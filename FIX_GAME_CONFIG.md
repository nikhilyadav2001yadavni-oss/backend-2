# Fix Game Configuration Issue

## Problem
You're getting `winAmount: 5` when betting `5 USDT`, but it should be `10 USDT` (5 × 2 multiplier).

This means the `winMultiplier` in your database is likely set to `1` instead of `2`.

## Solution

### Option 1: Update via MongoDB Directly

```javascript
// Connect to your MongoDB and run:
db.gameconfigs.updateMany(
  { gameType: "COLOR_CHANGER" },
  { $set: { winMultiplier: 2 } }
)

db.gameconfigs.updateMany(
  { gameType: "DICE_ROLL" },
  { $set: { winMultiplier: 2 } }
)
```

### Option 2: Use Admin API (if available)

Create an admin route to update game configs.

### Option 3: Delete and Reseed

```javascript
// Delete existing configs
db.gameconfigs.deleteMany({})

// Restart your server - it will automatically seed with correct values
```

## Verify Fix

After updating, test with this curl:

```bash
curl --location --request POST 'http://localhost:3001/api/v1/games/bet/color-changer' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--header 'Content-Type: application/json' \
--data-raw '{
  "color": "RED",
  "betAmount": 5
}'
```

Expected response:
```json
{
  "betAmount": 5,
  "winAmount": 10  // Should be 10, not 5
}
```

## Why Continuous Wins?

You're at `-65` profit/loss, which is below `-25` (max loss).

### How Many More Wins?

- Current: `-65`
- Each win with bet `5`: Net profit = `+5` (10 winAmount - 5 betAmount)
- Wins needed to reach `-25`: `(-65 + 25) / 5 = 8 wins`
- After 8 wins: You'll be at `-25`, then normal gameplay resumes

### I Fixed the Continuous Win Issue

Changed the condition from `<=` to `<`:

**Before:**
```typescript
if (userProfitLoss <= -maxUserLoss) { // At exactly -25, still forced win
```

**After:**
```typescript
if (userProfitLoss < -maxUserLoss) { // Only below -25 gets forced win
```

**Result:**
- At `-26` or below: Forced win
- At `-25`: Normal gameplay resumes
- This prevents infinite wins at exactly `-25`

## Current Behavior

| Profit/Loss | Next Bet Result |
|-------------|-----------------|
| Below `-25` (e.g., `-26`, `-30`, `-65`) | **Forced WIN** |
| Exactly `-25` | **Normal gameplay** (40% win chance) |
| Between `-25` and `+25` | **Normal gameplay** |
| At or above `+25` | **Forced LOSS** |

This ensures users recover from losses but don't get stuck in infinite win loops.

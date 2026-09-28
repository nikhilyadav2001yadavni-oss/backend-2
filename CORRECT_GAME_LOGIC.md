# ✅ Correct Game Logic

## Core Principle
**Platform never loses, but users CAN lose freely**

---

## Rules

### 1️⃣ User Profit Cap (Platform Protection)
- If user's total profit >= $25 → **Force LOSS**
- Keep forcing losses until profit drops back to $25 or below
- This ensures platform never pays out too much

### 2️⃣ Users Can Lose Freely
- ❌ **NO protection on losses**
- Users can lose $100, $500, or any amount
- This is how platform makes money

### 3️⃣ Platform Risk Check
- If platform balance is low → Force LOSS
- Ensures platform always has funds to pay winners

### 4️⃣ Normal Gameplay
- When profit < $25 → Normal game with controlled probability
- Default: 40% win, 60% loss

---

## Logic Flow

```
┌─────────────────────────────────────┐
│  User places bet                    │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Check: Is user profit >= $25?      │
└────────────┬────────────────────────┘
             │
      Yes ───┤
             │    ┌─────────────────────┐
             └───▶│  FORCE LOSS         │
                  │  (Platform protect) │
                  └─────────────────────┘
             │
       No ───┤
             │
             ▼
┌─────────────────────────────────────┐
│  Check: Platform has balance?       │
└────────────┬────────────────────────┘
             │
       No ───┤
             │    ┌─────────────────────┐
             └───▶│  FORCE LOSS         │
                  │  (Platform protect) │
                  └─────────────────────┘
             │
      Yes ───┤
             │
             ▼
┌─────────────────────────────────────┐
│  Normal Gameplay                    │
│  40% Win | 60% Loss                 │
└─────────────────────────────────────┘
```

---

## Examples

### Scenario 1: User at $30 profit
```
User Profit: +$30
Bet: $10

Result: LOSS (forced)
Reason: Profit >= $25, force loss to protect platform

After: +$20 profit (back below $25)
```

### Scenario 2: User at $26 profit, bets $5
```
User Profit: +$26
Bet: $5

Result: LOSS (forced)
New Profit: +$21

Next Bet: $5
Result: Normal gameplay (can win or lose)
```

### Scenario 3: User at -$100 (lost $100)
```
User Profit: -$100
Bet: $25

Result: Normal gameplay (40% win chance)
- If wins: +$25 (net profit = -$75)
- If loses: -$25 (net profit = -$125)

NO PROTECTION - User can keep losing
```

### Scenario 4: User at $10 profit
```
User Profit: +$10
Bet: $20

Normal gameplay:
- If wins: +$30 profit → Next bet will be forced LOSS
- If loses: -$10 profit (can go negative)
```

---

## Why This Works

✅ **Platform never loses money**
- Users capped at $25 profit
- Forced losses bring profit back down

✅ **Users can lose freely**
- No protection on losses
- This is how platform makes profit

✅ **Game feels fair**
- Normal gameplay most of the time
- Forced losses only when user is "too profitable"

---

## Current Issue: winMultiplier = 1 (should be 2)

Your database has `winMultiplier: 1`, which is why:
- Bet: $25 → Win: $25 (wrong)
- Should be: Bet: $25 → Win: $50

### Fix Database:

```javascript
// MongoDB Shell
db.gameconfigs.updateMany(
  {},
  { $set: { winMultiplier: 2 } }
)
```

Or delete configs and restart server to reseed with correct values.

---

## Summary Table

| User Profit | Bet | Result | Reason |
|------------|-----|--------|--------|
| +$30 | $10 | **LOSS** (forced) | Profit >= $25 (platform protect) |
| +$25 | $5 | **LOSS** (forced) | At profit cap |
| +$24 | $10 | **Normal** (40% win) | Below profit cap |
| +$10 | $15 | **Normal** (40% win) | Below profit cap |
| $0 | $20 | **Normal** (40% win) | No profit yet |
| -$50 | $25 | **Normal** (40% win) | No protection on losses |
| -$100 | $10 | **Normal** (40% win) | Users can lose freely |

**Key Point:** Only cap is on WINNING ($25 max profit). NO CAP on LOSING.

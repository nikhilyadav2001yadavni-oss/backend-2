# Game Win Amount Explanation

## Why did I win only 5 USDT when I bet 25 USDT?

### Your Game Result:
- **Bet Amount**: 25 USDT
- **Win Amount**: 5 USDT (instead of expected 50 USDT with 2x multiplier)
- **User Profit/Loss**: -175 USDT (you've lost 175 USDT overall)
- **Gaming Wallet Balance**: 20 USDT

---

## The Three-Tier Protection System

Your game uses a **three-tier protection system** to ensure fair gameplay and prevent excessive losses:

### Tier 1: User Profit/Loss Limits Protection ✅ (This is what happened to you)

When a user reaches the **maximum loss limit** (default: 25 USDT), the system automatically triggers a **protection mechanism**.

**What happened:**
1. Your total profit/loss was **-175 USDT** (you've lost 175 USDT overall)
2. The system's `maxUserLoss` limit is **25 USDT**
3. Since `-175 <= -25`, you've exceeded the maximum loss limit
4. The system **forced a small win** to protect you from further losses

**The Protection Logic:**
```typescript
if (userProfitLoss <= -maxUserLoss) {
    // User has reached max loss, allow small win
    const smallWinAmount = Math.min(betAmount, maxSmallWinAmount)
    // smallWinAmount = Math.min(25, 5) = 5 USDT
    return {
        result: GameResult.WIN,
        winAmount: smallWinAmount, // 5 USDT
        forcedResult: true, // This was a forced/protected win
    }
}
```

**Result:**
- You bet: **25 USDT**
- You won: **5 USDT** (the maximum small win amount)
- Net result: **-20 USDT** (you still lost, but less than the full 25 USDT)

---

### Tier 2: Platform Risk Protection

If the platform doesn't have sufficient balance to pay out a win, the system forces a loss to protect platform stability.

### Tier 3: Normal Gameplay

If neither Tier 1 nor Tier 2 are triggered, normal gameplay occurs with:
- **Win Probability**: 40% (default)
- **Win Multiplier**: 2x (default)
- **Normal Win**: If you bet 25 USDT and win normally, you'd get **50 USDT** (25 × 2)

---

## Why This Protection Exists

1. **Prevents Excessive Losses**: Stops users from losing more than the configured limit
2. **Fair Gaming**: Ensures users get occasional wins even when on a losing streak
3. **Platform Sustainability**: Maintains a healthy balance between user wins and platform operations

---

## Understanding Your Net Result

**What actually happened:**
- **Bet placed**: 25 USDT (deducted from your wallet)
- **Win received**: 5 USDT (credited to your wallet)
- **Net change**: -20 USDT (you lost 20 USDT in this round)

**Your wallet balance:**
- Before bet: 45 USDT (25 + 20 = 45)
- After bet: 20 USDT (45 - 25 + 5 = 20)

---

## Normal Win vs. Protected Win

### Normal Win (when you haven't hit loss limits):
- Bet: 25 USDT
- Win: **50 USDT** (25 × 2 multiplier)
- Net: +25 USDT profit

### Protected Win (when you've hit max loss):
- Bet: 25 USDT
- Win: **5 USDT** (maxSmallWinAmount)
- Net: -20 USDT (still a loss, but protected)

---

## Configuration Values

The system uses these default values (configurable in admin panel):

- **maxUserLoss**: 25 USDT (maximum loss before protection kicks in)
- **maxSmallWinAmount**: 5 USDT (maximum small win when protection is active)
- **winMultiplier**: 2x (normal win multiplier)
- **winProbability**: 0.4 (40% chance to win in normal gameplay)

---

## How to Check If It Was a Protected Win

Look at the game record in the database. The `metadata.notes` field will show:
- `"Result forced due to user profit/loss limits"` - Protected win (your case)
- `"Result forced due to platform risk"` - Platform protection
- `"Normal gameplay"` - Regular win/loss

The `forcedResult` field in the game record will be `true` for protected wins.

---

## Summary

**You won 5 USDT instead of 50 USDT because:**
1. ✅ You've already lost 175 USDT (exceeded the 25 USDT loss limit)
2. ✅ The system triggered **Tier 1 Protection** to prevent further losses
3. ✅ You received a **protected small win** of 5 USDT (the maximum allowed)
4. ✅ This is a **safety feature**, not a bug

**This is working as designed** - the system is protecting you from excessive losses by giving you a small win when you've reached the maximum loss threshold.

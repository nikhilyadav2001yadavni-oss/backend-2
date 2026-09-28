# ROI System Documentation

## Overview

The W-Invest ROI (Return on Investment) system provides users with a daily compounding return on their deposits. When a user makes a deposit, 50% of the net amount (after fees) is automatically invested in the ROI system with an 8% monthly return rate, compounded daily.

---

## Table of Contents

1. [Deposit Flow](#deposit-flow)
2. [ROI Investment Creation](#roi-investment-creation)
3. [ROI Calculation Formula](#roi-calculation-formula)
4. [Lock-in Period](#lock-in-period)
5. [Referral Bonus System](#referral-bonus-system)
6. [Daily ROI Processing](#daily-roi-processing)
7. [Withdrawal Validation](#withdrawal-validation)
8. [API Endpoints](#api-endpoints)
9. [Examples](#examples)
10. [Technical Details](#technical-details)

---

## Deposit Flow

When a user makes a deposit:

1. **Transaction Verification**: The deposit transaction is verified on the blockchain
2. **Fee Deduction**: Any deposit fees are deducted from the amount
3. **50-50 Split**: The net amount (after fees) is split equally:
   - **50%** → `gamingWallet` (for gaming activities)
   - **50%** → `roiWallet` (automatically invested in ROI)
4. **ROI Investment Creation**: The ROI wallet portion automatically creates an ROI investment with a 7-day lock-in period
5. **Referral Bonuses**: If the user was referred, referral bonuses are processed:
   - **Direct Referrer**: 3% of deposit amount → `mainWallet`
   - **Indirect Referrer**: 1.5% of deposit amount → `mainWallet`

### Example Deposit Flow

```
User deposits: 100 USDT
Deposit fee: 1 USDT (1%)
Net amount: 99 USDT

Split:
├── gamingWallet: 49.5 USDT (50%)
└── roiWallet: 49.5 USDT (50%) → Auto-invested with 7-day lock-in

Referral Bonuses (if applicable):
├── Direct Referrer: 2.97 USDT (3% of 99 USDT) → mainWallet
└── Indirect Referrer: 1.485 USDT (1.5% of 99 USDT) → mainWallet
```

---

## ROI Investment Creation

When a deposit is processed and the ROI wallet portion is credited:

1. **Investment Record Created**: A new `RoiInvestment` record is created with:
   - `principalAmount`: The ROI wallet portion (50% of net deposit)
   - `currentBalance`: Initially equals `principalAmount`
   - `lockInPeriod`: 7 days
   - `lockInStartDate`: Current date/time
   - `lockInEndDate`: `lockInStartDate + 7 days`
   - `isLocked`: `true`
   - `isActive`: `true`
   - `totalRoiEarned`: `0`

2. **Investment Tracking**: The investment is linked to the deposit transaction via `depositTransactionId`

---

## ROI Calculation Formula

### Constants

- **Monthly ROI Rate**: `8%` (0.08)
- **Days in Month**: `30` (average)
- **Daily ROI Rate**: `(1 + 0.08)^(1/30) - 1 ≈ 0.00257` (0.257% per day)
- **Lock-in Period**: `7 days`

### Daily ROI Calculation

The ROI is calculated daily using compound interest:

```
Daily Earnings = Current Balance × Daily ROI Rate
New Balance = Current Balance × (1 + Daily ROI Rate)
```

### Formula Breakdown

1. **Daily Rate Calculation**:
   ```
   Daily Rate = (1 + Monthly Rate)^(1/30) - 1
   Daily Rate = (1 + 0.08)^(1/30) - 1
   Daily Rate ≈ 0.00257 (0.257%)
   ```

2. **Daily Earnings**:
   ```
   Daily Earnings = Current Balance × 0.00257
   ```

3. **New Balance (Compounded)**:
   ```
   New Balance = Current Balance × 1.00257
   ```

### Monthly ROI Verification

After 30 days of compounding:
```
Final Balance = Principal × (1.00257)^30
Final Balance ≈ Principal × 1.08
ROI Earned ≈ Principal × 0.08 (8%)
```

---

## Lock-in Period

### Overview

Every ROI investment has a **7-day lock-in period** during which the principal amount cannot be withdrawn.

### Lock-in Details

- **Duration**: 7 days from the deposit date
- **Start Date**: Date when deposit was processed
- **End Date**: `lockInStartDate + 7 days`
- **Status**: `isLocked = true` during lock-in period

### Lock-in Behavior

1. **During Lock-in**:
   - ROI is still calculated and credited daily
   - Principal amount is locked and cannot be withdrawn
   - Only ROI earnings (credited daily) can be withdrawn (if they exceed the locked amount)

2. **After Lock-in**:
   - `isLocked` automatically changes to `false`
   - Full balance (principal + ROI) becomes available for withdrawal
   - Lock-in status is checked daily by the cron job

### Lock-in Calculation

```javascript
const now = new Date()
const isLocked = now < lockInEndDate
const daysRemaining = isLocked 
    ? Math.ceil((lockInEndDate - now) / (1000 * 60 * 60 * 24))
    : 0
```

---

## Referral Bonus System

### Overview

When a user makes a deposit, referral bonuses are automatically credited to their referrers.

### Bonus Structure

1. **Direct Referral Bonus**:
   - **Recipient**: The user who directly referred the depositor
   - **Amount**: 3% of the net deposit amount (after fees)
   - **Wallet**: Credited to referrer's `mainWallet`
   - **Transaction**: Recorded as `REFERRAL_BONUS` transaction

2. **Indirect Referral Bonus**:
   - **Recipient**: The user who referred the direct referrer
   - **Amount**: 1.5% of the net deposit amount (after fees)
   - **Wallet**: Credited to indirect referrer's `mainWallet`
   - **Transaction**: Recorded as `REFERRAL_BONUS` transaction

### Referral Chain

```
Indirect Referrer (Level 2)
    ↓ refers
Direct Referrer (Level 1)
    ↓ refers
Depositor (Level 0)
```

When the depositor makes a deposit:
- Direct Referrer gets: 3% of deposit
- Indirect Referrer gets: 1.5% of deposit

### Example

```
Deposit Amount: 100 USDT
Net Amount (after 1% fee): 99 USDT

Bonuses:
├── Direct Referrer: 99 × 0.03 = 2.97 USDT → mainWallet
└── Indirect Referrer: 99 × 0.015 = 1.485 USDT → mainWallet
```

---

## Daily ROI Processing

### Cron Job Schedule

The ROI calculation runs automatically via a cron job:
- **Schedule**: Daily at 00:00 UTC (midnight)
- **Frequency**: Once per day
- **Process**: Calculates and credits ROI for all active investments

### Processing Steps

1. **Fetch Active Investments**: Get all ROI investments where `isActive = true`

2. **For Each Investment**:
   - Check and update lock-in status
   - Calculate daily ROI:
     ```
     dailyEarnings = currentBalance × 0.00257
     newBalance = currentBalance × 1.00257
     ```
   - Update investment:
     - `currentBalance = newBalance`
     - `totalRoiEarned += dailyEarnings`
     - `lastRoiCalculationDate = today`
   - Credit ROI to user's `roiWallet`:
     ```
     wallet.roiWallet += dailyEarnings
     ```
   - Create transaction record:
     - Category: `ROI_CREDIT`
     - Amount: `dailyEarnings`
     - Status: `COMPLETED`

3. **Logging**: Logs processing results including:
   - Number of investments processed
   - Total ROI credited
   - Any errors encountered

### Manual Trigger

The ROI calculation can also be triggered manually for testing:
```typescript
import { triggerRoiCalculation } from './utils/roiCronJob'
const result = await triggerRoiCalculation()
```

---

## Withdrawal Validation

### Overview

Before allowing a withdrawal from the ROI wallet, the system validates:
1. User has sufficient balance
2. Lock-in period has ended for the requested amount

### Validation Logic

1. **Get User's ROI Wallet Balance**: Total balance in `roiWallet`

2. **Calculate Locked Balance**:
   - Find all active investments where `isLocked = true`
   - Sum their `currentBalance` values
   - This is the locked balance

3. **Calculate Available Balance**:
   ```
   availableBalance = roiWallet - lockedBalance
   ```

4. **Validate Withdrawal**:
   ```
   if (withdrawalAmount > availableBalance) {
       // Reject: Insufficient unlocked balance
   } else {
       // Allow: Sufficient unlocked balance
   }
   ```

### Example

```
User's ROI Wallet: 1000 USDT
Active Investments:
├── Investment 1: 500 USDT (locked, 3 days remaining)
├── Investment 2: 300 USDT (unlocked)
└── Investment 3: 200 USDT (locked, 1 day remaining)

Locked Balance: 500 + 200 = 700 USDT
Available Balance: 1000 - 700 = 300 USDT

Withdrawal Request: 250 USDT
Result: ✅ Allowed (250 < 300)

Withdrawal Request: 400 USDT
Result: ❌ Rejected (400 > 300)
```

---

## API Endpoints

### 1. Get ROI Summary

**Endpoint**: `GET /api/v1/roi/summary`

**Description**: Get comprehensive ROI summary including total investments, earnings, and rates.

**Response**:
```json
{
  "success": true,
  "message": "ROI summary fetched successfully",
  "data": {
    "totalInvestments": 5,
    "totalPrincipal": 1000.50,
    "totalRoiEarned": 25.75,
    "currentBalance": 1026.25,
    "lockedBalance": 500.00,
    "unlockedBalance": 526.25,
    "monthlyRoiRate": 8,
    "dailyRoiRate": 0.257,
    "lockInPeriodDays": 7
  }
}
```

### 2. Get ROI Investments

**Endpoint**: `GET /api/v1/roi/investments?page=1&limit=20`

**Description**: Get list of all ROI investments with pagination.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "message": "ROI investments fetched successfully",
  "data": {
    "investments": [
      {
        "_id": "...",
        "principalAmount": 100.50,
        "currentBalance": 102.75,
        "lockInPeriod": 7,
        "lockInStartDate": "2024-01-01T00:00:00Z",
        "lockInEndDate": "2024-01-08T00:00:00Z",
        "isLocked": true,
        "daysRemaining": 3,
        "totalRoiEarned": 2.25,
        "isActive": true
      }
    ],
    "totalCount": 5,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

### 3. Get ROI Earnings History

**Endpoint**: `GET /api/v1/roi/earnings-history?page=1&limit=20&startDate=2024-01-01&endDate=2024-12-31`

**Description**: Get history of ROI earnings/credits with optional date range filter.

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `startDate` (optional): Start date (ISO 8601 format)
- `endDate` (optional): End date (ISO 8601 format)

**Response**:
```json
{
  "success": true,
  "message": "ROI earnings history fetched successfully",
  "data": {
    "transactions": [
      {
        "transactionId": "TXN20241201000001",
        "category": "ROI_CREDIT",
        "amount": 0.257,
        "currency": "USDT",
        "status": "COMPLETED",
        "createdAt": "2024-12-01T00:00:00Z"
      }
    ],
    "totalCount": 30,
    "currentPage": 1,
    "totalPages": 2,
    "totalEarnings": 125.50
  }
}
```

### 4. Validate ROI Withdrawal

**Endpoint**: `POST /api/v1/roi/validate-withdrawal`

**Description**: Check if user can withdraw the specified amount from ROI wallet.

**Request Body**:
```json
{
  "amount": 100.50
}
```

**Response**:
```json
{
  "success": true,
  "message": "Withdrawal is allowed",
  "data": {
    "canWithdraw": true,
    "availableBalance": 526.25,
    "lockedBalance": 500.00
  }
}
```

---

## Examples

### Example 1: New Deposit

**Scenario**: User deposits 100 USDT with 1% fee

```
Deposit Amount: 100 USDT
Fee (1%): 1 USDT
Net Amount: 99 USDT

Split:
├── gamingWallet: 49.5 USDT
└── roiWallet: 49.5 USDT → ROI Investment Created

ROI Investment:
├── Principal: 49.5 USDT
├── Lock-in Period: 7 days
├── Lock-in End: Deposit Date + 7 days
└── Status: Locked
```

### Example 2: Daily ROI Calculation

**Scenario**: Investment of 100 USDT after 5 days

```
Day 0: Principal = 100 USDT
Day 1: Balance = 100 × 1.00257 = 100.257 USDT (ROI: 0.257 USDT)
Day 2: Balance = 100.257 × 1.00257 = 100.515 USDT (ROI: 0.258 USDT)
Day 3: Balance = 100.515 × 1.00257 = 100.774 USDT (ROI: 0.259 USDT)
Day 4: Balance = 100.774 × 1.00257 = 101.033 USDT (ROI: 0.260 USDT)
Day 5: Balance = 101.033 × 1.00257 = 101.293 USDT (ROI: 0.261 USDT)

Total ROI Earned (5 days): 1.293 USDT
Current Balance: 101.293 USDT
```

### Example 3: Monthly ROI Verification

**Scenario**: Investment of 1000 USDT for 30 days

```
After 30 days:
Final Balance = 1000 × (1.00257)^30
Final Balance ≈ 1000 × 1.08
Final Balance ≈ 1080 USDT

Total ROI Earned: 80 USDT (8% monthly)
```

### Example 4: Referral Bonus Flow

**Scenario**: User B (referred by User A, who was referred by User C) deposits 100 USDT

```
Deposit: 100 USDT
Fee: 1 USDT (1%)
Net: 99 USDT

Bonuses:
├── User A (Direct Referrer): 99 × 0.03 = 2.97 USDT → mainWallet
└── User C (Indirect Referrer): 99 × 0.015 = 1.485 USDT → mainWallet
```

### Example 5: Withdrawal Validation

**Scenario**: User wants to withdraw 300 USDT from ROI wallet

```
ROI Wallet Balance: 1000 USDT

Active Investments:
├── Investment 1: 500 USDT (Locked, 5 days remaining)
├── Investment 2: 300 USDT (Unlocked)
└── Investment 3: 200 USDT (Locked, 2 days remaining)

Locked Balance: 500 + 200 = 700 USDT
Available Balance: 1000 - 700 = 300 USDT

Withdrawal Request: 300 USDT
Validation: ✅ Allowed (300 ≤ 300)
```

---

## Technical Details

### Database Models

#### RoiInvestment Model

```typescript
{
  userId: ObjectId,
  depositTransactionId: ObjectId,
  principalAmount: Number,
  currentBalance: Number,
  lockInPeriod: Number (default: 7),
  lockInStartDate: Date,
  lockInEndDate: Date,
  isLocked: Boolean,
  lastRoiCalculationDate: Date,
  totalRoiEarned: Number,
  isActive: Boolean
}
```

### Service Functions

#### RoiService

- `createRoiInvestment(userId, depositTransactionId, principalAmount)`: Create new ROI investment
- `processDailyRoi()`: Process daily ROI for all active investments (cron job)
- `getUserRoiInvestments(userId, page, limit)`: Get user's ROI investments
- `getRoiEarningsHistory(userId, page, limit, startDate?, endDate?)`: Get ROI earnings history
- `getRoiSummary(userId)`: Get comprehensive ROI summary
- `canWithdrawFromRoi(userId, amount)`: Validate ROI withdrawal

### Constants

```typescript
MONTHLY_ROI_RATE = 0.08 // 8%
DAYS_IN_MONTH = 30
DAILY_ROI_RATE = (1 + 0.08)^(1/30) - 1 ≈ 0.00257
LOCK_IN_PERIOD_DAYS = 7
```

### Cron Job Configuration

- **Schedule**: `0 0 * * *` (Daily at midnight UTC)
- **File**: `src/utils/roiCronJob.ts`
- **Function**: `startRoiCronJob()`

### Transaction Categories

- `ROI_CREDIT`: Daily ROI earnings credited to ROI wallet
- `REFERRAL_BONUS`: Referral bonuses credited to main wallet

---

## Important Notes

1. **ROI Calculation**: ROI is calculated and credited daily at midnight UTC
2. **Lock-in Period**: 7-day lock-in period applies to the principal amount, not ROI earnings
3. **Compounding**: ROI compounds daily, meaning each day's ROI is calculated on the previous day's balance (including previous ROI)
4. **Referral Bonuses**: Only processed if the depositor has a referrer in the system
5. **Withdrawal**: Users can only withdraw unlocked balance (principal after lock-in + ROI earnings)
6. **Multiple Investments**: Users can have multiple ROI investments from different deposits
7. **Active Status**: Only active investments (`isActive = true`) are processed for ROI calculation

---

## Support

For questions or issues regarding the ROI system, please contact the development team or refer to the API documentation at `/api/v1/docs`.

---

**Last Updated**: December 2024  
**Version**: 1.0.0

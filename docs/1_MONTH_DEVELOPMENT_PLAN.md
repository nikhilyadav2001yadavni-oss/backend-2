# 📅 1-Month Development Plan
## Mobile App MVP - Investment Platform with Gaming & MLM

**Team:** 2 Developers (1 React Native + 1 Backend)  
**Timeline:** 4 Weeks (20 working days)  
**Total Hours:** ~320 hours (160h per developer)

---

## 📊 Project Overview

### **Simplified Scope:**
- ✅ USDT deposits only (BEP-20 on BSC)
- ✅ QR code for MetaMask address
- ✅ BSCScan API for transaction verification
- ✅ 2 Games: Color Changer & Dice Roll
- ✅ Full MLM system with unlimited depth
- ✅ ROI system with daily compounding

### **Total Screens:** ~22 screens
### **Success Probability:** 90%+

---

## 🎯 Development Timeline

### **Week 1: Foundation & Authentication** (Days 1-5)
**Total Hours:** 59h (31h Frontend + 28h Backend)

### **Week 2: Deposit & Wallet System** (Days 6-10)
**Total Hours:** 64h (28h Frontend + 36h Backend)

### **Week 3: ROI & MLM System** (Days 11-15)
**Total Hours:** 82h (35h Frontend + 47h Backend)

### **Week 4: Gaming & Withdrawal** (Days 16-20)
**Total Hours:** 68h (32h Frontend + 36h Backend)

**Grand Total:** 273h (126h Frontend + 147h Backend)  
**Buffer Available:** 47h for testing, polish, and unexpected issues

---

## 📅 WEEK 1: Foundation & Authentication

### **Day 1-2: Project Setup**

#### **Frontend Developer (12h)**
- [ ] Initialize React Native project
- [ ] Setup navigation (React Navigation)
- [ ] Configure project structure (folders, components)
- [ ] Setup state management (Redux/Context API)
- [ ] Install essential libraries
- [ ] Create base UI components (Button, Input, Card)
- [ ] Setup theme/styling system

#### **Backend Developer (12h)**
- [ ] Setup backend framework (Node.js/Express or Python/Django)
- [ ] Database setup (MongoDB/PostgreSQL)
- [ ] Configure environment variables
- [ ] Setup project structure
- [ ] Create database models (User, Wallet, Transaction)
- [ ] Setup API documentation (Swagger/Postman)
- [ ] Configure CORS and security middleware

**Deliverables:**
- ✅ Project structure ready
- ✅ Development environment configured
- ✅ Basic API endpoints working

---

### **Day 3-4: Authentication System**

#### **Frontend Developer (12h)**
- [ ] Splash Screen (#1)
- [ ] Onboarding Screen (#2) - Optional
- [ ] Login Screen (#3)
  - Email input
  - Password input
  - "Forgot Password?" link
  - "Sign Up" link
- [ ] Registration Screen (#4)
  - Email input
  - Phone number input
  - Referral code input (optional)
  - Terms & conditions checkbox
- [ ] OTP Verification Screen (#5)
  - 6-digit OTP input
  - Resend OTP button
  - Timer countdown
- [ ] Form validation
- [ ] Error handling

#### **Backend Developer (16h)**
- [ ] User registration API
  - Email validation
  - Phone validation
  - Duplicate check (email, phone)
  - Referral code validation
- [ ] OTP generation & sending
  - Email OTP
  - SMS OTP (optional)
- [ ] OTP verification API
- [ ] JWT authentication
  - Login API
  - Token generation
  - Token refresh
- [ ] Password reset flow
- [ ] User model with referral tracking

**Deliverables:**
- ✅ Complete authentication flow
- ✅ User can register, verify OTP, and login
- ✅ JWT tokens working

---

### **Day 5: Dashboard Basic**

#### **Frontend Developer (10h)**
- [ ] Main Dashboard Screen (#6)
  - Wallet balance cards (ROI, Gaming, MLM)
  - Quick stats display
  - Quick action buttons (Deposit, Withdraw, Play Games)
  - Recent activity feed
  - Bottom navigation bar
- [ ] Wallet Overview Screen (#7)
  - Detailed wallet breakdown
  - Transfer between wallets (if allowed)
- [ ] Transaction History Screen (#8)
  - Transaction list
  - Filters (All, Deposits, Withdrawals, ROI, MLM, Gaming)
  - Pull to refresh

#### **Backend Developer (6h)**
- [ ] Wallet balance API
  - ROI Wallet balance
  - Gaming Wallet balance
  - MLM Wallet balance
- [ ] Transaction history API
  - Get all transactions
  - Filter by type
  - Pagination
- [ ] Recent activity API

**Deliverables:**
- ✅ Dashboard displaying wallet balances
- ✅ Transaction history working
- ✅ Navigation structure ready

---

## 📅 WEEK 2: Deposit & Wallet System

### **Day 6-7: Deposit System (USDT + QR + BSCScan)**

#### **Frontend Developer (12h)**
- [ ] Deposit Selection Screen (#9)
  - USDT selection (only option)
  - Amount input
  - Minimum deposit warning ($100)
  - Deposit button
- [ ] Deposit Address Screen (#10)
  - QR code display (MetaMask address)
  - Wallet address text (copy button)
  - Amount to deposit display
  - "I've sent the payment" button
  - Instructions/help text
- [ ] Deposit Status Screen (#11)
  - Pending deposits list
  - Confirmation status
  - Transaction hash display
  - Estimated confirmation time
- [ ] Deposit History Screen (#12)
  - All past deposits
  - Filter by status (Pending, Confirmed, Failed)
  - Deposit details

#### **Backend Developer (16h)**
- [ ] Generate deposit address (MetaMask address)
- [ ] Store deposit requests
- [ ] BSCScan API integration
  - Verify transaction by hash
  - Check transaction status
  - Verify amount and recipient
- [ ] Deposit confirmation logic
  - Split deposit: 50% locked (ROI), 50% available (Gaming)
  - Update wallet balances
  - Create transaction records
- [ ] Deposit history API
- [ ] Webhook/cron job for checking pending deposits

**Technical Details:**
```javascript
// BSCScan API Integration
const verifyTransaction = async (txHash, expectedAmount, recipientAddress) => {
  const response = await fetch(
    `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${BSCSCAN_API_KEY}`
  );
  // Verify transaction status
  // Check amount matches
  // Verify recipient address
  // Update deposit status
};
```

**Deliverables:**
- ✅ Users can deposit USDT via QR code
- ✅ Transactions verified via BSCScan API
- ✅ Automatic wallet allocation (50/50 split)

---

### **Day 8-9: Wallet System**

#### **Frontend Developer (10h)**
- [ ] Wallet Overview Screen (#7) - Enhanced
  - ROI Wallet details
  - Gaming Wallet details
  - MLM Wallet details
  - Transfer between wallets (if allowed)
- [ ] Wallet balance display components
- [ ] Transfer funds UI (optional)

#### **Backend Developer (12h)**
- [ ] Wallet model structure
  - ROI Wallet (locked + earnings)
  - Gaming Wallet
  - MLM Wallet
- [ ] Wallet balance APIs
- [ ] Transfer between wallets API (if allowed)
- [ ] Wallet transaction logging

**Deliverables:**
- ✅ Three separate wallets working
- ✅ Wallet balances displayed correctly
- ✅ Transaction logging

---

### **Day 10: Transaction History & Polish**

#### **Frontend Developer (6h)**
- [ ] Transaction History Screen (#8) - Enhanced
  - Better filters
  - Transaction details view
  - Export option (optional)

#### **Backend Developer (8h)**
- [ ] Transaction history API - Enhanced
  - Advanced filtering
  - Search functionality
  - Export functionality
- [ ] Transaction model enhancements
- [ ] Testing deposit flow end-to-end

**Deliverables:**
- ✅ Complete transaction history
- ✅ Deposit flow tested and working

---

## 📅 WEEK 3: ROI & MLM System

### **Day 11-12: ROI System**

#### **Frontend Developer (14h)**
- [ ] ROI Wallet Screen (#13)
  - Locked balance display
  - ROI earnings balance
  - Daily ROI rate display
  - Monthly ROI rate (8%)
  - Lock-in period countdown (7 days)
  - ROI earnings chart/graph
- [ ] ROI Earnings History Screen (#14)
  - Daily ROI credits list
  - Filter by date range
  - Total earnings summary
  - Export option (optional)

#### **Backend Developer (20h)**
- [ ] ROI calculation logic
  - 8% monthly ROI
  - Daily compounding formula
  - Lock-in period check (7 days)
- [ ] Daily ROI cron job
  - Calculate ROI for all active investments
  - Credit to ROI wallet
  - Log transactions
- [ ] ROI earnings API
- [ ] Investment details API
- [ ] Lock-in period validation

**ROI Calculation Formula:**
```javascript
// Daily ROI = (Monthly ROI / Days in Month) compounded daily
// Monthly ROI = 8%
// Daily Rate = (1 + 0.08)^(1/30) - 1 ≈ 0.00257 (0.257% per day)
// Daily Earnings = Locked Amount × Daily Rate
// Compounded Daily: New Balance = Previous Balance × (1 + Daily Rate)
```

**Deliverables:**
- ✅ ROI calculation working correctly
- ✅ Daily ROI credited automatically
- ✅ Lock-in period enforced

---

### **Day 13-15: MLM/Referral System**

#### **Frontend Developer (18h)**
- [ ] Referral Dashboard Screen (#17)
  - Total referrals count
  - Total commission earned
  - Referral link/code display
  - Share button
  - Quick stats (Level 1, Level 2+ commissions)
- [ ] Referral Link/Code Screen (#18)
  - Unique referral code display
  - Shareable referral link
  - QR code for referral
  - Share options (WhatsApp, SMS, Email, etc.)
  - Copy to clipboard
- [ ] MLM Network/Tree Screen (#19)
  - Visual tree/graph of referrals
  - List view with levels
  - Show: Name, Level, Total deposits, Commission earned
  - Expandable levels
- [ ] MLM Wallet Screen (#21)
  - Total MLM balance
  - Available to withdraw
  - Transfer to gaming wallet (if allowed)
  - Commission breakdown by level

#### **Backend Developer (24h)**
- [ ] Referral system structure
  - User referral code generation
  - Referral tracking (parent-child relationship)
  - MLM tree structure (unlimited depth)
- [ ] Commission calculation logic
  - Level 1: 3% commission
  - Level 2+: 1.5% commission
  - Calculate on deposit confirmation
- [ ] MLM tree API
  - Get user's referral network
  - Calculate levels
  - Display network tree
- [ ] Commission history API
  - Filter by level
  - Filter by date
- [ ] MLM wallet API
- [ ] Commission credit on deposit

**MLM Structure:**
```
User A (You)
├── User B (Level 1) - 3% commission
│   ├── User C (Level 2) - 1.5% commission
│   │   └── User D (Level 3) - 1.5% commission
│   └── User E (Level 2) - 1.5% commission
└── User F (Level 1) - 3% commission
```

**Deliverables:**
- ✅ Referral system working
- ✅ MLM tree structure functional
- ✅ Commission calculation accurate
- ✅ Commissions credited automatically

---

## 📅 WEEK 4: Gaming & Withdrawal

### **Day 16-17: Gaming Hub (2 Games)**

#### **Frontend Developer (19h)**
- [ ] Games List Screen (#22)
  - Grid/list of available games
  - Game icons/thumbnails
  - Promo badges (2X rewards indicator)
  - Gaming wallet balance display
- [ ] Color Changer Game Screen (#27)
  - Color prediction interface (Red/Green/Blue)
  - Bet amount selection
  - Color result display
  - Win/loss animation
  - Bet history
- [ ] Dice Roll Game Screen (#25)
  - Dice prediction interface (1-6)
  - Select number or range
  - Place bet
  - Roll animation
  - Results display
- [ ] Game History Screen (#28)
  - All game bets history
  - Filter by game type
  - Filter by result (Win/Loss)
  - Game details
- [ ] Game Wallet Screen (#29)
  - Available balance
  - Recent game transactions
  - Deposit to game wallet (from ROI/MLM)
  - Withdraw from game wallet

#### **Backend Developer (14h)**
- [ ] Game models
  - Color Changer game logic
  - Dice Roll game logic
- [ ] Game APIs
  - Place bet API
  - Process game result
  - Calculate win/loss
  - Update gaming wallet
- [ ] Game history API
- [ ] Random number generation (secure)
- [ ] Game wallet integration
- [ ] 2X promo rewards logic (if enabled)

**Game Logic:**
```javascript
// Color Changer
const colors = ['Red', 'Green', 'Blue'];
const result = colors[Math.floor(Math.random() * colors.length)];
// User wins if prediction matches result

// Dice Roll
const diceResult = Math.floor(Math.random() * 6) + 1; // 1-6
// User wins if prediction matches result
```

**Deliverables:**
- ✅ 2 games functional
- ✅ Game wallet integration
- ✅ Game history working

---

### **Day 18-19: Withdrawal System**

#### **Frontend Developer (10h)**
- [ ] Withdrawal Request Screen (#30)
  - Select wallet (ROI, Gaming, MLM)
  - Enter amount
  - Enter crypto address (USDT)
  - Withdrawal fee display
  - Net amount after fee
  - Submit button
- [ ] Withdrawal History Screen (#31)
  - All withdrawal requests
  - Filter by status (Pending, Approved, Rejected)
  - Filter by wallet type
  - Withdrawal details
- [ ] Withdrawal Details Screen (#32)
  - Full withdrawal details
  - Status timeline
  - Admin remarks (if rejected)
  - Transaction hash (if approved)
  - Estimated processing time (5-7 days)

#### **Backend Developer (16h)**
- [ ] Withdrawal request API
  - Validate wallet balance
  - Calculate withdrawal fee
  - Create withdrawal request
  - Update wallet balance (hold funds)
- [ ] Admin approval API (for admin panel)
  - Approve withdrawal
  - Reject withdrawal (with remarks)
  - Process withdrawal
- [ ] Withdrawal history API
- [ ] Withdrawal status tracking
- [ ] Withdrawal fee calculation
- [ ] Principal withdrawal validation (only profits allowed)

**Deliverables:**
- ✅ Withdrawal request system
- ✅ Admin approval flow
- ✅ Withdrawal history tracking

---

### **Day 20: Profile, Settings & Final Polish**

#### **Frontend Developer (3h)**
- [ ] Profile Screen (#34)
  - User info (Email, Phone)
  - Account status
  - KYC status (if applicable)
  - Edit profile button
- [ ] Settings Screen (#35)
  - Notifications settings
  - Language selection
  - Security settings
  - Logout button
- [ ] Change Password Screen (#36)
  - Current password
  - New password
  - Confirm new password

#### **Backend Developer (6h)**
- [ ] Profile API
- [ ] Settings API
- [ ] Change password API
- [ ] Final testing
- [ ] Bug fixes
- [ ] Performance optimization

**Deliverables:**
- ✅ Profile & settings complete
- ✅ All features tested
- ✅ MVP ready for deployment

---

## 📋 Feature Checklist

### **Authentication Module** ✅
- [x] Splash Screen (#1)
- [x] Onboarding Screen (#2) - Optional
- [x] Login Screen (#3)
- [x] Registration Screen (#4)
- [x] OTP Verification Screen (#5)

### **Dashboard & Home** ✅
- [x] Main Dashboard (#6)
- [x] Wallet Overview (#7)
- [x] Transaction History (#8)

### **Deposit Module** ✅
- [x] Deposit Selection (#9)
- [x] Deposit Address/QR (#10)
- [x] Deposit Status (#11)
- [x] Deposit History (#12)

### **ROI/Investment Module** ✅
- [x] ROI Wallet (#13)
- [x] ROI Earnings History (#14)

### **MLM/Referral Module** ✅
- [x] Referral Dashboard (#17)
- [x] Referral Link/Code (#18)
- [x] MLM Network/Tree (#19)
- [x] MLM Wallet (#21)

### **Gaming Hub** ✅
- [x] Games List (#22)
- [x] Color Changer Game (#27)
- [x] Dice Roll Game (#25)
- [x] Game History (#28)
- [x] Game Wallet (#29)

### **Withdrawal Module** ✅
- [x] Withdrawal Request (#30)
- [x] Withdrawal History (#31)
- [x] Withdrawal Details (#32)

### **Profile & Settings** ✅
- [x] Profile Screen (#34)
- [x] Settings Screen (#35)
- [x] Change Password (#36)

**Total Screens:** ~22 screens

---

## 🔧 Technical Stack

### **Frontend (React Native)**
- React Native (latest stable)
- React Navigation
- State Management (Redux/Context API)
- UI Library (React Native Elements / NativeBase)
- QR Code Library (react-native-qrcode-svg)
- HTTP Client (Axios)
- Async Storage

### **Backend**
- Node.js/Express OR Python/Django
- MongoDB OR PostgreSQL
- JWT Authentication
- BSCScan API Integration
- Cron Jobs (node-cron / APScheduler)
- API Documentation (Swagger)

### **External Services**
- BSCScan API (transaction verification)
- Email Service (OTP sending)
- SMS Service (optional, for OTP)

---

## 📊 Success Metrics

### **Week 1 Goals:**
- ✅ Project setup complete
- ✅ Authentication working
- ✅ Dashboard displaying balances

### **Week 2 Goals:**
- ✅ Deposit system functional
- ✅ USDT deposits verified via BSCScan
- ✅ Wallet system working

### **Week 3 Goals:**
- ✅ ROI calculation accurate
- ✅ Daily ROI credited automatically
- ✅ MLM system functional
- ✅ Commissions calculated correctly

### **Week 4 Goals:**
- ✅ 2 games working
- ✅ Withdrawal system functional
- ✅ All features tested
- ✅ MVP ready for production

---

## ⚠️ Risk Management

### **Potential Risks:**
1. **BSCScan API Rate Limits**
   - Solution: Implement caching and batch processing
   - Buffer time: 4h

2. **MLM Tree Complexity**
   - Solution: Use recursive queries, optimize database indexes
   - Buffer time: 6h

3. **ROI Calculation Accuracy**
   - Solution: Thorough testing, use precise decimal calculations
   - Buffer time: 4h

4. **Game Fairness**
   - Solution: Use cryptographically secure random number generation
   - Buffer time: 3h

5. **Integration Issues**
   - Solution: Daily integration testing, clear API contracts
   - Buffer time: 8h

**Total Buffer:** 25h allocated for risks

---

## 📝 Daily Standup Checklist

### **Questions to Answer Daily:**
1. What did you complete yesterday?
2. What are you working on today?
3. Are there any blockers?
4. Do you need help from the other developer?
5. Are we on track with the timeline?

---

## 🎯 Final Deliverables

### **By End of Week 4:**
- ✅ Fully functional mobile app (22 screens)
- ✅ Complete backend API
- ✅ All features working end-to-end
- ✅ Basic testing completed
- ✅ Documentation ready
- ✅ Ready for beta testing

---

## 📞 Communication Plan

### **Daily:**
- Morning standup (15 min)
- End-of-day sync (10 min)

### **Weekly:**
- Week review meeting (30 min)
- Next week planning (30 min)

### **Tools:**
- Slack/Discord for daily communication
- GitHub for code management
- Trello/Jira for task tracking
- Figma for design reference (if available)

---

## ✅ Quality Assurance

### **Testing Checklist:**
- [ ] Unit tests for critical functions
- [ ] Integration tests for API endpoints
- [ ] Manual testing of all user flows
- [ ] Cross-platform testing (iOS/Android)
- [ ] Performance testing
- [ ] Security testing

---

## 🚀 Deployment Preparation

### **Week 4 Tasks:**
- [ ] Environment configuration
- [ ] API documentation finalization
- [ ] Database backup strategy
- [ ] Error logging setup
- [ ] Monitoring setup
- [ ] App store preparation (if needed)

---

## 📈 Post-MVP Enhancements (Future)

### **Phase 2 Features:**
- Investment Details Screen (#15)
- ROI Calculator (#16)
- Commission Earnings Screen (#20)
- Withdrawal Address Management (#33)
- Notifications Screen (#37)
- Help & Support Screen (#38)
- Statistics/Analytics Screen (#40)
- Promotions Screen (#41)
- KYC Verification (#42)

---

## 🎉 Success Criteria

**MVP is considered successful if:**
1. ✅ Users can register and login
2. ✅ Users can deposit USDT via QR code
3. ✅ Deposits are verified via BSCScan
4. ✅ ROI is calculated and credited daily
5. ✅ MLM referrals and commissions work
6. ✅ Users can play 2 games
7. ✅ Users can request withdrawals
8. ✅ All core features are functional
9. ✅ App is stable and performant
10. ✅ Ready for beta testing

---

**Good luck with the development! 🚀**

*Last Updated: [Current Date]*


# Email Templates Documentation

Beautiful, professional email templates for all W-Invest notifications.

## 📧 Template Overview

All email templates feature:
- **Modern Design**: Gradient headers, clean layouts, professional typography
- **Mobile Responsive**: Optimized for all screen sizes
- **Consistent Branding**: W-Invest purple/blue color scheme
- **Clear Information**: Well-structured information cards
- **Call-to-Actions**: Strategic button placements
- **Security**: Clear security warnings where appropriate

## 🎨 Design Features

### Visual Elements
- **Gradient Headers**: Purple to blue gradient (#667eea → #764ba2)
- **Typography**: Inter font family for modern, clean look
- **Icons**: Emoji-based icons for visual appeal and universal recognition
- **Color Coding**: 
  - Success: Green (#48bb78)
  - Warning/Error: Red (#c53030)
  - Info: Blue (#4299e1)
  - Neutral: Gray tones

### Layout Components
- **Highlight Boxes**: For important amounts (OTP, deposit amount, etc.)
- **Info Cards**: Structured transaction/account details
- **Status Badges**: Visual status indicators
- **Dividers**: Section separators
- **Footer**: Consistent branding and contact information

## 📬 Available Templates

### 1. OTP Email (`otpEmailTemplate`)

**Purpose**: Send one-time passwords for authentication

**Use Cases**:
- User registration
- Email verification
- Password reset

**Features**:
- Large, centered OTP display
- Expiry time warning
- Security reminder
- Context-specific messaging

**Data Required**:
```typescript
{
  otp: string
  type: 'registration' | 'verification' | 'password-reset'
  expiryMinutes: number  // default: 5
}
```

---

### 2. Deposit Success (`depositSuccessTemplate`)

**Purpose**: Confirm successful deposit

**Features**:
- Bold amount display with gradient
- Transaction details in info card
- Wallet breakdown (Gaming + ROI)
- Verification badge

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  transactionId: string
  gamingWallet: number
  roiWallet: number
  date: Date
}
```

---

### 3. Deposit Failed (`depositFailedTemplate`)

**Purpose**: Notify about failed deposit

**Features**:
- Clear error indication
- Failure reason display
- Support contact button
- Troubleshooting information

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  transactionId: string
  reason: string
  date: Date
}
```

---

### 4. Withdrawal Approved (`withdrawalApprovedTemplate`)

**Purpose**: Confirm withdrawal approval

**Features**:
- Success-themed green gradient
- Wallet address display
- Processing status badge
- Timeline expectation

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  transactionId: string
  walletAddress: string
  date: Date
}
```

---

### 5. Withdrawal Rejected (`withdrawalRejectedTemplate`)

**Purpose**: Notify about withdrawal rejection

**Features**:
- Error-themed red styling
- Clear rejection reason
- Fund return confirmation
- Support contact option

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  transactionId: string
  reason: string
  date: Date
}
```

---

### 6. ROI Credit (`roiCreditTemplate`)

**Purpose**: Notify about daily ROI earnings

**Features**:
- Blue investment-themed gradient
- Daily rate display
- Updated balance
- Monthly ROI information

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  dailyRate: number  // e.g., 0.00257 for 0.257%
  newBalance: number
  date: Date
}
```

---

### 7. Referral Bonus (`referralBonusTemplate`)

**Purpose**: Confirm referral commission earned

**Features**:
- Different styling for direct vs indirect
- Referrer name display
- Bonus percentage
- Program details

**Types**:
- **Direct**: 3% bonus, green theme
- **Indirect**: 1.5% bonus, blue theme

**Data Required**:
```typescript
{
  userName: string
  amount: number
  currency: string
  referralName: string
  bonusType: 'direct' | 'indirect'
  bonusPercentage: number
  date: Date
}
```

---

### 8. System Announcement (`systemAnnouncementTemplate`)

**Purpose**: Send platform-wide announcements

**Features**:
- Flexible content area
- Professional announcement styling
- Timestamp display
- Admin branding

**Data Required**:
```typescript
{
  userName: string
  title: string
  message: string
  date: Date
}
```

## 🔧 Usage

### In EmailService (OTP):
```typescript
import { otpEmailTemplate } from '../templates/emailTemplates'

const html = otpEmailTemplate('123456', 'registration', 5)
await sendEmail({ to, subject, html })
```

### In NotificationService (Auto):
All other templates are automatically used by the notification system based on `NotificationType`:

```typescript
await NotificationService.sendNotification(userId, {
  type: NotificationType.DEPOSIT_SUCCESS,
  data: {
    userName: 'John Doe',
    amount: 100,
    currency: 'USDT',
    transactionId: 'TX123456',
    gamingWalletAmount: 50,
    roiWalletAmount: 50,
    date: new Date()
  }
})
```

## 🎯 Testing

### Test OTP Email:
```bash
node test-sendgrid.js
```

### Test Other Templates:
Trigger actions in the app:
- Make a deposit → Receives deposit email
- Request withdrawal → Receives withdrawal email
- Earn ROI → Receives ROI credit email
- Refer a friend → Receives referral bonus email

### Preview Templates:
```bash
node preview-email-templates.js
```
This generates HTML files in `email-previews/` folder for visual inspection.

## 📱 Mobile Responsiveness

All templates are optimized for:
- **Desktop**: Full 600px width
- **Tablet**: Responsive scaling
- **Mobile**: Stacked layout, larger touch targets

Media queries adjust:
- Padding (30px → 20px)
- Font sizes (proportional scaling)
- Header size (32px → 24px)

## 🔐 Security Features

- **OTP Warnings**: Clear expiry time and security reminders
- **Transaction IDs**: Always displayed for reference
- **Wallet Addresses**: Full address display (with word-break)
- **Timestamps**: All actions timestamped
- **Support Links**: Easy access to help

## 🎨 Customization

### Colors
Edit `baseStyles` in `emailTemplates.ts`:
- Primary gradient: `#667eea` → `#764ba2`
- Success: `#48bb78`
- Error: `#c53030`
- Info: `#4299e1`

### Fonts
Currently using **Inter** via Google Fonts.
Change the import URL to use different fonts.

### Logo
Replace emoji `💎 W-Invest` with:
```html
<img src="https://your-domain.com/logo.png" alt="W-Invest" width="200">
```

### Footer
Edit footer section in `emailWrapper()` function.

## 📊 Best Practices

1. **Always provide all required data** - Missing data shows as "N/A" or defaults
2. **Use proper date objects** - For consistent formatting
3. **Include transaction IDs** - For user reference and support
4. **Test before deploying** - Use preview script to verify changes
5. **Keep branding consistent** - Use provided color scheme
6. **Mobile-first** - Always test on mobile devices

## 🆘 Support

For issues or customization requests:
- Email: support@winvest.com
- Documentation: See this file
- Code: `src/templates/emailTemplates.ts`

## 📝 Changelog

### Version 1.0.0 (Current)
- Initial release
- 8 professional email templates
- Mobile responsive design
- Consistent branding
- Security features
- Full integration with notification system

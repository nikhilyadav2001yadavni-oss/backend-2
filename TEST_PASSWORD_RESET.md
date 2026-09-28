# Test Password Reset Feature

## 🧪 Quick Test Guide

### Step 1: Reset Password

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/reset-password' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "winvest1@test.com"
}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Temporary password has been sent to your email. Please check your inbox and change your password after logging in.",
  "data": null
}
```

### Step 2: Check Email

1. Check the inbox for: `winvest1@test.com`
2. Look for email with subject: **"🔑 Password Reset - Temporary Password"**
3. Find the temporary password (8 characters with uppercase, lowercase, number, special char)
   - Example: `A7b@xK2!`, `P3#mQ8z$`

### Step 3: Login with Temporary Password

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "winvest1@test.com",
    "password": "YOUR_TEMPORARY_PASSWORD_HERE"
}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "...",
      "email": "winvest1@test.com",
      ...
    },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### Step 4: Change Password

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/change-password' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_ACCESS_TOKEN_HERE' \
--data-raw '{
    "oldPassword": "YOUR_TEMPORARY_PASSWORD_HERE",
    "newPassword": "NewSecurePassword123!"
}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

### Step 5: Verify New Password Works

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/login' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "winvest1@test.com",
    "password": "NewSecurePassword123!"
}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    ...
  }
}
```

---

## ❌ Error Scenarios

### Test 1: Missing Email

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/reset-password' \
--header 'Content-Type: application/json' \
--data-raw '{}'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Email is required",
  "data": null
}
```

### Test 2: Non-Existent Email

**Request:**
```bash
curl --location 'http://localhost:3001/api/v1/user/reset-password' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "nonexistent@test.com"
}'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "User not found with this email address",
  "data": null
}
}
```

---

## 📧 Email Preview

After requesting password reset, you should receive an email like this:

**Subject:** 🔑 Password Reset - Temporary Password

**Content:**
```
💎 W-Invest
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑

Password Reset Request

Hi [User Name],

You requested to reset your password. We've generated a temporary password for you.

┌─────────────────────────────────────┐
│  Your Temporary Password            │
│                                     │
│        A1B2C3D4                     │
└─────────────────────────────────────┘

⚠️ Important Security Information:
• Use this temporary password to log in to your account
• Change your password immediately after logging in
• This password is valid until you change it
• Never share this password with anyone

How to Reset Your Password:
1. Log in to your W-Invest account using the temporary password above
2. Go to your profile settings
3. Select "Change Password"
4. Enter the temporary password and your new password
5. Save changes

🚨 Didn't request this?
If you didn't request a password reset, please contact our support team immediately.
Your account security may be at risk.

[Contact Support]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Password reset requested on [Date & Time]
For your security, please change this password immediately after logging in.

W-Invest Platform
Your trusted investment partner

📧 Need help? Contact us at support@winvest.com
© 2026 W-Invest. All rights reserved.
```

---

## 🔍 What to Check

### In Console Logs:
```
✅ Password reset successful for user: winvest1@test.com
   Temporary password sent via email
```

### In SendGrid Activity:
1. Go to: https://app.sendgrid.com/email_activity
2. Search for recipient email
3. Verify email was delivered
4. Check open/click rates

### In Database:
```javascript
// User's password field should be updated
db.users.findOne({ email: "winvest1@test.com" })

// Output should show:
{
  _id: ObjectId("..."),
  email: "winvest1@test.com",
  password: "$2b$10$[new_hashed_password]", // Different from before
  ...
}
```

---

## 🎯 Success Criteria

✅ API returns 200 status
✅ Success message returned
✅ Email sent to user
✅ Email contains temporary password
✅ Email has beautiful template
✅ Password updated in database
✅ User can login with temporary password
✅ User can change password
✅ New password works for login
✅ Console logs show success
✅ SendGrid shows email delivered

---

## 🐛 Troubleshooting

### Email Not Received?
1. Check spam/junk folder
2. Verify email exists in database
3. Check SendGrid activity feed
4. Verify sender email is verified in SendGrid
5. Check console logs for errors

### Can't Login with Temporary Password?
1. Verify you copied password correctly (case-sensitive)
2. Check if password was actually updated in database
3. Try requesting reset again
4. Check console logs for errors

### Rate Limit Error?
- Wait 1 minute and try again
- Rate limiter prevents abuse
- Normal behavior for security

---

## 📊 Performance Benchmarks

**Expected Response Times:**
- Password reset request: ~1-2 seconds
- Email delivery: ~1-3 seconds
- Total user wait: ~2-5 seconds

**Database Operations:**
- User lookup: ~10-50ms
- Password update: ~50-100ms
- Password hashing: ~100-200ms

---

## ✅ Complete Test Checklist

- [ ] Request password reset with valid email
- [ ] Receive email with temporary password
- [ ] Email has beautiful template
- [ ] Email contains security instructions
- [ ] Login with temporary password succeeds
- [ ] Change password succeeds
- [ ] Login with new password succeeds
- [ ] Old password no longer works
- [ ] Test with invalid email (should fail)
- [ ] Test with missing email (should fail)
- [ ] Verify console logs
- [ ] Verify SendGrid delivery
- [ ] Verify database update

---

**All tests passing = Feature ready for production! 🚀**

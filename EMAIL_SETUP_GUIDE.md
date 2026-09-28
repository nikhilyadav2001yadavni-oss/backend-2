# SendGrid Email Setup Guide

**Official Documentation:** https://app.sendgrid.com/guide/integrate/langs/nodejs

## Important: Twilio ≠ SendGrid

⚠️ **Common Mistake:**
- **Twilio** = SMS/Voice service (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) 
- **SendGrid** = Email service (`SENDGRID_API_KEY`)

❌ You CANNOT use Twilio credentials for SendGrid emails  
✅ You MUST get a separate SendGrid API key

---

## Quick Setup (3 Steps)

Follow the [official SendGrid Node.js guide](https://app.sendgrid.com/guide/integrate/langs/nodejs):

### Step 1: Create SendGrid Account & Get API Key

1. **Sign up** (if you don't have an account)
   - Go to: https://signup.sendgrid.com/
   - Free tier: 100 emails/day

2. **Generate API Key**
   - Dashboard: https://app.sendgrid.com/
   - Navigate: **Settings** → **API Keys** → **Create API Key**
   - Name: `W-Invest Backend`
   - Permission: **Full Access** or **Mail Send** (minimum)
   - Click **Create & View**
   - **⚠️ COPY THE KEY NOW** (starts with `SG.`) - shown only once!

### Step 2: Verify Sender Email

**Required** - SendGrid blocks emails from unverified senders

1. Go to: **Settings** → **Sender Authentication** → **Verify a Single Sender**
2. Add your email (e.g., `noreply@yourdomain.com` or personal email for testing)
3. Check your inbox → Click verification link
4. Wait for "Verified" status in SendGrid dashboard

### Step 3: Add to Environment Variables

Add these to your `.env.development` file:

```env
# SendGrid Configuration (REQUIRED)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=your-verified-email@domain.com
SENDGRID_FROM_NAME=W-Invest
```

**Then test the setup:**
```bash
# Quick test (sends a test email)
node test-sendgrid.js

# Or start the server
npm run dev
```

---

## Testing Your Setup

### Method 1: Quick Test Script (Recommended)

Run the test script to verify SendGrid is working:

```bash
node test-sendgrid.js
```

**Expected output:**
```
📧 Sending test email...
   To: your-email@domain.com
   From: W-Invest <your-email@domain.com>
   Subject: SendGrid Test Email - W-Invest

✅ Email sent successfully!

Check your inbox (and spam folder) for the test email.
If you see this message, your SendGrid setup is working correctly! 🎉
```

### Method 2: Check Server Logs

Start your server and check logs:

```bash
npm run dev
```

You should see:
```
🔧 Environment: development (.env.development loaded)
✅ SendGrid API key configured
✅ Firebase Admin SDK initialized successfully
Server is running on port 3001
```

❌ If you see errors, verify:
- API key starts with `SG.`
- Sender email is verified in SendGrid
- Environment variables are loaded correctly

### Method 3: Test OTP API

```bash
curl --location 'http://localhost:3001/api/v1/user/send-otp' \
--header 'Content-Type: application/json' \
--data '{
    "email": "test@example.com",
    "type": "registration"
}'
```

### Method 4: Monitor in SendGrid Dashboard

- View sent emails: https://app.sendgrid.com/email_activity
- Check delivery status, opens, clicks
- Review bounce/spam reports

---

## Common Issues & Solutions

### ❌ "API key not found"
**Solution:** Add `SENDGRID_API_KEY` to `.env.development`

### ❌ "API key does not start with SG."
**Solution:** You're using wrong credentials. Get proper SendGrid API key from:  
https://app.sendgrid.com/settings/api_keys

### ❌ "Authorization grant is invalid"
**Solution:** Your API key is invalid/expired. Generate a new one.

### ❌ "Does not contain a valid address"
**Solution:** Sender email not verified. Verify at:  
https://app.sendgrid.com/settings/sender_auth

### ❌ Email not received
**Checklist:**
1. Check spam/junk folder
2. Verify sender email in SendGrid
3. Check SendGrid Activity Feed: https://app.sendgrid.com/email_activity
4. Ensure API key has "Mail Send" permission

---

## Production Recommendations

### 1. Domain Authentication
Instead of single sender verification, authenticate your entire domain:
- Better deliverability rates
- Removes "via sendgrid.net" from emails
- Professional appearance
- Guide: https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication

### 2. Upgrade Plan
- **Free:** 100 emails/day (good for testing)
- **Essentials:** $19.95/month - 50,000 emails/month
- **Pro:** $89.95/month - 100,000 emails/month + advanced features

### 3. Email Best Practices
- Use clear, descriptive subject lines
- Include plain text version (auto-generated in our code)
- Add unsubscribe link for marketing emails
- Monitor bounce rates and spam reports
- Keep your sender reputation high

---

## Additional Resources

- **Official Node.js Guide:** https://app.sendgrid.com/guide/integrate/langs/nodejs
- **API Documentation:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Getting Started:** https://docs.sendgrid.com/for-developers/sending-email/api-getting-started
- **Sender Authentication:** https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- **Email Activity Feed:** https://app.sendgrid.com/email_activity

---

## Need Help?

If issues persist:
1. Check server logs for detailed error messages
2. Review SendGrid Activity Feed
3. Verify all configuration steps above
4. Contact SendGrid support: https://support.sendgrid.com/

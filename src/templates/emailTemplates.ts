/**
 * Email Templates for W-Invest
 * Professional, responsive email templates for all notification types
 */

// Base styles used across all email templates
const baseStyles = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f7fa;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #1a202c;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .message {
            font-size: 15px;
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        
        .highlight-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
        }
        
        .highlight-box .label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        
        .highlight-box .value {
            color: #ffffff;
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 3px;
        }
        
        .info-card {
            background-color: #f7fafc;
            border-left: 4px solid #667eea;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .info-row:last-child {
            border-bottom: none;
        }
        
        .info-label {
            color: #718096;
            font-size: 14px;
            font-weight: 500;
        }
        
        .info-value {
            color: #1a202c;
            font-size: 14px;
            font-weight: 600;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .success-badge {
            background-color: #c6f6d5;
            color: #22543d;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            margin: 10px 0;
        }
        
        .warning-badge {
            background-color: #fed7d7;
            color: #742a2a;
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            margin: 10px 0;
        }
        
        .alert-box {
            background-color: #fff5f5;
            border: 1px solid #fc8181;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .alert-box p {
            margin: 0;
            color: #742a2a;
            font-size: 14px;
        }
        
        .footer {
            background-color: #2d3748;
            padding: 30px;
            text-align: center;
        }
        
        .footer p {
            color: #a0aec0;
            font-size: 13px;
            margin: 5px 0;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        
        .divider {
            height: 1px;
            background-color: #e2e8f0;
            margin: 25px 0;
        }
        
        @media only screen and (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
`

// Email wrapper
const emailWrapper = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>W-Invest Notification</title>
    ${baseStyles}
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>💎 W-Invest</h1>
        </div>
        ${content}
        <div class="footer">
            <p style="font-weight: 600; color: #cbd5e0; margin-bottom: 10px;">W-Invest Platform</p>
            <p>Your trusted investment partner</p>
            <div class="divider" style="margin: 20px 0;"></div>
            <p>📧 Need help? Contact us at <a href="mailto:support@winvest.com">support@winvest.com</a></p>
            <p style="margin-top: 15px;">© ${new Date().getFullYear()} W-Invest. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`

// OTP Email Template
export const otpEmailTemplate = (otp: string, type: 'registration' | 'verification' | 'password-reset', expiryMinutes: number = 5): string => {
    const typeInfo = {
        registration: {
            title: 'Complete Your Registration',
            description: 'Welcome to W-Invest! Please verify your email address to complete your registration.',
            icon: '🎉'
        },
        verification: {
            title: 'Verify Your Email',
            description: 'We need to verify your email address to secure your account.',
            icon: '🔐'
        },
        'password-reset': {
            title: 'Reset Your Password',
            description: 'You requested to reset your password. Use the OTP below to proceed.',
            icon: '🔑'
        }
    }

    const info = typeInfo[type]

    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                ${info.icon}
            </div>
            
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 10px;">${info.title}</h2>
            
            <p class="message" style="text-align: center;">
                ${info.description}
            </p>
            
            <div class="highlight-box">
                <div class="label">Your One-Time Password</div>
                <div class="value">${otp}</div>
            </div>
            
            <div class="alert-box" style="background-color: #fffaf0; border-color: #f6ad55;">
                <p style="color: #744210;">
                    ⏱️ This OTP will expire in <strong>${expiryMinutes} minutes</strong>. 
                    Please do not share this code with anyone.
                </p>
            </div>
            
            <p class="message">
                If you didn't request this OTP, please ignore this email or contact our support team immediately.
            </p>
            
            <p class="message" style="font-size: 14px; color: #718096; text-align: center; margin-top: 10px;">
                If you do not receive the email, please check your spam or junk folder.
            </p>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #718096; text-align: center; margin-top: 20px;">
                For security reasons, never share your OTP with anyone, including W-Invest staff.
            </p>
        </div>
    `

    return emailWrapper(content)
}

// Deposit Success Email Template
export const depositSuccessTemplate = (data: {
    userName: string
    amount: number
    currency: string
    transactionId: string
    gamingWallet: number
    roiWallet: number
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                💰
            </div>
            
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 10px;">Deposit Successful!</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                Great news! Your deposit has been successfully processed and credited to your account.
            </p>
            
            <div class="highlight-box">
                <div class="label">Deposit Amount</div>
                <div class="value">${data.currency} ${data.amount.toFixed(2)}</div>
            </div>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">Transaction Details</h3>
                <div class="info-row">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${data.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date & Time</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Gaming Wallet</span>
                    <span class="info-value" style="color: #48bb78;">${data.currency} ${data.gamingWallet.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ROI Wallet</span>
                    <span class="info-value" style="color: #4299e1;">${data.currency} ${data.roiWallet.toFixed(2)}</span>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <span class="success-badge">✓ Verified Transaction</span>
            </div>
            
            <p class="message" style="text-align: center;">
                Your funds are now available for gaming and ROI investment!
            </p>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #718096; text-align: center;">
                If you have any questions, feel free to contact our support team.
            </p>
        </div>
    `

    return emailWrapper(content)
}

// Deposit Failed Email Template
export const depositFailedTemplate = (data: {
    userName: string
    amount: number
    currency: string
    transactionId: string
    reason: string
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                ⚠️
            </div>
            
            <h2 style="color: #c53030; text-align: center; margin-bottom: 10px;">Deposit Failed</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                We're sorry, but your recent deposit attempt could not be completed.
            </p>
            
            <div class="info-card" style="border-left-color: #fc8181;">
                <h3 style="margin-top: 0; color: #c53030; font-size: 16px;">Transaction Details</h3>
                <div class="info-row">
                    <span class="info-label">Amount</span>
                    <span class="info-value">${data.currency} ${data.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${data.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date & Time</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Reason</span>
                    <span class="info-value" style="color: #c53030;">${data.reason}</span>
                </div>
            </div>
            
            <div class="alert-box">
                <p>
                    <strong>What should I do?</strong><br>
                    Please try again or contact our support team if the issue persists.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="mailto:support@winvest.com" class="button">Contact Support</a>
            </div>
        </div>
    `

    return emailWrapper(content)
}

// Withdrawal Approved Email Template
export const withdrawalApprovedTemplate = (data: {
    userName: string
    amount: number
    currency: string
    transactionId: string
    walletAddress: string
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                ✅
            </div>
            
            <h2 style="color: #22543d; text-align: center; margin-bottom: 10px;">Withdrawal Approved!</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                Excellent news! Your withdrawal request has been approved and is being processed.
            </p>
            
            <div class="highlight-box" style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);">
                <div class="label">Withdrawal Amount</div>
                <div class="value">${data.currency} ${data.amount.toFixed(2)}</div>
            </div>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">Withdrawal Details</h3>
                <div class="info-row">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${data.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date & Time</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Wallet Address</span>
                    <span class="info-value" style="font-size: 12px; word-break: break-all;">${data.walletAddress}</span>
                </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <span class="success-badge">✓ Processing Your Withdrawal</span>
            </div>
            
            <p class="message" style="text-align: center;">
                Your funds will be transferred to your wallet shortly. Please allow up to 24 hours for processing.
            </p>
        </div>
    `

    return emailWrapper(content)
}

// Withdrawal Rejected Email Template
export const withdrawalRejectedTemplate = (data: {
    userName: string
    amount: number
    currency: string
    transactionId: string
    reason: string
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                ❌
            </div>
            
            <h2 style="color: #c53030; text-align: center; margin-bottom: 10px;">Withdrawal Rejected</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                Unfortunately, your withdrawal request has been rejected. Please review the details below.
            </p>
            
            <div class="info-card" style="border-left-color: #fc8181;">
                <h3 style="margin-top: 0; color: #c53030; font-size: 16px;">Withdrawal Details</h3>
                <div class="info-row">
                    <span class="info-label">Amount</span>
                    <span class="info-value">${data.currency} ${data.amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Transaction ID</span>
                    <span class="info-value">${data.transactionId}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date & Time</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Rejection Reason</span>
                    <span class="info-value" style="color: #c53030;">${data.reason}</span>
                </div>
            </div>
            
            <div class="alert-box">
                <p>
                    <strong>What happens next?</strong><br>
                    The requested amount has been returned to your account. If you believe this is an error, please contact our support team.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="mailto:support@winvest.com" class="button">Contact Support</a>
            </div>
        </div>
    `

    return emailWrapper(content)
}

// ROI Credit Email Template
export const roiCreditTemplate = (data: {
    userName: string
    amount: number
    currency: string
    dailyRate: number
    newBalance: number
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                📈
            </div>
            
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 10px;">ROI Earnings Credited!</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                Your daily ROI earnings have been calculated and credited to your ROI wallet.
            </p>
            
            <div class="highlight-box" style="background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);">
                <div class="label">Today's ROI Earnings</div>
                <div class="value">${data.currency} ${data.amount.toFixed(2)}</div>
            </div>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">ROI Details</h3>
                <div class="info-row">
                    <span class="info-label">Daily Rate</span>
                    <span class="info-value">${(data.dailyRate * 100).toFixed(3)}%</span>
                </div>
                <div class="info-row">
                    <span class="info-label">New ROI Balance</span>
                    <span class="info-value" style="color: #4299e1;">${data.currency} ${data.newBalance.toFixed(2)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Credited On</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; color: #2d3748; font-size: 14px;">
                    🎯 <strong>Monthly ROI: 8%</strong> • Compounded Daily
                </p>
            </div>
            
            <p class="message" style="text-align: center;">
                Keep growing your wealth with W-Invest's consistent ROI returns!
            </p>
        </div>
    `

    return emailWrapper(content)
}

// Referral Bonus Email Template
export const referralBonusTemplate = (data: {
    userName: string
    amount: number
    currency: string
    referralName: string
    bonusType: 'direct' | 'indirect'
    bonusPercentage: number
    date: Date
}): string => {
    const bonusInfo = {
        direct: { icon: '👥', label: 'Direct Referral Bonus', color: '#48bb78' },
        indirect: { icon: '🌐', label: 'Indirect Referral Bonus', color: '#4299e1' }
    }

    const info = bonusInfo[data.bonusType]

    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                ${info.icon}
            </div>
            
            <h2 style="color: ${info.color}; text-align: center; margin-bottom: 10px;">${info.label}!</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                Congratulations! You've earned a referral bonus from your network.
            </p>
            
            <div class="highlight-box" style="background: linear-gradient(135deg, ${info.color} 0%, ${info.color}dd 100%);">
                <div class="label">Bonus Amount</div>
                <div class="value">${data.currency} ${data.amount.toFixed(2)}</div>
            </div>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">Bonus Details</h3>
                <div class="info-row">
                    <span class="info-label">Bonus Type</span>
                    <span class="info-value">${data.bonusType === 'direct' ? 'Direct' : 'Indirect'} (${data.bonusPercentage}%)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">From User</span>
                    <span class="info-value">${data.referralName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Credited On</span>
                    <span class="info-value">${data.date.toLocaleString()}</span>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, #fef5e7 0%, #ffeaa7 100%); border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; color: #744210; font-size: 14px;">
                    🎁 Keep referring friends to earn more bonuses!<br>
                    <strong>Direct: 3%</strong> • <strong>Indirect: 1.5%</strong>
                </p>
            </div>
            
            <p class="message" style="text-align: center;">
                Thank you for growing the W-Invest community!
            </p>
        </div>
    `

    return emailWrapper(content)
}

// System Announcement Email Template
export const systemAnnouncementTemplate = (data: {
    userName: string
    title: string
    message: string
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                📢
            </div>
            
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 10px;">${data.title}</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <div style="background-color: #f7fafc; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <p style="color: #2d3748; font-size: 15px; line-height: 1.7; margin: 0;">
                    ${data.message}
                </p>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #718096; text-align: center;">
                Announcement sent on ${data.date.toLocaleString()}
            </p>
        </div>
    `

    return emailWrapper(content)
}

// Temporary Password Email Template
export const temporaryPasswordTemplate = (data: {
    userName: string
    temporaryPassword: string
    date: Date
}): string => {
    const content = `
        <div class="content">
            <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">
                🔑
            </div>
            
            <h2 style="color: #1a202c; text-align: center; margin-bottom: 10px;">Password Reset Request</h2>
            
            <p class="greeting">Hi ${data.userName},</p>
            
            <p class="message">
                You requested to reset your password. We've generated a temporary password for you.
            </p>
            
            <div class="highlight-box">
                <div class="label">Your Temporary Password</div>
                <div class="value" style="font-size: 28px; letter-spacing: 2px;">${data.temporaryPassword}</div>
            </div>
            
            <div class="alert-box" style="background-color: #fffaf0; border-color: #f6ad55;">
                <p style="color: #744210;">
                    <strong>Important Security Information:</strong><br>
                    • This password contains uppercase, lowercase, number, and special character<br>
                    • Use this temporary password to log in to your account<br>
                    • Change your password immediately after logging in<br>
                    • This password is valid until you change it<br>
                    • Never share this password with anyone
                </p>
            </div>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #1a202c; font-size: 16px;">How to Reset Your Password</h3>
                <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.6;">
                    1. Log in to your W-Invest account using the temporary password above<br>
                    2. Go to your profile settings<br>
                    3. Select "Change Password"<br>
                    4. Enter the temporary password and your new password<br>
                    5. Save changes
                </p>
            </div>
            
            <div class="alert-box">
                <p>
                    <strong>Didn't request this?</strong><br>
                    If you didn't request a password reset, please contact our support team immediately. 
                    Your account security may be at risk.
                </p>
            </div>
            
            <div style="text-align: center;">
                <a href="mailto:support@winvest.com" class="button">Contact Support</a>
            </div>
            
            <div class="divider"></div>
            
            <p style="font-size: 13px; color: #718096; text-align: center;">
                Password reset requested on ${data.date.toLocaleString()}<br>
                For your security, please change this password immediately after logging in.
            </p>
        </div>
    `

    return emailWrapper(content)
}

export default {
    otpEmailTemplate,
    depositSuccessTemplate,
    depositFailedTemplate,
    withdrawalApprovedTemplate,
    withdrawalRejectedTemplate,
    roiCreditTemplate,
    referralBonusTemplate,
    systemAnnouncementTemplate,
    temporaryPasswordTemplate
}

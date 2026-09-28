/**
 * SendGrid Test Script
 * Following: https://app.sendgrid.com/guide/integrate/langs/nodejs
 * 
 * This is the minimum code needed to send an email with SendGrid
 * Run this to verify your SendGrid setup is working
 * 
 * Usage:
 *   node test-sendgrid.js
 */

require('dotenv').config({ path: './.env.development' })
const sgMail = require('@sendgrid/mail')

// Check if API key is set
if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ Error: SENDGRID_API_KEY not found in environment variables')
    console.error('Add it to your .env.development file:')
    console.error('SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx')
    process.exit(1)
}

// Set API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// Prepare test email
const msg = {
    to: process.env.SENDGRID_FROM_EMAIL || 'test@example.com', // Send to yourself for testing
    from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@winvest.com',
        name: process.env.SENDGRID_FROM_NAME || 'W-Invest',
    },
    subject: 'SendGrid Test Email - W-Invest',
    text: 'This is a test email from W-Invest backend to verify SendGrid integration.',
    html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0056b3;">SendGrid Test Email</h1>
            <p>This is a test email from <strong>W-Invest Backend</strong>.</p>
            <p>If you received this, your SendGrid integration is working correctly! ✅</p>
            <hr style="margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                Sent via SendGrid<br>
                Time: ${new Date().toLocaleString()}
            </p>
        </div>
    `,
}

// Send email
console.log('📧 Sending test email...')
console.log(`   To: ${msg.to}`)
console.log(`   From: ${msg.from.name} <${msg.from.email}>`)
console.log(`   Subject: ${msg.subject}`)
console.log('')

sgMail
    .send(msg)
    .then(() => {
        console.log('✅ Email sent successfully!')
        console.log('')
        console.log('Check your inbox (and spam folder) for the test email.')
        console.log('Also check SendGrid Activity Feed:')
        console.log('https://app.sendgrid.com/email_activity')
        console.log('')
        console.log('If you see this message, your SendGrid setup is working correctly! 🎉')
    })
    .catch((error) => {
        console.error('❌ Error sending email:')
        console.error('')
        
        if (error.response) {
            const { body } = error.response
            
            if (body.errors) {
                body.errors.forEach((err) => {
                    console.error(`   ${err.message}`)
                    
                    if (err.message.includes('authorization') || err.message.includes('invalid')) {
                        console.error('')
                        console.error('   Problem: Invalid or expired API key')
                        console.error('   Solution:')
                        console.error('   1. Go to: https://app.sendgrid.com/settings/api_keys')
                        console.error('   2. Create a new API key with "Mail Send" permission')
                        console.error('   3. Copy the key (starts with "SG.")')
                        console.error('   4. Update SENDGRID_API_KEY in .env.development')
                    } else if (err.message.includes('Sender Identity') || err.field === 'from') {
                        console.error('')
                        console.error('   Problem: Sender email not verified')
                        console.error('   Solution:')
                        console.error('   1. Go to: https://app.sendgrid.com/settings/sender_auth')
                        console.error('   2. Click "Verify a Single Sender"')
                        console.error('   3. Add your email and verify it')
                        console.error('   4. Update SENDGRID_FROM_EMAIL in .env.development')
                    }
                })
            } else {
                console.error(JSON.stringify(body, null, 2))
            }
        } else {
            console.error(error.message)
        }
        
        console.error('')
        console.error('Need help? See EMAIL_SETUP_GUIDE.md')
        process.exit(1)
    })

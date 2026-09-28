import axios from 'axios'
import * as nodemailer from 'nodemailer'
import { Transporter } from 'nodemailer'
import { otpEmailTemplate } from '../templates/emailTemplates'

/**
 * Email Service
 *
 * Primary options:
 *   - BREVO_API_KEY (preferred Brevo email API)
 *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (fallback)
 *
 * You can send via Brevo API key instead of SMTP when BREVO_API_KEY is set.
 */

const BREVO_API_KEY = process.env.BREVO_API_KEY || ''
const BREVO_API_URL = process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email'
const SMTP_HOST = process.env.SMTP_HOST || process.env.MAIL_HOST || ''
const SMTP_PORT = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '465', 10)
const SMTP_USER = process.env.SMTP_USER || process.env.MAIL_USERNAME || ''
const SMTP_PASS = process.env.SMTP_PASS || process.env.MAIL_PASSWORD || ''
const SMTP_ENCRYPTION = (
    process.env.SMTP_ENCRYPTION || process.env.MAIL_ENCRYPTION || 'tls'
).toLowerCase()

// Port 465 = implicit TLS (secure: true). Port 587 = STARTTLS (secure: false).
const SECURE = SMTP_ENCRYPTION === 'ssl' || SMTP_PORT === 465
const SMTP_VERIFY = process.env.SMTP_VERIFY !== 'false'

const FROM_ADDRESS =
    process.env.SMTP_FROM || process.env.MAIL_FROM_ADDRESS || SMTP_USER || 'noreply@winvest.com'
const FROM_NAME = process.env.SMTP_FROM_NAME || process.env.MAIL_FROM_NAME || 'W-Invest'

let transporter: Transporter | null = null

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SECURE,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
        connectionTimeout: 30_000,
        greetingTimeout: 30_000,
        socketTimeout: 60_000,
        // Dynadot shared host may use certs that fail strict verification.
        tls: { rejectUnauthorized: false },
    })

    if (SMTP_VERIFY) {
        transporter
            .verify()
            .then(() =>
                console.log(
                    `✅ SMTP transport ready (${SMTP_HOST}:${SMTP_PORT}, from=${FROM_ADDRESS}, secure=${SECURE})`
                )
            )
            .catch((err: any) =>
                console.error(
                    '❌ SMTP transport verify failed:',
                    err?.message || err,
                    `\n   Config used: ${SMTP_HOST}:${SMTP_PORT} secure=${SECURE}`,
                    '\n   "Connection timeout" = VPS firewall is blocking outbound SMTP.',
                    '\n   Ask your hosting provider to allow outbound port 465 (or 587).'
                )
            )
    } else {
        console.log(
            `📧 SMTP transport configured (${SMTP_HOST}:${SMTP_PORT}, verify skipped)`
        )
    }
} else {
    if (!BREVO_API_KEY) {
        console.error(
            '❌ SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.'
        )
    }
}

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

/**
 * Send email using SMTP (Nodemailer).
 *
 * @param options - Email options (to, subject, html, text)
 * @returns Promise<boolean> - Success status
 */
const sendEmailViaBrevo = async (options: EmailOptions): Promise<boolean> => {
    try {
        const payload = {
            sender: {
                name: FROM_NAME,
                email: FROM_ADDRESS,
            },
            to: [
                {
                    email: options.to,
                },
            ],
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        }

        const response = await axios.post(BREVO_API_URL, payload, {
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
            },
        })

        if (response.status >= 200 && response.status < 300) {
            console.log(`✅ Brevo email sent to ${options.to} (messageId=${response.data.messageId || 'unknown'})`)
            return true
        }

        console.error(`❌ Brevo API returned status ${response.status}`)
        return false
    } catch (error: any) {
        console.error('❌ Failed to send email via Brevo API to', options.to)
        console.error('   Error:', error?.message || error)
        if (error?.response) {
            console.error('   Brevo response:', error.response.data || error.response)
        }
        return false
    }
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
    if (BREVO_API_KEY) {
        return sendEmailViaBrevo(options)
    }

    if (!transporter) {
        console.error('❌ Cannot send email: SMTP transporter is not initialised.')
        return false
    }

    try {
        const info = await transporter.sendMail({
            from: { name: FROM_NAME, address: FROM_ADDRESS },
            to: options.to,
            subject: options.subject,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
            html: options.html,
        })

        console.log(`✅ Email sent to ${options.to} (messageId=${info.messageId})`)
        console.log(`   Subject: ${options.subject}`)
        return true
    } catch (error: any) {
        console.error('❌ Failed to send email to', options.to)
        console.error('   Error:', error?.message || error)
        if (error?.response) console.error('   SMTP response:', error.response)
        return false
    }
}

/**
 * Send OTP email
 * @param to - Recipient email
 * @param otp - OTP code
 * @param type - OTP type (registration, verification, password-reset)
 * @returns Promise<boolean> - Success status
 */
export const sendOtpEmail = async (
    to: string,
    otp: string,
    type: 'registration' | 'verification' | 'password-reset'
): Promise<boolean> => {
    const typeLabels: { [key: string]: string } = {
        registration: 'Registration',
        verification: 'Email Verification',
        'password-reset': 'Password Reset',
    }

    const subject = `W-Invest OTP for ${typeLabels[type]}`
    const html = otpEmailTemplate(otp, type, 5)

    return sendEmail({ to, subject, html })
}

// ---------------------------------------------------------------------------
// Mobile OTP / SMS — DISABLED
// ---------------------------------------------------------------------------
// Mobile OTP verification (2FA / registration / login) has been removed.
// The previous SMS-OTP stub is commented out below; restore it only if SMS
// verification is brought back.
// ---------------------------------------------------------------------------
//
// /** Default mobile OTP used until a real SMS provider is wired up. */
// export const PHONE_DEFAULT_OTP = '123456'
//
// export const sendOtpSms = async (
//     phone: string,
//     _otp: string,
//     type: 'registration' | 'verification' | 'password-reset'
// ): Promise<boolean> => {
//     // Stub: replace this block with real SMS gateway integration.
//     // Always sends PHONE_DEFAULT_OTP until SMS provider is configured.
//     console.log(`📱 [SMS STUB] OTP for ${type} → Phone: ${phone}, OTP: ${PHONE_DEFAULT_OTP}`)
//     return true
// }

export default {
    sendEmail,
    sendOtpEmail,
}

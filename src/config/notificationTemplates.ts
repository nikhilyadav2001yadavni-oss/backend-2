import { NotificationType, NotificationChannel } from '../models/NotificationModel'
import {
    depositSuccessTemplate,
    depositFailedTemplate,
    withdrawalApprovedTemplate,
    withdrawalRejectedTemplate,
    roiCreditTemplate,
    referralBonusTemplate,
    systemAnnouncementTemplate
} from '../templates/emailTemplates'

export interface NotificationTemplate {
    type: NotificationType
    channels: NotificationChannel[]
    title: (data: any) => string
    message: (data: any) => string
    emailSubject?: (data: any) => string
    emailBody?: (data: any) => string
    smsBody?: (data: any) => string
}

export const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
    [NotificationType.DEPOSIT_SUCCESS]: {
        type: NotificationType.DEPOSIT_SUCCESS,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '💰 Deposit Successful',
        message: (data) => `Your deposit of ${data.amount} ${data.currency} has been successfully credited to your wallet.`,
        emailSubject: (data) => `✅ Deposit Successful - ${data.amount} ${data.currency}`,
        emailBody: (data) => depositSuccessTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            transactionId: data.transactionId,
            gamingWallet: data.gamingWalletAmount || 0,
            roiWallet: data.roiWalletAmount || 0,
            date: data.date || new Date()
        }),
        smsBody: (data) => `W-Invest: Your deposit of ${data.amount} ${data.currency} is successful. Transaction ID: ${data.transactionId}`,
    },

    [NotificationType.DEPOSIT_FAILED]: {
        type: NotificationType.DEPOSIT_FAILED,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '❌ Deposit Failed',
        message: (data) => `Your deposit of ${data.amount} ${data.currency} failed. Reason: ${data.reason}`,
        emailSubject: (data) => `❌ Deposit Failed - ${data.amount} ${data.currency}`,
        emailBody: (data) => depositFailedTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            transactionId: data.transactionId,
            reason: data.reason || 'Verification failed',
            date: data.date || new Date()
        }),
    },

    [NotificationType.WITHDRAWAL_REQUEST]: {
        type: NotificationType.WITHDRAWAL_REQUEST,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        title: (data) => '📤 Withdrawal Request Submitted',
        message: (data) => `Your withdrawal request of ${data.amount} ${data.currency} is being processed.`,
        emailSubject: (data) => `Withdrawal Request Submitted - ${data.amount} ${data.currency}`,
        emailBody: (data) => `
            <h2>Withdrawal Request Submitted</h2>
            <p>Dear ${data.userName},</p>
            <p>Your withdrawal request has been received and is being processed.</p>
            <ul>
                <li><strong>Amount:</strong> ${data.amount} ${data.currency}</li>
                <li><strong>Transaction ID:</strong> ${data.transactionId}</li>
                <li><strong>Withdrawal Address:</strong> ${data.withdrawalAddress}</li>
                <li><strong>Network Fee:</strong> ${data.networkFee} ${data.currency}</li>
            </ul>
            <p>You will be notified once the withdrawal is processed.</p>
        `,
    },

    [NotificationType.WITHDRAWAL_APPROVED]: {
        type: NotificationType.WITHDRAWAL_APPROVED,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '✅ Withdrawal Approved',
        message: (data) => `Your withdrawal of ${data.amount} ${data.currency} has been approved and sent.`,
        emailSubject: (data) => `✅ Withdrawal Approved - ${data.amount} ${data.currency}`,
        emailBody: (data) => withdrawalApprovedTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            transactionId: data.transactionId,
            walletAddress: data.withdrawalAddress || data.walletAddress || 'N/A',
            date: data.date || new Date()
        }),
        smsBody: (data) => `W-Invest: Your withdrawal of ${data.amount} ${data.currency} has been sent. TxHash: ${data.transactionHash}`,
    },

    [NotificationType.WITHDRAWAL_REJECTED]: {
        type: NotificationType.WITHDRAWAL_REJECTED,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '❌ Withdrawal Rejected',
        message: (data) => `Your withdrawal request of ${data.amount} ${data.currency} was rejected. Reason: ${data.reason}`,
        emailSubject: (data) => `❌ Withdrawal Rejected - ${data.amount} ${data.currency}`,
        emailBody: (data) => withdrawalRejectedTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            transactionId: data.transactionId,
            reason: data.reason || 'Not specified',
            date: data.date || new Date()
        }),
    },

    [NotificationType.GAME_WIN]: {
        type: NotificationType.GAME_WIN,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '🎉 You Won!',
        message: (data) => `Congratulations! You won ${data.amount} ${data.currency} in ${data.gameName}.`,
    },

    [NotificationType.GAME_LOSE]: {
        type: NotificationType.GAME_LOSE,
        channels: [NotificationChannel.IN_APP],
        title: (data) => '😔 Better luck next time',
        message: (data) => `You lost ${data.amount} ${data.currency} in ${data.gameName}. Try again!`,
    },

    [NotificationType.ROI_CREDIT]: {
        type: NotificationType.ROI_CREDIT,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '💎 ROI Credited',
        message: (data) => `${data.amount} ${data.currency} ROI has been credited to your wallet.`,
        emailSubject: (data) => `📈 ROI Credit - ${data.amount} ${data.currency}`,
        emailBody: (data) => roiCreditTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            dailyRate: data.dailyRate || 0.00257,
            newBalance: data.roiWalletBalance || 0,
            date: data.date || new Date()
        }),
    },

    [NotificationType.REFERRAL_JOINED]: {
        type: NotificationType.REFERRAL_JOINED,
        channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '👥 New Referral!',
        message: (data) => `${data.referredUserName} joined using your referral code!`,
    },

    [NotificationType.REFERRAL_BONUS]: {
        type: NotificationType.REFERRAL_BONUS,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '🎁 Referral Bonus Earned',
        message: (data) => `You earned ${data.amount} ${data.currency} referral bonus!`,
        emailSubject: (data) => `🎁 Referral Bonus - ${data.amount} ${data.currency}`,
        emailBody: (data) => referralBonusTemplate({
            userName: data.userName || 'User',
            amount: data.amount,
            currency: data.currency || 'USDT',
            referralName: data.referredUserName || 'User',
            bonusType: data.bonusType || 'direct',
            bonusPercentage: data.bonusPercentage || (data.bonusType === 'direct' ? 3 : 1.5),
            date: data.date || new Date()
        }),
    },

    [NotificationType.ACCOUNT_VERIFIED]: {
        type: NotificationType.ACCOUNT_VERIFIED,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        title: (data) => '✅ Account Verified',
        message: (data) => 'Your account has been successfully verified!',
        emailSubject: (data) => 'Welcome to W-Invest - Account Verified',
        emailBody: (data) => `
            <h2>Welcome to W-Invest!</h2>
            <p>Dear ${data.userName},</p>
            <p>Your account has been successfully verified.</p>
            <p>You can now:</p>
            <ul>
                <li>Make deposits</li>
                <li>Play games</li>
                <li>Earn ROI</li>
                <li>Refer friends and earn commissions</li>
            </ul>
            <p>Get started now!</p>
        `,
    },

    [NotificationType.SECURITY_ALERT]: {
        type: NotificationType.SECURITY_ALERT,
        channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP, NotificationChannel.PUSH],
        title: (data) => '🔒 Security Alert',
        message: (data) => `${data.alertMessage}`,
        emailSubject: (data) => `Security Alert - ${data.alertType}`,
        emailBody: (data) => `
            <h2>Security Alert</h2>
            <p>Dear ${data.userName},</p>
            <p><strong>${data.alertMessage}</strong></p>
            <p>If this wasn't you, please contact support immediately.</p>
            <ul>
                <li><strong>Time:</strong> ${data.timestamp}</li>
                <li><strong>IP Address:</strong> ${data.ipAddress || 'Unknown'}</li>
            </ul>
        `,
        smsBody: (data) => `W-Invest Security Alert: ${data.alertMessage}. Contact support if this wasn't you.`,
    },

    [NotificationType.SYSTEM_ANNOUNCEMENT]: {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
        title: (data) => data.title || '📢 Announcement',
        message: (data) => data.message,
        emailSubject: (data) => `📢 ${data.title || 'W-Invest Announcement'}`,
        emailBody: (data) => systemAnnouncementTemplate({
            userName: data.userName || 'User',
            title: data.title || 'Important Announcement',
            message: data.message || '',
            date: data.date || new Date()
        }),
    },
}


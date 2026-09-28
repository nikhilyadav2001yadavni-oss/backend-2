import Notification, { NotificationType, NotificationChannel, NotificationStatus, NotificationPriority } from '../models/NotificationModel'
import User from '../models/UserModel'
import { notificationTemplates } from '../config/notificationTemplates'
import { sendPushNotification as sendFCMNotification } from './FirebaseService'
import { sendEmail } from './EmailService'
import mongoose from 'mongoose'

// SMS service — DISABLED (mobile OTP / SMS notifications are turned off).
// Restore this block if SMS delivery is brought back.
//
// const sendSMS = async (phone: string, message: string): Promise<boolean> => {
//     try {
//         // TODO: Integrate with your SMS service (Twilio, AWS SNS, etc.)
//         console.log(`📱 Sending SMS to ${phone}`)
//         console.log(`Message: ${message}`)
//
//         // Simulate SMS sending
//         // await smsProvider.send({ to: phone, body: message })
//
//         return true
//     } catch (error) {
//         console.error('SMS sending failed:', error)
//         return false
//     }
// }

// Push notification service using Firebase Cloud Messaging
const sendPushNotification = async (userId: string, notificationId: string, title: string, message: string, data?: any): Promise<boolean> => {
    try {
        console.log(`🔥 [NotificationService] Preparing Firebase notification for user ${userId}:`, {
            notificationId,
            title,
            message,
            data,
            timestamp: new Date().toISOString(),
        })

        // Get user's FCM token and push notification preference
        const user = await User.findById(userId).select('fcmToken name email pushNotificationStatus')
        if (!user) {
            console.error(`❌ [NotificationService] User ${userId} not found`)
            return false
        }
        
        // Check if push notifications are enabled for this user
        if ((user as any).pushNotificationStatus === false) {
            console.log(`⚠️ [NotificationService] User ${userId} (${user.email || user.name || 'N/A'}) has push notifications disabled`)
            return false
        }
        
        if (!user.fcmToken) {
            console.log(`⚠️ [NotificationService] User ${userId} (${user.email || user.name || 'N/A'}) does not have an FCM token registered`)
            return false
        }

        console.log(`📱 [NotificationService] User ${userId} has FCM token: ${user.fcmToken.substring(0, 20)}...`)

        // Prepare notification data and include notification _id
        const notificationData: { [key: string]: string } = {
            _id: notificationId, // Always include the notification's _id from database
        }
        if (data) {
            Object.entries(data).forEach(([key, value]) => {
                notificationData[key] = String(value)
            })
        }

        // Send push notification via Firebase
        const messageId = await sendFCMNotification(user.fcmToken, title, message, notificationData)
        
        console.log(`✅ [NotificationService] Push notification sent successfully to user ${userId}`, {
            notificationId,
            title,
            message,
            messageId,
            userEmail: user.email,
            timestamp: new Date().toISOString(),
        })
        return true
    } catch (error: any) {
        console.error('❌ [NotificationService] Push notification failed:', {
            userId,
            notificationId,
            error: error.message,
            title,
            message,
        })
        
        // If token is invalid, we might want to clear it from the user's record
        if (error.message === 'INVALID_TOKEN') {
            try {
                await User.updateOne({ _id: userId }, { $unset: { fcmToken: 1 } })
                console.log(`🗑️ [NotificationService] Removed invalid FCM token for user ${userId}`)
            } catch (updateError) {
                console.error('[NotificationService] Failed to remove invalid FCM token:', updateError)
            }
        }
        
        return false
    }
}

// In-app notification (stored in database)
const createInAppNotification = async (notificationData: any): Promise<boolean> => {
    try {
        // Already saved in database, just mark as sent
        return true
    } catch (error) {
        console.error('In-app notification failed:', error)
        return false
    }
}

export interface SendNotificationParams {
    userId: string | mongoose.Types.ObjectId
    type: NotificationType
    data?: any
    channels?: NotificationChannel[]
    priority?: NotificationPriority
    customTitle?: string
    customMessage?: string
}

/**
 * Main function to send notifications
 * @param params - Notification parameters
 * @returns Promise<Notification>
 *
 * @example
 * // Send deposit success notification
 * await NotificationService.sendNotification({
 *   userId: user._id,
 *   type: NotificationType.DEPOSIT_SUCCESS,
 *   data: {
 *     userName: user.name,
 *     amount: 100,
 *     currency: 'TRX',
 *     transactionId: 'TXN123456',
 *     mainWalletAmount: 50,
 *     gamingWalletAmount: 50
 *   }
 * })
 */
const sendNotification = async (params: SendNotificationParams): Promise<any> => {
    try {
        const { userId, type, data = {}, channels, priority, customTitle, customMessage } = params

        // Get user details
        const user = await User.findById(userId).select('name email phone')
        if (!user) {
            throw new Error('User not found')
        }

        // Get template
        const template = notificationTemplates[type]
        if (!template) {
            throw new Error(`Template not found for notification type: ${type}`)
        }

        // Merge user data with provided data
        const notificationData = {
            userName: user.name,
            userEmail: user.email,
            userPhone: user.phone,
            ...data,
        }

        // Generate title and message
        const title = customTitle || template.title(notificationData)
        const message = customMessage || template.message(notificationData)

        // Determine channels to use
        const notificationChannels = channels || template.channels

        // Create notification record in database
        const notification = new Notification({
            userId,
            type,
            channel: notificationChannels,
            title,
            message,
            data: notificationData,
            status: NotificationStatus.PENDING,
            priority: priority || NotificationPriority.MEDIUM,
            retryCount: 0,
        })
        await notification.save()

        // Send through each channel
        const sendResults: any = {}
        const metadata: any = {}

        for (const channel of notificationChannels) {
            let success = false

            switch (channel) {
                case NotificationChannel.EMAIL:
                    if (user.email && template.emailSubject && template.emailBody) {
                        const subject = template.emailSubject(notificationData)
                        const body = template.emailBody(notificationData)
                        success = await sendEmail({
                            to: user.email,
                            subject: subject,
                            html: body,
                        })
                        sendResults.email = success
                    }
                    break

                case NotificationChannel.SMS:
                    // SMS channel disabled — mobile OTP / SMS notifications are turned off.
                    // if (user.phone && template.smsBody) {
                    //     const smsMessage = template.smsBody(notificationData)
                    //     success = await sendSMS(user.phone, smsMessage)
                    //     sendResults.sms = success
                    // }
                    success = false
                    sendResults.sms = false
                    break

                case NotificationChannel.PUSH:
                    try {
                        success = await sendPushNotification(userId.toString(), notification._id.toString(), title, message, notificationData)
                        sendResults.push = success
                        // Store Firebase message ID in metadata if available
                        if (success) {
                            metadata.pushId = 'sent' // We can enhance this to store actual message ID if needed
                        }
                    } catch (pushError: any) {
                        console.error('[NotificationService] Push notification error:', pushError)
                        sendResults.push = false
                    }
                    break

                case NotificationChannel.IN_APP:
                    success = await createInAppNotification(notification)
                    sendResults.inApp = success
                    break
            }
        }

        // Update notification status
        const allSuccess = Object.values(sendResults).every((result) => result === true)
        notification.status = allSuccess ? NotificationStatus.SENT : NotificationStatus.FAILED
        notification.sentAt = allSuccess ? new Date() : undefined
        notification.metadata = {
            ...metadata,
            sendResults,
            sentAt: allSuccess ? new Date().toISOString() : undefined,
        }

        if (!allSuccess) {
            notification.failureReason = `Failed channels: ${Object.entries(sendResults)
                .filter(([_, success]) => !success)
                .map(([channel]) => channel)
                .join(', ')}`
        }

        await notification.save()

        return notification
    } catch (error: any) {
        console.error('Notification sending failed:', error)
        throw new Error(error.message || 'Failed to send notification')
    }
}

/**
 * Send bulk notifications to multiple users
 * @param userIds - Array of user IDs
 * @param type - Notification type
 * @param dataFn - Function to generate data for each user
 */
const sendBulkNotification = async (userIds: string[], type: NotificationType, dataFn?: (userId: string) => any): Promise<any[]> => {
    const notifications = []

    for (const userId of userIds) {
        try {
            const data = dataFn ? dataFn(userId) : {}
            const notification = await sendNotification({
                userId,
                type,
                data,
            })
            notifications.push(notification)
        } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error)
        }
    }

    return notifications
}

/**
 * Get user notifications with pagination
 */
const getUserNotifications = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: NotificationStatus
): Promise<{
    notifications: any[]
    totalCount: number
    unreadCount: number
    currentPage: number
    totalPages: number
}> => {
    try {
        const filter: any = { userId }
        if (status) {
            filter.status = status
        }

        const skip = (page - 1) * limit

        const [notifications, totalCount, unreadCount] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v').lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ userId, status: { $ne: NotificationStatus.READ } }),
        ])

        const totalPages = Math.ceil(totalCount / limit)

        return {
            notifications,
            totalCount,
            unreadCount,
            currentPage: page,
            totalPages,
        }
    } catch (error: any) {
        throw new Error(error.message || 'Failed to fetch notifications')
    }
}

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId: string, userId: string): Promise<any> => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            {
                status: NotificationStatus.READ,
                readAt: new Date(),
            },
            { new: true }
        )

        if (!notification) {
            throw new Error('Notification not found')
        }

        return notification
    } catch (error: any) {
        throw new Error(error.message || 'Failed to mark notification as read')
    }
}

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId: string): Promise<number> => {
    try {
        const result = await Notification.updateMany(
            { userId, status: { $ne: NotificationStatus.READ } },
            {
                status: NotificationStatus.READ,
                readAt: new Date(),
            }
        )

        return result.modifiedCount
    } catch (error: any) {
        throw new Error(error.message || 'Failed to mark all notifications as read')
    }
}

/**
 * Delete notification
 */
const deleteNotification = async (notificationId: string, userId: string): Promise<boolean> => {
    try {
        const result = await Notification.deleteOne({ _id: notificationId, userId })
        return result.deletedCount > 0
    } catch (error: any) {
        throw new Error(error.message || 'Failed to delete notification')
    }
}

/**
 * Get unread notification count
 */
const getUnreadCount = async (userId: string): Promise<number> => {
    try {
        return await Notification.countDocuments({
            userId,
            status: { $ne: NotificationStatus.READ },
        })
    } catch (error: any) {
        throw new Error(error.message || 'Failed to get unread count')
    }
}

// Export all functions as a single service object
export default {
    sendNotification,
    sendBulkNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
}

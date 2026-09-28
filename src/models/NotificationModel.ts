import mongoose from 'mongoose'

export enum NotificationType {
    DEPOSIT_SUCCESS = 'DEPOSIT_SUCCESS',
    DEPOSIT_FAILED = 'DEPOSIT_FAILED',
    WITHDRAWAL_REQUEST = 'WITHDRAWAL_REQUEST',
    WITHDRAWAL_APPROVED = 'WITHDRAWAL_APPROVED',
    WITHDRAWAL_REJECTED = 'WITHDRAWAL_REJECTED',
    GAME_WIN = 'GAME_WIN',
    GAME_LOSE = 'GAME_LOSE',
    ROI_CREDIT = 'ROI_CREDIT',
    REFERRAL_JOINED = 'REFERRAL_JOINED',
    REFERRAL_BONUS = 'REFERRAL_BONUS',
    ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
    SECURITY_ALERT = 'SECURITY_ALERT',
    SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
}

export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
    IN_APP = 'IN_APP',
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
    READ = 'READ',
}

export enum NotificationPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

export interface Notification {
    _id: string
    userId: mongoose.Types.ObjectId
    type: NotificationType
    channel: NotificationChannel[]
    title: string
    message: string
    data?: {
        transactionId?: string
        amount?: number
        currency?: string
        link?: string
        actionUrl?: string
        [key: string]: any
    }
    status: NotificationStatus
    priority: NotificationPriority
    sentAt?: Date
    readAt?: Date
    failureReason?: string
    retryCount: number
    metadata?: {
        emailId?: string
        smsId?: string
        pushId?: string
        [key: string]: any
    }
    createdAt: Date
    updatedAt: Date
}

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: true,
            index: true,
        },
        channel: [
            {
                type: String,
                enum: Object.values(NotificationChannel),
                required: true,
            },
        ],
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        status: {
            type: String,
            enum: Object.values(NotificationStatus),
            default: NotificationStatus.PENDING,
            index: true,
        },
        priority: {
            type: String,
            enum: Object.values(NotificationPriority),
            default: NotificationPriority.MEDIUM,
        },
        sentAt: {
            type: Date,
            default: null,
        },
        readAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
        },
        retryCount: {
            type: Number,
            default: 0,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
)

// Indexes for efficient querying
notificationSchema.index({ userId: 1, status: 1 })
notificationSchema.index({ userId: 1, type: 1 })
notificationSchema.index({ userId: 1, createdAt: -1 })
notificationSchema.index({ status: 1, priority: -1 })

const Notification = mongoose.model<Notification & mongoose.Document>('Notification', notificationSchema)

export default Notification

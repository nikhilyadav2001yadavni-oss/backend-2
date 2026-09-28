import mongoose from 'mongoose'

export enum SupportTicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    CLOSED = 'CLOSED',
}

export interface SupportTicket {
    _id: string
    userId: mongoose.Types.ObjectId
    subject: string
    status: SupportTicketStatus
    lastMessagePreview?: string
    lastMessageAt?: Date
    closedByEmail?: string
    closedByComment?: string
    closedAt?: Date
    createdAt: Date
    updatedAt: Date
}

const supportTicketSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        status: {
            type: String,
            enum: Object.values(SupportTicketStatus),
            default: SupportTicketStatus.OPEN,
            index: true,
        },
        lastMessagePreview: {
            type: String,
            default: '',
        },
        lastMessageAt: {
            type: Date,
            default: null,
        },
        closedByEmail: {
            type: String,
            default: null,
        },
        closedByComment: {
            type: String,
            default: null,
            maxlength: 1000,
        },
        closedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
)

supportTicketSchema.index({ userId: 1, updatedAt: -1 })

const SupportTicket = mongoose.model<SupportTicket & mongoose.Document>('SupportTicket', supportTicketSchema)

export default SupportTicket

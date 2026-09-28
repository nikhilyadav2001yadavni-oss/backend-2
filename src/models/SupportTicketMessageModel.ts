import mongoose from 'mongoose'

export enum SupportMessageSenderType {
    USER = 'USER',
    SUPPORT = 'SUPPORT',
}

export interface SupportTicketMessage {
    _id: string
    ticketId: mongoose.Types.ObjectId
    senderType: SupportMessageSenderType
    senderId: mongoose.Types.ObjectId
    body: string
    attachmentUrls: string[]
    createdAt: Date
    updatedAt: Date
}

const supportTicketMessageSchema = new mongoose.Schema(
    {
        ticketId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SupportTicket',
            required: true,
            index: true,
        },
        senderType: {
            type: String,
            enum: Object.values(SupportMessageSenderType),
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        body: {
            type: String,
            required: true,
            maxlength: 10000,
        },
        attachmentUrls: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
)

supportTicketMessageSchema.index({ ticketId: 1, createdAt: 1 })

const SupportTicketMessage = mongoose.model<SupportTicketMessage & mongoose.Document>(
    'SupportTicketMessage',
    supportTicketMessageSchema
)

export default SupportTicketMessage

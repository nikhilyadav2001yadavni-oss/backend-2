import mongoose from 'mongoose'
import SupportTicket, { SupportTicketStatus } from '../models/SupportTicketModel'
import SupportTicketMessage, { SupportMessageSenderType } from '../models/SupportTicketMessageModel'
import { createBadRequestError, createForbiddenError, createNotFoundError } from '../middleware/authentication'

const previewFromBody = (body: string, maxLen = 120): string => {
    const t = body.replace(/\s+/g, ' ').trim()
    return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`
}

/** Admin panel JWT roles that may view/reply to any ticket (includes subadmins). */
const isSupportStaffRole = (role?: string) =>
    role === 'admin' || role === 'superadmin' || role === 'subadmin'

const getTicketForParticipant = async (
    ticketId: string,
    participant: { id: string; role?: string }
): Promise<InstanceType<typeof SupportTicket>> => {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        throw createBadRequestError('Invalid ticket id')
    }
    const ticket = await SupportTicket.findById(ticketId) as InstanceType<typeof SupportTicket> | null
    if (!ticket) {
        throw createNotFoundError('Ticket not found')
    }
    const ownerId = ticket.userId.toString()
    const isOwner = ownerId === participant.id
    const isAdmin = isSupportStaffRole(participant.role)
    if (!isOwner && !isAdmin) {
        throw createForbiddenError('You do not have access to this ticket')
    }
    return ticket
}

const createTicket = async (
    userId: string,
    subject: string,
    messageBody: string,
    attachmentUrls: string[] = []
): Promise<{ ticket: InstanceType<typeof SupportTicket>; firstMessage: InstanceType<typeof SupportTicketMessage> }> => {
    const ticket = new SupportTicket({
        userId,
        subject: subject.trim(),
        status: SupportTicketStatus.OPEN,
        lastMessagePreview: previewFromBody(messageBody),
        lastMessageAt: new Date(),
    })
    await ticket.save()

    const firstMessage = new SupportTicketMessage({
        ticketId: ticket._id,
        senderType: SupportMessageSenderType.USER,
        senderId: new mongoose.Types.ObjectId(userId),
        body: messageBody.trim(),
        attachmentUrls,
    })
    await firstMessage.save()

    return { ticket, firstMessage }
}

const listTicketsForUser = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{
    tickets: InstanceType<typeof SupportTicket>[]
    totalCount: number
    currentPage: number
    totalPages: number
}> => {
    const skip = (page - 1) * limit
    const filter = { userId: new mongoose.Types.ObjectId(userId) }
    const [tickets, totalCount] = await Promise.all([
        SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
        SupportTicket.countDocuments(filter),
    ])
    return {
        tickets: tickets as unknown as InstanceType<typeof SupportTicket>[],
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
    }
}

const listTicketsForAdmin = async (
    page: number = 1,
    limit: number = 20,
    status?: SupportTicketStatus
): Promise<{
    tickets: Record<string, unknown>[]
    totalCount: number
    currentPage: number
    totalPages: number
}> => {
    const skip = (page - 1) * limit
    const filter: Record<string, unknown> = {}
    if (status && Object.values(SupportTicketStatus).includes(status)) {
        filter.status = status
    }
    const [tickets, totalCount] = await Promise.all([
        SupportTicket.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .lean(),
        SupportTicket.countDocuments(filter),
    ])
    return {
        tickets: tickets as Record<string, unknown>[],
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
    }
}

const getTicketMessages = async (
    ticketId: string,
    participant: { id: string; role?: string },
    page: number = 1,
    limit: number = 50
): Promise<{
    ticket: InstanceType<typeof SupportTicket>
    messages: InstanceType<typeof SupportTicketMessage>[]
    totalMessages: number
    currentPage: number
    totalPages: number
}> => {
    const ticket = await getTicketForParticipant(ticketId, participant)
    const skip = (page - 1) * limit
    const filter = { ticketId: ticket._id }
    const [messages, totalMessages] = await Promise.all([
        SupportTicketMessage.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
        SupportTicketMessage.countDocuments(filter),
    ])
    return {
        ticket,
        messages: messages as unknown as InstanceType<typeof SupportTicketMessage>[],
        totalMessages,
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit) || 1,
    }
}

const addMessage = async (params: {
    ticketId: string
    senderType: SupportMessageSenderType
    senderId: string
    body: string
    attachmentUrls?: string[]
    actor: { id: string; role?: string }
}): Promise<InstanceType<typeof SupportTicketMessage>> => {
    const { ticketId, senderType, senderId, body, attachmentUrls = [], actor } = params
    const ticket = await getTicketForParticipant(ticketId, actor)

    if (ticket.status === SupportTicketStatus.CLOSED) {
        throw createBadRequestError('This ticket is closed')
    }

    if (senderType === SupportMessageSenderType.USER) {
        if (ticket.userId.toString() !== senderId) {
            throw createForbiddenError('Invalid sender for this ticket')
        }
    } else {
        if (!isSupportStaffRole(actor.role)) {
            throw createForbiddenError('Only support staff can send support messages')
        }
    }

    const message = new SupportTicketMessage({
        ticketId: ticket._id,
        senderType,
        senderId: new mongoose.Types.ObjectId(senderId),
        body: body.trim(),
        attachmentUrls,
    })
    await message.save()

    ticket.lastMessagePreview = previewFromBody(body)
    ticket.lastMessageAt = new Date()

    if (senderType === SupportMessageSenderType.SUPPORT && ticket.status === SupportTicketStatus.OPEN) {
        ticket.status = SupportTicketStatus.IN_PROGRESS
    }

    await ticket.save()

    return message
}

const closeTicket = async (
    ticketId: string,
    userId: string,
    role?: string,
    opts?: { comment?: string; email?: string }
): Promise<InstanceType<typeof SupportTicket>> => {
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        throw createBadRequestError('Invalid ticket id')
    }
    const isAdmin = isSupportStaffRole(role)
    const ticket = isAdmin
        ? await SupportTicket.findById(ticketId)
        : await SupportTicket.findOne({ _id: ticketId, userId })
    if (!ticket) {
        throw createNotFoundError('Ticket not found')
    }
    if (ticket.status === SupportTicketStatus.CLOSED) {
        throw createBadRequestError('Ticket is already closed')
    }
    ticket.status = SupportTicketStatus.CLOSED
    ticket.closedAt = new Date()
    ticket.closedByEmail = opts?.email || ''
    ticket.closedByComment = opts?.comment?.trim() || ''
    console.log('[closeTicket] saving: closedByEmail=%s closedByComment=%s closedAt=%s', ticket.closedByEmail, ticket.closedByComment, ticket.closedAt)
    await ticket.save()
    console.log('[closeTicket] saved ticket:', ticket._id, 'closedByEmail:', ticket.closedByEmail, 'closedByComment:', ticket.closedByComment)
    return ticket
}

/** Serialize message for WebSocket / API clients */
const formatMessage = (m: InstanceType<typeof SupportTicketMessage> | Record<string, unknown>) => {
    const doc = typeof (m as any).toObject === 'function' ? (m as any).toObject() : m
    return {
        id: String((doc as any)._id),
        ticketId: String((doc as any).ticketId),
        senderType: (doc as any).senderType,
        senderId: String((doc as any).senderId),
        body: (doc as any).body,
        attachmentUrls: (doc as any).attachmentUrls || [],
        createdAt: (doc as any).createdAt,
    }
}

export default {
    createTicket,
    listTicketsForUser,
    listTicketsForAdmin,
    getTicketMessages,
    getTicketForParticipant,
    addMessage,
    closeTicket,
    formatMessage,
}

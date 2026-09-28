import { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import SupportTicketService from '../services/SupportTicketService'
import { createSupportTicketBodySchema, sendSupportMessageBodySchema } from '../schemas/supportTicketSchemas'
import { uploadImageToCloudinary } from '../utils/uploadHelper'
import { SupportMessageSenderType } from '../models/SupportTicketMessageModel'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSupportIO } = require('../ws.js')

export default {
    createTicket: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                })
                return
            }

            const { error, value } = createSupportTicketBodySchema.validate(
                {
                    subject: req.body.subject,
                    message: req.body.message,
                },
                { abortEarly: false, stripUnknown: true }
            )
            if (error) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: error.details.map((d) => d.message).join(', '),
                    data: null,
                })
                return
            }

            const files = (req.files as Express.Multer.File[] | undefined) || []
            const attachmentUrls: string[] = []
            for (const file of files) {
                const uploaded = await uploadImageToCloudinary(file, 'support-tickets')
                attachmentUrls.push(uploaded.secure_url)
            }

            const { ticket, firstMessage } = await SupportTicketService.createTicket(
                userId,
                value.subject,
                value.message,
                attachmentUrls
            )

            const formattedFirst = SupportTicketService.formatMessage(firstMessage)

            // Broadcast to ticket room so any connected admin sees it
            const io = getSupportIO()
            if (io) {
                const room = `ticket:${ticket._id.toString()}`
                io.of('/').to(room).emit('receive_message', { message: formattedFirst })
            }

            res.status(HttpStatusCode.CREATED).json({
                success: true,
                message: 'Support ticket created',
                data: {
                    ticket,
                    firstMessage: formattedFirst,
                },
            })
        } catch (err: any) {
            res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Internal server error',
                data: null,
            })
        }
    },

    listTickets: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                })
                return
            }

            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20))

            const result = await SupportTicketService.listTicketsForUser(userId, page, limit)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Tickets fetched',
                data: result,
            })
        } catch (err: any) {
            res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Internal server error',
                data: null,
            })
        }
    },

    getTicketDetail: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const role = req.user?.role
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                })
                return
            }

            const { ticketId } = req.params
            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50))

            const { ticket, messages, totalMessages, currentPage, totalPages } =
                await SupportTicketService.getTicketMessages(ticketId, { id: userId, role }, page, limit)

            const ticketObj = typeof (ticket as any).toObject === 'function' ? (ticket as any).toObject() : ticket
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Ticket detail',
                data: {
                    ticket: ticketObj,
                    messages: messages.map((m) => SupportTicketService.formatMessage(m as any)),
                    totalMessages,
                    currentPage,
                    totalPages,
                },
            })
        } catch (err: any) {
            res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Internal server error',
                data: null,
            })
        }
    },

    sendMessage: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const role = req.user?.role
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                })
                return
            }

            const { ticketId } = req.params
            const { error, value } = sendSupportMessageBodySchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            })
            if (error) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: error.details.map((d) => d.message).join(', '),
                    data: null,
                })
                return
            }

            const isStaff =
                role === 'admin' || role === 'superadmin' || role === 'subadmin'
            const senderType = isStaff
                ? SupportMessageSenderType.SUPPORT
                : SupportMessageSenderType.USER

            const message = await SupportTicketService.addMessage({
                ticketId,
                senderType,
                senderId: userId,
                body: value.message,
                attachmentUrls: value.attachmentUrls || [],
                actor: { id: userId, role },
            })

            const formatted = SupportTicketService.formatMessage(message)

            // Broadcast to all Socket.IO clients in this ticket room
            const io = getSupportIO()
            if (io) {
                const room = `ticket:${ticketId}`
                io.of('/').to(room).emit('receive_message', { message: formatted })
            }

            res.status(HttpStatusCode.CREATED).json({
                success: true,
                message: 'Message sent',
                data: { message: formatted },
            })
        } catch (err: any) {
            res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Internal server error',
                data: null,
            })
        }
    },

    closeTicket: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                })
                return
            }

            const { ticketId } = req.params
            const role = req.user?.role
            const ticket = await SupportTicketService.closeTicket(ticketId, userId, role)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Ticket closed',
                data: { ticket },
            })
        } catch (err: any) {
            res.status(err.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Internal server error',
                data: null,
            })
        }
    },
}

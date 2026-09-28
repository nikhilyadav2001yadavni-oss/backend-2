import express, { Request, Response, NextFunction } from 'express'
import { HttpStatusCode } from '../enums/App'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate } from '../middleware/authentication'
import { upload } from '../utils/uploadHelper'
import SupportTicketController from '../controllers/SupportTicketController'

const router = express.Router()

const handleMulterError = (err: any, _req: Request, res: Response, next: NextFunction) => {
    if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(HttpStatusCode.BAD_REQUEST).json({
                success: false,
                message: 'File size exceeds 5MB limit',
                data: null,
            })
        }
        if (err.message && err.message.includes('Only image files')) {
            return res.status(HttpStatusCode.BAD_REQUEST).json({
                success: false,
                message: err.message,
                data: null,
            })
        }
        return res.status(HttpStatusCode.BAD_REQUEST).json({
            success: false,
            message: err.message || 'File upload error',
            data: null,
        })
    }
    next()
}

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Support tickets service connected' })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                message: error.message || 'Internal server error',
            })
        }
    })
    .post(
        '/',
        apiLimiter,
        authenticate,
        upload.array('attachments', 5),
        handleMulterError,
        SupportTicketController.createTicket
    )
    .get('/my', apiLimiter, authenticate, SupportTicketController.listTickets)
    .get('/:ticketId', apiLimiter, authenticate, SupportTicketController.getTicketDetail)
    .post('/:ticketId/messages', apiLimiter, authenticate, SupportTicketController.sendMessage)
    .patch('/:ticketId/close', apiLimiter, authenticate, SupportTicketController.closeTicket)

export default router

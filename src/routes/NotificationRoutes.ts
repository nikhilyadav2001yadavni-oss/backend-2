import express, { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate } from '../middleware/authentication'
import NotificationController from '../controllers/NotificationController'

const router = express.Router()

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Notification Service Connected' })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                message: error.message || 'Internal server error',
            })
        }
    })
    .get('/list', apiLimiter, authenticate, NotificationController.getNotifications)
    .get('/unread-count', apiLimiter, authenticate, NotificationController.getUnreadCount)
    .patch('/:notificationId/read', apiLimiter, authenticate, NotificationController.markAsRead)
    .patch('/read-all', apiLimiter, authenticate, NotificationController.markAllAsRead)
    .delete('/:notificationId', apiLimiter, authenticate, NotificationController.deleteNotification)

export default router


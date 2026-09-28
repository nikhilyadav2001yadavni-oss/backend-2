import { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import NotificationService from '../services/NotificationService'
import { NotificationStatus } from '../models/NotificationModel'

export default {
    /**
     * Get user notifications
     */
    getNotifications: async (req: Request, res: Response): Promise<void> => {
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

            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20
            const status = req.query.status as NotificationStatus | undefined

            // Validate pagination
            if (page < 1 || limit < 1 || limit > 100) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                    data: null,
                })
                return
            }

            const result = await NotificationService.getUserNotifications(userId, page, limit, status)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Notifications fetched successfully',
                data: result,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Get unread notification count
     */
    getUnreadCount: async (req: Request, res: Response): Promise<void> => {
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

            const unreadCount = await NotificationService.getUnreadCount(userId)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Unread count fetched successfully',
                data: { unreadCount },
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Mark notification as read
     */
    markAsRead: async (req: Request, res: Response): Promise<void> => {
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

            const { notificationId } = req.params

            if (!notificationId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Notification ID is required',
                    data: null,
                })
                return
            }

            const notification = await NotificationService.markAsRead(notificationId, userId)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Notification marked as read',
                data: notification,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (req: Request, res: Response): Promise<void> => {
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

            const count = await NotificationService.markAllAsRead(userId)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `${count} notifications marked as read`,
                data: { count },
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Delete notification
     */
    deleteNotification: async (req: Request, res: Response): Promise<void> => {
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

            const { notificationId } = req.params

            if (!notificationId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Notification ID is required',
                    data: null,
                })
                return
            }

            const deleted = await NotificationService.deleteNotification(notificationId, userId)

            if (!deleted) {
                res.status(HttpStatusCode.NOT_FOUND).json({
                    success: false,
                    message: 'Notification not found',
                    data: null,
                })
                return
            }

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Notification deleted successfully',
                data: null,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
}


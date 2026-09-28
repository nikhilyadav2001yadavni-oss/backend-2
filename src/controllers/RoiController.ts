import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import RoiService from '../services/RoiService'

export default {
    getRoiSummary: async (req: Request, res: Response): Promise<void> => {
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

            const summary = await RoiService.getRoiSummary(userId)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'ROI summary fetched successfully',
                data: summary,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    getRoiInvestments: async (req: Request, res: Response): Promise<void> => {
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

            if (page < 1 || limit < 1 || limit > 100) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                    data: null,
                })
                return
            }

            const result = await RoiService.getUserRoiInvestments(userId, page, limit)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'ROI investments fetched successfully',
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

    getRoiEarningsHistory: async (req: Request, res: Response): Promise<void> => {
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
            const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
            const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

            if (page < 1 || limit < 1 || limit > 100) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                    data: null,
                })
                return
            }

            const result = await RoiService.getRoiEarningsHistory(userId, page, limit, startDate, endDate)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'ROI earnings history fetched successfully',
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
}

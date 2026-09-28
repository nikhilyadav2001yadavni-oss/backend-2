import { Request, Response, NextFunction } from 'express'
import { HttpStatusCode } from '../enums/App'

/**
 * Middleware to authenticate cron job requests using a secret token
 * This allows external services like cronjob.org to trigger ROI calculation
 * without requiring JWT authentication
 */
export const authenticateCronJob = (req: Request, res: Response, next: NextFunction): void => {
    const cronSecret = process.env.CRON_JOB_SECRET || process.env.ROI_CRON_SECRET
    
    if (!cronSecret) {
        res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Cron job secret not configured',
            data: null,
        })
        return
    }

    // Check for secret in query parameter or header
    const providedSecret = req.query.secret as string || req.headers['x-cron-secret'] as string

    if (!providedSecret || providedSecret !== cronSecret) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid or missing cron job secret',
            data: null,
        })
        return
    }

    next()
}

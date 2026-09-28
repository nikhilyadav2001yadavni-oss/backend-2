import express from 'express'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticateCronJob } from '../middleware/cronAuth'
import { triggerRoiCalculation } from '../utils/roiCronJob'
import { HttpStatusCode } from '../enums/App'

const router = express.Router()

/**
 * Public endpoint for triggering ROI calculation
 * Can be used by cronjob.org or other external cron services
 * Requires secret token authentication via query parameter or header
 * 
 * Usage:
 * - GET /api/v1/cron/roi-calculation?secret=YOUR_SECRET_TOKEN
 * - GET /api/v1/cron/roi-calculation (with X-Cron-Secret header)
 */
router.get(
    '/roi-calculation',
    apiLimiter,
    authenticateCronJob,
    async (req, res) => {
        try {
            const result = await triggerRoiCalculation()

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `ROI calculation completed successfully. Processed ${result.processed} investments and credited ${result.totalCredited.toFixed(8)} USDT`,
                data: {
                    processed: result.processed,
                    totalCredited: result.totalCredited,
                    errors: result.errors,
                    timestamp: new Date().toISOString(),
                },
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    }
)

export default router

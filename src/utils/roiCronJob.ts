import RoiService from '../services/RoiService'

/**
 * Trigger ROI calculation manually
 * This function can be called via API endpoint for external cron services like cronjob.org
 * 
 * Usage:
 * - GET /api/v1/cron/roi-calculation?secret=YOUR_SECRET_TOKEN
 * - POST /api/v1/admin/trigger-roi-calculation
 */
export const triggerRoiCalculation = async (): Promise<{
    processed: number
    totalCredited: number
    errors: string[]
}> => {
    return await RoiService.processDailyRoi()
}

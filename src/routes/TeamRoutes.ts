import express, { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate } from '../middleware/authentication'
import { TeamController } from '../controllers'

const router = express.Router()

router
    .get('/', async (req: Request, res: Response) => {
        try {
            return res.status(HttpStatusCode.OK).json({ message: 'Team Connected' })
        } catch (error: any) {
            return res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ 
                message: error.message || 'Internal server error' 
            })
        }
    })
    .get('/direct-referrals/:userId', apiLimiter, authenticate, TeamController.getDirectReferrals)

export default router


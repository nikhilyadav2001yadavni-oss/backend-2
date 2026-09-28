import express from 'express'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate } from '../middleware/authentication'
import RoiController from '../controllers/RoiController'

const router = express.Router()

router
    .get('/summary', apiLimiter, authenticate, RoiController.getRoiSummary)
    .get('/investments', apiLimiter, authenticate, RoiController.getRoiInvestments)
    .get('/earnings-history', apiLimiter, authenticate, RoiController.getRoiEarningsHistory)

export default router

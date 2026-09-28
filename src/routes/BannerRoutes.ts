import express, { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import { apiLimiter } from '../utils/rateLimiter'
import { authenticate } from '../middleware/authentication'
import BannerController from '../controllers/BannerController'

const router = express.Router()

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Banner Connected' })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                message: error.message || 'Internal server error',
            })
        }
    })
    .post('/', apiLimiter, authenticate, BannerController.createBanner)
    .get('/all', apiLimiter, BannerController.getAllBanners)
    .get('/:id', apiLimiter, BannerController.getBannerById)
    .put('/:id', apiLimiter, authenticate, BannerController.updateBanner)
    .delete('/:id', apiLimiter, authenticate, BannerController.deleteBanner)

export default router

import express, { Request, Response, NextFunction } from 'express'
import HelperController from '../controllers/HelperController'
import { upload } from '../utils/uploadHelper'
import { authenticate, requireAdmin } from '../middleware/authentication'
import { apiLimiter } from '../utils/rateLimiter'
import { HttpStatusCode } from '../enums/App'

const router = express.Router()

// Multer error handling middleware
const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction) => {
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

router.post('/upload-image', apiLimiter, authenticate, upload.single('image'), handleMulterError, HelperController.uploadImage)

export default router

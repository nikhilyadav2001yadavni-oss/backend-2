import express, { Request, Response } from 'express';
import { HttpStatusCode } from '../enums/App';
import { apiLimiter, createAccountLimiter } from '../utils/rateLimiter';
import { authenticate } from '../middleware/authentication';
import { UserController } from '../controllers';
const router = express.Router();

router
    .get('/activity-marquee', UserController.getActivityMarquee)
    .get('/', async (req: Request, res: Response) => {
        try {
            return res.status(HttpStatusCode.OK).json({ message: 'User Connected' });
        } catch (error: any) {
            return res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error' });
        }
    })
    .post('/signup', UserController.signup)
    .post('/login', apiLimiter, UserController.login)
    .post('/send-otp', apiLimiter, UserController.sendOtp)
    .post('/verify-otp', apiLimiter, UserController.verifyOtp)
    .post('/reset-password', apiLimiter, UserController.resetPassword)
    .post('/edit-profile', apiLimiter, authenticate, UserController.editProfile)
    .get('/user-details', apiLimiter, authenticate,UserController.getUserDetails)
    .post('/change-password', apiLimiter, authenticate, UserController.changePassword)
    .post('/update-2fa', apiLimiter, authenticate, UserController.update2FA)
    .post('/update-biometric', apiLimiter, authenticate, UserController.updateBiometric)
    .post('/update-push-notification', apiLimiter, authenticate, UserController.updatePushNotification)
    .post('/update-fcm-token', apiLimiter, authenticate, UserController.updateFcmToken)
    .post('/logout', apiLimiter, authenticate, UserController.logout)
    .get('/direct-referrals', authenticate, UserController.directReferrals)


export default router;
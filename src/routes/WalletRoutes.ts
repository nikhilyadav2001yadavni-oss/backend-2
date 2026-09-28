import express, { Request, Response } from 'express'
import { HttpStatusCode } from '../enums/App'
import { apiLimiter, createAccountLimiter } from '../utils/rateLimiter'
import { WalletController } from '../controllers'
import { authenticate } from '../middleware/authentication'

const router = express.Router()

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Wallet Connected' })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error' })
        }
    })
    .get('/currency-list', apiLimiter, authenticate, WalletController.getCurrencyList)
    .post('/deposit', apiLimiter, authenticate, WalletController.deposit)
    .post('/withdrawal', apiLimiter, authenticate, WalletController.withdrawal)
    .get('/transactions', apiLimiter, authenticate, WalletController.transactions)
    .get('/transaction/:id', apiLimiter, authenticate, WalletController.getTransactionById)
    
export default router

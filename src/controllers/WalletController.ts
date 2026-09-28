import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import WalletService from '../services/WalletService'
import User from '../models/UserModel'
import Transaction from '../models/TransactionModel'

export default {
    getCurrencyList: async (req: Request, res: Response): Promise<void> => {
        try {
            const currencyList = await WalletService.getCurrencyList()
            res.status(HttpStatusCode.OK).json({ success: true, message: 'Currency list fetched successfully', data: currencyList })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    deposit: async (req: Request, res: Response): Promise<void> => {
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

            const { currency, amount, toAddress, fromAddress, transactionHash } = req.body

            // Validate required fields
            if (!currency || !amount || !toAddress || !fromAddress || !transactionHash) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Missing required fields: currency, amount, toAddress, fromAddress, transactionHash',
                    data: null,
                })
                return
            }

            // Validate amount
            if (amount <= 0) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Amount must be greater than 0',
                    data: null,
                })
                return
            }

            // Process deposit
            const result = await WalletService.deposit(userId, currency, amount, toAddress, fromAddress, transactionHash)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result.transaction,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    withdrawal: async (req: Request, res: Response): Promise<void> => {
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

            const { walletType, amount, withdrawalAddress, currency, networkFee } = req.body

            // Validate required fields
            if (!walletType || !amount || !withdrawalAddress || !currency || networkFee === undefined) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Missing required fields: walletType, amount, withdrawalAddress, currency, networkFee',
                    data: null,
                })
                return
            }

            // Validate wallet type
            if (walletType !== 'gamingWallet' && walletType !== 'roiWallet') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid walletType. Allowed values: gamingWallet, roiWallet',
                    data: null,
                })
                return
            }

            // Validate amount
            if (amount <= 0) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Amount must be greater than 0',
                    data: null,
                })
                return
            }

            // Check per-user withdrawal limit if enabled
            const userDoc = await User.findById(userId).lean() as any
            if (userDoc?.withdrawalLimit?.enabled) {
                const { period, amount: limitAmount } = userDoc.withdrawalLimit
                const now = new Date()
                let periodStart: Date
                if (period === 'daily') {
                    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                } else if (period === 'weekly') {
                    const dayOfWeek = now.getDay()
                    periodStart = new Date(now)
                    periodStart.setDate(now.getDate() - dayOfWeek)
                    periodStart.setHours(0, 0, 0, 0)
                } else {
                    // monthly
                    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
                }
                const withdrawalsInPeriod = await Transaction.aggregate([
                    {
                        $match: {
                            userId: userDoc._id,
                            category: 'WITHDRAWAL',
                            status: { $in: ['PENDING', 'COMPLETED'] },
                            createdAt: { $gte: periodStart },
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ])
                const usedAmount = withdrawalsInPeriod[0]?.total ?? 0
                if (usedAmount + amount > limitAmount) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: `Withdrawal limit exceeded. Your ${period} limit is ${limitAmount}. Already used: ${usedAmount}. Remaining: ${Math.max(0, limitAmount - usedAmount)}`,
                        data: { limit: limitAmount, used: usedAmount, remaining: Math.max(0, limitAmount - usedAmount), period },
                    })
                    return
                }
            }

            // Process withdrawal (fee is calculated server-side from currency withdrawalFee/withdrawalFeeType)
            const result = await WalletService.withdrawal(userId, walletType, amount, withdrawalAddress, currency)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result.transaction,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    transactions: async (req: Request, res: Response): Promise<void> => {
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

            // Get query parameters
            const type = (req.query.type as string)?.toUpperCase() || 'ALL'
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20

            // Validate type parameter
            const validTypes = ['ALL', 'DEPOSIT', 'WITHDRAWAL', 'ROI_CREDIT', 'GAME', 'REFERRAL_BONUS']
            if (!validTypes.includes(type)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Invalid type. Allowed values: ${validTypes.join(', ')}`,
                    data: null,
                })
                return
            }

            // Validate pagination parameters
            if (page < 1 || limit < 1 || limit > 100) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                    data: null,
                })
                return
            }

            // Fetch transactions
            const result = await WalletService.getTransactions(
                userId,
                type as 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'ROI_CREDIT' | 'GAME' | 'REFERRAL_BONUS',
                page,
                limit
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Transactions fetched successfully',
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
    getTransactionById: async (req: Request, res: Response): Promise<void> => {
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

            const transactionId = req.params.id || req.query.id
            if (!transactionId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Transaction ID is required',
                    data: null,
                })
                return
            }

            const transaction = await WalletService.getTransactionById(userId, transactionId as string)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Transaction fetched successfully',
                data: transaction,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    testDeposit: async (req: Request, res: Response): Promise<void> => {
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

            const { currency, amount } = req.body

            // Validate required fields
            if (!currency || !amount) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Missing required fields: currency, amount',
                    data: null,
                })
                return
            }

            // Validate amount
            if (amount <= 0) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Amount must be greater than 0',
                    data: null,
                })
                return
            }

            // Process test deposit (no blockchain verification)
            const result = await WalletService.testDeposit(userId, currency, amount)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result.transaction,
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

import { createBadRequestError, createNotFoundError } from '../middleware/authentication'
import RoiInvestment from '../models/RoiInvestmentModel'
import Wallet from '../models/WalletModel'
import Transaction, { TransactionCategory, TransactionStatus } from '../models/TransactionModel'
import { getInvestmentConfig } from '../models/InvestmentConfigModel'
import mongoose from 'mongoose'

const LOCK_IN_PERIOD_DAYS = 7 // 7 days lock-in period
const DAYS_IN_MONTH = 30 // Average days in a month

// Default rates (fallback when config not yet available)
const DEFAULT_MONTHLY_ROI_RATE = 0.08 // 8% monthly ROI
const DEFAULT_DAILY_ROI_RATE = Math.pow(1 + DEFAULT_MONTHLY_ROI_RATE, 1 / DAYS_IN_MONTH) - 1

/**
 * Calculate daily ROI earnings using provided daily rate
 * Daily Earnings = Current Balance × Daily Rate
 * New Balance = Previous Balance × (1 + Daily Rate)
 */
export const calculateDailyRoi = (
    currentBalance: number,
    dailyRoiRate?: number
): { dailyEarnings: number; newBalance: number } => {
    const rate = dailyRoiRate ?? DEFAULT_DAILY_ROI_RATE
    const dailyEarnings = currentBalance * rate
    const newBalance = currentBalance * (1 + rate)
    return {
        dailyEarnings,
        newBalance: Number(newBalance.toFixed(8)), // Round to 8 decimal places
    }
}

/**
 * Create a new ROI investment from a deposit
 */
export const createRoiInvestment = async (
    userId: string,
    depositTransactionId: string,
    principalAmount: number
): Promise<any> => {
    try {
        const investment = new RoiInvestment({
            userId: new mongoose.Types.ObjectId(userId),
            depositTransactionId: new mongoose.Types.ObjectId(depositTransactionId),
            principalAmount,
            currentBalance: principalAmount,
            lockInPeriod: LOCK_IN_PERIOD_DAYS,
            lockInStartDate: new Date(),
            isLocked: true,
            lastRoiCalculationDate: new Date(),
            totalRoiEarned: 0,
            isActive: true,
        })

        // Calculate lock-in end date
        const lockInEndDate = new Date(investment.lockInStartDate)
        lockInEndDate.setDate(lockInEndDate.getDate() + LOCK_IN_PERIOD_DAYS)
        investment.lockInEndDate = lockInEndDate

        await investment.save()
        return investment
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to create ROI investment')
    }
}

/**
 * Calculate and credit daily ROI for all active investments
 * This should be run as a cron job daily
 */
export const processDailyRoi = async (): Promise<{
    processed: number
    totalCredited: number
    errors: string[]
}> => {
    const errors: string[] = []
    let processed = 0
    let totalCredited = 0

    try {
        // Get dynamic ROI rate from InvestmentConfig
        const investmentConfig = await getInvestmentConfig()
        const dailyRoiRate = investmentConfig.dailyRoiRate

        // Get all active investments
        const activeInvestments = await RoiInvestment.find({ isActive: true })

        for (const investment of activeInvestments) {
            try {
                // Check if lock-in period has ended and update status
                const now = new Date()
                if (now >= investment.lockInEndDate && investment.isLocked) {
                    investment.isLocked = false
                    await investment.save()
                }

                // Calculate daily ROI using dynamic rate
                const { dailyEarnings, newBalance } = calculateDailyRoi(investment.currentBalance, dailyRoiRate)

                // Update investment
                investment.currentBalance = newBalance
                investment.totalRoiEarned += dailyEarnings
                investment.lastRoiCalculationDate = new Date()
                await investment.save()

                // Credit ROI to user's ROI wallet
                const wallet = await Wallet.findOne({ userId: investment.userId })
                if (wallet) {
                    wallet.roiWallet += dailyEarnings
                    await wallet.save()

                    // Create transaction record for ROI credit
                    const roiTransaction = new Transaction({
                        userId: investment.userId,
                        category: TransactionCategory.ROI_CREDIT,
                        status: TransactionStatus.COMPLETED,
                        amount: dailyEarnings,
                        currency: 'USDT', // Assuming USDT, can be made dynamic
                        network: 'INTERNAL',
                        fee: 0,
                        netAmount: dailyEarnings,
                        blockchainVerified: false,
                        metadata: {
                            roiWalletAmount: wallet.roiWallet,
                            investmentId: investment._id.toString(),
                            notes: `Daily ROI credit - Investment ID: ${investment._id}`,
                        },
                    })
                    await roiTransaction.save()

                    processed++
                    totalCredited += dailyEarnings
                } else {
                    errors.push(`Wallet not found for user ${investment.userId}`)
                }
            } catch (error: any) {
                errors.push(`Error processing investment ${investment._id}: ${error.message}`)
            }
        }

        return {
            processed,
            totalCredited,
            errors,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to process daily ROI')
    }
}

/**
 * Get ROI investment details for a user
 */
export const getUserRoiInvestments = async (
    userId: string,
    page: number = 1,
    limit: number = 20
): Promise<{
    investments: any[]
    totalCount: number
    currentPage: number
    totalPages: number
}> => {
    try {
        const skip = (page - 1) * limit
        const filter = { userId: new mongoose.Types.ObjectId(userId), isActive: true }

        const totalCount = await RoiInvestment.countDocuments(filter)
        const investments = await RoiInvestment.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('depositTransactionId', 'transactionId amount currency createdAt')
            .select('-__v')
            .lean()

        // Calculate lock-in status for each investment
        const investmentsWithStatus = investments.map((inv: any) => {
            const now = new Date()
            const isLocked = now < new Date(inv.lockInEndDate)
            const daysRemaining = isLocked
                ? Math.ceil((new Date(inv.lockInEndDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0

            return {
                ...inv,
                isLocked,
                daysRemaining,
            }
        })

        return {
            investments: investmentsWithStatus,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to fetch ROI investments')
    }
}

/**
 * Get ROI earnings history for a user
 */
export const getRoiEarningsHistory = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date
): Promise<{
    transactions: any[]
    totalCount: number
    currentPage: number
    totalPages: number
    totalEarnings: number
}> => {
    try {
        const skip = (page - 1) * limit
        const filter: any = {
            userId: new mongoose.Types.ObjectId(userId),
            category: TransactionCategory.ROI_CREDIT,
            status: TransactionStatus.COMPLETED,
        }

        // Add date range filter if provided
        if (startDate || endDate) {
            filter.createdAt = {}
            if (startDate) {
                filter.createdAt.$gte = startDate
            }
            if (endDate) {
                filter.createdAt.$lte = endDate
            }
        }

        const totalCount = await Transaction.countDocuments(filter)

        // Calculate total earnings
        const earningsAggregation = await Transaction.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        const totalEarnings = earningsAggregation[0]?.total || 0

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-__v')
            .lean()

        return {
            transactions,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalEarnings,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to fetch ROI earnings history')
    }
}

/**
 * Get ROI summary for a user (total investments, total earnings, current balance, etc.)
 */
export const getRoiSummary = async (userId: string): Promise<{
    totalInvestments: number
    totalPrincipal: number
    totalRoiEarned: number
    currentBalance: number
    lockedBalance: number
    unlockedBalance: number
    monthlyRoiRate: number
    dailyRoiRate: number
    lockInPeriodDays: number
}> => {
    try {
        const investmentConfig = await getInvestmentConfig()

        const investments = await RoiInvestment.find({
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true,
        })

        let totalPrincipal = 0
        let totalRoiEarned = 0
        let currentBalance = 0
        let lockedBalance = 0
        let unlockedBalance = 0

        const now = new Date()
        investments.forEach((inv) => {
            totalPrincipal += inv.principalAmount
            totalRoiEarned += inv.totalRoiEarned
            currentBalance += inv.currentBalance

            if (now < inv.lockInEndDate) {
                lockedBalance += inv.currentBalance
            } else {
                unlockedBalance += inv.currentBalance
            }
        })

        return {
            totalInvestments: investments.length,
            totalPrincipal,
            totalRoiEarned,
            currentBalance,
            lockedBalance,
            unlockedBalance,
            monthlyRoiRate: investmentConfig.monthlyRoiRate, // Already in percentage
            dailyRoiRate: investmentConfig.dailyRoiRate * 100, // Convert to percentage
            lockInPeriodDays: LOCK_IN_PERIOD_DAYS,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to fetch ROI summary')
    }
}

/**
 * Check if user can withdraw from ROI wallet (lock-in period validation)
 */
export const canWithdrawFromRoi = async (userId: string, amount: number): Promise<{
    canWithdraw: boolean
    reason?: string
    availableBalance: number
    lockedBalance: number
}> => {
    try {
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }

        // Get all active investments
        const investments = await RoiInvestment.find({
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true,
        })

        const now = new Date()
        let lockedBalance = 0
        let unlockedBalance = 0

        investments.forEach((inv) => {
            if (now < inv.lockInEndDate) {
                // Still in lock-in period
                lockedBalance += inv.currentBalance
            } else {
                // Lock-in period ended
                unlockedBalance += inv.currentBalance
            }
        })

        // Available balance is the unlocked portion of ROI wallet
        // Note: ROI wallet also includes credited ROI earnings which are always available
        const availableBalance = wallet.roiWallet - lockedBalance

        if (amount > availableBalance) {
            return {
                canWithdraw: false,
                reason: `Insufficient unlocked balance. Available: ${availableBalance}, Requested: ${amount}, Locked: ${lockedBalance}`,
                availableBalance,
                lockedBalance,
            }
        }

        return {
            canWithdraw: true,
            availableBalance,
            lockedBalance,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to validate ROI withdrawal')
    }
}

export default {
    createRoiInvestment,
    processDailyRoi,
    getUserRoiInvestments,
    getRoiEarningsHistory,
    getRoiSummary,
    canWithdrawFromRoi,
    calculateDailyRoi,
    LOCK_IN_PERIOD_DAYS,
}

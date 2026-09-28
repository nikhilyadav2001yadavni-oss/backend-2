import { createBadRequestError, createConflictError, createNotFoundError } from '../middleware/authentication'
import CurrencyModel, { seedDefaultCurrencies } from '../models/CurrencyModel'
import { Currency as CurrencyType } from '../models/CurrencyModel'
import Transaction, { TransactionCategory, TransactionStatus } from '../models/TransactionModel'
import AdminCommission, { CommissionType } from '../models/AdminCommissionModel'
import Wallet from '../models/WalletModel'
import BlockchainService, { BlockchainChain } from './BlockchainService'
import Referral from '../models/ReferralModel'
import User from '../models/UserModel'
import NotificationService from './NotificationService'
import RoiService from './RoiService'
import { getInvestmentConfig } from '../models/InvestmentConfigModel'
import mongoose from 'mongoose'

// Map chain names to BlockchainChain enum
const chainMapping: { [key: string]: BlockchainChain } = {
    TRC20: BlockchainChain.TRX,
    BEP20: BlockchainChain.BNB,
    ERC20: BlockchainChain.ETH,
    POLYGON: BlockchainChain.POLYGON,
}

export default {
    getCurrencyList: async (): Promise<CurrencyType[]> => {
        try {
            // Seed default currencies if database is empty
            await seedDefaultCurrencies()
            const currencyList = await CurrencyModel.find({ isActive: true })
            return currencyList
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Currency list not found')
        }
    },

    deposit: async (
        userId: string,
        currencySymbol: string,
        amount: number,
        toAddress: string,
        fromAddress: string,
        transactionHash: string
    ): Promise<{
        transaction: any
        message: string
    }> => {
        try {
            // Get currency from database
            const currency = await CurrencyModel.findOne({
                symbol: currencySymbol.toUpperCase(),
                isActive: true,
            })

            if (!currency) {
                throw createBadRequestError(`Currency ${currencySymbol} not found or is not active`)
            }

            // Check if deposits are enabled for this currency
            if (!currency.depositEnabled) {
                throw createBadRequestError(`Deposits are currently disabled for ${currency.symbol}`)
            }

            // Validate minimum deposit amount
            if (amount < currency.minimumDepositAmount) {
                throw createBadRequestError(`Minimum deposit amount for ${currency.symbol} is ${currency.minimumDepositAmount}`)
            }

            // Get blockchain chain from currency
            const blockchainChain = chainMapping[currency.chain]
            if (!blockchainChain) {
                throw createBadRequestError(`Invalid chain configuration for ${currency.symbol}`)
            }

            // Check if transaction hash already exists
            const existingTransaction = await Transaction.findOne({ transactionHash })
            if (existingTransaction) {
                // Log the duplicate attempt in DB for admin review - do NOT credit wallet
                const duplicateRecord = new Transaction({
                    userId,
                    category: TransactionCategory.DEPOSIT,
                    status: TransactionStatus.DUPLICATE_HASH,
                    amount,
                    currency: currency.symbol,
                    network: currency.chain,
                    fee: 0,
                    netAmount: amount,
                    fromAddress,
                    toAddress,
                    blockchainVerified: false,
                    metadata: {
                        duplicateTransactionHash: transactionHash,
                        notes: `Duplicate deposit attempt - this transaction hash was already used`,
                    },
                })
                await duplicateRecord.save()
                throw createConflictError('This transaction hash has already been used for a previous deposit. Please use a different transaction.')
            }

            // Calculate fee
            let fee = 0
            if (currency.depositFee > 0) {
                if (currency.depositFeeType === 'percentage') {
                    fee = (amount * currency.depositFee) / 100
                } else {
                    fee = currency.depositFee
                }
            }

            const netAmount = amount - fee

            // Create pending transaction
            const newTransaction = new Transaction({
                userId,
                category: TransactionCategory.DEPOSIT,
                status: TransactionStatus.PENDING,
                amount,
                currency: currency.symbol,
                network: currency.chain,
                fee,
                netAmount,
                fromAddress,
                toAddress,
                transactionHash,
                blockchainVerified: false,
                metadata: {
                    notes: `Pending verification on ${currency.chain} (${blockchainChain}) blockchain`,
                },
            })
            await newTransaction.save()

            try {
                // Verify transaction on blockchain
                let verificationResult

                // For native tokens (ETH, BNB, TRX, SOL, POLYGON) - when symbol matches the chain's native token
                if (
                    (blockchainChain === BlockchainChain.ETH && currency.symbol === 'ETH') ||
                    (blockchainChain === BlockchainChain.BNB && currency.symbol === 'BNB') ||
                    (blockchainChain === BlockchainChain.TRX && currency.symbol === 'TRX') ||
                    (blockchainChain === BlockchainChain.SOL && currency.symbol === 'SOL') ||
                    (blockchainChain === BlockchainChain.POLYGON && currency.symbol === 'MATIC')
                ) {
                    verificationResult = await BlockchainService.verifyTransaction(blockchainChain, transactionHash, toAddress, fromAddress, amount)
                }
                // For tokens (USDT, USDC, etc.)
                else {
                    // Token contract addresses for each chain
                    let tokenContractAddress: string

                    if (blockchainChain === BlockchainChain.ETH) {
                        // Ethereum token contracts
                        if (currency.symbol === 'USDT') {
                            tokenContractAddress = '0xdac17f958d2ee523a2206206994597c13d831ec7'
                        } else if (currency.symbol === 'USDC') {
                            tokenContractAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
                        } else {
                            throw createBadRequestError(`Unsupported token ${currency.symbol} on Ethereum`)
                        }
                    } else if (blockchainChain === BlockchainChain.BNB) {
                        // BSC token contracts (BEP-20)
                        if (currency.symbol === 'USDT') {
                            tokenContractAddress = '0x55d398326f99059ff775485246999027b3197955'
                        } else if (currency.symbol === 'USDC') {
                            tokenContractAddress = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d'
                        } else {
                            throw createBadRequestError(`Unsupported token ${currency.symbol} on BSC`)
                        }
                    } else if (blockchainChain === BlockchainChain.TRX) {
                        // Tron token contracts (TRC-20)
                        if (currency.symbol === 'USDT') {
                            tokenContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
                        } else {
                            throw createBadRequestError(`Unsupported token ${currency.symbol} on Tron`)
                        }
                    } else if (blockchainChain === BlockchainChain.POLYGON) {
                        // Polygon token contracts
                        if (currency.symbol === 'USDT') {
                            tokenContractAddress = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'
                        } else if (currency.symbol === 'USDC') {
                            tokenContractAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'
                        } else {
                            throw createBadRequestError(`Unsupported token ${currency.symbol} on Polygon`)
                        }
                    } else {
                        throw createBadRequestError('Unsupported blockchain')
                    }

                    verificationResult = await BlockchainService.verifyTokenTransaction(
                        blockchainChain,
                        transactionHash,
                        toAddress,
                        tokenContractAddress,
                        fromAddress
                    )
                }

                // Check if verification was successful
                if (!verificationResult.isValid) {
                    // Update transaction status to failed
                    await Transaction.updateOne(
                        { _id: newTransaction._id },
                        {
                            status: TransactionStatus.FAILED,
                            'metadata.notes': verificationResult.error,
                        }
                    )

                    // Send deposit failed notification
                    try {
                        console.log('🔥 [WalletService] Sending Firebase notification: DEPOSIT_FAILED', {
                            userId: userId.toString(),
                            amount,
                            currency: currency.symbol,
                            transactionHash,
                        })
                        await NotificationService.sendNotification({
                            userId: userId.toString(),
                            type: 'DEPOSIT_FAILED' as any,
                            data: {
                                amount: amount,
                                currency: currency.symbol,
                                transactionHash: transactionHash,
                                reason: verificationResult.error || 'Transaction verification failed',
                            },
                        })
                    } catch (notificationError: any) {
                        // Log error but don't fail the deposit failure handling
                        console.error('Failed to send deposit failed notification:', notificationError.message)
                    }

                    throw createBadRequestError(verificationResult.error || 'Transaction verification failed')
                }

                // Split netAmount (after fee deduction): 50% to gamingWallet, 50% to roiWallet
                const gamingWalletAmount = netAmount / 2
                const roiWalletAmount = netAmount / 2

                // Update wallet balances
                const wallet = await Wallet.findOne({ userId })
                if (!wallet) {
                    throw createNotFoundError('Wallet not found')
                }

                wallet.gamingWallet += gamingWalletAmount
                wallet.roiWallet += roiWalletAmount
                await wallet.save()

                // Create ROI investment for the roiWallet portion
                await RoiService.createRoiInvestment(
                    userId,
                    newTransaction._id.toString(),
                    roiWalletAmount
                )

                // Process referral bonuses (direct 3%, indirect 1.5%)
                await processReferralBonuses(userId, netAmount, currency.symbol, currency.chain)

                // Create admin commission record if there's a fee
                if (fee > 0) {
                    const adminCommission = new AdminCommission({
                        transactionId: newTransaction._id,
                        userId,
                        type: CommissionType.DEPOSIT_FEE,
                        amount: fee,
                        currency: currency.symbol,
                        network: currency.chain,
                        description: `Deposit fee for ${amount} ${currency.symbol} (${currency.depositFeeType === 'percentage' ? currency.depositFee + '%' : currency.depositFee + ' ' + currency.symbol})`,
                    })
                    await adminCommission.save()
                }

                // Update transaction status to completed
                await Transaction.updateOne(
                    { _id: newTransaction._id },
                    {
                        status: TransactionStatus.COMPLETED,
                        blockchainVerified: true,
                        'metadata.gamingWalletAmount': gamingWalletAmount,
                        'metadata.roiWalletAmount': roiWalletAmount,
                        'metadata.notes': 'Transaction verified and processed successfully',
                    }
                )

                // Fetch updated transaction
                const updatedTransaction = await Transaction.findById(newTransaction._id)

                // Send deposit success notification
                try {
                    console.log('🔥 [WalletService] Sending Firebase notification: DEPOSIT_SUCCESS', {
                        userId: userId.toString(),
                        amount: netAmount,
                        currency: currency.symbol,
                        transactionId: updatedTransaction?.transactionId,
                    })
                    await NotificationService.sendNotification({
                        userId: userId.toString(),
                        type: 'DEPOSIT_SUCCESS' as any,
                        data: {
                            amount: netAmount,
                            currency: currency.symbol,
                            transactionId: updatedTransaction?.transactionId,
                            mainWalletAmount: wallet.mainWallet,
                            gamingWalletAmount: wallet.gamingWallet,
                            roiWalletAmount: wallet.roiWallet,
                        },
                    })
                } catch (notificationError: any) {
                    // Log error but don't fail the deposit
                    console.error('Failed to send deposit success notification:', notificationError.message)
                }

                const feeMessage = fee > 0 ? ` (Fee: ${fee} ${currency.symbol})` : ''
                return {
                    transaction: updatedTransaction,
                    message: `Deposit successful! ${gamingWalletAmount} ${currency.symbol} credited to Gaming Wallet and ${roiWalletAmount} ${currency.symbol} credited to ROI Wallet${feeMessage}`,
                }
            } catch (verificationError: any) {
                // Update transaction status to failed
                await Transaction.updateOne(
                    { _id: newTransaction._id },
                    {
                        status: TransactionStatus.FAILED,
                        'metadata.notes': verificationError.message,
                    }
                )

                // Send deposit failed notification
                try {
                    console.log('🔥 [WalletService] Sending Firebase notification: DEPOSIT_FAILED (test deposit)', {
                        userId: userId.toString(),
                        amount,
                        currency: currency.symbol,
                        transactionHash,
                    })
                    await NotificationService.sendNotification({
                        userId: userId.toString(),
                        type: 'DEPOSIT_FAILED' as any,
                        data: {
                            amount: amount,
                            currency: currency.symbol,
                            transactionHash: transactionHash,
                            reason: verificationError.message || 'Transaction verification failed',
                        },
                    })
                } catch (notificationError: any) {
                    // Log error but don't fail the deposit failure handling
                    console.error('Failed to send deposit failed notification:', notificationError.message)
                }

                throw verificationError
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Deposit failed')
        }
    },

    testDeposit: async (
        userId: string,
        currencySymbol: string,
        amount: number
    ): Promise<{
        transaction: any
        message: string
    }> => {
        try {
            // Get currency from database
            const currency = await CurrencyModel.findOne({
                symbol: currencySymbol.toUpperCase(),
                isActive: true,
            })

            if (!currency) {
                throw createBadRequestError(`Currency ${currencySymbol} not found or is not active`)
            }

            // Validate minimum deposit amount
            if (amount < currency.minimumDepositAmount) {
                throw createBadRequestError(`Minimum deposit amount for ${currency.symbol} is ${currency.minimumDepositAmount}`)
            }

            // Calculate fee
            let fee = 0
            if (currency.depositFee > 0) {
                if (currency.depositFeeType === 'percentage') {
                    fee = (amount * currency.depositFee) / 100
                } else {
                    fee = currency.depositFee
                }
            }

            const netAmount = amount - fee

            // Create transaction (TEST MODE - no blockchain verification)
            const newTransaction = new Transaction({
                userId,
                category: TransactionCategory.DEPOSIT,
                status: TransactionStatus.COMPLETED, // Directly completed for test
                amount,
                currency: currency.symbol,
                network: currency.chain,
                fee,
                netAmount,
                fromAddress: 'TEST_ADDRESS', // Placeholder for test
                toAddress: currency.depositAddress || 'TEST_RECIPIENT', // Use currency deposit address
                transactionHash: `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`, // Generate unique test hash
                blockchainVerified: false, // Marked as not verified since it's a test
                metadata: {
                    notes: `TEST DEPOSIT - No blockchain verification (Testing Mode)`,
                },
            })
            await newTransaction.save()

            // Split netAmount (after fee deduction): 50% to gamingWallet, 50% to roiWallet
            const gamingWalletAmount = netAmount / 2
            const roiWalletAmount = netAmount / 2

            // Update wallet balances
            const wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                throw createNotFoundError('Wallet not found')
            }

            wallet.gamingWallet += gamingWalletAmount
            wallet.roiWallet += roiWalletAmount
            await wallet.save()

            // Create ROI investment for the roiWallet portion
            await RoiService.createRoiInvestment(
                userId,
                newTransaction._id.toString(),
                roiWalletAmount
            )

            // Process referral bonuses (direct 3%, indirect 1.5%)
            await processReferralBonuses(userId, netAmount, currency.symbol, currency.chain)

            // Create admin commission record if there's a fee
            if (fee > 0) {
                const adminCommission = new AdminCommission({
                    transactionId: newTransaction._id,
                    userId,
                    type: CommissionType.DEPOSIT_FEE,
                    amount: fee,
                    currency: currency.symbol,
                    network: currency.chain,
                    description: `Deposit fee for ${amount} ${currency.symbol} (${currency.depositFeeType === 'percentage' ? currency.depositFee + '%' : currency.depositFee + ' ' + currency.symbol})`,
                })
                await adminCommission.save()
            }

            // Update transaction metadata
            await Transaction.updateOne(
                { _id: newTransaction._id },
                {
                    'metadata.gamingWalletAmount': gamingWalletAmount,
                    'metadata.roiWalletAmount': roiWalletAmount,
                    'metadata.notes': 'TEST DEPOSIT - Processed successfully without blockchain verification',
                }
            )

            // Fetch updated transaction
            const updatedTransaction = await Transaction.findById(newTransaction._id)

            // Send deposit success notification
            try {
                console.log('🔥 [WalletService] Sending Firebase notification: DEPOSIT_SUCCESS (test deposit)', {
                    userId: userId.toString(),
                    amount: netAmount,
                    currency: currency.symbol,
                    transactionId: updatedTransaction?.transactionId,
                })
                await NotificationService.sendNotification({
                    userId: userId.toString(),
                    type: 'DEPOSIT_SUCCESS' as any,
                    data: {
                        amount: netAmount,
                        currency: currency.symbol,
                        transactionId: updatedTransaction?.transactionId,
                        mainWalletAmount: wallet.mainWallet,
                        gamingWalletAmount: wallet.gamingWallet,
                        roiWalletAmount: wallet.roiWallet,
                    },
                })
            } catch (notificationError: any) {
                // Log error but don't fail the deposit
                console.error('Failed to send test deposit success notification:', notificationError.message)
            }

            const feeMessage = fee > 0 ? ` (Fee: ${fee} ${currency.symbol})` : ''
            return {
                transaction: updatedTransaction,
                message: `TEST Deposit successful! ${gamingWalletAmount} ${currency.symbol} credited to Gaming Wallet and ${roiWalletAmount} ${currency.symbol} credited to ROI Wallet${feeMessage}. Note: This is a test deposit without blockchain verification.`,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Test deposit failed')
        }
    },

    withdrawal: async (
        userId: string,
        walletType: 'gamingWallet' | 'roiWallet',
        amount: number,
        withdrawalAddress: string,
        currencySymbol: string
    ): Promise<{
        transaction: any
        message: string
    }> => {
        try {
            // Validate wallet type
            if (walletType !== 'gamingWallet' && walletType !== 'roiWallet') {
                throw createBadRequestError('Invalid wallet type. Only gamingWallet and roiWallet are allowed for withdrawal')
            }

            // Get currency from database
            const currency = await CurrencyModel.findOne({
                symbol: currencySymbol.toUpperCase(),
                isActive: true,
            })

            if (!currency) {
                throw createBadRequestError(`Currency ${currencySymbol} not found or is not active`)
            }

            // Check if withdrawals are enabled for this currency
            if (!currency.withdrawalEnabled) {
                throw createBadRequestError(`Withdrawals are currently disabled for ${currency.symbol}`)
            }

            // Validate minimum withdrawal amount
            if (amount < currency.minimumWithdrawalAmount) {
                throw createBadRequestError(
                    `Minimum withdrawal amount for ${currency.symbol} is ${currency.minimumWithdrawalAmount}`
                )
            }

            // Calculate withdrawal fee based on currency fee type (percentage or fixed)
            // Fee is deducted FROM the requested amount — user receives (amount - fee)
            let networkFee = 0
            if (currency.withdrawalFee > 0) {
                if (currency.withdrawalFeeType === 'percentage') {
                    networkFee = (amount * currency.withdrawalFee) / 100
                } else {
                    networkFee = currency.withdrawalFee
                }
            }

            // Amount user actually receives after fee is taken out of their request
            const netAmount = amount - networkFee
            if (netAmount <= 0) {
                throw createBadRequestError(
                    `Withdrawal amount (${amount} ${currency.symbol}) must be greater than the network fee (${networkFee} ${currency.symbol})`
                )
            }

            // Get user wallet
            const wallet = await Wallet.findOne({ userId })
            if (!wallet) {
                throw createNotFoundError('Wallet not found')
            }

            // Check if user has enough balance — we only deduct `amount` from the wallet
            const walletBalance = wallet[walletType]

            // If withdrawing from ROI wallet, validate lock-in period
            if (walletType === 'roiWallet') {
                const roiValidation = await RoiService.canWithdrawFromRoi(userId, amount)

                if (!roiValidation.canWithdraw) {
                    throw createBadRequestError(
                        roiValidation.reason || `Insufficient unlocked balance in ROI wallet. Available: ${roiValidation.availableBalance} ${currency.symbol}, Required: ${amount} ${currency.symbol}, Locked: ${roiValidation.lockedBalance} ${currency.symbol}`
                    )
                }
            } else {
                // For gamingWallet, just check balance
                if (walletBalance < amount) {
                    throw createBadRequestError(
                        `Insufficient balance in ${walletType}. Available: ${walletBalance} ${currency.symbol}, Required: ${amount} ${currency.symbol}`
                    )
                }
            }

            // Deduct requested amount from wallet (fee is taken from this, not added on top)
            wallet[walletType] -= amount
            await wallet.save()

            // Create withdrawal transaction (pending, manual processing)
            const newTransaction = new Transaction({
                userId,
                category: TransactionCategory.WITHDRAWAL,
                status: TransactionStatus.PENDING,
                amount, // Amount debited from wallet
                currency: currency.symbol,
                network: currency.chain,
                fee: networkFee, // Network fee (deducted from `amount`)
                netAmount, // Amount the user actually receives (amount - fee)
                toAddress: withdrawalAddress, // User's withdrawal address
                fromAddress: null, // Will be filled by admin when processing
                blockchainVerified: false,
                metadata: {
                    walletType,     // Store source wallet so admin refund goes back to the right wallet
                    notes: `Withdrawal request from ${walletType}. Pending admin approval.`,
                },
            })
            await newTransaction.save()

            // Log network fee in AdminCommission
            if (networkFee > 0) {
                const adminCommission = new AdminCommission({
                    transactionId: newTransaction._id,
                    userId,
                    type: CommissionType.WITHDRAWAL_FEE,
                    amount: networkFee,
                    currency: currency.symbol,
                    network: currency.chain,
                    description: `Withdrawal fee for ${amount} ${currency.symbol} (${currency.withdrawalFeeType === 'percentage' ? currency.withdrawalFee + '%' : currency.withdrawalFee + ' ' + currency.symbol})`,
                })
                await adminCommission.save()
            }

            return {
                transaction: newTransaction,
                message: `Withdrawal request submitted successfully. ${amount} ${currency.symbol} deducted from your ${walletType}. You will receive ${netAmount} ${currency.symbol} after the network fee of ${networkFee} ${currency.symbol}. Your withdrawal will be processed by admin.`,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Withdrawal request failed')
        }
    },

    getTransactions: async (
        userId: string,
        type: 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'ROI_CREDIT' | 'GAME' | 'REFERRAL_BONUS' = 'ALL',
        page: number = 1,
        limit: number = 20
    ): Promise<{
        transactions: any[]
        totalCount: number
        currentPage: number
        totalPages: number
    }> => {
        try {
            // Build filter query
            const filter: any = { userId }

            // Add category filter based on type
            // DEPOSIT bucket also includes admin-credited funds; WITHDRAWAL bucket also includes admin-debited funds
            if (type === 'DEPOSIT') {
                filter.category = { $in: [TransactionCategory.DEPOSIT, TransactionCategory.ADMIN_CREDIT] }
            } else if (type === 'WITHDRAWAL') {
                filter.category = { $in: [TransactionCategory.WITHDRAWAL, TransactionCategory.ADMIN_DEBIT] }
            } else if (type === 'ROI_CREDIT') {
                filter.category = TransactionCategory.ROI_CREDIT
            } else if (type === 'GAME') {
                filter.category = { $in: [TransactionCategory.GAME_WIN, TransactionCategory.GAME_LOSE] }
            } else if (type === 'REFERRAL_BONUS') {
                filter.category = TransactionCategory.REFERRAL_BONUS
            }
            // If type is 'ALL', no category filter is applied

            // Calculate pagination
            const skip = (page - 1) * limit

            // Get total count for pagination
            const totalCount = await Transaction.countDocuments(filter)

            // Fetch transactions with pagination
            const transactions = await Transaction.find(filter)
                .sort({ createdAt: -1 }) // Most recent first
                .skip(skip)
                .limit(limit)
                .select('-__v') // Exclude version key
                .lean() // Return plain JavaScript objects for better performance

            // Calculate total pages
            const totalPages = Math.ceil(totalCount / limit)

            return {
                transactions,
                totalCount,
                currentPage: page,
                totalPages,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch transactions')
        }
    },

    getTransactionById: async (
        userId: string,
        transactionId: string
    ): Promise<any> => {
        try {
            // Try to find transaction by transactionId or MongoDB _id
            // First check if it's a MongoDB ObjectId format
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(transactionId)
            
            let transaction
            if (isObjectId) {
                // Search by MongoDB _id
                transaction = await Transaction.findOne({
                    _id: transactionId,
                    userId,
                })
                    .select('-__v')
                    .lean()
            } else {
                // Search by transactionId (e.g., TXN20251228143025001)
                transaction = await Transaction.findOne({
                    transactionId: transactionId,
                    userId,
                })
                    .select('-__v')
                    .lean()
            }

            if (!transaction) {
                throw createNotFoundError('Transaction not found or you do not have access to this transaction')
            }

            return transaction
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch transaction')
        }
    },

    /**
     * Admin: Approve a PENDING deposit (credit wallet, ROI, referral, commission, notification).
     */
    approvePendingDeposit: async (transactionId: string): Promise<{ transaction: any; message: string }> => {
        try {
            const transaction = await Transaction.findById(transactionId).lean();
            if (!transaction) {
                throw createNotFoundError('Transaction not found');
            }
            if (transaction.category !== TransactionCategory.DEPOSIT) {
                throw createBadRequestError('Transaction is not a deposit');
            }
            if (transaction.status !== TransactionStatus.PENDING) {
                throw createConflictError(`Deposit is already ${transaction.status.toLowerCase()}`);
            }

            const userId = (transaction as any).userId?.toString?.() || (transaction as any).userId;
            const currency = await CurrencyModel.findOne({ symbol: (transaction as any).currency, isActive: true });
            if (!currency) {
                throw createBadRequestError(`Currency ${(transaction as any).currency} not found or inactive`);
            }

            const amount = (transaction as any).amount;
            const fee = (transaction as any).fee ?? 0;
            const netAmount = (transaction as any).netAmount ?? amount - fee;

            const gamingWalletAmount = netAmount / 2;
            const roiWalletAmount = netAmount / 2;

            const wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                throw createNotFoundError('Wallet not found');
            }

            wallet.gamingWallet += gamingWalletAmount;
            wallet.roiWallet += roiWalletAmount;
            await wallet.save();

            await RoiService.createRoiInvestment(userId, transactionId, roiWalletAmount);
            await processReferralBonuses(userId, netAmount, (transaction as any).currency, (transaction as any).network);

            if (fee > 0) {
                const adminCommission = new AdminCommission({
                    transactionId: (transaction as any)._id,
                    userId,
                    type: CommissionType.DEPOSIT_FEE,
                    amount: fee,
                    currency: (transaction as any).currency,
                    network: (transaction as any).network,
                    description: `Deposit fee (admin approved) for ${amount} ${(transaction as any).currency}`,
                });
                await adminCommission.save();
            }

            await Transaction.updateOne(
                { _id: transactionId },
                {
                    status: TransactionStatus.COMPLETED,
                    blockchainVerified: true,
                    'metadata.gamingWalletAmount': gamingWalletAmount,
                    'metadata.roiWalletAmount': roiWalletAmount,
                    'metadata.notes': 'Deposit approved and processed by admin',
                }
            );

            const updatedTransaction = await Transaction.findById(transactionId);
            try {
                await NotificationService.sendNotification({
                    userId,
                    type: 'DEPOSIT_SUCCESS' as any,
                    data: {
                        amount: netAmount,
                        currency: (transaction as any).currency,
                        transactionId: (updatedTransaction as any)?.transactionId,
                        mainWalletAmount: wallet.mainWallet,
                        gamingWalletAmount: wallet.gamingWallet,
                        roiWalletAmount: wallet.roiWallet,
                    },
                });
            } catch (notificationError: any) {
                console.error('Failed to send deposit success notification:', notificationError.message);
            }

            return {
                transaction: updatedTransaction,
                message: `Deposit approved. ${gamingWalletAmount} ${(transaction as any).currency} credited to Gaming Wallet and ${roiWalletAmount} to ROI Wallet.`,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to approve deposit');
        }
    },
}

/**
 * Process referral bonuses for a deposit
 * Uses dynamic rates from InvestmentConfig (direct %, indirect %)
 */
async function processReferralBonuses(
    depositorUserId: string,
    depositAmount: number,
    currency: string,
    network: string
): Promise<void> {
    try {
        const config = await getInvestmentConfig()
        const directRate = config.directCommissionRate
        const indirectRate = config.indirectCommissionRate

        // Find the depositor's referral record
        const depositorReferral = await Referral.findOne({
            userId: new mongoose.Types.ObjectId(depositorUserId),
        })

        if (!depositorReferral || !depositorReferral.previousNode) {
            // No referrer, no bonuses to process
            return
        }

        // Direct referral (the person who referred the depositor)
        const directReferrerId = depositorReferral.previousNode
        const directReferrerReferral = await Referral.findOne({ userId: directReferrerId })

        if (directReferrerReferral) {
            // Calculate direct referral bonus using dynamic rate
            const directBonusAmount = (depositAmount * directRate) / 100

            // Credit to direct referrer's ROI wallet (ROI + Referral both go to ROI wallet)
            const directReferrerWallet = await Wallet.findOne({ userId: directReferrerId })
            if (directReferrerWallet) {
                directReferrerWallet.roiWallet += directBonusAmount
                await directReferrerWallet.save()

                // Create transaction record
                const directBonusTransaction = new Transaction({
                    userId: directReferrerId,
                    category: TransactionCategory.REFERRAL_BONUS,
                    status: TransactionStatus.COMPLETED,
                    amount: directBonusAmount,
                    currency,
                    network: 'INTERNAL',
                    fee: 0,
                    netAmount: directBonusAmount,
                    blockchainVerified: false,
                    metadata: {
                        roiWalletAmount: directReferrerWallet.roiWallet,
                        referralUserId: depositorUserId,
                        notes: `Direct referral bonus (${directRate}%) from deposit of ${depositAmount} ${currency}`,
                    },
                })
                await directBonusTransaction.save()

                // Send referral bonus notification to direct referrer
                try {
                    const depositorUser = await User.findById(depositorUserId).select('name')
                    const directReferrerReferral = await Referral.findOne({ userId: directReferrerId })
                    
                    console.log('🔥 [WalletService] Sending Firebase notification: REFERRAL_BONUS (direct)', {
                        userId: directReferrerId.toString(),
                        amount: directBonusAmount,
                        currency,
                        referredUserName: depositorUser?.name || 'User',
                    })
                    await NotificationService.sendNotification({
                        userId: directReferrerId.toString(),
                        type: 'REFERRAL_BONUS' as any,
                        data: {
                            amount: directBonusAmount,
                            currency,
                            referredUserName: depositorUser?.name || 'User',
                            totalReferrals: directReferrerReferral?.totalReferrals || 0,
                        },
                    })
                } catch (notificationError: any) {
                    console.error('Failed to send referral bonus notification:', notificationError.message)
                }
            }
        }

        // Indirect referral (the person who referred the direct referrer)
        if (directReferrerReferral && directReferrerReferral.previousNode) {
            const indirectReferrerId = directReferrerReferral.previousNode
            const indirectReferrerReferral = await Referral.findOne({ userId: indirectReferrerId })

            if (indirectReferrerReferral) {
                // Calculate indirect referral bonus using dynamic rate
                const indirectBonusAmount = (depositAmount * indirectRate) / 100

                // Credit to indirect referrer's ROI wallet (ROI + Referral both go to ROI wallet)
                const indirectReferrerWallet = await Wallet.findOne({ userId: indirectReferrerId })
                if (indirectReferrerWallet) {
                    indirectReferrerWallet.roiWallet += indirectBonusAmount
                    await indirectReferrerWallet.save()

                    // Create transaction record
                    const indirectBonusTransaction = new Transaction({
                        userId: indirectReferrerId,
                        category: TransactionCategory.REFERRAL_BONUS,
                        status: TransactionStatus.COMPLETED,
                        amount: indirectBonusAmount,
                        currency,
                        network: 'INTERNAL',
                        fee: 0,
                        netAmount: indirectBonusAmount,
                        blockchainVerified: false,
                        metadata: {
                            roiWalletAmount: indirectReferrerWallet.roiWallet,
                            referralUserId: depositorUserId,
                            notes: `Indirect referral bonus (${indirectRate}%) from deposit of ${depositAmount} ${currency}`,
                        },
                    })
                    await indirectBonusTransaction.save()

                    // Send referral bonus notification to indirect referrer
                    try {
                        const depositorUser = await User.findById(depositorUserId).select('name')
                        const indirectReferrerReferral = await Referral.findOne({ userId: indirectReferrerId })
                        
                        console.log('🔥 [WalletService] Sending Firebase notification: REFERRAL_BONUS (indirect)', {
                            userId: indirectReferrerId.toString(),
                            amount: indirectBonusAmount,
                            currency,
                            referredUserName: depositorUser?.name || 'User',
                        })
                        await NotificationService.sendNotification({
                            userId: indirectReferrerId.toString(),
                            type: 'REFERRAL_BONUS' as any,
                            data: {
                                amount: indirectBonusAmount,
                                currency,
                                referredUserName: depositorUser?.name || 'User',
                                totalReferrals: indirectReferrerReferral?.totalReferrals || 0,
                            },
                        })
                    } catch (notificationError: any) {
                        console.error('Failed to send referral bonus notification:', notificationError.message)
                    }
                }
            }
        }
    } catch (error: any) {
        // Log error but don't fail the deposit if referral bonus processing fails
        console.error('Error processing referral bonuses:', error.message)
    }
}

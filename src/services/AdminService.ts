import { createBadRequestError, createConflictError, createForbiddenError, createNotFoundError } from "../middleware/authentication";
import Admin from "../models/AdminModel";
import Currency from "../models/CurrencyModel";
import GameConfig from "../models/GameConfigModel";
import SystemConfig from "../models/SystemConfigModel";
import InvestmentConfigModel, { getInvestmentConfig as getInvestmentConfigFromModel } from "../models/InvestmentConfigModel";
import Game, { GameType } from "../models/GameModel";
import User from "../models/UserModel";
import Referral from "../models/ReferralModel";
import Transaction, { TransactionCategory, TransactionStatus } from "../models/TransactionModel";
import Wallet from "../models/WalletModel";
import RoiInvestment from "../models/RoiInvestmentModel";
import NotificationService from "./NotificationService";
import { NotificationType, NotificationChannel } from "../models/NotificationModel";
import mongoose from 'mongoose';
import { validatePassword, generateReferralCode } from '../utils/common';
import { clearGameConfigCache } from '../utils/gamesHelper';

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default {
    signup: async (name: string, email: string, password: string): Promise<{_id: string, name: string, email: string, role: string, permissions: string[]}> => {
        try {
            const checkAdmin = await Admin.findOne({ email });
            if (checkAdmin) {
                throw createConflictError('Email already exists');
            }
            const admin = new Admin({ name, email, password });
            const savedAdmin = await admin.save();
            return { _id: savedAdmin._id.toString(), name: savedAdmin.name, email: savedAdmin.email, role: savedAdmin.role, permissions: (savedAdmin as any).permissions ?? [] };
        } catch (error: any) {
            throw createConflictError(error.message || 'Admin already exists');
        }
    },
    signin: async (email: string): Promise<{_id: string, name: string, email: string, role: string, permissions: string[], password: string}> => {
        try {
            const admin = await Admin.findOne({ email });
            if (!admin) {
                throw createNotFoundError('Admin not found');
            }
            return { _id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role, permissions: (admin as any).permissions ?? [], password: admin.password };
        } catch (error: any) {
            throw createNotFoundError(error.message || 'Admin not found');
        }
    },

    getAdminList: async () => {
        const admins = await Admin.find({}, '-password').sort({ createdAt: -1 }).lean();
        return admins.map((a: any) => ({
            _id: a._id.toString(),
            name: a.name,
            email: a.email,
            role: a.role,
            permissions: a.permissions ?? [],
            isActive: a.isActive ?? true,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
        }));
    },

    createSubAdmin: async (name: string, email: string, password: string, permissions: string[]) => {
        const existing = await Admin.findOne({ email });
        if (existing) throw createConflictError('Email already exists');
        const admin = new Admin({ name, email, password, role: 'subadmin', permissions });
        const saved = await admin.save();
        return { _id: saved._id.toString(), name: saved.name, email: saved.email, role: saved.role, permissions: (saved as any).permissions ?? [], isActive: true };
    },

    updateSubAdmin: async (adminId: string, updates: { name?: string; permissions?: string[]; isActive?: boolean }) => {
        const admin = await Admin.findById(adminId);
        if (!admin) throw createNotFoundError('Admin not found');
        if (updates.name !== undefined) admin.name = updates.name;
        if (updates.permissions !== undefined) (admin as any).permissions = updates.permissions;
        if (updates.isActive !== undefined) (admin as any).isActive = updates.isActive;
        await admin.save();
        return { _id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role, permissions: (admin as any).permissions ?? [], isActive: (admin as any).isActive };
    },

    deleteSubAdmin: async (adminId: string) => {
        const admin = await Admin.findById(adminId);
        if (!admin) throw createNotFoundError('Admin not found');
        if (admin.role === 'superadmin' || admin.role === 'admin') throw createForbiddenError('Cannot delete superadmin');
        await Admin.deleteOne({ _id: adminId });
        return { success: true, message: 'Admin deleted successfully' };
    },
    getGameConfigs: async (gameType?: GameType, activeOnly?: boolean) => {
        try {
            // Get metrics: Active game configs count and total players count
            const activeGameConfigsCount = await GameConfig.countDocuments({ isActive: true });
            const totalPlayersCount = await User.countDocuments({});
            
            // Format players count (e.g., 2100 -> "2.1K+")
            const formatPlayersCount = (count: number): string => {
                if (count >= 1000) {
                    const kValue = (count / 1000).toFixed(1);
                    return `${kValue}K+`;
                }
                return `${count}+`;
            };

            if (gameType) {
                const config = await GameConfig.findOne({ 
                    gameType,
                    isActive: true 
                });
                if (!config) {
                    throw createNotFoundError(`Game configuration not found for ${gameType}`);
                }
                return {
                    ...config.toObject(),
                    metrics: {
                        activeConfigs: activeGameConfigsCount,
                        totalPlayers: totalPlayersCount,
                        totalPlayersFormatted: formatPlayersCount(totalPlayersCount),
                    }
                };
            } else {
                // Admin list: return configs (optionally only active) sorted by gameType
                const filter = activeOnly ? { isActive: true } : {};
                const configs = await GameConfig.find(filter).sort({ gameType: 1 }).lean();
                const formatted = configs.map((c: any) => ({
                    _id: c._id.toString(),
                    gameType: c.gameType,
                    gameName: c.gameName,
                    maxUserProfit: c.maxUserProfit,
                    maxUserLoss: c.maxUserLoss,
                    winProbability: c.winProbability,
                    winMultiplier: c.winMultiplier,
                    platformBalanceBuffer: c.platformBalanceBuffer,
                    maxSmallWinAmount: c.maxSmallWinAmount,
                    minBetAmount: c.minBetAmount,
                    maxBetAmount: c.maxBetAmount,
                    isActive: c.isActive,
                    metadata: c.metadata,
                    createdAt: c.createdAt,
                    updatedAt: c.updatedAt,
                }));
                return {
                    configs: formatted,
                    metrics: {
                        activeConfigs: activeGameConfigsCount,
                        totalPlayers: totalPlayersCount,
                        totalPlayersFormatted: formatPlayersCount(totalPlayersCount),
                    }
                };
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch game configurations');
        }
    },

    /**
     * Update a game config by id. Clears game config cache after update.
     */
    updateGameConfig: async (id: string, body: {
        gameName?: string;
        maxUserProfit?: number;
        maxUserLoss?: number;
        winProbability?: number;
        winMultiplier?: number;
        platformBalanceBuffer?: number;
        maxSmallWinAmount?: number;
        minBetAmount?: number;
        maxBetAmount?: number;
        isActive?: boolean;
        metadata?: { description?: string; rules?: string[]; notes?: string };
    }) => {
        try {
            const config = await GameConfig.findById(id);
            if (!config) {
                throw createNotFoundError('Game configuration not found');
            }
            if (body.winMultiplier !== undefined && body.winMultiplier < 2) {
                throw createBadRequestError('Win multiplier must be at least 2');
            }
            const allowed = ['gameName', 'maxUserProfit', 'maxUserLoss', 'winProbability', 'winMultiplier', 'platformBalanceBuffer', 'maxSmallWinAmount', 'minBetAmount', 'maxBetAmount', 'isActive', 'metadata'];
            for (const key of allowed) {
                if (body[key as keyof typeof body] !== undefined) {
                    (config as any)[key] = body[key as keyof typeof body];
                }
            }
            await config.save();
            clearGameConfigCache(config.gameType as GameType);
            return config;
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update game configuration');
        }
    },
    addCurrency: async (currencyData: {
        symbol: string;
        name: string;
        chain: string;
        depositAddress: string;
        colorCode?: string;
        image?: string;
        minimumDepositAmount?: number;
        minimumWithdrawalAmount?: number;
        depositFee?: number;
        depositFeeType?: string;
        withdrawalFee?: number;
        withdrawalFeeType?: string;
        isActive?: boolean;
        depositEnabled?: boolean;
        withdrawalEnabled?: boolean;
    }) => {
        try {
            // Check if currency with same symbol already exists
            const existingCurrency = await Currency.findOne({ symbol: currencyData.symbol.toUpperCase() });
            if (existingCurrency) {
                throw createConflictError(`Currency with symbol ${currencyData.symbol.toUpperCase()} already exists`);
            }

            // Create new currency
            const newCurrency = new Currency({
                symbol: currencyData.symbol.toUpperCase(),
                name: currencyData.name,
                chain: currencyData.chain.toUpperCase(),
                colorCode: currencyData.colorCode || null,
                image: currencyData.image || null,
                depositAddress: currencyData.depositAddress,
                minimumDepositAmount: currencyData.minimumDepositAmount || 0,
                minimumWithdrawalAmount: currencyData.minimumWithdrawalAmount || 0,
                depositFee: currencyData.depositFee || 0,
                depositFeeType: currencyData.depositFeeType || 'percentage',
                withdrawalFee: currencyData.withdrawalFee || 0,
                withdrawalFeeType: currencyData.withdrawalFeeType || 'percentage',
                isActive: currencyData.isActive !== undefined ? currencyData.isActive : true,
                depositEnabled: currencyData.depositEnabled !== undefined ? currencyData.depositEnabled : true,
                withdrawalEnabled: currencyData.withdrawalEnabled !== undefined ? currencyData.withdrawalEnabled : true,
            });

            await newCurrency.save();
            return newCurrency;
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to add currency');
        }
    },
    getCurrencyList: async (activeOnly?: boolean) => {
        try {
            const filter = activeOnly ? { isActive: true } : {};
            const list = await Currency.find(filter).sort({ symbol: 1 }).lean();
            return list.map((c: any) => ({
                _id: c._id.toString(),
                symbol: c.symbol,
                name: c.name,
                chain: c.chain,
                colorCode: c.colorCode ?? null,
                image: c.image ?? null,
                depositAddress: c.depositAddress,
                minimumDepositAmount: c.minimumDepositAmount ?? 0,
                minimumWithdrawalAmount: c.minimumWithdrawalAmount ?? 0,
                depositFee: c.depositFee ?? 0,
                depositFeeType: c.depositFeeType ?? 'percentage',
                withdrawalFee: c.withdrawalFee ?? 0,
                withdrawalFeeType: c.withdrawalFeeType ?? 'percentage',
                isActive: c.isActive ?? true,
                depositEnabled: c.depositEnabled ?? true,
                withdrawalEnabled: c.withdrawalEnabled ?? true,
                createdAt: c.createdAt,
                updatedAt: c.updatedAt,
            }));
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch currencies');
        }
    },
    updateCurrency: async (
        currencyId: string,
        updates: {
            name?: string;
            chain?: string;
            colorCode?: string | null;
            image?: string | null;
            depositAddress?: string;
            minimumDepositAmount?: number;
            minimumWithdrawalAmount?: number;
            depositFee?: number;
            depositFeeType?: string;
            withdrawalFee?: number;
            withdrawalFeeType?: string;
            isActive?: boolean;
            depositEnabled?: boolean;
            withdrawalEnabled?: boolean;
        }
    ) => {
        try {
            const currency = await Currency.findById(currencyId);
            if (!currency) throw createNotFoundError('Currency not found');
            if (updates.name !== undefined) currency.name = updates.name;
            if (updates.chain !== undefined) currency.chain = updates.chain.toUpperCase();
            if (updates.colorCode !== undefined) currency.colorCode = updates.colorCode ?? undefined;
            if (updates.image !== undefined) currency.image = updates.image ?? undefined;
            if (updates.depositAddress !== undefined) currency.depositAddress = updates.depositAddress;
            if (updates.minimumDepositAmount !== undefined) currency.minimumDepositAmount = updates.minimumDepositAmount;
            if (updates.minimumWithdrawalAmount !== undefined) currency.minimumWithdrawalAmount = updates.minimumWithdrawalAmount;
            if (updates.depositFee !== undefined) currency.depositFee = updates.depositFee;
            if (updates.depositFeeType !== undefined) currency.depositFeeType = updates.depositFeeType;
            if (updates.withdrawalFee !== undefined) currency.withdrawalFee = updates.withdrawalFee;
            if (updates.withdrawalFeeType !== undefined) currency.withdrawalFeeType = updates.withdrawalFeeType;
            if (updates.isActive !== undefined) currency.isActive = updates.isActive;
            if (updates.depositEnabled !== undefined) currency.depositEnabled = updates.depositEnabled;
            if (updates.withdrawalEnabled !== undefined) currency.withdrawalEnabled = updates.withdrawalEnabled;
            await currency.save();
            return currency;
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update currency');
        }
    },
    deleteCurrency: async (currencyId: string) => {
        try {
            const currency = await Currency.findById(currencyId);
            if (!currency) throw createNotFoundError('Currency not found');
            await Currency.findByIdAndDelete(currencyId);
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to delete currency');
        }
    },
    getSystemConfig: async () => {
        try {
            // Get or create system config (should only be one)
            let config = await SystemConfig.findOne();
            if (!config) {
                // Create default config if it doesn't exist
                config = new SystemConfig({
                    platformName: 'Winvest',
                    logo: null,
                    darkMode: false,
                    pushNotification: true,
                    twoFA: false,
                    biometricLogin: false,
                    maintenance: false,
                    maintenanceMessage: null,
                    supportEmail: 'support@winvest.com',
                    websiteDomain: null,
                });
                await config.save();
            }
            return config;
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch system configuration');
        }
    },
    updateSystemConfig: async (updates: {
        platformName?: string;
        logo?: string | null;
        darkMode?: boolean;
        pushNotification?: boolean;
        twoFA?: boolean;
        biometricLogin?: boolean;
        maintenance?: boolean;
        maintenanceMessage?: string | null;
        supportEmail?: string;
        websiteDomain?: string | null;
    }) => {
        try {
            // Get or create system config
            let config = await SystemConfig.findOne();
            if (!config) {
                config = new SystemConfig({
                    platformName: 'Winvest',
                    logo: null,
                    darkMode: false,
                    pushNotification: true,
                    twoFA: false,
                    biometricLogin: false,
                    maintenance: false,
                    maintenanceMessage: null,
                    supportEmail: 'support@winvest.com',
                    websiteDomain: null,
                });
            }

            // Update only provided fields
            if (updates.platformName !== undefined) config.platformName = updates.platformName.trim();
            if (updates.logo !== undefined) config.logo = updates.logo;
            if (updates.darkMode !== undefined) config.darkMode = updates.darkMode;
            if (updates.pushNotification !== undefined) config.pushNotification = updates.pushNotification;
            if (updates.twoFA !== undefined) config.twoFA = updates.twoFA;
            if (updates.biometricLogin !== undefined) config.biometricLogin = updates.biometricLogin;
            if (updates.maintenance !== undefined) config.maintenance = updates.maintenance;
            if (updates.maintenanceMessage !== undefined) config.maintenanceMessage = updates.maintenanceMessage || null;
            if (updates.supportEmail !== undefined) config.supportEmail = updates.supportEmail.trim();
            if (updates.websiteDomain !== undefined) config.websiteDomain = updates.websiteDomain ? updates.websiteDomain.trim() : null;

            await config.save();
            return config;
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update system configuration');
        }
    },

    getInvestmentConfig: async () => {
        try {
            return await getInvestmentConfigFromModel();
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch investment configuration');
        }
    },
    updateInvestmentConfig: async (updates: {
        directCommissionRate?: number;
        indirectCommissionRate?: number;
        monthlyRoiRate?: number;
    }) => {
        try {
            let config = await InvestmentConfigModel.findOne();
            if (!config) {
                config = new InvestmentConfigModel({
                    directCommissionRate: 3,
                    indirectCommissionRate: 1.5,
                    monthlyRoiRate: 8,
                });
                await config.save();
            }
            if (updates.directCommissionRate !== undefined) {
                if (updates.directCommissionRate < 0 || updates.directCommissionRate > 100) {
                    throw createBadRequestError('Direct commission rate must be between 0 and 100');
                }
                (config as any).directCommissionRate = updates.directCommissionRate;
            }
            if (updates.indirectCommissionRate !== undefined) {
                if (updates.indirectCommissionRate < 0 || updates.indirectCommissionRate > 100) {
                    throw createBadRequestError('Indirect commission rate must be between 0 and 100');
                }
                (config as any).indirectCommissionRate = updates.indirectCommissionRate;
            }
            if (updates.monthlyRoiRate !== undefined) {
                if (updates.monthlyRoiRate < 0 || updates.monthlyRoiRate > 100) {
                    throw createBadRequestError('Monthly ROI rate must be between 0 and 100');
                }
                (config as any).monthlyRoiRate = updates.monthlyRoiRate;
            }
            await config.save();
            return getInvestmentConfigFromModel();
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update investment configuration');
        }
    },

    /**
     * Upload platform logo to Cloudinary
     */
    uploadPlatformLogo: async (file: Express.Multer.File): Promise<string> => {
        try {
            const { uploadImageToCloudinary } = require('../utils/uploadHelper');
            const result = await uploadImageToCloudinary(file, 'platform', 'logo');
            
            // Update system config with new logo URL
            const config = await SystemConfig.findOne();
            if (config) {
                config.logo = result.secure_url;
                await config.save();
            }
            
            return result.secure_url;
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to upload logo');
        }
    },
    verifyWithdrawal: async (transactionId: string, adminId?: string) => {
        const transaction = await Transaction.findOne({ transactionId })
        if (!transaction) throw createNotFoundError('Transaction not found')
        if (transaction.category !== TransactionCategory.WITHDRAWAL) throw createBadRequestError('Transaction is not a withdrawal')
        if (transaction.status !== TransactionStatus.PENDING) {
            throw createConflictError(`Withdrawal cannot be verified — current status: ${transaction.status.toLowerCase()}`)
        }
        const updatePayload: any = {
            status: TransactionStatus.VERIFIED,
            'metadata.notes': 'Withdrawal verified by admin — awaiting superadmin approval',
        }
        if (adminId) updatePayload.verifiedBy = adminId
        await Transaction.updateOne({ transactionId }, updatePayload)
        return { success: true, message: 'Withdrawal verified successfully' }
    },

    processWithdrawal: async (transactionId: string, action: 'APPROVE' | 'REJECT', transactionHash?: string, reason?: string) => {
        try {
            // Find the withdrawal transaction
            const transaction = await Transaction.findOne({ transactionId })
            if (!transaction) {
                throw createNotFoundError('Transaction not found')
            }

            if (transaction.category !== TransactionCategory.WITHDRAWAL) {
                throw createBadRequestError('Transaction is not a withdrawal')
            }

            // Withdrawal must be verified before it can be approved or rejected
            if (transaction.status !== TransactionStatus.VERIFIED) {
                if (transaction.status === TransactionStatus.PENDING) {
                    throw createConflictError('Withdrawal must be verified first before it can be approved or rejected')
                }
                throw createConflictError(`Withdrawal is already ${transaction.status.toLowerCase()}`)
            }

            if (action === 'APPROVE') {
                if (!transactionHash) {
                    throw createBadRequestError('Transaction hash is required for approval')
                }

                // Update transaction status to completed
                await Transaction.updateOne(
            { transactionId },
                    {
                        status: TransactionStatus.COMPLETED,
                        transactionHash,
                        blockchainVerified: true,
                        'metadata.notes': 'Withdrawal approved and processed by admin',
                    }
                )

                // Send withdrawal approved notification
                try {
                    console.log('🔥 [AdminService] Sending Firebase notification: WITHDRAWAL_APPROVED', {
                        userId: transaction.userId.toString(),
                        amount: transaction.amount,
                        currency: transaction.currency,
                        transactionId: transaction.transactionId,
                        transactionHash,
                    })
                    await NotificationService.sendNotification({
                        userId: transaction.userId.toString(),
                        type: 'WITHDRAWAL_APPROVED' as any,
                        data: {
                            amount: transaction.amount,
                            currency: transaction.currency,
                            transactionId: transaction.transactionId,
                            transactionHash,
                            network: transaction.network,
                        },
                    })
                } catch (notificationError: any) {
                    console.error('Failed to send withdrawal approved notification:', notificationError.message)
                }

                return { success: true, message: 'Withdrawal approved successfully' }
            } else if (action === 'REJECT') {
                if (!reason) {
                    throw createBadRequestError('Rejection reason is required')
                }

                // Refund the deducted amount back to the original source wallet.
                // `transaction.amount` already equals what was debited (fee is taken out of it, not on top).
                const wallet = await Wallet.findOne({ userId: transaction.userId })
                const refundAmount = transaction.amount
                if (wallet) {
                    const sourceWallet = (transaction.metadata?.walletType as string) || 'roiWallet'
                    const validWallets = ['gamingWallet', 'roiWallet']
                    const targetWallet = validWallets.includes(sourceWallet) ? sourceWallet : 'roiWallet'
                    ;(wallet as any)[targetWallet] += refundAmount
                    await wallet.save()
                }

                // Update transaction status to rejected
                await Transaction.updateOne(
            { transactionId },
                    {
                        status: TransactionStatus.REJECTED,
                        'metadata.notes': `Withdrawal rejected by admin. Reason: ${reason}. Refunded ${refundAmount} ${transaction.currency} to ${(transaction.metadata?.walletType as string) || 'roiWallet'}.`,
                    }
                )

                // Send withdrawal rejected notification
                try {
                    console.log('🔥 [AdminService] Sending Firebase notification: WITHDRAWAL_REJECTED', {
                        userId: transaction.userId.toString(),
                        amount: transaction.amount,
                        currency: transaction.currency,
                        reason,
                    })
                    await NotificationService.sendNotification({
                        userId: transaction.userId.toString(),
                        type: 'WITHDRAWAL_REJECTED' as any,
                        data: {
                            amount: transaction.amount,
                            currency: transaction.currency,
                            reason,
                        },
                    })
                } catch (notificationError: any) {
                    console.error('Failed to send withdrawal rejected notification:', notificationError.message)
                }

                return { success: true, message: 'Withdrawal rejected successfully' }
            } else {
                throw createBadRequestError('Invalid action. Must be APPROVE or REJECT')
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to process withdrawal');
        }
    },
    sendNotificationToUsers: async (
        userIds: string[],
        title: string,
        message: string,
        options?: { sendInApp?: boolean; sendEmail?: boolean; sendPush?: boolean }
    ) => {
        try {
            const sendInApp = options?.sendInApp !== false
            const sendEmail = options?.sendEmail !== false
            const sendPush = options?.sendPush !== false

            if (!sendInApp && !sendEmail && !sendPush) {
                throw createBadRequestError('Select at least one channel: In-app, Push or Email')
            }

            const channels: NotificationChannel[] = []
            if (sendInApp) channels.push(NotificationChannel.IN_APP)
            if (sendEmail) channels.push(NotificationChannel.EMAIL)
            if (sendPush) channels.push(NotificationChannel.PUSH)

            const notifications = []
            for (const userId of userIds) {
                try {
                    console.log('[AdminService] Sending notification: SYSTEM_ANNOUNCEMENT', {
                        userId,
                        title,
                        message,
                        channels: channels.join(','),
                    })
                    const notification = await NotificationService.sendNotification({
                        userId,
                        type: NotificationType.SYSTEM_ANNOUNCEMENT,
                        customTitle: title,
                        customMessage: message,
                        channels,
                        data: {
                            title,
                            message,
                        },
                    })
                    notifications.push(notification)
                } catch (error: any) {
                    console.error(`Failed to send notification to user ${userId}:`, error.message)
                }
            }

            return {
                success: true,
                message: `Notifications sent to ${notifications.length} users`,
                notifications,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to send notifications')
        }
    },

    getDashboardStats: async () => {
        try {
            const now = new Date();
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

            const calculatePercentageChange = (current: number, previous: number): number => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return Number((((current - previous) / previous) * 100).toFixed(1));
            };

            const sumAgg = (
                category: TransactionCategory,
                field: '$amount' | '$netAmount',
                from: Date,
                to?: Date,
            ) =>
                Transaction.aggregate([
                    {
                        $match: {
                            category,
                            status: TransactionStatus.COMPLETED,
                            createdAt: to ? { $gte: from, $lte: to } : { $gte: from },
                        },
                    },
                    { $group: { _id: null, total: { $sum: field } } },
                ]);

            const [
                totalUsers,
                usersLastMonth,
                activeUserIds,
                activeUsersLastMonthIds,
                depositsCurrentMonth,
                depositsLastMonth,
                withdrawalsCurrentMonth,
                withdrawalsLastMonth,
                gamesPlayedCurrentMonth,
                gamesPlayedLastMonth,
                gameWinsCurrentMonth,
                gameWinsLastMonth,
                pendingWithdrawals,
                pendingDeposits,
            ] = await Promise.all([
                User.countDocuments({}),
                User.countDocuments({ createdAt: { $lt: startOfCurrentMonth } }),
                Transaction.distinct('userId', { createdAt: { $gte: startOfCurrentMonth } }),
                Transaction.distinct('userId', { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
                sumAgg(TransactionCategory.DEPOSIT, '$netAmount', startOfCurrentMonth),
                sumAgg(TransactionCategory.DEPOSIT, '$netAmount', startOfLastMonth, endOfLastMonth),
                sumAgg(TransactionCategory.WITHDRAWAL, '$amount', startOfCurrentMonth),
                sumAgg(TransactionCategory.WITHDRAWAL, '$amount', startOfLastMonth, endOfLastMonth),
                Game.countDocuments({ createdAt: { $gte: startOfCurrentMonth } }),
                Game.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
                sumAgg(TransactionCategory.GAME_WIN, '$amount', startOfCurrentMonth),
                sumAgg(TransactionCategory.GAME_WIN, '$amount', startOfLastMonth, endOfLastMonth),
                Transaction.countDocuments({ category: TransactionCategory.WITHDRAWAL, status: TransactionStatus.PENDING }),
                Transaction.countDocuments({ category: TransactionCategory.DEPOSIT, status: TransactionStatus.PENDING }),
            ]);

            const userGrowth = calculatePercentageChange(totalUsers, usersLastMonth);

            const activeUsers = activeUserIds.length;
            const activeUsersLastMonth = activeUsersLastMonthIds.length;
            const activeUserGrowth = calculatePercentageChange(activeUsers, activeUsersLastMonth);

            const totalDeposits = depositsCurrentMonth[0]?.total || 0;
            const totalDepositsLastMonth = depositsLastMonth[0]?.total || 0;
            const depositGrowth = calculatePercentageChange(totalDeposits, totalDepositsLastMonth);

            const totalWithdrawals = withdrawalsCurrentMonth[0]?.total || 0;
            const totalWithdrawalsLastMonth = withdrawalsLastMonth[0]?.total || 0;
            const withdrawalGrowth = calculatePercentageChange(totalWithdrawals, totalWithdrawalsLastMonth);

            const gamesPlayedGrowth = calculatePercentageChange(gamesPlayedCurrentMonth, gamesPlayedLastMonth);

            const totalGameWins = gameWinsCurrentMonth[0]?.total || 0;
            const totalGameWinsLastMonth = gameWinsLastMonth[0]?.total || 0;
            const platformRevenue = totalDeposits - totalWithdrawals - totalGameWins;
            const platformRevenueLastMonth = totalDepositsLastMonth - totalWithdrawalsLastMonth - totalGameWinsLastMonth;
            const revenueGrowth = calculatePercentageChange(platformRevenue, platformRevenueLastMonth);

            return {
                totalUsers: {
                    count: totalUsers,
                    percentageChange: userGrowth,
                    trend: userGrowth >= 0 ? 'up' : 'down'
                },
                activeUsers: {
                    count: activeUsers,
                    percentageChange: activeUserGrowth,
                    trend: activeUserGrowth >= 0 ? 'up' : 'down'
                },
                totalDeposits: {
                    amount: Number(totalDeposits.toFixed(2)),
                    percentageChange: depositGrowth,
                    trend: depositGrowth >= 0 ? 'up' : 'down'
                },
                totalWithdrawals: {
                    amount: Number(totalWithdrawals.toFixed(2)),
                    percentageChange: withdrawalGrowth,
                    trend: withdrawalGrowth >= 0 ? 'up' : 'down'
                },
                gamesPlayed: {
                    count: gamesPlayedCurrentMonth,
                    percentageChange: gamesPlayedGrowth,
                    trend: gamesPlayedGrowth >= 0 ? 'up' : 'down'
                },
                platformRevenue: {
                    amount: Number(platformRevenue.toFixed(2)),
                    percentageChange: revenueGrowth,
                    trend: revenueGrowth >= 0 ? 'up' : 'down'
                },
                pendingWithdrawals: {
                    count: pendingWithdrawals
                },
                pendingDeposits: {
                    count: pendingDeposits
                }
            };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch dashboard statistics');
        }
    },

    /**
     * Get recent transactions for admin dashboard
     * @param limit - Number of transactions to fetch (default: 10)
     * @returns Recent transactions with user details
     */
    getRecentTransactions: async (limit: number = 10) => {
        try {
            const transactions = await Transaction.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'name email')
                .lean()

            // Format the transactions for display
            const formattedTransactions = transactions.map(transaction => ({
                user: (transaction.userId as any)?.name || 'Unknown User',
                email: (transaction.userId as any)?.email || '',
                type: transaction.category.toLowerCase(),
                amount: transaction.amount,
                currency: transaction.currency || 'USDT',
                status: transaction.status.toLowerCase(),
                transactionId: transaction.transactionId,
                date: transaction.createdAt
            }))

            return formattedTransactions
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch recent transactions')
        }
    },

    /**
     * Get gaming stats: totalGames (from GameConfig count), totalBets, totalWins, totalLosses, platformProfit.
     */
    getGameStats: async () => {
        try {
            const [countResult, sumsResult] = await Promise.all([
                GameConfig.countDocuments(),
                Game.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalBets: { $sum: '$betAmount' },
                            totalWins: { $sum: '$winAmount' },
                            totalLosses: { $sum: '$lossAmount' },
                        },
                    },
                ]),
            ]);
            const sums = sumsResult[0] || { totalBets: 0, totalWins: 0, totalLosses: 0 };
            const totalBets = Number((sums.totalBets ?? 0).toFixed(2));
            const totalWins = Number((sums.totalWins ?? 0).toFixed(2));
            const totalLosses = Number((sums.totalLosses ?? 0).toFixed(2));
            const platformProfit = Number((totalBets - totalWins).toFixed(2));
            return {
                totalGames: countResult,
                totalBets,
                totalWins,
                totalLosses,
                platformProfit,
            };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch game stats');
        }
    },

    /**
     * Get recent games for admin dashboard
     * @param limit - Number of games to fetch (default: 10)
     * @returns Recent games with user details
     */
    getRecentGames: async (limit: number = 10) => {
        try {
            const games = await Game.find()
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('userId', 'name email')
                .lean()

            // Format the games for display
            const formattedGames = games.map(game => ({
                user: (game.userId as any)?.name || 'Unknown User',
                email: (game.userId as any)?.email || '',
                game: game.gameType === GameType.COLOR_CHANGER ? 'Color' : 'Dice',
                bet: game.betAmount,
                currency: 'USDT', // Platform uses USDT
                result: game.result.toLowerCase(),
                winAmount: game.winAmount || 0,
                gameId: game.gameId,
                date: game.createdAt
            }))

            return formattedGames
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch recent games')
        }
    },

    /**
     * Get all transactions list for admin with skip, limit, and optional fromDate, toDate, status, type, search (pagination).
     * type: all | deposit | withdrawal | game | referral | roi. Search is done by API (transactionId, userName, userEmail).
     */
    getTransactionList: async (
        skip: number = 0,
        limit: number = 10,
        fromDate?: string,
        toDate?: string,
        status?: string,
        type?: string,
        search?: string
    ) => {
        try {
            const matchStage: any = {};
            if (type && type !== 'all') {
                const typeLower = type.toLowerCase();
                if (typeLower === 'deposit') matchStage.category = TransactionCategory.DEPOSIT;
                else if (typeLower === 'withdrawal') matchStage.category = TransactionCategory.WITHDRAWAL;
                else if (typeLower === 'game') matchStage.category = { $in: [TransactionCategory.GAME_WIN, TransactionCategory.GAME_LOSE] };
                else if (typeLower === 'referral') matchStage.category = TransactionCategory.REFERRAL_BONUS;
                else if (typeLower === 'roi') matchStage.category = TransactionCategory.ROI_CREDIT;
                else if (typeLower === 'admin_credit') matchStage.category = TransactionCategory.ADMIN_CREDIT;
                else if (typeLower === 'admin_debit') matchStage.category = TransactionCategory.ADMIN_DEBIT;
                else if (typeLower === 'admin_adjustment') matchStage.category = { $in: [TransactionCategory.ADMIN_CREDIT, TransactionCategory.ADMIN_DEBIT] };
            }
            if (status && status !== 'all') {
                const statusLower = status.toLowerCase();
                const statusUpper = status.toUpperCase();
                // win / lose are game-result pseudo-statuses — translate to category filter
                if (statusLower === 'win') {
                    matchStage.category = TransactionCategory.GAME_WIN;
                } else if (statusLower === 'lose') {
                    matchStage.category = TransactionCategory.GAME_LOSE;
                } else if (['PENDING', 'VERIFIED', 'COMPLETED', 'FAILED', 'REJECTED'].includes(statusUpper)) {
                    matchStage.status = statusUpper;
                }
            }
            if (fromDate || toDate) {
                matchStage.createdAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.createdAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.createdAt.$lte = end;
                }
            }
            const searchTrimmed = search?.trim();
            const searchMatch = searchTrimmed
                ? {
                    $or: [
                        { transactionId: { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.referralCode': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                    ],
                }
                : null;

            const listPipeline: any[] = [
                { $match: Object.keys(matchStage).length ? matchStage : {} },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            ];
            if (searchMatch) listPipeline.push({ $match: searchMatch });
            listPipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        transactionId: 1,
                        userId: 1,
                        category: 1,
                        amount: 1,
                        currency: 1,
                        status: 1,
                        fee: 1,
                        netAmount: 1,
                        createdAt: 1,
                        userName: '$user.name',
                        userEmail: '$user.email',
                        userReferralCode: '$user.referralCode',
                    },
                },
            );

            let total: number;
            if (searchMatch) {
                const countPipeline: any[] = [
                    { $match: Object.keys(matchStage).length ? matchStage : {} },
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                    { $match: searchMatch },
                    { $count: 'total' },
                ];
                const countResult = await Transaction.aggregate(countPipeline);
                total = countResult[0]?.total ?? 0;
            } else {
                total = await Transaction.countDocuments(Object.keys(matchStage).length ? matchStage : {});
            }
            const transactions = await Transaction.aggregate(listPipeline);
            const categoryToType: Record<string, string> = {
                [TransactionCategory.DEPOSIT]: 'deposit',
                [TransactionCategory.WITHDRAWAL]: 'withdrawal',
                [TransactionCategory.GAME_WIN]: 'game',
                [TransactionCategory.GAME_LOSE]: 'game',
                [TransactionCategory.ROI_CREDIT]: 'roi',
                [TransactionCategory.REFERRAL_BONUS]: 'referral',
                [TransactionCategory.ADMIN_CREDIT]: 'admin_credit',
                [TransactionCategory.ADMIN_DEBIT]: 'admin_debit',
            };
            const formatted = transactions.map((t: any) => {
                // For game transactions, show win/lose instead of the underlying COMPLETED status
                let displayStatus: string
                if (t.category === TransactionCategory.GAME_WIN) displayStatus = 'win'
                else if (t.category === TransactionCategory.GAME_LOSE) displayStatus = 'lose'
                else displayStatus = t.status?.toLowerCase?.() || t.status
                return {
                    _id: t._id.toString(),
                    transactionId: t.transactionId,
                    userId: t.userId?.toString?.() || t.userId,
                    userName: t.userName || 'Unknown',
                    userEmail: t.userEmail || '',
                    userReferralCode: t.userReferralCode || '',
                    type: categoryToType[t.category] || t.category?.toLowerCase?.() || t.category,
                    amount: t.amount,
                    currency: t.currency,
                    status: displayStatus,
                    fee: t.fee,
                    netAmount: t.netAmount,
                    createdAt: t.createdAt,
                }
            });
            return { transactions: formatted, total };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch transaction list');
        }
    },

    /**
     * Get deposit stats per currency (based on active currencies in DB).
     * Returns total, pending, approved today, rejected today for each currency.
     */
    getDepositStats: async () => {
        try {
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);

            const [currencies, aggregated] = await Promise.all([
                Currency.find({ isActive: true }).sort({ symbol: 1 }).lean(),
                Transaction.aggregate([
                    { $match: { category: TransactionCategory.DEPOSIT } },
                    {
                        $group: {
                            _id: '$currency',
                            totalDeposits: { $sum: '$amount' },
                            pendingDeposits: {
                                $sum: { $cond: [{ $eq: ['$status', TransactionStatus.PENDING] }, '$amount', 0] },
                            },
                            approvedToday: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ['$status', TransactionStatus.COMPLETED] },
                                                { $gte: ['$createdAt', startOfToday] },
                                                { $lte: ['$createdAt', endOfToday] },
                                            ],
                                        },
                                        '$amount',
                                        0,
                                    ],
                                },
                            },
                            rejectedToday: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $eq: ['$status', TransactionStatus.REJECTED] },
                                                { $gte: ['$updatedAt', startOfToday] },
                                                { $lte: ['$updatedAt', endOfToday] },
                                            ],
                                        },
                                        '$amount',
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ]),
            ]);

            const statsByCurrency: Record<string, { totalDeposits: number; pendingDeposits: number; approvedToday: number; rejectedToday: number }> = {};
            aggregated.forEach((row: any) => {
                const key = (row._id || '').toUpperCase();
                statsByCurrency[key] = {
                    totalDeposits: row.totalDeposits ?? 0,
                    pendingDeposits: row.pendingDeposits ?? 0,
                    approvedToday: row.approvedToday ?? 0,
                    rejectedToday: row.rejectedToday ?? 0,
                };
            });

            const result = currencies.map((c: any) => {
                const symbol = (c.symbol || '').toUpperCase();
                const stats = statsByCurrency[symbol] || {
                    totalDeposits: 0,
                    pendingDeposits: 0,
                    approvedToday: 0,
                    rejectedToday: 0,
                };
                return {
                    symbol: c.symbol,
                    name: c.name,
                    colorCode: c.colorCode || null,
                    totalDeposits: Number(stats.totalDeposits.toFixed(2)),
                    pendingDeposits: Number(stats.pendingDeposits.toFixed(2)),
                    approvedToday: Number(stats.approvedToday.toFixed(2)),
                    rejectedToday: Number(stats.rejectedToday.toFixed(2)),
                };
            });

            return result;
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch deposit stats');
        }
    },

    /**
     * Get deposit list for admin with skip, limit, and optional currency, fromDate, toDate, status, search (pagination).
     * Search is done by API (transactionId, userName, userEmail).
     */
    getDepositList: async (
        skip: number = 0,
        limit: number = 10,
        currency?: string,
        fromDate?: string,
        toDate?: string,
        status?: string,
        search?: string
    ) => {
        try {
            const matchStage: any = { category: TransactionCategory.DEPOSIT };
            if (currency && currency !== 'all') {
                matchStage.currency = currency;
            }
            if (status && status !== 'all') {
                const statusUpper = status.toLowerCase() === 'duplicate_hash' ? 'DUPLICATE_HASH' : status.toUpperCase();
                if (['PENDING', 'VERIFIED', 'COMPLETED', 'FAILED', 'REJECTED', 'DUPLICATE_HASH'].includes(statusUpper)) {
                    matchStage.status = statusUpper;
                }
            }
            if (fromDate || toDate) {
                matchStage.createdAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.createdAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.createdAt.$lte = end;
                }
            }
            const searchTrimmed = search?.trim();
            const searchMatch = searchTrimmed
                ? {
                    $or: [
                        { transactionId: { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.referralCode': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                    ],
                }
                : null;

            const listPipeline: any[] = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            ];
            if (searchMatch) listPipeline.push({ $match: searchMatch });
            listPipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        transactionId: 1,
                        userId: 1,
                        amount: 1,
                        currency: 1,
                        network: 1,
                        status: 1,
                        fee: 1,
                        netAmount: 1,
                        transactionHash: { $ifNull: ['$transactionHash', '$metadata.duplicateTransactionHash'] },
                        createdAt: 1,
                        userName: '$user.name',
                        userEmail: '$user.email',
                        userReferralCode: '$user.referralCode',
                    },
                },
            );

            let total: number;
            if (searchMatch) {
                const countPipeline: any[] = [
                    { $match: matchStage },
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                    { $match: searchMatch },
                    { $count: 'total' },
                ];
                const countResult = await Transaction.aggregate(countPipeline);
                total = countResult[0]?.total ?? 0;
            } else {
                total = await Transaction.countDocuments(matchStage);
            }
            const deposits = await Transaction.aggregate(listPipeline);
            const formatted = deposits.map((d: any) => ({
                _id: d._id.toString(),
                transactionId: d.transactionId,
                userId: d.userId?.toString?.() || d.userId,
                userName: d.userName || 'Unknown',
                userEmail: d.userEmail || '',
                userReferralCode: d.userReferralCode || '',
                amount: d.amount,
                currency: d.currency,
                network: d.network,
                status: d.status?.toLowerCase?.() || d.status,
                fee: d.fee,
                netAmount: d.netAmount,
                transactionHash: d.transactionHash,
                createdAt: d.createdAt,
            }));
            return { deposits: formatted, total };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch deposit list');
        }
    },

    /**
     * Approve a PENDING deposit (credits wallet, ROI, referral, commission, notification via WalletService).
     */
    approveDeposit: async (transactionId: string) => {
        const WalletService = (await import('./WalletService')).default;
        return WalletService.approvePendingDeposit(transactionId);
    },

    /**
     * Reject a PENDING deposit (updates status, sends notification).
     */
    rejectDeposit: async (transactionId: string, reason: string) => {
        try {
            const transaction = await Transaction.findOne({ transactionId });
            if (!transaction) {
                throw createNotFoundError('Transaction not found');
            }
            if (transaction.category !== TransactionCategory.DEPOSIT) {
                throw createBadRequestError('Transaction is not a deposit');
            }
            if (transaction.status !== TransactionStatus.PENDING) {
                throw createConflictError(`Deposit is already ${transaction.status.toLowerCase()}`);
            }
            await Transaction.updateOne(
            { transactionId },
                {
                    status: TransactionStatus.REJECTED,
                    'metadata.notes': reason || 'Rejected by admin',
                }
            );
            try {
                await NotificationService.sendNotification({
                    userId: transaction.userId.toString(),
                    type: 'DEPOSIT_FAILED' as any,
                    data: {
                        amount: transaction.amount,
                        currency: transaction.currency,
                        transactionHash: transaction.transactionHash || '',
                        reason: reason || 'Deposit rejected by admin',
                    },
                });
            } catch (notificationError: any) {
                console.error('Failed to send deposit rejected notification:', notificationError.message);
            }
            return { success: true, message: 'Deposit rejected' };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to reject deposit');
        }
    },

    /**
     * Get withdrawal stats: total, pending, approved today, rejected today (amounts).
     */
    getWithdrawalStats: async () => {
        try {
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setUTCHours(23, 59, 59, 999);

            const [totalResult, pendingResult, approvedTodayResult, rejectedTodayResult] = await Promise.all([
                Transaction.aggregate([
                    { $match: { category: TransactionCategory.WITHDRAWAL } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
                Transaction.aggregate([
                    { $match: { category: TransactionCategory.WITHDRAWAL, status: TransactionStatus.PENDING } },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
                Transaction.aggregate([
                    {
                        $match: {
                            category: TransactionCategory.WITHDRAWAL,
                            status: TransactionStatus.COMPLETED,
                            createdAt: { $gte: startOfToday, $lte: endOfToday },
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
                Transaction.aggregate([
                    {
                        $match: {
                            category: TransactionCategory.WITHDRAWAL,
                            status: TransactionStatus.REJECTED,
                            createdAt: { $gte: startOfToday, $lte: endOfToday },
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
            ]);

            return {
                totalWithdrawals: Number((totalResult[0]?.total ?? 0).toFixed(2)),
                pendingWithdrawals: Number((pendingResult[0]?.total ?? 0).toFixed(2)),
                approvedToday: Number((approvedTodayResult[0]?.total ?? 0).toFixed(2)),
                rejectedToday: Number((rejectedTodayResult[0]?.total ?? 0).toFixed(2)),
            };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch withdrawal stats');
        }
    },

    /**
     * Get withdrawal list for admin with skip, limit, and optional fromDate, toDate, status, search (pagination).
     * Search is done by API (transactionId, userName, userEmail, toAddress).
     */
    getWithdrawalList: async (
        skip: number = 0,
        limit: number = 10,
        fromDate?: string,
        toDate?: string,
        status?: string,
        search?: string
    ) => {
        try {
            const matchStage: any = { category: TransactionCategory.WITHDRAWAL };
            if (status && status !== 'all') {
                const statusUpper = status.toUpperCase();
                if (['PENDING', 'VERIFIED', 'COMPLETED', 'FAILED', 'REJECTED'].includes(statusUpper)) {
                    matchStage.status = statusUpper;
                }
            }
            if (fromDate || toDate) {
                matchStage.createdAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.createdAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.createdAt.$lte = end;
                }
            }
            const searchTrimmed = search?.trim();
            const searchMatch = searchTrimmed
                ? {
                    $or: [
                        { transactionId: { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.referralCode': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { toAddress: { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                    ],
                }
                : null;

            const listPipeline: any[] = [
                { $match: matchStage },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                { $lookup: { from: 'admins', localField: 'verifiedBy', foreignField: '_id', as: 'verifier' } },
                { $unwind: { path: '$verifier', preserveNullAndEmptyArrays: true } },
            ];
            if (searchMatch) listPipeline.push({ $match: searchMatch });
            listPipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        transactionId: 1,
                        userId: 1,
                        amount: 1,
                        currency: 1,
                        network: 1,
                        status: 1,
                        fee: 1,
                        netAmount: 1,
                        toAddress: 1,
                        transactionHash: 1,
                        createdAt: 1,
                        verifiedBy: 1,
                        userName: '$user.name',
                        userEmail: '$user.email',
                        userReferralCode: '$user.referralCode',
                        verifiedByName: '$verifier.name',
                    },
                },
            );

            let total: number;
            if (searchMatch) {
                const countPipeline: any[] = [
                    { $match: matchStage },
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                    { $match: searchMatch },
                    { $count: 'total' },
                ];
                const countResult = await Transaction.aggregate(countPipeline);
                total = countResult[0]?.total ?? 0;
            } else {
                total = await Transaction.countDocuments(matchStage);
            }
            const withdrawals = await Transaction.aggregate(listPipeline);
            const formatted = withdrawals.map((w: any) => ({
                _id: w._id.toString(),
                transactionId: w.transactionId,
                userId: w.userId?.toString?.() || w.userId,
                userName: w.userName || 'Unknown',
                userEmail: w.userEmail || '',
                userReferralCode: w.userReferralCode || '',
                amount: w.amount,
                currency: w.currency,
                network: w.network,
                status: w.status?.toLowerCase?.() || w.status,
                fee: w.fee,
                netAmount: w.netAmount,
                toAddress: w.toAddress,
                transactionHash: w.transactionHash,
                createdAt: w.createdAt,
                verifiedBy: w.verifiedBy?.toString?.() || w.verifiedBy,
                verifiedByName: w.verifiedByName || null,
            }));
            return { withdrawals: formatted, total };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch withdrawal list');
        }
    },

    /**
     * Get user transaction summary for withdrawal verification (deposits, withdrawals, ROI, referral, gaming, total balance).
     */
    getUserVerificationSummary: async (userId: string) => {
        try {
            const uid = new mongoose.Types.ObjectId(userId);
            const [txSummary, wallet, transactions] = await Promise.all([
                Transaction.aggregate([
                    { $match: { userId: uid } },
                    {
                        $group: {
                            _id: '$category',
                            total: { $sum: '$amount' },
                            completedTotal: {
                                $sum: {
                                    $cond: [
                                        { $in: ['$status', [TransactionStatus.COMPLETED, TransactionStatus.VERIFIED]] },
                                        '$amount',
                                        0,
                                    ],
                                },
                            },
                        },
                    },
                ]),
                Wallet.findOne({ userId: uid }).lean(),
                Transaction.find({ userId: uid })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .select('transactionId category status amount currency netAmount createdAt')
                    .lean(),
            ]);
            const byCategory: Record<string, number> = {};
            txSummary.forEach((r: any) => {
                byCategory[r._id] = Number((r.total ?? 0).toFixed(2));
            });
            const mainWallet = Number(wallet?.mainWallet ?? 0);
            const gamingWallet = Number(wallet?.gamingWallet ?? 0);
            const roiWallet = Number(wallet?.roiWallet ?? 0);
            const totalBalance = Number((mainWallet + gamingWallet + roiWallet).toFixed(2));
            const txList = (transactions as any[]).map((t) => ({
                transactionId: t.transactionId,
                category: t.category,
                status: t.status?.toLowerCase?.() || t.status,
                amount: t.amount,
                netAmount: t.netAmount ?? t.amount,
                currency: t.currency,
                createdAt: t.createdAt,
            }));
            return {
                deposits: byCategory[TransactionCategory.DEPOSIT] ?? 0,
                withdrawals: byCategory[TransactionCategory.WITHDRAWAL] ?? 0,
                roi: byCategory[TransactionCategory.ROI_CREDIT] ?? 0,
                referral: byCategory[TransactionCategory.REFERRAL_BONUS] ?? 0,
                gamingWins: byCategory[TransactionCategory.GAME_WIN] ?? 0,
                gamingLosses: byCategory[TransactionCategory.GAME_LOSE] ?? 0,
                totalBalance,
                mainWallet,
                gamingWallet,
                roiWallet,
                transactions: txList,
            };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch user verification summary');
        }
    },

    /**
     * Get wallet stats: total balance (main+game+roi), total ROI wallet balance, total Game wallet balance.
     */
    getWalletStats: async () => {
        try {
            const [totalResult, roiResult, gameResult] = await Promise.all([
                Wallet.aggregate([
                    { $project: { total: { $add: ['$mainWallet', '$gamingWallet', '$roiWallet'] } } },
                    { $group: { _id: null, total: { $sum: '$total' } } },
                ]),
                Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$roiWallet' } } }]),
                Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$gamingWallet' } } }]),
            ]);
            return {
                totalBalance: Number((totalResult[0]?.total ?? 0).toFixed(2)),
                totalRoiWalletBalance: Number((roiResult[0]?.total ?? 0).toFixed(2)),
                totalGameWalletBalance: Number((gameResult[0]?.total ?? 0).toFixed(2)),
            };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch wallet stats');
        }
    },

    /**
     * Get wallet list for admin with skip, limit, optional search, fromDate, toDate (pagination).
     * Search by user name, email, userId. Date filter on wallet updatedAt.
     */
    getWalletList: async (
        skip: number = 0,
        limit: number = 10,
        search?: string,
        fromDate?: string,
        toDate?: string
    ) => {
        try {
            const matchStage: any = {};
            if (fromDate || toDate) {
                matchStage.updatedAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.updatedAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.updatedAt.$lte = end;
                }
            }
            const searchTrimmed = search?.trim();
            const searchMatch: { $or: any[] } | null = searchTrimmed
                ? {
                    $or: [
                        { userId: mongoose.Types.ObjectId.isValid(searchTrimmed) ? new mongoose.Types.ObjectId(searchTrimmed) : null },
                        { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                    ].filter((c: any) => c.userId !== null || c['user.name'] || c['user.email']),
                }
                : null;
            if (searchMatch && searchMatch.$or.length === 0) {
                searchMatch.$or = [{ _id: null }] as any[];
            }
            const listPipeline: any[] = [];
            if (Object.keys(matchStage).length) listPipeline.push({ $match: matchStage });
            listPipeline.push(
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            );
            if (searchMatch) {
                const searchOr: any[] = [
                    { 'user.name': { $regex: escapeRegex(searchTrimmed!), $options: 'i' } },
                    { 'user.email': { $regex: escapeRegex(searchTrimmed!), $options: 'i' } },
                    { 'user.referralCode': { $regex: escapeRegex(searchTrimmed!), $options: 'i' } },
                ];
                if (mongoose.Types.ObjectId.isValid(searchTrimmed!)) {
                    searchOr.push({ userId: new mongoose.Types.ObjectId(searchTrimmed!) });
                }
                listPipeline.push({ $match: { $or: searchOr } });
            }
            listPipeline.push(
                { $sort: { updatedAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        userId: 1,
                        mainWallet: 1,
                        gamingWallet: 1,
                        roiWallet: 1,
                        updatedAt: 1,
                        userName: '$user.name',
                        userEmail: '$user.email',
                        userReferralCode: '$user.referralCode',
                    },
                },
            );

            let total: number;
            if (searchTrimmed) {
                const countPipeline: any[] = [];
                if (Object.keys(matchStage).length) countPipeline.push({ $match: matchStage });
                countPipeline.push(
                    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
                    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                    { $match: { $or: [ { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } }, { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } }, ...(mongoose.Types.ObjectId.isValid(searchTrimmed) ? [{ userId: new mongoose.Types.ObjectId(searchTrimmed) }] : []) ] } },
                    { $count: 'total' },
                );
                const countResult = await Wallet.aggregate(countPipeline);
                total = countResult[0]?.total ?? 0;
            } else {
                total = await Wallet.countDocuments(matchStage);
            }
            const wallets = await Wallet.aggregate(listPipeline);
            const formatted = wallets.map((w: any) => {
                const main = w.mainWallet ?? 0;
                const game = w.gamingWallet ?? 0;
                const roi = w.roiWallet ?? 0;
                return {
                    _id: w._id.toString(),
                    userId: w.userId?.toString?.() || w.userId,
                    userName: w.userName || 'Unknown',
                    userEmail: w.userEmail || '',
                    userReferralCode: w.userReferralCode || '',
                    mainWallet: main,
                    gamingWallet: game,
                    roiWallet: roi,
                    totalBalance: main + game + roi,
                    updatedAt: w.updatedAt,
                };
            });
            return { wallets: formatted, total };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch wallet list');
        }
    },

    /**
     * Single API to add or deduct funds from a user wallet (ROI or Game wallet).
     * @param userId - User ID
     * @param walletType - 'gamingWallet' | 'roiWallet'
     * @param type - 'add' | 'deduct'
     * @param amount - Amount (positive number)
     * @param description - Reason/description
     */
    adjustWalletFunds: async (
        userId: string,
        walletType: 'gamingWallet' | 'roiWallet',
        type: 'add' | 'deduct',
        amount: number,
        description: string
    ) => {
        try {
            if (!userId || !walletType || !type || amount == null || amount <= 0) {
                throw createBadRequestError('userId, walletType (gamingWallet|roiWallet), type (add|deduct), and positive amount are required');
            }
            if (walletType !== 'gamingWallet' && walletType !== 'roiWallet') {
                throw createBadRequestError('walletType must be gamingWallet or roiWallet');
            }
            if (type !== 'add' && type !== 'deduct') {
                throw createBadRequestError('type must be add or deduct');
            }
            const wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                throw createNotFoundError('Wallet not found for user');
            }
            const current = Number(wallet.get(walletType)) || 0;
            if (type === 'deduct' && current < amount) {
                throw createBadRequestError(`Insufficient balance in ${walletType}. Current: ${current}`);
            }
            const newBalance = type === 'add' ? current + amount : current - amount;
            (wallet as any)[walletType] = newBalance;
            await wallet.save();

            // Record the admin adjustment as a transaction so it appears in the admin transactions list
            const adjustmentTransaction = new Transaction({
                userId,
                category: type === 'add' ? TransactionCategory.ADMIN_CREDIT : TransactionCategory.ADMIN_DEBIT,
                status: TransactionStatus.COMPLETED,
                amount,
                currency: 'USDT',
                network: 'INTERNAL',
                fee: 0,
                netAmount: amount,
                blockchainVerified: false,
                metadata: {
                    walletType,
                    [walletType === 'gamingWallet' ? 'gamingWalletAmount' : 'roiWalletAmount']: newBalance,
                    notes: description || (type === 'add'
                        ? `Admin added ${amount} to ${walletType}`
                        : `Admin deducted ${amount} from ${walletType}`),
                },
            });
            await adjustmentTransaction.save();

            return {
                wallet: {
                    _id: wallet._id.toString(),
                    userId: wallet.userId.toString(),
                    mainWallet: wallet.mainWallet,
                    gamingWallet: wallet.gamingWallet,
                    roiWallet: wallet.roiWallet,
                },
                message: type === 'add' ? `Added ${amount} to ${walletType}` : `Deducted ${amount} from ${walletType}`,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to adjust wallet funds');
        }
    },

    /**
     * Get user list for admin with skip, limit, and optional status filter (pagination)
     * Returns users with roiWallet, gamingWallet, walletBalance, referral code, status, joined date
     * @param status - optional 'active' | 'suspended' | 'inactive' | 'noDeposits'
     *   - inactive: users with zero total balance (main + gaming + roi)
     *   - noDeposits: users who have never completed a deposit
     */
    getUserList: async (skip: number = 0, limit: number = 10, status?: 'active' | 'suspended' | 'inactive' | 'noDeposits', search?: string, fromDate?: string, toDate?: string) => {
        try {
            const pipeline: any[] = [];

            const searchTrimmed = search?.trim();
            if (searchTrimmed) {
                const regex = { $regex: escapeRegex(searchTrimmed), $options: 'i' };
                pipeline.push({
                    $match: {
                        $or: [
                            { name: regex },
                            { email: regex },
                            { phone: regex },
                            { referralCode: regex },
                        ],
                    },
                });
            }

            if (fromDate || toDate) {
                const dateMatch: any = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    dateMatch.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    dateMatch.$lte = end;
                }
                pipeline.push({ $match: { createdAt: dateMatch } });
            }

            // Initial status match (active/suspended) - excludes inactive/noDeposits from this stage
            if (status === 'active' || status === 'suspended') {
                const matchStage = status === 'active'
                    ? { $match: { $or: [{ status: 'active' }, { status: { $exists: false } }, { status: null }] } }
                    : { $match: { status: 'suspended' } };
                pipeline.push(matchStage);
            }

            // noDeposits: exclude users who have completed at least one deposit
            if (status === 'noDeposits') {
                const userIdsWithDeposits = await Transaction.distinct('userId', {
                    category: TransactionCategory.DEPOSIT,
                    status: TransactionStatus.COMPLETED,
                });
                pipeline.push({
                    $match: { _id: { $nin: userIdsWithDeposits } },
                });
            }

            pipeline.push(
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: 'wallets',
                        localField: '_id',
                        foreignField: 'userId',
                        as: 'wallet',
                    },
                },
                {
                    $unwind: {
                        path: '$wallet',
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $addFields: {
                        mainWallet: { $ifNull: ['$wallet.mainWallet', 0] },
                        gamingWallet: { $ifNull: ['$wallet.gamingWallet', 0] },
                        roiWallet: { $ifNull: ['$wallet.roiWallet', 0] },
                        walletBalance: {
                            $add: [
                                { $ifNull: ['$wallet.mainWallet', 0] },
                                { $ifNull: ['$wallet.gamingWallet', 0] },
                                { $ifNull: ['$wallet.roiWallet', 0] },
                            ],
                        },
                    },
                },
            );

            // inactive: filter users with zero total balance
            if (status === 'inactive') {
                pipeline.push({ $match: { walletBalance: 0 } });
            }

            // Count total before skip/limit (for pagination)
            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await User.aggregate(countPipeline);
            const total = countResult[0]?.total ?? 0;

            pipeline.push({ $skip: skip }, { $limit: limit });
            pipeline.push({
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    phone: 1,
                    password: 1,
                    referralCode: 1,
                    status: 1,
                    createdAt: 1,
                    mainWallet: 1,
                    gamingWallet: 1,
                    roiWallet: 1,
                    walletBalance: 1,
                    withdrawalLimit: 1,
                },
            });

            const users = await User.aggregate(pipeline);
            const formatted = users.map((u: any) => ({
                _id: u._id.toString(),
                name: u.name,
                email: u.email,
                phone: u.phone || '',
                password: u.password || '',
                referralCode: u.referralCode || '',
                status: u.status || 'active',
                joinedDate: u.createdAt,
                mainWallet: u.mainWallet ?? 0,
                gamingWallet: u.gamingWallet ?? 0,
                roiWallet: u.roiWallet ?? 0,
                walletBalance: u.walletBalance ?? 0,
                withdrawalLimit: u.withdrawalLimit ?? null,
            }));
            return { users: formatted, total };
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch user list');
        }
    },

    /**
     * Update user status (active | suspended)
     */
    updateUserStatus: async (userId: string, status: 'active' | 'suspended') => {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw createNotFoundError('User not found');
            }
            user.status = status;
            await user.save();
            return {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                status: user.status,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update user status');
        }
    },

    /**
     * Update user by id (admin). Payload: name, email, phone, status, password (all optional but at least one).
     */
    updateUser: async (userId: string, payload: { name?: string; email?: string; phone?: string; status?: 'active' | 'suspended'; password?: string }) => {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw createNotFoundError('User not found');
            }
            const { name, email, phone, status, password } = payload;
            if (email !== undefined) {
                const existingByEmail = await User.findOne({ email, _id: { $ne: userId } });
                if (existingByEmail) throw createConflictError('Another user already has this email');
                user.email = email;
            }
            if (phone !== undefined) {
                const existingByPhone = await User.findOne({ phone, _id: { $ne: userId } });
                if (existingByPhone) throw createConflictError('Another user already has this phone');
                user.phone = phone;
            }
            if (name !== undefined) user.name = name;
            if (status !== undefined && ['active', 'suspended'].includes(status)) user.status = status;
            if (password !== undefined && password.trim() !== '') {
                const passwordValidation = validatePassword(password);
                if (!passwordValidation.isValid) {
                    throw createBadRequestError(passwordValidation.error || 'Invalid password');
                }
                user.password = password;
            }
            await user.save();
            return {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status || 'active',
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update user');
        }
    },

    setUserWithdrawalLimit: async (userId: string, payload: { enabled: boolean; period: string; amount: number }) => {
        try {
            const user = await User.findById(userId);
            if (!user) throw createNotFoundError('User not found');
            const { enabled, period, amount } = payload;
            if (!['daily','weekly','monthly'].includes(period)) throw createBadRequestError('Invalid period');
            if (amount < 0) throw createBadRequestError('Amount must be >= 0');
            (user as any).withdrawalLimit = { enabled, period: period as 'daily' | 'weekly' | 'monthly', amount };
            await user.save();
            return { _id: user._id.toString(), withdrawalLimit: (user ).withdrawalLimit };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to set withdrawal limit');
        }
    },

    /**
     * Apply a withdrawal limit to ALL users in one go.
     * Overwrites any individual per-user limit settings.
     */
    setBulkWithdrawalLimit: async (payload: { enabled: boolean; period: string; amount: number }) => {
        try {
            const { enabled, period, amount } = payload;
            if (!['daily', 'weekly', 'monthly'].includes(period)) throw createBadRequestError('Invalid period. Must be daily, weekly, or monthly');
            if (amount < 0) throw createBadRequestError('Amount must be >= 0');
            const result = await User.updateMany(
                {},
                { $set: { withdrawalLimit: { enabled, period: period as 'daily' | 'weekly' | 'monthly', amount } } }
            );
            return { updatedCount: result.modifiedCount };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to apply bulk withdrawal limit');
        }
    },

    /**
     * Create a new user (admin). Payload: name, email, phone, password, referralCode (optional).
     * User is created as verified; Wallet and Referral records are created via hooks/flow.
     */
    createUser: async (payload: {
        name: string;
        email: string;
        phone: string;
        password: string;
        referralCode?: string;
    }) => {
        try {
            const { name, email, phone, password, referralCode } = payload;
            const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
            if (existingUser) {
                if (existingUser.email === email && existingUser.phone === phone) {
                    throw createConflictError('User already registered with this email and phone');
                }
                throw createConflictError(
                    existingUser.email === email
                        ? 'User already registered with this email'
                        : 'User already registered with this phone'
                );
            }
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                throw createBadRequestError(passwordValidation.error || 'Invalid password');
            }
            let referrerUserId: mongoose.Types.ObjectId | null = null;
            if (referralCode && referralCode.trim()) {
                const referrer = await Referral.findOne({ referralCode: referralCode.trim(), isActive: true });
                if (!referrer) {
                    throw createBadRequestError('Invalid referral code');
                }
                referrerUserId = referrer.userId as mongoose.Types.ObjectId;
            }
            const newUser = new User({
                name,
                email,
                phone,
                password: password,
                isVerified: true,
                status: 'active',
            });
            const savedUser = await newUser.save();
            const userReferralCode = generateReferralCode(savedUser._id.toString());
            let level = 0;
            if (referrerUserId) {
                const referrerData = await Referral.findOne({ userId: referrerUserId });
                level = referrerData ? referrerData.level + 1 : 1;
            }
            const newReferral = new Referral({
                userId: savedUser._id,
                referralCode: userReferralCode,
                previousNode: referrerUserId || null,
                nextNodes: [],
                level,
                totalReferrals: 0,
                isActive: true,
            });
            await newReferral.save();
            await User.updateOne({ _id: savedUser._id }, { referralCode: userReferralCode });
            if (referrerUserId) {
                await Referral.updateOne(
                    { userId: referrerUserId },
                    { $push: { nextNodes: savedUser._id }, $inc: { totalReferrals: 1 } }
                );
            }
            return {
                _id: savedUser._id.toString(),
                name: savedUser.name,
                email: savedUser.email,
                phone: savedUser.phone,
                referralCode: userReferralCode,
                status: savedUser.status || 'active',
                isVerified: true,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to create user');
        }
    },

    /**
     * List all ROI investments for admin with filters (search, isActive, fromDate, toDate) and pagination.
     */
    getInvestmentList: async (
        skip: number = 0,
        limit: number = 20,
        search?: string,
        isActive?: 'all' | 'active' | 'paused',
        fromDate?: string,
        toDate?: string
    ) => {
        try {
            const matchStage: any = {};
            if (isActive && isActive !== 'all') {
                matchStage.isActive = isActive === 'active';
            }
            if (fromDate || toDate) {
                matchStage.createdAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.createdAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.createdAt.$lte = end;
                }
            }
            const searchTrimmed = search?.trim();
            const pipeline: any[] = [
                { $match: Object.keys(matchStage).length ? matchStage : {} },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            ];
            if (searchTrimmed) {
                pipeline.push({
                    $match: {
                        $or: [
                            { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                            { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                            { 'user.referralCode': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        ],
                    },
                });
            }
            const countPipeline = [...pipeline, { $count: 'total' }];
            const [countResult] = await RoiInvestment.aggregate(countPipeline);
            const total = countResult?.total ?? 0;
            pipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        userId: 1,
                        depositTransactionId: 1,
                        principalAmount: 1,
                        currentBalance: 1,
                        lockInPeriod: 1,
                        lockInStartDate: 1,
                        lockInEndDate: 1,
                        isLocked: 1,
                        lastRoiCalculationDate: 1,
                        totalRoiEarned: 1,
                        isActive: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        'user.email': 1,
                        'user.name': 1,
                        'user.referralCode': 1,
                    },
                }
            );
            const rawList = await RoiInvestment.aggregate(pipeline);
            const list = rawList.map((item: any) => {
                const referralCode = item.user?.referralCode || '';
                return {
                    ...item,
                    userReferralCode: referralCode,
                    user: { ...(item.user || {}), referralCode },
                };
            });
            return { list, total };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to fetch investments');
        }
    },

    /**
     * Update investment isActive (pause or start). Admin only.
     */
    updateInvestmentActive: async (investmentId: string, isActive: boolean) => {
        try {
            const investment = await RoiInvestment.findByIdAndUpdate(
                investmentId,
                { isActive },
                { new: true }
            );
            if (!investment) {
                throw createNotFoundError('Investment not found');
            }
            return investment;
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update investment');
        }
    },

    /**
     * Get investment stats (total amount, active count, total ROI earned, current balance).
     */
    getInvestmentStats: async () => {
        try {
            const stats = await RoiInvestment.aggregate([
                {
                    $group: {
                        _id: null,
                        totalInvestmentAmount: { $sum: '$principalAmount' },
                        totalCurrentBalance: { $sum: '$currentBalance' },
                        totalRoiEarned: { $sum: '$totalRoiEarned' },
                        totalInvestments: { $sum: 1 },
                        activeInvestments: {
                            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                        },
                    },
                },
            ]);

            if (!stats || stats.length === 0) {
                return {
                    totalInvestmentAmount: 0,
                    totalCurrentBalance: 0,
                    totalRoiEarned: 0,
                    totalInvestments: 0,
                    activeInvestments: 0,
                };
            }

            return {
                totalInvestmentAmount: stats[0].totalInvestmentAmount || 0,
                totalCurrentBalance: stats[0].totalCurrentBalance || 0,
                totalRoiEarned: stats[0].totalRoiEarned || 0,
                totalInvestments: stats[0].totalInvestments || 0,
                activeInvestments: stats[0].activeInvestments || 0,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to fetch investment stats');
        }
    },

    /**
     * Get user and teams stats (total users, active teams, total referrals).
     */
    getUserTeamsStats: async () => {
        try {
            const [userCount, referralStats] = await Promise.all([
                User.countDocuments(),
                Referral.aggregate([
                    {
                        $group: {
                            _id: null,
                            totalReferrals: { $sum: '$totalReferrals' },
                            activeTeams: {
                                $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $gt: ['$totalReferrals', 0] }] }, 1, 0] }
                            },
                        },
                    },
                ]),
            ]);

            return {
                totalUsers: userCount || 0,
                activeTeams: referralStats[0]?.activeTeams || 0,
                totalReferrals: referralStats[0]?.totalReferrals || 0,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to fetch user teams stats');
        }
    },

    /**
     * Get user and teams list with filters (search, fromDate, toDate) and pagination.
     */
    getUserTeamsList: async (
        skip: number = 0,
        limit: number = 20,
        search?: string,
        fromDate?: string,
        toDate?: string
    ) => {
        try {
            const matchStage: any = {};
            
            if (fromDate || toDate) {
                matchStage.createdAt = {};
                if (fromDate) {
                    const start = new Date(fromDate);
                    start.setUTCHours(0, 0, 0, 0);
                    matchStage.createdAt.$gte = start;
                }
                if (toDate) {
                    const end = new Date(toDate);
                    end.setUTCHours(23, 59, 59, 999);
                    matchStage.createdAt.$lte = end;
                }
            }

            const searchTrimmed = search?.trim();
            const pipeline: any[] = [
                { $match: Object.keys(matchStage).length ? matchStage : {} },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user',
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            ];

            if (searchTrimmed) {
                pipeline.push({
                    $match: {
                        $or: [
                            { 'user.email': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                            { 'user.name': { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                            { referralCode: { $regex: escapeRegex(searchTrimmed), $options: 'i' } },
                        ],
                    },
                });
            }

            const countPipeline = [...pipeline, { $count: 'total' }];
            const [countResult] = await Referral.aggregate(countPipeline);
            const total = countResult?.total ?? 0;

            pipeline.push(
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                {
                    $project: {
                        _id: 1,
                        userId: { $toString: '$userId' },
                        referralCode: 1,
                        level: 1,
                        isActive: 1,
                        createdAt: 1,
                        'user.email': 1,
                        'user.name': 1,
                        directReferrals: { $size: { $ifNull: ['$nextNodes', []] } }, // Immediate children
                        totalReferrals: { $size: { $ifNull: ['$nextNodes', []] } }, // Use calculated value for consistency
                        teamSize: { $size: { $ifNull: ['$nextNodes', []] } }, // Same for now (would need recursive calculation for full network)
                    },
                }
            );

            const list = await Referral.aggregate(pipeline);
            return { list, total };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to fetch user teams list');
        }
    },

    /**
     * Get team tree for a specific user (referral network).
     */
    getUserTeamTree: async (userId: string) => {
        try {
            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw createBadRequestError('Invalid user ID format');
            }

            const referral = await Referral.findOne({ userId: new mongoose.Types.ObjectId(userId) })
                .populate('userId', 'name email')
                .lean();

            if (!referral) {
                throw createNotFoundError('User referral data not found');
            }

            // Check if user still exists (population succeeded)
            if (!referral.userId) {
                throw createNotFoundError('User associated with this referral has been deleted');
            }

            // Recursive function to build tree
            const buildTree = async (refData: any, depth: number = 0): Promise<any> => {
                // Handle case where userId population failed (user deleted)
                if (!refData.userId || !refData.userId._id) {
                    return null;
                }

                if (depth > 5 || !refData.nextNodes || refData.nextNodes.length === 0) {
                    return {
                        id: refData.userId._id.toString(),
                        name: refData.userId.name || 'Unknown User',
                        email: refData.userId.email || 'No email',
                        level: refData.level + 1,
                        directReferrals: refData.nextNodes?.length || 0,
                        earnings: 0, // Can be calculated from transactions if needed
                        children: [],
                    };
                }

                const children = await Promise.all(
                    refData.nextNodes.slice(0, 10).map(async (childId: any) => { // Limit to 10 direct children for performance
                        const childReferral = await Referral.findOne({ userId: childId })
                            .populate('userId', 'name email')
                            .lean();
                        if (childReferral) {
                            return await buildTree(childReferral, depth + 1);
                        }
                        return null;
                    })
                );

                return {
                    id: refData.userId._id.toString(),
                    name: refData.userId.name || 'Unknown User',
                    email: refData.userId.email || 'No email',
                    level: refData.level + 1,
                    directReferrals: refData.nextNodes?.length || 0,
                    earnings: 0, // Can be calculated from transactions if needed
                    children: children.filter(Boolean),
                };
            };

            const tree = await buildTree(referral);
            
            // If tree is null (user was deleted), return empty structure
            if (!tree) {
                throw createNotFoundError('User data is incomplete or user has been deleted');
            }
            
            return tree;
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to fetch user team tree');
        }
    },

    /**
     * Get admin profile by ID.
     */
    getAdminProfile: async (adminId: string) => {
        try {
            const admin = await Admin.findById(adminId).select('-password');
            if (!admin) {
                throw createNotFoundError('Admin not found');
            }
            return {
                _id: admin._id.toString(),
                name: admin.name,
                email: admin.email,
                role: admin.role,
                createdAt: admin.createdAt,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createNotFoundError('Admin not found');
        }
    },

    /**
     * Update admin profile (name, email, password).
     */
    updateAdminProfile: async (
        adminId: string,
        name: string,
        email: string,
        currentPassword?: string,
        newPassword?: string
    ) => {
        try {
            const admin = await Admin.findById(adminId);
            if (!admin) {
                throw createNotFoundError('Admin not found');
            }

            // Check if email is already taken by another admin
            if (email !== admin.email) {
                const existingAdmin = await Admin.findOne({ email });
                if (existingAdmin) {
                    throw createConflictError('Email already in use by another admin');
                }
            }

            // If changing password, verify current password
            if (newPassword && currentPassword) {
                const isPasswordValid = currentPassword === admin.password;
                if (!isPasswordValid) {
                    throw createBadRequestError('Current password is incorrect');
                }
                admin.password = newPassword;
            }

            admin.name = name;
            admin.email = email;
            await admin.save();

            return {
                _id: admin._id.toString(),
                name: admin.name,
                email: admin.email,
                role: admin.role,
                createdAt: admin.createdAt,
            };
        } catch (error: any) {
            if (error.statusCode) throw error;
            throw createBadRequestError(error.message || 'Failed to update profile');
        }
    },
};
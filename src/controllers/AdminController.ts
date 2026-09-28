
import { HttpStatusCode } from "../enums/App";
import { Request, Response } from "express";
import { AdminService } from "../services/index";
import SupportTicketService from "../services/SupportTicketService";
import { generateTokens } from "../utils/authHelpers";
import { createUnauthorizedError } from "../middleware/authentication";
import { GameType } from "../models/GameModel";
import { triggerRoiCalculation } from "../utils/roiCronJob";
import { SupportTicketStatus } from "../models/SupportTicketModel";

export default {
    signup: async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, email, password } = req.body;
            const result = await AdminService.signup(name, email, password);
            const token = generateTokens({ id: result._id, email: result.email, role: result.role, permissions: result.permissions ?? [] });
            if (result) {
                res.status(HttpStatusCode.OK).json({ message: 'Admin Created Successfully', data: {...result, token}});
            } else {
                res.status(HttpStatusCode.BAD_REQUEST).json({ message: 'Admin not created', data: null });
            }
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error', data: null });
        }
    },
    signin: async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
            const result = await AdminService.signin(email);
            const isPasswordValid = password === result.password;
            if (!isPasswordValid) {
                throw createUnauthorizedError('Invalid password');
            }
            delete (result as any).password;
            const token = generateTokens({ id: result._id, email: result.email, role: result.role, permissions: result.permissions ?? [] });
            res.status(HttpStatusCode.OK).json({ message: 'Admin Signed In', data: {...result, token}});
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error', data: null });
        }
    },
    getGameConfigs: async (req: Request, res: Response): Promise<void> => {
        try {
            const { gameType, activeOnly } = req.query;
            const activeOnlyFlag = activeOnly === 'true';
            const configs = await AdminService.getGameConfigs(gameType as GameType | undefined, activeOnlyFlag);
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: gameType ? 'Game configuration fetched successfully' : 'Game configurations fetched successfully',
                data: configs
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },

    /**
     * Update game config by id. Body: gameName, maxUserProfit, winProbability, winMultiplier, minBetAmount, maxBetAmount, isActive, etc.
     */
    updateGameConfig: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const body = req.body;
            const config = await AdminService.updateGameConfig(id, body);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Game configuration updated successfully',
                data: config,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },
    addCurrency: async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                symbol,
                name,
                chain,
                colorCode,
                image,
                depositAddress,
                minimumDepositAmount,
                minimumWithdrawalAmount,
                depositFee,
                depositFeeType,
                withdrawalFee,
                withdrawalFeeType,
                isActive
            } = req.body;

            // Validate required fields
            if (!symbol || !name || !chain || !depositAddress) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Symbol, name, chain, and depositAddress are required fields',
                    data: null
                });
                return;
            }

            // Validate symbol enum
            const validSymbols = ['TRX', 'BNB', 'ETH', 'SOL'];
            if (!validSymbols.includes(symbol.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Symbol must be one of: ${validSymbols.join(', ')}`,
                    data: null
                });
                return;
            }

            // Validate chain enum
            const validChains = ['TRC20', 'BEP20', 'ERC20', 'POLYGON'];
            if (!validChains.includes(chain.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Chain must be one of: ${validChains.join(', ')}`,
                    data: null
                });
                return;
            }

            // Validate color code format if provided
            if (colorCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Color code must be a valid hex color (e.g., #FF0000 or #F00)',
                    data: null
                });
                return;
            }

            // Validate depositFeeType and withdrawalFeeType
            const validFeeTypes = ['percentage', 'fixed'];
            if (depositFeeType && !validFeeTypes.includes(depositFeeType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Deposit fee type must be one of: ${validFeeTypes.join(', ')}`,
                    data: null
                });
                return;
            }

            if (withdrawalFeeType && !validFeeTypes.includes(withdrawalFeeType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Withdrawal fee type must be one of: ${validFeeTypes.join(', ')}`,
                    data: null
                });
                return;
            }

            // Call service to add currency
            const newCurrency = await AdminService.addCurrency({
                symbol,
                name,
                chain,
                colorCode,
                image,
                depositAddress,
                minimumDepositAmount,
                minimumWithdrawalAmount,
                depositFee,
                depositFeeType,
                withdrawalFee,
                withdrawalFeeType,
                isActive
            });

            res.status(HttpStatusCode.CREATED).json({
                success: true,
                message: 'Currency added successfully',
                data: newCurrency
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to add currency',
                data: null
            });
        }
    },
    getCurrencyList: async (req: Request, res: Response): Promise<void> => {
        try {
            const activeOnly = req.query.activeOnly === 'true';
            const list = await AdminService.getCurrencyList(activeOnly);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Currencies fetched successfully',
                data: list
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    updateCurrency: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const {
                name,
                chain,
                colorCode,
                image,
                depositAddress,
                minimumDepositAmount,
                minimumWithdrawalAmount,
                depositFee,
                depositFeeType,
                withdrawalFee,
                withdrawalFeeType,
                isActive,
                depositEnabled,
                withdrawalEnabled
            } = req.body;
            if (!id) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Currency ID is required',
                    data: null
                });
                return;
            }
            const validChains = ['TRC20', 'BEP20', 'ERC20', 'POLYGON'];
            if (chain && !validChains.includes(chain.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Chain must be one of: ${validChains.join(', ')}`,
                    data: null
                });
                return;
            }
            if (colorCode && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorCode)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Color code must be a valid hex color',
                    data: null
                });
                return;
            }
            const validFeeTypes = ['percentage', 'fixed'];
            if (depositFeeType && !validFeeTypes.includes(depositFeeType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Deposit fee type must be one of: ${validFeeTypes.join(', ')}`,
                    data: null
                });
                return;
            }
            if (withdrawalFeeType && !validFeeTypes.includes(withdrawalFeeType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: `Withdrawal fee type must be one of: ${validFeeTypes.join(', ')}`,
                    data: null
                });
                return;
            }
            const updated = await AdminService.updateCurrency(id, {
                name,
                chain,
                colorCode,
                image,
                depositAddress,
                minimumDepositAmount,
                minimumWithdrawalAmount,
                depositFee,
                depositFeeType,
                withdrawalFee,
                withdrawalFeeType,
                isActive,
                depositEnabled,
                withdrawalEnabled
            });
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Currency updated successfully',
                data: updated
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    deleteCurrency: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Currency ID is required',
                    data: null
                });
                return;
            }
            await AdminService.deleteCurrency(id);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Currency deleted successfully',
                data: null
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    getSystemConfig: async (req: Request, res: Response): Promise<void> => {
        try {
            const config = await AdminService.getSystemConfig();
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'System configuration fetched successfully',
                data: config
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    updateSystemConfig: async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                platformName,
                logo,
                darkMode,
                pushNotification,
                twoFA,
                biometricLogin,
                maintenance,
                maintenanceMessage,
                supportEmail,
                websiteDomain
            } = req.body;

            // Validate that at least one field is provided
            if (
                platformName === undefined &&
                logo === undefined &&
                darkMode === undefined &&
                pushNotification === undefined &&
                twoFA === undefined &&
                biometricLogin === undefined &&
                maintenance === undefined &&
                maintenanceMessage === undefined &&
                supportEmail === undefined &&
                websiteDomain === undefined
            ) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'At least one configuration field must be provided',
                    data: null
                });
                return;
            }

            // Validate platformName if provided
            if (platformName !== undefined) {
                if (typeof platformName !== 'string' || !platformName.trim()) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'platformName must be a non-empty string',
                        data: null
                    });
                    return;
                }
            }

            // Validate boolean fields
            const booleanFields = { darkMode, pushNotification, twoFA, biometricLogin, maintenance };
            for (const [key, value] of Object.entries(booleanFields)) {
                if (value !== undefined && typeof value !== 'boolean') {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: `${key} must be a boolean value`,
                        data: null
                    });
                    return;
                }
            }

            // Validate supportEmail if provided
            if (supportEmail !== undefined) {
                if (typeof supportEmail !== 'string' || !supportEmail.trim()) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'supportEmail must be a non-empty string',
                        data: null
                    });
                    return;
                }
            }

            // Validate websiteDomain if provided (optional, can be null or empty)
            if (websiteDomain !== undefined && websiteDomain !== null && typeof websiteDomain !== 'string') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'websiteDomain must be a string',
                    data: null
                });
                return;
            }

            const config = await AdminService.updateSystemConfig({
                platformName,
                logo,
                darkMode,
                pushNotification,
                twoFA,
                biometricLogin,
                maintenance,
                maintenanceMessage,
                supportEmail,
                websiteDomain
            });

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'System configuration updated successfully',
                data: config
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    getInvestmentConfig: async (req: Request, res: Response): Promise<void> => {
        try {
            const config = await AdminService.getInvestmentConfig();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Investment configuration fetched successfully',
                data: config
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    updateInvestmentConfig: async (req: Request, res: Response): Promise<void> => {
        try {
            const { directCommissionRate, indirectCommissionRate, monthlyRoiRate } = req.body;
            if (
                directCommissionRate === undefined &&
                indirectCommissionRate === undefined &&
                monthlyRoiRate === undefined
            ) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'At least one configuration field must be provided',
                    data: null
                });
                return;
            }
            const config = await AdminService.updateInvestmentConfig({
                directCommissionRate,
                indirectCommissionRate,
                monthlyRoiRate
            });
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Investment configuration updated successfully',
                data: config
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },

    /**
     * Upload platform logo. Expects multipart/form-data with 'logo' file field.
     */
    uploadLogo: async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'No file uploaded',
                    data: null,
                });
                return;
            }

            const logoUrl = await AdminService.uploadPlatformLogo(req.file);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Logo uploaded successfully',
                data: { logo: logoUrl },
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to upload logo',
                data: null,
            });
        }
    },

    /**
     * Subadmin management
     */
    getAdminList: async (req: Request, res: Response): Promise<void> => {
        try {
            const callerRole = req.user?.role ?? '';
            if (callerRole !== 'superadmin' && callerRole !== 'admin') {
                res.status(HttpStatusCode.FORBIDDEN).json({ success: false, message: 'Only superadmin can manage admins', data: null });
                return;
            }
            const list = await AdminService.getAdminList();
            res.status(HttpStatusCode.OK).json({ success: true, message: 'Admin list fetched', data: list, total: list.length });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    createSubAdmin: async (req: Request, res: Response): Promise<void> => {
        try {
            const callerRole = req.user?.role ?? '';
            if (callerRole !== 'superadmin' && callerRole !== 'admin') {
                res.status(HttpStatusCode.FORBIDDEN).json({ success: false, message: 'Only superadmin can create admins', data: null });
                return;
            }
            const { name, email, password, permissions } = req.body;
            if (!name || !email || !password) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, message: 'name, email and password are required', data: null });
                return;
            }
            const result = await AdminService.createSubAdmin(name, email, password, Array.isArray(permissions) ? permissions : []);
            res.status(HttpStatusCode.OK).json({ success: true, message: 'Subadmin created successfully', data: result });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    updateSubAdmin: async (req: Request, res: Response): Promise<void> => {
        try {
            const callerRole = req.user?.role ?? '';
            if (callerRole !== 'superadmin' && callerRole !== 'admin') {
                res.status(HttpStatusCode.FORBIDDEN).json({ success: false, message: 'Only superadmin can update admins', data: null });
                return;
            }
            const { id } = req.params;
            const { name, permissions, isActive } = req.body;
            const result = await AdminService.updateSubAdmin(id, { name, permissions, isActive });
            res.status(HttpStatusCode.OK).json({ success: true, message: 'Admin updated successfully', data: result });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    deleteSubAdmin: async (req: Request, res: Response): Promise<void> => {
        try {
            const callerRole = req.user?.role ?? '';
            if (callerRole !== 'superadmin' && callerRole !== 'admin') {
                res.status(HttpStatusCode.FORBIDDEN).json({ success: false, message: 'Only superadmin can delete admins', data: null });
                return;
            }
            const { id } = req.params;
            const result = await AdminService.deleteSubAdmin(id);
            res.status(HttpStatusCode.OK).json({ success: true, message: result.message, data: null });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    /**
     * Get admin profile (current logged-in admin).
     */
    getProfile: async (req: Request, res: Response): Promise<void> => {
        try {
            const adminId = req.user?.id || req.user?._id; // Set by authenticate middleware
            if (!adminId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Unauthorized',
                    data: null,
                });
                return;
            }

            const admin = await AdminService.getAdminProfile(adminId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Profile fetched successfully',
                data: admin,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Update admin profile. Body: name, email, currentPassword (optional), newPassword (optional).
     */
    updateProfile: async (req: Request, res: Response): Promise<void> => {
        try {
            const adminId = req.user?.id || req.user?._id; // Set by authenticate middleware
            if (!adminId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Unauthorized',
                    data: null,
                });
                return;
            }

            const { name, email, currentPassword, newPassword } = req.body;
            
            if (!name || !email) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Name and email are required',
                    data: null,
                });
                return;
            }

            // If changing password, validate
            if (newPassword) {
                if (!currentPassword) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Current password is required to set a new password',
                        data: null,
                    });
                    return;
                }
                if (newPassword.length < 6) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'New password must be at least 6 characters',
                        data: null,
                    });
                    return;
                }
            }

            const updatedAdmin = await AdminService.updateAdminProfile(
                adminId,
                name.trim(),
                email.trim(),
                currentPassword,
                newPassword
            );

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Profile updated successfully',
                data: updatedAdmin,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    triggerRoiCalculation: async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await triggerRoiCalculation();

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `ROI calculation completed successfully. Processed ${result.processed} investments and credited ${result.totalCredited.toFixed(8)} USDT`,
                data: {
                    processed: result.processed,
                    totalCredited: result.totalCredited,
                    errors: result.errors,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    verifyWithdrawal: async (req: Request, res: Response): Promise<void> => {
        try {
            // Require 'withdrawals' permission OR superadmin/admin role
            const callerRole = req.user?.role ?? '';
            const callerPermissions: string[] = req.user?.permissions ?? [];
            const isSuperAdmin = callerRole === 'superadmin' || callerRole === 'admin';
            const hasWithdrawalsPermission = callerPermissions.includes('withdrawals');

            if (!isSuperAdmin && !hasWithdrawalsPermission) {
                res.status(HttpStatusCode.FORBIDDEN).json({
                    success: false,
                    message: 'You do not have permission to verify withdrawals',
                    data: null
                });
                return;
            }

            const { transactionId } = req.body;
            if (!transactionId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Transaction ID is required',
                    data: null
                });
                return;
            }

            const adminId = req.user?.id || req.user?._id;
            const result = await AdminService.verifyWithdrawal(transactionId, adminId);
            res.status(HttpStatusCode.OK).json({ success: true, message: result.message, data: result });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },

    processWithdrawal: async (req: Request, res: Response): Promise<void> => {
        try {
            // Only superadmin (or legacy 'admin') can approve / reject
            const callerRole = req.user?.role ?? '';
            const isSuperAdmin = callerRole === 'superadmin' || callerRole === 'admin';
            if (!isSuperAdmin) {
                res.status(HttpStatusCode.FORBIDDEN).json({
                    success: false,
                    message: 'Only superadmin can approve or reject withdrawals',
                    data: null
                });
                return;
            }

            const { transactionId, action, transactionHash, reason } = req.body;

            if (!transactionId || !action) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Transaction ID and action (APPROVE/REJECT) are required',
                    data: null
                });
                return;
            }

            if (action !== 'APPROVE' && action !== 'REJECT') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Action must be either APPROVE or REJECT',
                    data: null
                });
                return;
            }

            if (action === 'APPROVE' && !transactionHash) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Transaction hash is required for approval',
                    data: null
                });
                return;
            }

            if (action === 'REJECT' && !reason) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Rejection reason is required',
                    data: null
                });
                return;
            }

            const result = await AdminService.processWithdrawal(transactionId, action, transactionHash, reason);

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },
    sendNotificationToUsers: async (req: Request, res: Response): Promise<void> => {
        try {
            // Require 'notifications' permission OR superadmin/admin role
            const callerRole = req.user?.role ?? '';
            const callerPermissions: string[] = req.user?.permissions ?? [];
            const isSuperAdmin = callerRole === 'superadmin' || callerRole === 'admin';
            const hasNotificationsPermission = callerPermissions.includes('notifications');

            if (!isSuperAdmin && !hasNotificationsPermission) {
                res.status(HttpStatusCode.FORBIDDEN).json({
                    success: false,
                    message: 'You do not have permission to send notifications',
                    data: null
                });
                return;
            }

            const { userIds, title, message, sendInApp, sendEmail, sendPush } = req.body;

            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'User IDs array is required',
                    data: null
                });
                return;
            }

            if (!title || !message) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Title and message are required',
                    data: null
                });
                return;
            }

            const result = await AdminService.sendNotificationToUsers(userIds, title, message, {
                sendInApp: sendInApp !== false,
                sendEmail: sendEmail !== false,
                sendPush: sendPush !== false,
            });

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },

    getDashboardStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getDashboardStats();

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Dashboard statistics fetched successfully',
                data: stats
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            });
        }
    },

    /**
     * Get recent transactions for dashboard
     */
    getRecentTransactions: async (req: Request, res: Response): Promise<void> => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
            
            const transactions = await AdminService.getRecentTransactions(limit)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Recent transactions fetched successfully',
                data: transactions
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            })
        }
    },

    /**
     * Get gaming stats: totalGames, totalBets, totalWins, totalLosses, platformProfit.
     */
    getGameStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getGameStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Game stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get recent games for dashboard
     */
    getRecentGames: async (req: Request, res: Response): Promise<void> => {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10
            
            const games = await AdminService.getRecentGames(limit)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Recent games fetched successfully',
                data: games
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null
            })
        }
    },

    /**
     * Get transaction list with skip, limit, optional fromDate, toDate, status, type.
     */
    getTransactionList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const status = req.query.status as string | undefined;
            const type = req.query.type as string | undefined;
            const search = req.query.search as string | undefined;
            const result = await AdminService.getTransactionList(skip, limit, fromDate, toDate, status, type, search);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Transaction list fetched successfully',
                data: result.transactions,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get deposit stats per currency (based on active currencies in DB).
     */
    getDepositStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getDepositStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Deposit stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get deposit list with skip, limit, optional currency, fromDate, toDate, status.
     */
    getDepositList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const currency = req.query.currency as string | undefined;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const status = req.query.status as string | undefined;
            const search = req.query.search as string | undefined;
            const result = await AdminService.getDepositList(skip, limit, currency, fromDate, toDate, status, search);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Deposit list fetched successfully',
                data: result.deposits,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Approve a PENDING deposit by transaction id.
     */
    approveDeposit: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: transactionId } = req.params;
            const result = await AdminService.approveDeposit(transactionId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result.transaction,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Reject a PENDING deposit by transaction id. Body: reason (optional).
     */
    rejectDeposit: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: transactionId } = req.params;
            const { reason } = req.body;
            await AdminService.rejectDeposit(transactionId, reason || 'Rejected by admin');
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Deposit rejected successfully',
                data: null,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get withdrawal stats (total, pending, approved today, rejected today).
     */
    getWithdrawalStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getWithdrawalStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Withdrawal stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get withdrawal list with skip, limit, optional fromDate, toDate, status.
     */
    getWithdrawalList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const status = req.query.status as string | undefined;
            const search = req.query.search as string | undefined;
            const result = await AdminService.getWithdrawalList(skip, limit, fromDate, toDate, status, search);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Withdrawal list fetched successfully',
                data: result.withdrawals,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get user transaction summary for withdrawal verification (deposits, withdrawals, ROI, referral, gaming, total balance).
     */
    getUserVerificationSummary: async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;
            if (!userId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'User ID is required',
                    data: null,
                });
                return;
            }
            const summary = await AdminService.getUserVerificationSummary(userId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Verification summary fetched successfully',
                data: summary,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get wallet stats (total balance, total ROI wallet, total Game wallet).
     */
    getWalletStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getWalletStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Wallet stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get wallet list with skip, limit, optional search, fromDate, toDate.
     */
    getWalletList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const search = req.query.search as string | undefined;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const result = await AdminService.getWalletList(skip, limit, search, fromDate, toDate);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Wallet list fetched successfully',
                data: result.wallets,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Single API to add or deduct funds. Body: userId, walletType (gamingWallet|roiWallet), type (add|deduct), amount, description.
     */
    adjustWalletFunds: async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId, walletType, type, amount, description } = req.body;
            if (!userId || !walletType || !type || amount == null) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'userId, walletType, type, and amount are required',
                    data: null,
                });
                return;
            }
            const result = await AdminService.adjustWalletFunds(
                userId,
                walletType,
                type,
                Number(amount),
                description || ''
            );
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: result.wallet,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * List investments (ROI) for admin. Query: skip, limit, search, status (all|active|paused), fromDate, toDate.
     */
    getInvestmentList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const search = req.query.search as string | undefined;
            const status = req.query.status as 'all' | 'active' | 'paused' | undefined;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const result = await AdminService.getInvestmentList(skip, limit, search, status, fromDate, toDate);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Investment list fetched successfully',
                data: result.list,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Pause or start an investment. Body: { isActive: boolean }.
     */
    updateInvestmentActive: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: investmentId } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'isActive (boolean) is required',
                    data: null,
                });
                return;
            }
            const result = await AdminService.updateInvestmentActive(investmentId, isActive);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: isActive ? 'Investment started successfully' : 'Investment paused successfully',
                data: result,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get investment stats (total amount, active count, total ROI earned).
     */
    getInvestmentStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getInvestmentStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Investment stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get user and teams stats (total users, active teams, total referrals).
     */
    getUserTeamsStats: async (req: Request, res: Response): Promise<void> => {
        try {
            const stats = await AdminService.getUserTeamsStats();
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User teams stats fetched successfully',
                data: stats,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get user and teams list. Query: skip, limit, search, fromDate, toDate.
     */
    getUserTeamsList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
            const search = req.query.search as string | undefined;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const result = await AdminService.getUserTeamsList(skip, limit, search, fromDate, toDate);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User teams list fetched successfully',
                data: result.list,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Get team tree for a specific user. Params: userId.
     */
    getUserTeamTree: async (req: Request, res: Response): Promise<void> => {
        try {
            const { userId } = req.params;
            if (!userId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'userId is required',
                    data: null,
                });
                return;
            }
            const tree = await AdminService.getUserTeamTree(userId);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User team tree fetched successfully',
                data: tree,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Create a new user (admin). Body: name, email, phone, password, referralCode (optional).
     */
    createUser: async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, email, phone, password, referralCode } = req.body;
            if (!name || !email || !phone || !password) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'name, email, phone and password are required',
                    data: null,
                });
                return;
            }
            const result = await AdminService.createUser({
                name,
                email,
                phone,
                password,
                referralCode: referralCode || undefined,
            });
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User created successfully',
                data: result,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Update user by id. Body: name, email, phone, status, password (all optional).
     */
    updateUser: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: userId } = req.params;
            const { name, email, phone, status, password } = req.body;
            const result = await AdminService.updateUser(userId, { name, email, phone, status, password });
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User updated successfully',
                data: result,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    setUserWithdrawalLimit: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: userId } = req.params;
            const { enabled, period, amount } = req.body;
            if (enabled === undefined || !period || amount === undefined) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, message: 'Missing required fields: enabled, period, amount', data: null });
                return;
            }
            const result = await AdminService.setUserWithdrawalLimit(userId, { enabled: Boolean(enabled), period, amount: Number(amount) });
            res.status(HttpStatusCode.OK).json({ success: true, message: 'Withdrawal limit updated successfully', data: result });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    setBulkWithdrawalLimit: async (req: Request, res: Response): Promise<void> => {
        try {
            const { enabled, period, amount } = req.body;
            if (enabled === undefined || !period || amount === undefined) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ success: false, message: 'Missing required fields: enabled, period, amount', data: null });
                return;
            }
            const result = await AdminService.setBulkWithdrawalLimit({ enabled: Boolean(enabled), period, amount: Number(amount) });
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `Withdrawal limit applied to ${result.updatedCount} user${result.updatedCount !== 1 ? 's' : ''}`,
                data: result,
            });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message || 'Internal server error', data: null });
        }
    },

    /**
     * Get user list with skip and limit (pagination)
     */
    getUserList: async (req: Request, res: Response): Promise<void> => {
        try {
            const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const status = req.query.status as string | undefined;
            const validStatuses = ['active', 'suspended', 'inactive', 'noDeposits'];
            const statusFilter = status && validStatuses.includes(status) ? status as 'active' | 'suspended' | 'inactive' | 'noDeposits' : undefined;
            const search = req.query.search as string | undefined;
            const fromDate = req.query.fromDate as string | undefined;
            const toDate = req.query.toDate as string | undefined;
            const result = await AdminService.getUserList(skip, limit, statusFilter, search, fromDate, toDate);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'User list fetched successfully',
                data: result.users,
                total: result.total,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /**
     * Suspend or activate user (update status)
     */
    updateUserStatus: async (req: Request, res: Response): Promise<void> => {
        try {
            const { id: userId } = req.params;
            const { status } = req.body;
            if (!status || !['active', 'suspended'].includes(status)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid status. Use "active" or "suspended"',
                    data: null,
                });
                return;
            }
            const result = await AdminService.updateUserStatus(userId, status);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: `User ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
                data: result,
            });
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /** List all user support tickets (admin / subadmin). Query: page, limit, status (OPEN | IN_PROGRESS | CLOSED) */
    getSupportTicketList: async (req: Request, res: Response): Promise<void> => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
            const statusParam = req.query.status as string | undefined;
            const status =
                statusParam && Object.values(SupportTicketStatus).includes(statusParam as SupportTicketStatus)
                    ? (statusParam as SupportTicketStatus)
                    : undefined;
            const result = await SupportTicketService.listTicketsForAdmin(page, limit, status);
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Support tickets fetched',
                data: result,
            });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    /** Single ticket + messages for admin (same access rules as user detail + staff) */
    closeSupportTicket: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                });
                return;
            }
            const { ticketId } = req.params;
            const comment = typeof req.body?.comment === 'string' ? req.body.comment : '';
            const email = req.user?.email || '';
            console.log('[closeSupportTicket] ticketId=%s email=%s comment=%s', ticketId, email, comment);
            const ticket = await SupportTicketService.closeTicket(ticketId, userId, role, { comment, email });
            const ticketObj = typeof (ticket as any).toObject === 'function' ? (ticket as any).toObject() : ticket;
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Ticket closed',
                data: { ticket: ticketObj },
            });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },

    getSupportTicketDetail: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                    data: null,
                });
                return;
            }
            const { ticketId } = req.params;
            const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
            const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string, 10) || 100));
            const { ticket, messages, totalMessages, currentPage, totalPages } =
                await SupportTicketService.getTicketMessages(ticketId, { id: userId, role }, page, limit);
            // Convert Mongoose doc to plain object so all fields (including closedBy*) are included
            const ticketObj = typeof (ticket as any).toObject === 'function' ? (ticket as any).toObject() : ticket;
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Ticket detail',
                data: {
                    ticket: ticketObj,
                    messages: messages.map((m) => SupportTicketService.formatMessage(m as any)),
                    totalMessages,
                    currentPage,
                    totalPages,
                },
            });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            });
        }
    },
};

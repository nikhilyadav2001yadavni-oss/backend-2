import express, { Request, Response } from 'express';
import { HttpStatusCode } from '../enums/App';
import AdminController from '../controllers/AdminController';
import WalletController from '../controllers/WalletController';
import { apiLimiter, createAccountLimiter } from '../utils/rateLimiter';
import { authenticate, requireAdmin, requireAnyAdmin, requireSuperAdmin } from '../middleware/authentication';
import { upload } from '../utils/uploadHelper';
const router = express.Router();

router
    .get('/', async (req: Request, res: Response) => {
        try {
            res.status(HttpStatusCode.OK).json({ message: 'Admin Connected' });
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Internal server error' });
        }
    })
    .post('/signup', createAccountLimiter, AdminController.signup)
    .post('/signin', apiLimiter, AdminController.signin)
    .get('/dashboard-stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getDashboardStats)
    .get('/recent-transactions', apiLimiter, authenticate, requireAnyAdmin, AdminController.getRecentTransactions)
    .get('/games/stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getGameStats)
    .get('/recent-games', apiLimiter, authenticate, requireAnyAdmin, AdminController.getRecentGames)
    .get('/transactions', apiLimiter, authenticate, requireAnyAdmin, AdminController.getTransactionList)
    .get('/deposit-stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getDepositStats)
    .get('/deposits', apiLimiter, authenticate, requireAnyAdmin, AdminController.getDepositList)
    .patch('/deposits/:id/approve', apiLimiter, authenticate, requireAnyAdmin, AdminController.approveDeposit)
    .patch('/deposits/:id/reject', apiLimiter, authenticate, requireAnyAdmin, AdminController.rejectDeposit)
    .get('/users', apiLimiter, authenticate, requireAnyAdmin, AdminController.getUserList)
    .get('/users/:userId/verification-summary', apiLimiter, authenticate, requireAnyAdmin, AdminController.getUserVerificationSummary)
    .post('/users', apiLimiter, authenticate, requireAnyAdmin, AdminController.createUser)
    .put('/users/:id', apiLimiter, authenticate, requireAnyAdmin, AdminController.updateUser)
    .patch('/users/:id/status', apiLimiter, authenticate, requireAnyAdmin, AdminController.updateUserStatus)
    .patch('/users/:id/withdrawal-limit', apiLimiter, authenticate, requireAnyAdmin, AdminController.setUserWithdrawalLimit)
    .patch('/withdrawal-limit/bulk', apiLimiter, authenticate, requireAnyAdmin, AdminController.setBulkWithdrawalLimit)
    .get('/game-configs', apiLimiter, authenticate, AdminController.getGameConfigs)
    .put('/game-configs/:id', apiLimiter, authenticate, AdminController.updateGameConfig)
    .post('/currency', apiLimiter, authenticate, requireAnyAdmin, AdminController.addCurrency)
    .get('/currencies', apiLimiter, authenticate, requireAnyAdmin, AdminController.getCurrencyList)
    .put('/currencies/:id', apiLimiter, authenticate, requireAnyAdmin, AdminController.updateCurrency)
    .delete('/currencies/:id', apiLimiter, authenticate, requireAnyAdmin, AdminController.deleteCurrency)
    .get('/system-config', apiLimiter, authenticate, AdminController.getSystemConfig)
    .put('/system-config', apiLimiter, authenticate, AdminController.updateSystemConfig)
    .post('/system-config/upload-logo', apiLimiter, authenticate, requireAnyAdmin, upload.single('logo'), AdminController.uploadLogo)
    // Sub-admin management is admin-only (not accessible by subadmins themselves)
    .get('/admin-users', apiLimiter, authenticate, requireAdmin, AdminController.getAdminList)
    .post('/admin-users', apiLimiter, authenticate, requireAdmin, AdminController.createSubAdmin)
    .put('/admin-users/:id', apiLimiter, authenticate, requireAdmin, AdminController.updateSubAdmin)
    .delete('/admin-users/:id', apiLimiter, authenticate, requireAdmin, AdminController.deleteSubAdmin)
    .get('/profile', apiLimiter, authenticate, requireAnyAdmin, AdminController.getProfile)
    .put('/profile', apiLimiter, authenticate, requireAnyAdmin, AdminController.updateProfile)

    // Test deposit is only available in non-production environments
    if (process.env.ENV !== 'production') {
        router.post('/test-deposit', apiLimiter, authenticate, requireAnyAdmin, WalletController.testDeposit);
    }

router
    .post('/trigger-roi-calculation', apiLimiter, authenticate, requireSuperAdmin, AdminController.triggerRoiCalculation)
    .get('/withdrawal-stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getWithdrawalStats)
    .get('/withdrawals', apiLimiter, authenticate, requireAnyAdmin, AdminController.getWithdrawalList)
    .post('/withdrawal/verify', apiLimiter, authenticate, requireAnyAdmin, AdminController.verifyWithdrawal)
    .post('/withdrawal/process', apiLimiter, authenticate, requireAnyAdmin, AdminController.processWithdrawal)
    .get('/wallet-stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getWalletStats)
    .get('/wallets', apiLimiter, authenticate, requireAnyAdmin, AdminController.getWalletList)
    .post('/wallets/adjust-funds', apiLimiter, authenticate, requireAnyAdmin, AdminController.adjustWalletFunds)
    .get('/investments/stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getInvestmentStats)
    .get('/investments', apiLimiter, authenticate, requireAnyAdmin, AdminController.getInvestmentList)
    .patch('/investments/:id/active', apiLimiter, authenticate, requireAnyAdmin, AdminController.updateInvestmentActive)
    .get('/investment-config', apiLimiter, authenticate, requireSuperAdmin, AdminController.getInvestmentConfig)
    .put('/investment-config', apiLimiter, authenticate, requireSuperAdmin, AdminController.updateInvestmentConfig)
    .get('/user-teams/stats', apiLimiter, authenticate, requireAnyAdmin, AdminController.getUserTeamsStats)
    .get('/user-teams', apiLimiter, authenticate, requireAnyAdmin, AdminController.getUserTeamsList)
    .get('/user-teams/:userId/tree', apiLimiter, authenticate, requireAnyAdmin, AdminController.getUserTeamTree)
    .post('/notifications/send', apiLimiter, authenticate, requireAnyAdmin, AdminController.sendNotificationToUsers)
    .get('/support-tickets', apiLimiter, authenticate, AdminController.getSupportTicketList)
    .get('/support-tickets/:ticketId', apiLimiter, authenticate, AdminController.getSupportTicketDetail)
    .patch('/support-tickets/:ticketId/close', apiLimiter, authenticate, requireAnyAdmin, AdminController.closeSupportTicket)

export default router;
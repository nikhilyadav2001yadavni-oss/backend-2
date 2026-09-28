import { createBadRequestError } from '../middleware/authentication'
import User from '../models/UserModel'
import Referral from '../models/ReferralModel'
import Wallet from '../models/WalletModel'
import { getInvestmentConfig } from '../models/InvestmentConfigModel'

export default {
    getTeamDetails: async (
        authenticatedUserId: string,
        paramsUserId: string
    ): Promise<{
        totalDirectReferrals: number
        totalTeams: number
        totalEarning: number
        commissionRates: {
            direct: number
            allLevels: number
        }
        directReferredTeam: Array<{
            userId: string
            name: string
            directReferrals: number
            earnings: number
        }>
    }> => {
        try {
            // Get stats for authenticated user (from token)
            const authenticatedUserReferral = await Referral.findOne({ userId: authenticatedUserId })
            const authenticatedUserWallet = await Wallet.findOne({ userId: authenticatedUserId })
            
            const totalDirectReferrals = authenticatedUserReferral ? authenticatedUserReferral.totalReferrals : 0
            const totalEarning = authenticatedUserWallet ? authenticatedUserWallet.roiWallet : 0
            
            // Get commission rates: user's Referral overrides or platform default from InvestmentConfig
            const platformConfig = await getInvestmentConfig()
            const commissionRates = {
                direct: authenticatedUserReferral?.directCommissionRate ?? platformConfig.directCommissionRate,
                allLevels: authenticatedUserReferral?.allLevelsCommissionRate ?? platformConfig.indirectCommissionRate,
            }
            
            // Calculate totalTeams (direct + indirect) recursively
            const calculateTotalTeams = async (userId: string): Promise<number> => {
                const referral = await Referral.findOne({ userId })
                if (!referral || referral.nextNodes.length === 0) {
                    return 0
                }
                
                let total = referral.nextNodes.length // Direct referrals
                
                // Recursively count indirect referrals
                for (const nextNodeId of referral.nextNodes) {
                    const indirectCount = await calculateTotalTeams(nextNodeId.toString())
                    total += indirectCount
                }
                
                return total
            }
            
            const totalTeams = await calculateTotalTeams(authenticatedUserId)
            
            // Get directReferredTeam for paramsUserId (from URI params)
            const paramsUserReferral = await Referral.findOne({ userId: paramsUserId })
            let directReferredTeam: Array<{
                userId: string
                name: string
                directReferrals: number
                earnings: number
            }> = []
            
            if (paramsUserReferral && paramsUserReferral.nextNodes.length > 0) {
                const directReferralUsers = await User.find({ 
                    _id: { $in: paramsUserReferral.nextNodes } 
                }).select('name')
                
                directReferredTeam = await Promise.all(
                    directReferralUsers.map(async (user) => {
                        const referralRecord = await Referral.findOne({ userId: user._id })
                        const directReferrals = referralRecord ? referralRecord.totalReferrals : 0
                        
                        const wallet = await Wallet.findOne({ userId: user._id })
                        const earnings = wallet ? wallet.roiWallet : 0
                        
                        return {
                            userId: user._id.toString(),
                            name: user.name,
                            directReferrals,
                            earnings,
                        }
                    })
                )
            }
            
            return {
                totalDirectReferrals,
                totalTeams,
                totalEarning,
                commissionRates,
                directReferredTeam,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch team details')
        }
    }
}


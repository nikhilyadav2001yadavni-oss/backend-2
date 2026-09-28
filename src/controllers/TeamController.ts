import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import TeamService from '../services/TeamService'

export default {
    getDirectReferrals: async (req: Request, res: Response): Promise<void> => {
        try {
            const authenticatedUserId = req.user?.id
            const paramsUserId = req.params.userId
            
            if (!authenticatedUserId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }
            
            if (!paramsUserId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ 
                    success: false, 
                    message: 'User ID is required in params', 
                    data: null 
                })
                return
            }
            
            const result = await TeamService.getTeamDetails(authenticatedUserId, paramsUserId)
            
            res.status(HttpStatusCode.OK).json({ 
                success: true, 
                message: 'Team details fetched successfully', 
                data: result 
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    }
}


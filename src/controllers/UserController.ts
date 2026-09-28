import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import { UserService } from '../services/index'
import { generateTokens } from '../utils/authHelpers'
import User from '../models/UserModel'
import Currency from '../models/CurrencyModel'

export default {
    signup: async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, email, phone, password, referralCode } = req.body

            // Check if user exists and register if not, or return error with user details
            const result = await UserService.signup(name, email, phone, password, referralCode)
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                // Mobile OTP disabled — only `eotp` is returned.
                data: { eotp: result.eotp /* , motp: result.motp */ },
            })
        } catch (error: any) {
            // If error contains userDetails, include it in the response
            if (error.userDetails) {
                res.status(error.statusCode || HttpStatusCode.CONFLICT).json({
                    success: false,
                    message: error.message || 'User already registered',
                    data: error.userDetails,
                })
            } else {
                res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                    success: false,
                    message: error.message || 'Internal server error',
                    data: null,
                })
            }
        }
    },
    login: async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body
            const result = await UserService.login(email, password)
            if (result) {
                // Check if user is verified to determine message
                const message = result.isVerified
                    ? 'User logged in successfully'
                    : 'Please verify your account to complete login. OTP has been sent to your email.'
                
                res.status(HttpStatusCode.OK).json({ 
                    success: true, 
                    message, 
                    data: result 
                })
            } else {
                res.status(HttpStatusCode.BAD_REQUEST).json({ 
                    message: 'login failed', 
                    success: false, 
                    data: null 
                })
            }
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    sendOtp: async (req: Request, res: Response): Promise<void> => {
        try {
            const { email /* , target */ } = req.body

            // Mobile OTP disabled — `target` is ignored and OTP is always sent to email only.
            // const validTargets = ['email', 'phone', 'all']
            // const resolvedTarget: 'email' | 'phone' | 'all' = validTargets.includes(target) ? target : 'all'
            const resolvedTarget: 'email' = 'email'

            const result = await UserService.sendOtp(email, resolvedTarget)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'OTP sent successfully to email. If you do not receive it, please check your spam or junk folder.',
                data: {
                    target: resolvedTarget,
                    expiresAt: result.expiresAt,
                    expiresIn: result.expiresIn,
                },
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    editProfile: async(req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const { fullName, email, phone, dob, country, city, address, profilepicture } = req.body;
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Email cannot be changed for security reasons
            if (email !== undefined) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Email cannot be changed. Please contact support if you need to update your email.',
                    data: null
                })
                return
            }

            // Prepare update data (map fullName to name)
            const updateData: any = {}
            if (fullName !== undefined) updateData.name = fullName
            if (phone !== undefined) updateData.phone = phone
            if (dob !== undefined) updateData.dob = dob
            if (country !== undefined) updateData.country = country
            if (city !== undefined) updateData.city = city
            if (address !== undefined) updateData.address = address
            if (profilepicture !== undefined) updateData.profilepicture = profilepicture

            // Check if at least one field is provided
            if (Object.keys(updateData).length === 0) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'At least one field is required to update',
                    data: null
                })
                return
            }

            const result = await UserService.editProfile(userId, updateData)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Profile updated successfully',
                data: result
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    getUserDetails: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ success: false, message: 'Authentication required', data: null })
                return
            }
            const result = await UserService.getUserDetails(userId)
            res.status(HttpStatusCode.OK).json({ success: true, message: 'User details fetched successfully', data: result })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    changePassword: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const { currentPassword, newPassword, confirmPassword } = req.body;
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Validate required fields
            if (!currentPassword || !newPassword || !confirmPassword) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Current password, new password, and confirm password are required',
                    data: null
                })
                return
            }

            const result = await UserService.changePassword(
                userId, 
                currentPassword, 
                newPassword, 
                confirmPassword
            )
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: null
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    update2FA: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const { is2fa } = req.body;
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Validate required field
            if (typeof is2fa !== 'boolean') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'is2fa is required and must be a boolean value',
                    data: null
                })
                return
            }

            const result = await UserService.update2FA(userId, is2fa)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    is2fa: result.is2fa
                }
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    updateBiometric: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const { isBiometric } = req.body;
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Validate required field
            if (typeof isBiometric !== 'boolean') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'isBiometric is required and must be a boolean value',
                    data: null
                })
                return
            }

            const result = await UserService.updateBiometric(userId, isBiometric)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    isBiometric: result.isBiometric
                }
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    updatePushNotification: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const { pushNotificationStatus } = req.body;
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Validate required field
            if (typeof pushNotificationStatus !== 'boolean') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'pushNotificationStatus is required and must be a boolean value',
                    data: null
                })
                return
            }

            const result = await UserService.updatePushNotification(userId, pushNotificationStatus)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    pushNotificationStatus: result.pushNotificationStatus
                }
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    verifyOtp: async (req: Request, res: Response): Promise<void> => {
        try {
            // Mobile OTP disabled — `motp`, `phone` and `target` are accepted but ignored.
            const { email, eotp, type /* , motp, phone, target */ } = req.body

            // Always verify against email OTP only.
            // const validTargets = ['email', 'phone', 'all']
            // const resolvedTarget: 'email' | 'phone' | 'all' = validTargets.includes(target) ? target : 'email'
            const resolvedTarget: 'email' = 'email'

            const result = await UserService.verifyOtp(
                email,
                type,
                undefined, // phone — ignored
                resolvedTarget,
                eotp ? String(eotp) : undefined,
                undefined  // motp — ignored
            )

            // Always look up the user by email (phone-based lookup is disabled).
            const userQuery = { email }
            if (type === 'registration') {
                const user = await User.findOne(userQuery).select('email name phone referralCode isVerified fcmToken createdAt updatedAt')
                if (!user) {
                    res.status(HttpStatusCode.NOT_FOUND).json({ 
                        success: false, 
                        message: 'User not found', 
                        data: null 
                    })
                    return
                }
                
                // Generate tokens
                const token = generateTokens({
                    id: user._id.toString(),
                    email: user.email,
                })
                
                const responseData = {
                    _id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    referralCode: user.referralCode || undefined,
                    isVerified: user.isVerified,
                    fcmToken: (user as any).fcmToken ?? null,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    token,
                }
                
                res.status(HttpStatusCode.OK).json({ 
                    success: true, 
                    message: 'OTP verified successfully', 
                    data: responseData 
                })
            } else {
                res.status(HttpStatusCode.OK).json({ 
                    success: true, 
                    message: 'OTP verified successfully', 
                    data: result 
                })
            }
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    directReferrals: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.query.userId as string
            if (!userId) {
                res.status(HttpStatusCode.BAD_REQUEST).json({ 
                    success: false, 
                    message: 'User ID is required', 
                    data: null 
                })
                return
            }
            
            const result = await UserService.getDirectReferrals(userId)
            
            // Check if user has no direct referrals
            if (result.length === 0) {
                res.status(HttpStatusCode.OK).json({ 
                    success: false, 
                    message: 'No direct referrals found', 
                    data: [] 
                })
                return
            }
            
            res.status(HttpStatusCode.OK).json({ 
                success: true, 
                message: 'Direct referrals fetched successfully', 
                data: result 
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    updateFcmToken: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            const { fcmToken } = req.body
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            // Validate required field
            if (!fcmToken || typeof fcmToken !== 'string') {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'FCM token is required and must be a string',
                    data: null
                })
                return
            }

            const result = await UserService.updateFcmToken(userId, fcmToken)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: null
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    logout: async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id
            
            if (!userId) {
                res.status(HttpStatusCode.UNAUTHORIZED).json({ 
                    success: false, 
                    message: 'Authentication required', 
                    data: null 
                })
                return
            }

            const result = await UserService.logout(userId)
            
            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: null
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Reset Password - Send temporary password via email
     */
    resetPassword: async (req: Request, res: Response): Promise<void> => {
        try {
            const { email } = req.body

            // Validate email
            if (!email) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Email is required',
                    data: null,
                })
                return
            }

            // Reset password and send temporary password
            const result = await UserService.resetPassword(email)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: null,
            })
        } catch (error: any) {
            res.status(error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },

    /**
     * Returns random fake activity data for landing page marquee (users, join, deposit, earning).
     * Data changes on every request.
     */
    getActivityMarquee: async (req: Request, res: Response): Promise<void> => {
        try {
            const firstNames = ['Raj', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Rahul', 'Kavya', 'Arjun', 'Divya', 'Suresh', 'Meera', 'Karan', 'Pooja', 'Rohan', 'Neha', 'Aditya', 'Shreya', 'Varun', 'Isha']
            const lastInitials = ['K.', 'M.', 'S.', 'R.', 'P.', 'N.', 'D.', 'V.', 'A.', 'J.', 'B.', 'C.', 'L.', 'G.', 'H.']
            const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow']

            const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
            const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
            const randomFloat = (min: number, max: number, decimals: number) => {
                const val = Math.random() * (max - min) + min
                return parseFloat(val.toFixed(decimals))
            }

            const activeCurrencies = await Currency.find({ isActive: true }).select('symbol').lean()
            const symbols: string[] = activeCurrencies.length > 0
                ? activeCurrencies.map(c => c.symbol)
                : ['TRX', 'BNB', 'ETH', 'SOL']

            const items: { type: 'join' | 'deposit' | 'earning'; user: string; value?: string; text: string }[] = []

            for (let i = 0; i < 12; i++) {
                const user = `${pick(firstNames)} ${pick(lastInitials)}`
                const city = pick(cities)
                const type = pick(['join', 'deposit', 'earning'] as const)

                if (type === 'join') {
                    items.push({ type: 'join', user, text: `joined from ${city}` })
                } else if (type === 'deposit') {
                    const symbol = pick(symbols)
                    const amount = symbol === 'ETH'
                        ? randomFloat(0.05, 2, 3)
                        : symbol === 'BNB'
                            ? randomFloat(0.5, 10, 2)
                            : symbol === 'SOL'
                                ? randomFloat(1, 50, 2)
                                : randomInt(100, 5000) // TRX
                    const formatted = `${amount} ${symbol}`
                    items.push({ type: 'deposit', user, value: formatted, text: `deposited ${formatted}` })
                } else {
                    const symbol = pick(symbols)
                    const amount = symbol === 'ETH'
                        ? randomFloat(0.001, 0.5, 4)
                        : symbol === 'BNB'
                            ? randomFloat(0.01, 2, 3)
                            : symbol === 'SOL'
                                ? randomFloat(0.1, 10, 2)
                                : randomInt(10, 500) // TRX
                    const formatted = `${amount} ${symbol}`
                    items.push({ type: 'earning', user, value: formatted, text: `earned ${formatted}` })
                }
            }

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Activity marquee data',
                data: { items },
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

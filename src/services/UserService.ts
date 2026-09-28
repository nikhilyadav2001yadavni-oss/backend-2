import { createBadRequestError, createConflictError, createForbiddenError, createNotFoundError, createUnauthorizedError } from '../middleware/authentication'
import User, { User as UserType } from '../models/UserModel'
import Wallet, { Wallet as WalletType } from '../models/WalletModel'
import Otp from '../models/OtpModel'
import Referral from '../models/ReferralModel'
import Transaction, { TransactionCategory, TransactionStatus } from '../models/TransactionModel'
import Game from '../models/GameModel'
import { generateTokens } from '../utils/authHelpers'
import { generateOtp, generateReferralCode, validatePassword } from '../utils/common'
import { MiscellaneousExpressionOperatorReturningNumber } from 'mongoose'
import TeamService from './TeamService'
import { sendOtpEmail, sendEmail } from './EmailService'
// Mobile OTP (SMS) disabled — keep symbols imported only if you re-enable SMS:
// import { sendOtpSms, PHONE_DEFAULT_OTP } from './EmailService'
import { temporaryPasswordTemplate } from '../templates/emailTemplates'
import crypto from 'crypto'

export default {
    signup: async (
        name: string,
        email: string,
        phone: string,
        password: string,
        referralCode?: string
    ): Promise<{ message: string; eotp: string /* motp removed — mobile OTP disabled */ }> => {
        try {
            // Normalize email for storage & lookup — always lowercase + trimmed
            email = (email || '').trim().toLowerCase()

            // Check if user already exists by email or phone
            const existingUser = await User.findOne({ $or: [{ email }, { phone }] })
            if (existingUser) {
                // Determine what already exists
                const existingFields = []
                if (existingUser.email === email) {
                    existingFields.push('email')
                }
                if (existingUser.phone === phone) {
                    existingFields.push('phone')
                }
                
                const errorMessage = existingFields.length === 2 
                    ? 'User already registered with this email and phone'
                    : `User already registered with this ${existingFields[0]}`
                
                // User exists, return error with user details including isVerified
                const error: any = createConflictError(errorMessage)
                // error.userDetails = {
                //     _id: existingUser._id.toString(),
                //     name: existingUser.name,
                //     email: existingUser.email,
                //     phone: existingUser.phone,
                //     isVerified: existingUser.isVerified,
                //     createdAt: existingUser.createdAt,
                //     updatedAt: existingUser.updatedAt,
                // }
                throw error
            }

            // Validate password strength
            const passwordValidation = validatePassword(password)
            if (!passwordValidation.isValid) {
                throw createBadRequestError(passwordValidation.error || 'Invalid password')
            }

            // Validate referral code if provided
            let referrerUserId = null
            if (referralCode) {
                const referrer = await Referral.findOne({ referralCode, isActive: true })
                if (!referrer) {
                    throw createBadRequestError('Invalid referral code')
                }
                referrerUserId = referrer.userId
            }

            // User doesn't exist, proceed with registration
            const userData: any = { 
                name, 
                email, 
                phone, 
                password: password,
                isVerified: false 
            }
            const newUser = new User(userData)
            const savedUser = await newUser.save()

            // Generate OTP for email only (mobile OTP disabled).
            const eotp = generateOtp()
            // const motp = PHONE_DEFAULT_OTP   // mobile OTP disabled

            // Upsert OTP record (motp omitted — mobile OTP disabled)
            const expiresAt = new Date()
            expiresAt.setMinutes(expiresAt.getMinutes() + 5)
            await Otp.findOneAndUpdate(
                { email },
                {
                    $set: { email, phone, eotp, expiresAt },
                    $setOnInsert: { referrerUserId: referrerUserId || null },
                },
                { upsert: true, new: true }
            )

            // Send eotp via email only — SMS OTP path disabled.
            await Promise.allSettled([
                sendOtpEmail(email, eotp, 'registration'),
                // sendOtpSms(phone, motp, 'registration'),
            ])

            return {
                message: 'User registered successfully. OTP sent to email.',
                eotp,
                // motp,  // mobile OTP disabled
            }
        } catch (error: any) {
            // If error has userDetails, re-throw it to preserve the user details
            if (error.userDetails) {
                throw error
            }
            throw createBadRequestError(error.message || 'User registration failed')
        }
    },
    login: async (
        email: string,
        password: string
    ): Promise<
        | (Omit<UserType, 'password'> & {
              token?: {
                  accessToken: string
                  refreshToken: string
                  accessTokenExpiry: string
                  refreshTokenExpiry: string
              }
              eotp?: string
              // motp?: string  // mobile OTP disabled
              expiresAt?: Date
              expiresIn?: string
              fcmToken?: string
          })
        | null
    > => {
        try {
            // Case-insensitive email lookup so "Pragya.mishra009@gmail.com" and "pragya.mishra009@gmail.com" both match
            const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
            const user = await User.findOne({ email: emailRegex }).select('email password name phone referralCode isVerified status fcmToken createdAt updatedAt')
            if (!user) {
                throw createUnauthorizedError('User not found')
            }

            // Verify password
            const isPasswordValid = password === user.password
            if (!isPasswordValid) {
                throw createUnauthorizedError('Invalid password')
            }

            // Reject login if user is suspended
            const status = (user as any).status
            if (status === 'suspended') {
                throw createForbiddenError('Your account has been suspended. Please contact support.')
            }

            // Prepare user data
            const userData: any = {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone,
                referralCode: user.referralCode || undefined,
                isVerified: user.isVerified,
                fcmToken: (user as any).fcmToken ?? null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }

            // If user is not verified, generate and send OTP (email only — mobile OTP disabled)
            if (!user.isVerified) {
                const eotp = generateOtp()
                // const motp = PHONE_DEFAULT_OTP   // mobile OTP disabled
                const phone = user.phone || null    // still stored on OTP record for lookups
                const canonicalEmail = user.email   // use the stored email (canonical case) for OTP lookup & delivery

                // Upsert OTP record (motp omitted — mobile OTP disabled)
                const expiresAt = new Date()
                expiresAt.setMinutes(expiresAt.getMinutes() + 5)
                await Otp.findOneAndUpdate(
                    { email: canonicalEmail },
                    { $set: { ...(phone && { phone }), eotp, expiresAt } },
                    { upsert: true, new: true }
                )

                // Send eotp via email only — SMS OTP path disabled.
                const sendTasks: Promise<boolean>[] = [sendOtpEmail(canonicalEmail, eotp, 'verification')]
                // if (phone) sendTasks.push(sendOtpSms(phone, motp, 'verification'))
                await Promise.allSettled(sendTasks)

                userData.eotp = eotp
                // userData.motp = motp   // mobile OTP disabled
                userData.expiresAt = expiresAt
                userData.expiresIn = '5 minutes'
            } else {
                // Only generate tokens if user is verified
                const token = generateTokens({
                    id: user._id.toString(),
                    email: user.email,
                })
                userData.token = token
            }

            return userData
        } catch (error: any) {
            throw createUnauthorizedError(error.message || 'User not found')
        }
    },
    sendOtp: async (email: string, _target: 'email' | 'phone' | 'all' = 'all'): Promise<{
        success: boolean
        expiresAt: Date
        expiresIn: string
    }> => {
        try {
            // Mobile OTP disabled — `target` is ignored and we always send email OTP only.
            const user = await User.findOne({ email }).select('phone')
            const phone = user?.phone ?? null

            const eotp = generateOtp()
            // const motp = (target === 'phone' || target === 'all') ? PHONE_DEFAULT_OTP : null  // mobile OTP disabled

            const expiresAt = new Date()
            expiresAt.setMinutes(expiresAt.getMinutes() + 5)

            const updateFields: any = { expiresAt, eotp }
            // if (motp !== null) updateFields.motp = motp   // mobile OTP disabled
            if (phone) updateFields.phone = phone

            await Otp.findOneAndUpdate(
                { email },
                { $set: updateFields },
                { upsert: true, new: true }
            )

            // Email-only dispatch (SMS path disabled)
            const sendTasks: Promise<boolean>[] = [sendOtpEmail(email, eotp, 'verification')]
            // if (motp && phone) sendTasks.push(sendOtpSms(phone, motp, 'verification'))
            await Promise.allSettled(sendTasks)

            return {
                success: true,
                expiresAt,
                expiresIn: '5 minutes'
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'OTP not sent')
        }
    },
    verifyOtp: async (
        email: string,
        type: 'registration' | 'verification',
        _phone?: string,
        _target: 'email' | 'phone' | 'all' = 'email',
        eotp?: string,
        _motp?: string
    ): Promise<boolean> => {
        try {
            // Mobile OTP disabled — only email OTP (`eotp`) is honoured.
            // The `phone`, `motp` and `target` params are kept for backward compatibility
            // but are ignored.
            //
            // Previous multi-channel logic (kept here for reference):
            // if (target === 'phone' && phone && motp) {
            //     query = { phone: String(phone), motp }
            // } else if (target === 'all' && eotp && motp) {
            //     const lookupQuery: any = { eotp, motp }
            //     if (email) lookupQuery.$or = [{ email }, ...(phone ? [{ phone: String(phone) }] : [])]
            //     query = lookupQuery
            // } else if (eotp) {
            //     query = { email, eotp }
            // }

            if (!eotp) {
                throw createBadRequestError('OTP is required')
            }
            const query: any = { email, eotp }

            const otpRecord = await Otp.findOne(query)
            if (!otpRecord) {
                throw createBadRequestError('Invalid OTP')
            }

            // Always resolve the canonical email from the OTP record for downstream user lookups
            const resolvedEmail = otpRecord.email
            
            // Check if OTP has expired
            if (new Date() > otpRecord.expiresAt) {
                await Otp.deleteOne({ _id: otpRecord._id })
                throw createBadRequestError('OTP has expired')
            }
            
            // If type is registration, update the isVerified flag to true and create referral record
            if (type === 'registration') {
                const user = await User.findOne({ email: resolvedEmail })
                if (!user) {
                    throw createNotFoundError('User not found')
                }
                
                // Update isVerified flag
                await User.updateOne({ email: resolvedEmail }, { isVerified: true })
                
                // Check if referral record already exists
                const existingReferral = await Referral.findOne({ userId: user._id })
                if (!existingReferral) {
                    // Generate unique referral code for this user
                    const userReferralCode = generateReferralCode(user._id.toString())
                    
                    // Get referrer info from OTP record (stored during signup)
                    const referrerUserId = otpRecord.referrerUserId
                    let level = 0
                    
                    if (referrerUserId) {
                        const referrerData = await Referral.findOne({ userId: referrerUserId })
                        if (referrerData) {
                            level = referrerData.level + 1
                        }
                    }
                    
                    // Create referral record
                    const newReferral = new Referral({
                        userId: user._id,
                        referralCode: userReferralCode,
                        previousNode: referrerUserId || null,
                        nextNodes: [],
                        level: level,
                        totalReferrals: 0,
                        isActive: true,
                    })
                    await newReferral.save()
                    
                    // Update user's referralCode field
                    await User.updateOne({ email: resolvedEmail }, { referralCode: userReferralCode })
                    
                    // If there's a referrer, update their nextNodes
                    if (referrerUserId) {
                        await Referral.updateOne(
                            { userId: referrerUserId },
                            { 
                                $push: { nextNodes: user._id },
                                $inc: { totalReferrals: 1 }
                            }
                        )
                    }
                }
            }
            
            // Delete the OTP after successful verification
            await Otp.deleteOne({ _id: otpRecord._id })
            return true
        } catch (error: any) {
            throw createBadRequestError(error.message || 'OTP verification failed')
        }
    },
    getUserDetails: async (userId: string): Promise<{
        _id: string;
        name: string;
        email: string;
        phone: string;
        referralCode?: string;
        isVerified: boolean;
        dob?: Date;
        country?: string;
        city?: string;
        address?: string;
        profilepicture?: string;
        is2fa?: boolean;
        isBiometric?: boolean;
        pushNotificationStatus?: boolean;
        totalReferrals: number;
        totalTeams: number;
        totalEarning: number;
        themeMode: string;
        fcmToken?: string;
        createdAt: Date;
        updatedAt: Date;
        totalGames: number,
        gameWinningEarning: number,
        wallet: {
            mainWallet: number;
            gamingWallet: number;
            roiWallet: number;
            totalBalance: number;
            monthlyChange: {
                percentage: number;
                period: string;
                balanceAtStart: number;
                currentBalance: number;
            };
        };
    }> => {
        try {
            // Select all fields except password and otp
            const user = await User.findById(userId).select('-password -otp')
            if (!user) {
                throw createNotFoundError('User not found')
            }
            
            const wallet = await Wallet.findOne({ userId: user._id })
            if (!wallet) {
                throw createNotFoundError('Wallet not found')
            }
            
            // Get direct referrals count
            const referral = await Referral.findOne({ userId: user._id })
            const directReferralsCount = referral ? referral.totalReferrals : 0
            
            // Get totalTeams and totalEarning from TeamService
            const teamDetails = await TeamService.getTeamDetails(userId, userId)
            const { totalTeams, totalEarning } = teamDetails
            
            // Get total games played and total game winning amount for this user
            const [totalGames, gameWinningResult] = await Promise.all([
                Game.countDocuments({ userId: user._id }),
                Transaction.aggregate([
                    {
                        $match: {
                            userId: user._id,
                            category: TransactionCategory.GAME_WIN,
                            status: TransactionStatus.COMPLETED,
                        },
                    },
                    { $group: { _id: null, total: { $sum: '$amount' } } },
                ]),
            ])
            const gameWinningEarning = gameWinningResult[0]?.total ?? 0
            
            // Calculate total balance
            const totalBalance = wallet.mainWallet + wallet.gamingWallet + wallet.roiWallet
            
            // Calculate balance at start of current month
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            
            // Get all transactions before the start of current month to calculate starting balance
            const transactionsBeforeMonth = await Transaction.find({
                userId: user._id,
                createdAt: { $lt: startOfMonth },
                status: TransactionStatus.COMPLETED,
            })
            
            // Calculate balance at start of month by summing all transactions before start of month
            // Note: Deposits are split 50-50 between gamingWallet and roiWallet, so we use netAmount
            // Withdrawals deduct from specific wallets, so we use amount + fee
            // Game wins/losses affect gamingWallet
            // ROI credits affect roiWallet
            // Referral bonuses affect mainWallet
            let balanceAtStartOfMonth = 0
            transactionsBeforeMonth.forEach((txn: any) => {
                if (txn.category === TransactionCategory.DEPOSIT) {
                    // Deposit: netAmount is split 50-50, so total added = netAmount
                    balanceAtStartOfMonth += txn.netAmount || 0
                } else if (txn.category === TransactionCategory.WITHDRAWAL) {
                    // Withdrawal: amount + fee is deducted from wallet
                    balanceAtStartOfMonth -= (txn.amount + (txn.fee || 0))
                } else if (txn.category === TransactionCategory.GAME_WIN) {
                    // Game win: adds to gamingWallet
                    balanceAtStartOfMonth += txn.amount || 0
                } else if (txn.category === TransactionCategory.GAME_LOSE) {
                    // Game lose: deducts from gamingWallet
                    balanceAtStartOfMonth -= txn.amount || 0
                } else if (txn.category === TransactionCategory.ROI_CREDIT) {
                    // ROI credit: adds to roiWallet
                    balanceAtStartOfMonth += txn.amount || 0
                } else if (txn.category === TransactionCategory.REFERRAL_BONUS) {
                    // Referral bonus: adds to mainWallet
                    balanceAtStartOfMonth += txn.amount || 0
                }
            })
            
            // Calculate percentage change for this month
            let percentageChange = 0
            if (balanceAtStartOfMonth > 0) {
                percentageChange = ((totalBalance - balanceAtStartOfMonth) / balanceAtStartOfMonth) * 100
            } else if (totalBalance > 0) {
                // If starting balance was 0 but current balance > 0, it's 100% increase
                percentageChange = 100
            }
            
            return {
                _id: user._id.toString(),
                name: user.name,
                email: user.email,
                phone: user.phone,
                referralCode: user.referralCode || undefined,
                isVerified: user.isVerified,
                dob: user.dob || undefined,
                country: user.country || undefined,
                city: user.city || undefined,
                address: user.address || undefined,
                profilepicture: user.profilepicture || undefined,
                is2fa: user.is2fa || undefined,
                isBiometric: user.isBiometric || undefined,
                pushNotificationStatus: (user as any).pushNotificationStatus ?? true,
                totalReferrals: directReferralsCount,
                totalTeams,
                totalEarning,
                totalGames,
                gameWinningEarning: Number(gameWinningEarning.toFixed(2)),
                themeMode: (user as any).themeMode || 'light',
                fcmToken: (user as any).fcmToken ?? null,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                wallet: {
                    mainWallet: wallet.mainWallet,
                    gamingWallet: wallet.gamingWallet,
                    roiWallet: wallet.roiWallet,
                    totalBalance: totalBalance,
                    monthlyChange: {
                        percentage: Number(percentageChange.toFixed(2)),
                        period: 'this month',
                        balanceAtStart: balanceAtStartOfMonth,
                        currentBalance: totalBalance,
                    },
                },
            }
        } catch (error: any) {
            throw createNotFoundError(error.message || 'User not found')
        }
    },
    getDirectReferrals: async (userId: string): Promise<Array<{
        _id: string;
        name: string;
        totalTeam: number;
        totalEarnings: number;
        allLevelsCommissionRate: number;
        directCommissionRate: number;
    }>> => {
        try {
            // Find the referral record for this user
            const userReferral = await Referral.findOne({ userId })
            if (!userReferral) {
                // User has no referral record, return empty array
                return []
            }
            
            // Get all direct referral user IDs
            const directReferralIds = userReferral.nextNodes
            if (directReferralIds.length === 0) {
                return []
            }
            
            // Fetch all direct referral users
            const directReferralUsers = await User.find({ 
                _id: { $in: directReferralIds } 
            }).select('name')
            
            const platformConfig = await (await import('../models/InvestmentConfigModel')).getInvestmentConfig()

            // For each direct referral, get their referral count
            const result = await Promise.all(
                directReferralUsers.map(async (user) => {
                    const referralRecord = await Referral.findOne({ userId: user._id })
                    const directReferralsCount = referralRecord ? referralRecord.totalReferrals : 0
                    
                    // Get wallet to calculate earnings (you can customize this calculation)
                    const wallet = await Wallet.findOne({ userId: user._id })
                    const totalEarnings = wallet ? wallet.roiWallet : 0
                    
                    return {
                        _id: user._id.toString(),
                        name: user.name,
                        totalTeam: directReferralsCount,
                        totalEarnings,
                        allLevelsCommissionRate: referralRecord?.allLevelsCommissionRate ?? platformConfig.indirectCommissionRate,
                        directCommissionRate: referralRecord?.directCommissionRate ?? platformConfig.directCommissionRate,
                    }
                })
            )
            
            return result
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to fetch direct referrals')
        }
    },
    editProfile: async (
        userId: string,
        updateData: {
            name?: string;
            phone?: string;
            dob?: Date | string;
            country?: string;
            city?: string;
            address?: string;
            profilepicture?: string;
        }
    ): Promise<{
        _id: string;
        name: string;
        email: string;
        phone: string;
        dob?: Date;
        country?: string;
        city?: string;
        address?: string;
        profilepicture?: string;
        updatedAt: Date;
    }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Check if phone is being changed and if it conflicts with another user
            if (updateData.phone && updateData.phone !== user.phone) {
                const existingUser = await User.findOne({ phone: updateData.phone })
                if (existingUser && existingUser._id.toString() !== userId) {
                    throw createConflictError('Phone already registered with another account')
                }
            }

            // Prepare update object with only provided fields
            // Note: Email cannot be changed for security reasons
            const updateFields: any = {}
            if (updateData.name !== undefined) updateFields.name = updateData.name
            if (updateData.phone !== undefined) updateFields.phone = updateData.phone
            if (updateData.dob !== undefined) {
                // Convert string to Date if needed
                updateFields.dob = updateData.dob instanceof Date ? updateData.dob : new Date(updateData.dob)
            }
            if (updateData.country !== undefined) updateFields.country = updateData.country
            if (updateData.city !== undefined) updateFields.city = updateData.city
            if (updateData.address !== undefined) updateFields.address = updateData.address
            if (updateData.profilepicture !== undefined) updateFields.profilepicture = updateData.profilepicture

            // Update the user
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateFields },
                { new: true, runValidators: true }
            ).select('_id name email phone dob country city address profilepicture updatedAt').lean()

            if (!updatedUser) {
                throw createBadRequestError('Failed to update profile')
            }

            return {
                _id: updatedUser._id.toString(),
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                dob: (updatedUser.dob != null ? updatedUser.dob : undefined) as Date | undefined,
                country: (updatedUser.country != null ? updatedUser.country : undefined) as string | undefined,
                city: (updatedUser.city != null ? updatedUser.city : undefined) as string | undefined,
                address: (updatedUser.address != null ? updatedUser.address : undefined) as string | undefined,
                profilepicture: (updatedUser.profilepicture != null ? updatedUser.profilepicture : undefined) as string | undefined,
                updatedAt: updatedUser.updatedAt,
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update profile')
        }
    },
    changePassword: async (
        userId: string,
        currentPassword: string,
        newPassword: string,
        confirmPassword: string
    ): Promise<{ message: string }> => {
        try {
            // Find the user with password field
            const user = await User.findById(userId).select('password')
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Verify current password
            const isCurrentPasswordValid = currentPassword === user.password
            if (!isCurrentPasswordValid) {
                throw createBadRequestError('Current password is incorrect')
            }

            // Validate that new password and confirm password match
            if (newPassword !== confirmPassword) {
                throw createBadRequestError('New password and confirm password do not match')
            }

            // Validate that new password is different from current password
            const isSamePassword = newPassword === user.password
            if (isSamePassword) {
                throw createBadRequestError('New password must be different from current password')
            }

            // Validate password strength (8+ chars, 1 uppercase, 1 number, 1 special char)
            const passwordValidation = validatePassword(newPassword)
            if (!passwordValidation.isValid) {
                throw createBadRequestError(passwordValidation.error || 'Invalid password')
            }

            // Update the user's password
            await User.findByIdAndUpdate(userId, { password: newPassword })

            return {
                message: 'Password changed successfully'
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to change password')
        }
    },
    update2FA: async (
        userId: string,
        is2fa: boolean
    ): Promise<{ message: string; is2fa: boolean }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Update 2FA setting
            await User.findByIdAndUpdate(userId, { is2fa })

            return {
                message: `2FA ${is2fa ? 'enabled' : 'disabled'} successfully`,
                is2fa
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update 2FA setting')
        }
    },
    updateBiometric: async (
        userId: string,
        isBiometric: boolean
    ): Promise<{ message: string; isBiometric: boolean }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Update biometric setting
            await User.findByIdAndUpdate(userId, { isBiometric })

            return {
                message: `Biometric authentication ${isBiometric ? 'enabled' : 'disabled'} successfully`,
                isBiometric
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update biometric setting')
        }
    },
    updatePushNotification: async (
        userId: string,
        pushNotificationStatus: boolean
    ): Promise<{ message: string; pushNotificationStatus: boolean }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Update push notification setting
            await User.findByIdAndUpdate(userId, { pushNotificationStatus })

            return {
                message: `Push notifications ${pushNotificationStatus ? 'enabled' : 'disabled'} successfully`,
                pushNotificationStatus
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update push notification setting')
        }
    },
    updateFcmToken: async (
        userId: string,
        fcmToken: string
    ): Promise<{ message: string }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Update FCM token
            await User.findByIdAndUpdate(userId, { fcmToken })

            return {
                message: 'FCM token updated successfully'
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to update FCM token')
        }
    },
    logout: async (
        userId: string
    ): Promise<{ message: string }> => {
        try {
            // Find the user
            const user = await User.findById(userId)
            if (!user) {
                throw createNotFoundError('User not found')
            }

            // Clear FCM token on logout by setting it to null
            await User.findByIdAndUpdate(userId, { fcmToken: null })

            return {
                message: 'Logged out successfully. FCM token cleared.'
            }
        } catch (error: any) {
            throw createBadRequestError(error.message || 'Failed to logout')
        }
    },

    /**
     * Generate a secure temporary password
     * Requirements: 8 characters with at least 1 uppercase, 1 lowercase, 1 number, 1 special character
     * @returns Secure random password
     */
    generateSecurePassword: (): string => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        const lowercase = 'abcdefghijklmnopqrstuvwxyz'
        const numbers = '0123456789'
        const special = '!@#$%^&*'
        
        // Ensure at least one character from each category
        const password = [
            uppercase[Math.floor(Math.random() * uppercase.length)],
            lowercase[Math.floor(Math.random() * lowercase.length)],
            numbers[Math.floor(Math.random() * numbers.length)],
            special[Math.floor(Math.random() * special.length)]
        ]
        
        // Fill remaining 4 characters with random mix
        const allChars = uppercase + lowercase + numbers + special
        for (let i = 0; i < 4; i++) {
            password.push(allChars[Math.floor(Math.random() * allChars.length)])
        }
        
        // Shuffle the password array to randomize positions
        for (let i = password.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [password[i], password[j]] = [password[j], password[i]]
        }
        
        return password.join('')
    },

    /**
     * Reset password - Generate temporary password and send via email
     * @param email - User's email address
     * @returns Success message
     */
    resetPassword: async (email: string): Promise<{ message: string }> => {
        try {
            // Find user by email
            const user = await User.findOne({ email })
            if (!user) {
                throw createNotFoundError('User not found with this email address')
            }

            // Generate a secure temporary password (8 characters with uppercase, lowercase, number, special char)
            const temporaryPassword = await (async () => {
                const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
                const lowercase = 'abcdefghijklmnopqrstuvwxyz'
                const numbers = '0123456789'
                const special = '!@#$%^&*'
                
                // Ensure at least one character from each category
                const password = [
                    uppercase[Math.floor(Math.random() * uppercase.length)],
                    lowercase[Math.floor(Math.random() * lowercase.length)],
                    numbers[Math.floor(Math.random() * numbers.length)],
                    special[Math.floor(Math.random() * special.length)]
                ]
                
                // Fill remaining 4 characters with random mix
                const allChars = uppercase + lowercase + numbers + special
                for (let i = 0; i < 4; i++) {
                    password.push(allChars[Math.floor(Math.random() * allChars.length)])
                }
                
                // Shuffle the password array to randomize positions
                for (let i = password.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [password[i], password[j]] = [password[j], password[i]]
                }
                
                return password.join('')
            })()

            // Update user's password in database
            await User.findByIdAndUpdate(user._id, { 
                password: temporaryPassword 
            })

            // Send email with temporary password using beautiful template
            const emailHtml = temporaryPasswordTemplate({
                userName: user.name || 'User',
                temporaryPassword: temporaryPassword,
                date: new Date()
            })

            const emailSent = await sendEmail({
                to: user.email,
                subject: '🔑 Password Reset - Temporary Password',
                html: emailHtml
            })

            if (!emailSent) {
                throw createBadRequestError('Failed to send email. Please try again.')
            }

            console.log(`✅ Password reset successful for user: ${user.email}`)
            console.log(`   Temporary password sent via email`)

            return {
                message: 'Temporary password has been sent to your email. Please check your inbox and change your password after logging in.'
            }
        } catch (error: any) {
            console.error('❌ Password reset failed:', error.message)
            throw createBadRequestError(error.message || 'Failed to reset password')
        }
    }
}

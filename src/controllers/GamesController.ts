import { HttpStatusCode } from '../enums/App'
import { Request, Response } from 'express'
import GameService from '../services/GameService'
import { GameType } from '../models/GameModel'
import { validateBetAmount } from '../utils/gamesHelper'

export default {
    placeBetColorChangeGame: async (req: Request, res: Response): Promise<void> => {
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

            const { color, betAmount } = req.body

            // Validate color
            const validColors = ['RED', 'GREEN', 'BLUE']
            if (!color || !validColors.includes(color.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Color must be RED, GREEN, or BLUE',
                    data: null
                })
                return
            }

            // Validate betAmount (config-driven via GameConfig)
            const amount = Number(betAmount)
            const colorBetCheck = await validateBetAmount(amount, GameType.COLOR_CHANGER)
            if (!colorBetCheck.isValid) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: colorBetCheck.error,
                    data: null
                })
                return
            }

            // Place bet using GameService
            const result = await GameService.placeBetColorChanger(userId, color, amount)

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    gameId: result.gameId,
                    result: result.result,
                    userColor: result.userColor,
                    winningColor: result.winningColor,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    lossAmount: result.lossAmount,
                    userProfitLoss: result.userProfitLoss,
                    gamingWalletBalance: result.gamingWalletBalance,
                }
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    placeBetDiceRoll: async (req: Request, res: Response): Promise<void> => {
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

            const { betType, betAmount, selectedNumber, selectedRange } = req.body

            // Validate betType
            const validBetTypes = ['SINGLE_NUMBERS', 'NUMBER_RANGE']
            if (!betType || !validBetTypes.includes(betType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Bet type must be SINGLE_NUMBERS or NUMBER_RANGE',
                    data: null
                })
                return
            }

            // Validate betAmount (config-driven via GameConfig)
            const amount = Number(betAmount)
            const diceBetCheck = await validateBetAmount(amount, GameType.DICE_ROLL)
            if (!diceBetCheck.isValid) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: diceBetCheck.error,
                    data: null
                })
                return
            }

            // Validate bet type specific inputs
            if (betType === 'SINGLE_NUMBERS') {
                if (selectedNumber === undefined || selectedNumber === null) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Selected number is required for single numbers bet',
                        data: null
                    })
                    return
                }
                // Validate number is between 1-6
                const num = Number(selectedNumber)
                if (isNaN(num) || num < 1 || num > 6 || !Number.isInteger(num)) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Selected number must be an integer between 1 and 6',
                        data: null
                    })
                    return
                }
            } else if (betType === 'NUMBER_RANGE') {
                if (!selectedRange || typeof selectedRange !== 'object') {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Selected range is required for number range bet',
                        data: null
                    })
                    return
                }
                const from = Number(selectedRange.from)
                const to = Number(selectedRange.to)
                if (isNaN(from) || isNaN(to) || from < 1 || from > 6 || to < 1 || to > 6 || 
                    !Number.isInteger(from) || !Number.isInteger(to)) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Range values must be integers between 1 and 6',
                        data: null
                    })
                    return
                }
                if (from > to) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message: 'Range "from" value must be less than or equal to "to" value',
                        data: null
                    })
                    return
                }
                if (to - from > 2) {
                    res.status(HttpStatusCode.BAD_REQUEST).json({
                        success: false,
                        message:
                            'Number range can include at most 3 numbers (e.g. 1-1, 1-2, 1-3, 4-6)',
                        data: null
                    })
                    return
                }
            }

            // Place bet using GameService
            const result = await GameService.placeBetDiceRoll(
                userId,
                betType,
                amount,
                betType === 'SINGLE_NUMBERS' ? Number(selectedNumber) : undefined,
                betType === 'NUMBER_RANGE' ? { from: Number(selectedRange.from), to: Number(selectedRange.to) } : undefined
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    gameId: result.gameId,
                    result: result.result,
                    betType: result.betType,
                    selectedNumber: result.selectedNumber,
                    selectedRange: result.selectedRange,
                    diceResult: result.diceResult,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    lossAmount: result.lossAmount,
                    userProfitLoss: result.userProfitLoss,
                    gamingWalletBalance: result.gamingWalletBalance,
                }
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    placeBetDragonTiger: async (req: Request, res: Response): Promise<void> => {
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

            const { betType, betAmount } = req.body

            // Validate betType
            const validBetTypes = ['DRAGON', 'TIGER', 'TIE']
            if (!betType || !validBetTypes.includes(betType.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Bet type must be DRAGON, TIGER, or TIE',
                    data: null
                })
                return
            }

            // Validate betAmount (config-driven via GameConfig)
            const amount = Number(betAmount)
            const dragonTigerBetCheck = await validateBetAmount(amount, GameType.DRAGON_TIGER)
            if (!dragonTigerBetCheck.isValid) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: dragonTigerBetCheck.error,
                    data: null
                })
                return
            }

            // Place bet using GameService
            const result = await GameService.placeBetDragonTiger(
                userId,
                betType.toUpperCase() as 'DRAGON' | 'TIGER' | 'TIE',
                amount
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    gameId: result.gameId,
                    result: result.result,
                    betType: result.betType,
                    dragonCard: result.dragonCard,
                    tigerCard: result.tigerCard,
                    winningSide: result.winningSide,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    lossAmount: result.lossAmount,
                    userProfitLoss: result.userProfitLoss,
                    gamingWalletBalance: result.gamingWalletBalance,
                }
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    placeBetSuperOver: async (req: Request, res: Response): Promise<void> => {
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

            const { betType, runThreshold, betAmount } = req.body

            // Validate betType
            const validBetTypes = ['OVER', 'UNDER']
            if (!betType || !validBetTypes.includes(betType.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Bet type must be OVER or UNDER',
                    data: null
                })
                return
            }

            // Validate runThreshold
            const validThresholds = [6, 8, 10, 12, 14, 16]
            if (!runThreshold || !validThresholds.includes(Number(runThreshold))) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Run threshold must be one of: 6, 8, 10, 12, 14, 16',
                    data: null
                })
                return
            }

            // Validate betAmount (config-driven via GameConfig)
            const amount = Number(betAmount)
            const superOverBetCheck = await validateBetAmount(amount, GameType.SUPER_OVER)
            if (!superOverBetCheck.isValid) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: superOverBetCheck.error,
                    data: null
                })
                return
            }

            // Place bet using GameService
            const result = await GameService.placeBetSuperOver(
                userId,
                betType.toUpperCase() as 'OVER' | 'UNDER',
                Number(runThreshold),
                amount
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    gameId: result.gameId,
                    result: result.result,
                    betType: result.betType,
                    runThreshold: result.runThreshold,
                    ballScores: result.ballScores,
                    totalRunsScored: result.totalRunsScored,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    lossAmount: result.lossAmount,
                    userProfitLoss: result.userProfitLoss,
                    gamingWalletBalance: result.gamingWalletBalance,
                }
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    placeBetMarbleRace: async (req: Request, res: Response): Promise<void> => {
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

            const { selectedMarble, betAmount } = req.body

            // Validate selectedMarble
            const validMarbles = ['RED', 'BLUE', 'GREEN', 'ORANGE']
            if (!selectedMarble || !validMarbles.includes(selectedMarble.toUpperCase())) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Selected marble must be RED, BLUE, GREEN, or ORANGE',
                    data: null
                })
                return
            }

            // Validate betAmount (config-driven via GameConfig)
            const amount = Number(betAmount)
            const marbleBetCheck = await validateBetAmount(amount, GameType.MARBLE_RACE)
            if (!marbleBetCheck.isValid) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: marbleBetCheck.error,
                    data: null
                })
                return
            }

            // Place bet using GameService
            const result = await GameService.placeBetMarbleRace(
                userId,
                selectedMarble.toUpperCase() as 'RED' | 'BLUE' | 'GREEN' | 'ORANGE',
                amount
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: result.message,
                data: {
                    gameId: result.gameId,
                    result: result.result,
                    selectedMarble: result.selectedMarble,
                    winningMarble: result.winningMarble,
                    betAmount: result.betAmount,
                    winAmount: result.winAmount,
                    lossAmount: result.lossAmount,
                    userProfitLoss: result.userProfitLoss,
                    gamingWalletBalance: result.gamingWalletBalance,
                }
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
    getGameTransactions: async (req: Request, res: Response): Promise<void> => {
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

            // Get query parameters
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 20
            const gameName = req.query.gameName as 'COLOR_CHANGER' | 'DICE_ROLL' | 'DRAGON_TIGER' | 'SUPER_OVER' | undefined
            const gameType = (req.query.gameType as 'ALL' | 'WIN' | 'LOSS') || 'ALL'

            // Validate pagination parameters
            if (page < 1 || limit < 1 || limit > 100) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100',
                    data: null,
                })
                return
            }

            // Validate gameName parameter
            if (gameName && !['COLOR_CHANGER', 'DICE_ROLL', 'DRAGON_TIGER', 'SUPER_OVER', 'MARBLE_RACE'].includes(gameName)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid gameName. Allowed values: COLOR_CHANGER, DICE_ROLL, DRAGON_TIGER, SUPER_OVER, MARBLE_RACE',
                    data: null,
                })
                return
            }

            // Validate gameType parameter
            if (!['ALL', 'WIN', 'LOSS'].includes(gameType)) {
                res.status(HttpStatusCode.BAD_REQUEST).json({
                    success: false,
                    message: 'Invalid gameType. Allowed values: ALL, WIN, LOSS',
                    data: null,
                })
                return
            }

            // Fetch game transactions
            const result = await GameService.getGameTransactions(
                userId,
                page,
                limit,
                gameName,
                gameType
            )

            res.status(HttpStatusCode.OK).json({
                success: true,
                message: 'Game transactions fetched successfully',
                data: result,
            })
        } catch (error: any) {
            const statusCode = error.statusCode || HttpStatusCode.INTERNAL_SERVER_ERROR
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Internal server error',
                data: null,
            })
        }
    },
}

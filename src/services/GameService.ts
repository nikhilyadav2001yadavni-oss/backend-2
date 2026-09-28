import { createBadRequestError, createNotFoundError } from '../middleware/authentication'
import Game, { GameType, GameResult } from '../models/GameModel'
import Wallet from '../models/WalletModel'
import Transaction, { TransactionCategory, TransactionStatus } from '../models/TransactionModel'
import mongoose from 'mongoose'
import {
    getUserTotalProfitLoss,
    determineGameResult,
    calculateNetProfitLoss,
    updateGamingWallet,
    getRandomItem,
    getGameConfig,
} from '../utils/gamesHelper'

// Color Changer Game specific constants
const VALID_COLORS = ['RED', 'GREEN', 'BLUE']

/**
 * Generate random winning color (for display purposes)
 */
const generateWinningColor = (): string => {
    return getRandomItem(VALID_COLORS)
}

/**
 * Generate random dice result (1-6)
 */
const generateDiceResult = (): number => {
    return Math.floor(Math.random() * 6) + 1
}

/**
 * Card suits and ranks for Dragon Tiger
 */
const CARD_SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades']
const CARD_RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King']

/**
 * Get card value for comparison (Ace = 1, 2-10 = face value, Jack = 11, Queen = 12, King = 13)
 */
const getCardValue = (rank: string): number => {
    if (rank === 'Ace') return 1
    if (rank === 'Jack') return 11
    if (rank === 'Queen') return 12
    if (rank === 'King') return 13
    return parseInt(rank)
}

/**
 * Generate a random card
 */
const generateRandomCard = (): { suit: string; rank: string; value: number } => {
    const suit = getRandomItem(CARD_SUITS)
    const rank = getRandomItem(CARD_RANKS)
    const value = getCardValue(rank)
    return { suit, rank, value }
}

/**
 * Generate random run for a cricket ball (0-6 runs)
 */
const generateBallRun = (): number => {
    // In cricket, runs per ball are typically 0-6
    // Higher probability for lower runs (more realistic)
    const random = Math.random()
    if (random < 0.3) return 0      // 30% chance for 0 runs
    if (random < 0.5) return 1       // 20% chance for 1 run
    if (random < 0.65) return 2     // 15% chance for 2 runs
    if (random < 0.75) return 3     // 10% chance for 3 runs
    if (random < 0.85) return 4     // 10% chance for 4 runs
    if (random < 0.95) return 6     // 10% chance for 6 runs (boundary)
    return Math.floor(Math.random() * 3) + 4 // 5% chance for 4-5 runs
}

/**
 * Generate 6 ball scores for Super Over
 */
const generateBallScores = (): number[] => {
    return Array.from({ length: 6 }, () => generateBallRun())
}

/**
 * Marble colors for Marble Race
 */
const MARBLE_COLORS = ['RED', 'BLUE', 'GREEN', 'ORANGE']

/**
 * Generate random winning marble
 */
const generateWinningMarble = (): 'RED' | 'BLUE' | 'GREEN' | 'ORANGE' => {
    return getRandomItem(MARBLE_COLORS) as 'RED' | 'BLUE' | 'GREEN' | 'ORANGE'
}

/**
 * Check if dice result matches single number bet
 */
const checkSingleNumberWin = (selectedNumber: number, diceResult: number): boolean => {
    return selectedNumber === diceResult
}

/**
 * Check if dice result matches number range bet
 */
const checkNumberRangeWin = (range: { from: number; to: number }, diceResult: number): boolean => {
    return diceResult >= range.from && diceResult <= range.to
}

/**
 * Place bet for Color Changer Game
 */
export const placeBetColorChanger = async (
    userId: string,
    color: string,
    betAmount: number
): Promise<{
    gameId: string
    result: GameResult
    userColor: string
    winningColor: string
    betAmount: number
    winAmount?: number
    lossAmount?: number
    userProfitLoss: number
    gamingWalletBalance: number
    message: string
}> => {
    try {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }
        
        // Check if user has sufficient balance in gaming wallet
        if (wallet.gamingWallet < betAmount) {
            throw createBadRequestError('Insufficient balance in gaming wallet')
        }
        
        // Determine game result using three-tier logic (fetches config from DB)
        const gameResult = await determineGameResult(
            userId,
            betAmount,
            GameType.COLOR_CHANGER
        )
        
        // Generate winning color based on game result
        // If user wins (normal or forced), winning color should match their selection
        // If user loses, winning color should be different from their selection
        let winningColor: string
        if (gameResult.result === GameResult.WIN) {
            // User wins - winning color should match their selected color
            winningColor = color.toUpperCase()
        } else {
            // User loses - generate a color different from their selection
            const validColors = VALID_COLORS.filter(c => c !== color.toUpperCase())
            winningColor = getRandomItem(validColors)
        }
        
        // Calculate new profit/loss (net profit/loss)
        const currentProfitLoss = await getUserTotalProfitLoss(userId)
        const netProfitLoss = calculateNetProfitLoss(gameResult, betAmount)
        const newProfitLoss = currentProfitLoss + netProfitLoss
        
        // Update wallet
        updateGamingWallet(wallet, gameResult, betAmount)
        
        await wallet.save()
        
        // Create game record
        const newGame = new Game({
            userId: new mongoose.Types.ObjectId(userId),
            gameType: GameType.COLOR_CHANGER,
            userColor: color.toUpperCase(),
            winningColor, // Store the result color at top level for easy access
            betAmount,
            result: gameResult.result,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            platformRiskCheck: gameResult.platformRiskCheck,
            forcedResult: gameResult.forcedResult,
            metadata: {
                selectedColor: color.toUpperCase(),
                winningColor, // Also keep in metadata for backward compatibility
                probability: gameResult.probability,
                notes: gameResult.forcedResult 
                    ? (gameResult.platformRiskCheck 
                        ? 'Result forced due to platform risk' 
                        : 'Result forced due to user profit/loss limits')
                    : 'Normal gameplay',
            },
        })
        await newGame.save()
        
        // Create transaction record
        const transactionCategory = gameResult.result === GameResult.WIN 
            ? TransactionCategory.GAME_WIN 
            : TransactionCategory.GAME_LOSE
        
        const transactionAmount = gameResult.result === GameResult.WIN 
            ? (gameResult.winAmount || 0) 
            : (gameResult.lossAmount || 0)
        
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            category: transactionCategory,
            status: TransactionStatus.COMPLETED,
            amount: transactionAmount,
            currency: 'USDT',
            network: 'INTERNAL',
            fee: 0,
            netAmount: transactionAmount,
            blockchainVerified: false,
            metadata: {
                gamingWalletAmount: wallet.gamingWallet,
                gameId: newGame.gameId,
                notes: `Color Changer Game - ${gameResult.result}`,
            },
        })
        await newTransaction.save()
        
        // Prepare response message
        let message = ''
        if (gameResult.result === GameResult.WIN) {
            message = `Congratulations! You won ${gameResult.winAmount} USDT!`
        } else {
            message = `Sorry, you lost ${gameResult.lossAmount} USDT. Better luck next time!`
        }
        
        return {
            gameId: newGame.gameId,
            result: gameResult.result,
            userColor: color.toUpperCase(),
            winningColor,
            betAmount,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            gamingWalletBalance: wallet.gamingWallet,
            message,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to place bet')
    }
}

/**
 * Place bet for Dice Roll Game
 */
export const placeBetDiceRoll = async (
    userId: string,
    betType: 'SINGLE_NUMBERS' | 'NUMBER_RANGE',
    betAmount: number,
    selectedNumber?: number,
    selectedRange?: { from: number; to: number }
): Promise<{
    gameId: string
    result: GameResult
    betType: 'SINGLE_NUMBERS' | 'NUMBER_RANGE'
    selectedNumber?: number
    selectedRange?: { from: number; to: number }
    diceResult: number
    betAmount: number
    winAmount?: number
    lossAmount?: number
    userProfitLoss: number
    gamingWalletBalance: number
    message: string
}> => {
    try {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }
        
        // Check if user has sufficient balance in gaming wallet
        if (wallet.gamingWallet < betAmount) {
            throw createBadRequestError('Insufficient balance in gaming wallet')
        }
        
        // Validate bet type specific inputs
        if (betType === 'SINGLE_NUMBERS') {
            if (selectedNumber === undefined || selectedNumber === null) {
                throw createBadRequestError('Selected number is required for single numbers bet')
            }
            // Validate number is between 1-6
            const num = Number(selectedNumber)
            if (isNaN(num) || num < 1 || num > 6 || !Number.isInteger(num)) {
                throw createBadRequestError('Selected number must be an integer between 1 and 6')
            }
        } else if (betType === 'NUMBER_RANGE') {
            if (!selectedRange || !selectedRange.from || !selectedRange.to) {
                throw createBadRequestError('Selected range is required for number range bet')
            }
            // Validate range
            if (selectedRange.from < 1 || selectedRange.from > 6 || 
                selectedRange.to < 1 || selectedRange.to > 6 ||
                !Number.isInteger(selectedRange.from) || !Number.isInteger(selectedRange.to)) {
                throw createBadRequestError('Range values must be integers between 1 and 6')
            }
            if (selectedRange.from > selectedRange.to) {
                throw createBadRequestError('Range "from" value must be less than or equal to "to" value')
            }
            if (selectedRange.to - selectedRange.from > 2) {
                throw createBadRequestError(
                    'Number range can include at most 3 numbers (e.g. 1-1, 1-2, 1-3, 4-6)'
                )
            }
        }
        
        // Determine game result using three-tier logic (fetches config from DB)
        // This determines if we allow the win or force a loss
        const gameResult = await determineGameResult(
            userId,
            betAmount,
            GameType.DICE_ROLL
        )
        
        // Generate dice result based on game outcome
        // If user should win, ensure dice matches their bet
        // If user should lose, ensure dice doesn't match (unless forced win)
        let diceResult: number
        let diceMatches = false
        
        if (gameResult.result === GameResult.WIN) {
            // User wins - generate a matching dice result
            if (betType === 'SINGLE_NUMBERS' && selectedNumber !== undefined) {
                // Use the selected number as dice result
                diceResult = selectedNumber
                diceMatches = true
            } else if (betType === 'NUMBER_RANGE' && selectedRange) {
                // Generate a random number within the range
                const rangeSize = selectedRange.to - selectedRange.from + 1
                diceResult = selectedRange.from + Math.floor(Math.random() * rangeSize)
                diceMatches = true
            } else {
                // Fallback - shouldn't happen
                diceResult = generateDiceResult()
            }
        } else {
            // User should lose - generate a non-matching dice result
            diceResult = generateDiceResult()
            
            // Check if it accidentally matches
            if (betType === 'SINGLE_NUMBERS' && selectedNumber !== undefined) {
                diceMatches = checkSingleNumberWin(selectedNumber, diceResult)
                // If it matches, generate a different number
                if (diceMatches) {
                    const allNumbers = [1, 2, 3, 4, 5, 6]
                    const otherNumbers = allNumbers.filter(n => n !== selectedNumber)
                    if (otherNumbers.length > 0) {
                        diceResult = getRandomItem(otherNumbers)
                        diceMatches = false
                    }
                }
            } else if (betType === 'NUMBER_RANGE' && selectedRange) {
                diceMatches = checkNumberRangeWin(selectedRange, diceResult)
                // If it matches, generate a number outside the range
                if (diceMatches) {
                    const allNumbers = [1, 2, 3, 4, 5, 6]
                    const rangeNumbers: number[] = []
                    for (let i = selectedRange.from; i <= selectedRange.to; i++) {
                        rangeNumbers.push(i)
                    }
                    const outsideRange = allNumbers.filter(n => !rangeNumbers.includes(n))
                    if (outsideRange.length > 0) {
                        diceResult = getRandomItem(outsideRange)
                        diceMatches = false
                    }
                }
            }
        }
        
        // Calculate new profit/loss (net profit/loss)
        const currentProfitLoss = await getUserTotalProfitLoss(userId)
        const netProfitLoss = calculateNetProfitLoss(gameResult, betAmount)
        const newProfitLoss = currentProfitLoss + netProfitLoss
        
        // Update wallet
        updateGamingWallet(wallet, gameResult, betAmount)
        
        await wallet.save()
        
        // Create game record
        const newGame = new Game({
            userId: new mongoose.Types.ObjectId(userId),
            gameType: GameType.DICE_ROLL,
            betAmount,
            result: gameResult.result,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            platformRiskCheck: gameResult.platformRiskCheck,
            forcedResult: gameResult.forcedResult,
            metadata: {
                betType,
                selectedNumber: betType === 'SINGLE_NUMBERS' ? selectedNumber : undefined,
                selectedRange: betType === 'NUMBER_RANGE' ? selectedRange : undefined,
                diceResult,
                winMultiplier: gameResult.winAmount ? gameResult.winAmount / betAmount : undefined,
                probability: gameResult.probability,
                notes: gameResult.forcedResult 
                    ? (gameResult.platformRiskCheck 
                        ? 'Result forced due to platform risk' 
                        : 'Result forced due to user profit/loss limits')
                    : 'Normal gameplay',
            },
        })
        await newGame.save()
        
        // Create transaction record
        const transactionCategory = gameResult.result === GameResult.WIN 
            ? TransactionCategory.GAME_WIN 
            : TransactionCategory.GAME_LOSE
        
        const transactionAmount = gameResult.result === GameResult.WIN 
            ? (gameResult.winAmount || 0) 
            : (gameResult.lossAmount || 0)
        
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            category: transactionCategory,
            status: TransactionStatus.COMPLETED,
            amount: transactionAmount,
            currency: 'USDT',
            network: 'INTERNAL',
            fee: 0,
            netAmount: transactionAmount,
            blockchainVerified: false,
            metadata: {
                gamingWalletAmount: wallet.gamingWallet,
                gameId: newGame.gameId,
                notes: `Dice Roll Game - ${gameResult.result}`,
            },
        })
        await newTransaction.save()
        
        // Prepare response message
        let message = ''
        if (gameResult.result === GameResult.WIN) {
            const winMultiplier = gameResult.winAmount ? (gameResult.winAmount / betAmount).toFixed(1) : '2.0'
            message = `Congratulations! Dice rolled ${diceResult}. You won ${gameResult.winAmount} USDT (${winMultiplier}x)!`
        } else {
            message = `Sorry, dice rolled ${diceResult}. You lost ${gameResult.lossAmount} USDT. Better luck next time!`
        }
        
        return {
            gameId: newGame.gameId,
            result: gameResult.result,
            betType,
            selectedNumber: betType === 'SINGLE_NUMBERS' ? selectedNumber : undefined,
            selectedRange: betType === 'NUMBER_RANGE' ? selectedRange : undefined,
            diceResult,
            betAmount,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            gamingWalletBalance: wallet.gamingWallet,
            message,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to place bet')
    }
}

/**
 * Get game transactions (GAME_WIN and GAME_LOSE) for a user
 * @param userId - User ID
 * @param page - Page number (default: 1)
 * @param limit - Number of transactions per page (default: 20)
 * @param gameName - Filter by game name: COLOR_CHANGER, DICE_ROLL, DRAGON_TIGER, SUPER_OVER, or MARBLE_RACE (optional)
 * @param gameType - Filter by game type: ALL, WIN, or LOSS (default: ALL)
 */
export const getGameTransactions = async (
    userId: string,
    page: number = 1,
    limit: number = 20,
    gameName?: 'COLOR_CHANGER' | 'DICE_ROLL' | 'DRAGON_TIGER' | 'SUPER_OVER' | 'MARBLE_RACE',
    gameType: 'ALL' | 'WIN' | 'LOSS' = 'ALL'
): Promise<{
    transactions: any[]
    totalCount: number
    currentPage: number
    totalPages: number
}> => {
    try {
        // Build filter query for game transactions only
        const filter: any = {
            userId: new mongoose.Types.ObjectId(userId),
        }

        // Filter by game type (WIN/LOSS/ALL)
        if (gameType === 'WIN') {
            filter.category = TransactionCategory.GAME_WIN
        } else if (gameType === 'LOSS') {
            filter.category = TransactionCategory.GAME_LOSE
        } else {
            // ALL - include both WIN and LOSE
            filter.category = { $in: [TransactionCategory.GAME_WIN, TransactionCategory.GAME_LOSE] }
        }

        // If gameName filter is provided, we need to join with Game collection
        // First, get all gameIds for the specified gameType
        if (gameName) {
            const gameFilter: any = {
                userId: new mongoose.Types.ObjectId(userId),
                gameType: gameName,
            }
            const games = await Game.find(gameFilter).select('gameId').lean()
            const gameIds = games.map((g: any) => g.gameId)
            
            if (gameIds.length === 0) {
                // No games found for this gameName, return empty result
                return {
                    transactions: [],
                    totalCount: 0,
                    currentPage: page,
                    totalPages: 0,
                }
            }
            
            // Filter transactions by gameId
            filter['metadata.gameId'] = { $in: gameIds }
        }

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

        // Enrich transactions with game details (userColor, winningColor, result, and dice roll specific fields)
        const enrichedTransactions = await Promise.all(
            transactions.map(async (transaction: any) => {
                // Get gameId from metadata
                const gameId = transaction.metadata?.gameId
                
                if (gameId) {
                    // Fetch game details including metadata for dice roll games
                    const game = await Game.findOne({ gameId })
                        .select('gameType userColor winningColor result metadata')
                        .lean()
                    
                    if (game) {
                        // Base response with common fields
                        const response: any = {
                            ...transaction,
                            gameType: game.gameType || null,
                            userColor: game.userColor || null,
                            winningColor: game.winningColor || null,
                            result: game.result || null
                        }
                        
                        // Add dice roll specific fields if it's a dice roll game
                        if (game.gameType === 'DICE_ROLL' && game.metadata) {
                            response.betType = game.metadata.betType || null
                            response.selectedNumber = game.metadata.selectedNumber || null
                            response.selectedRange = game.metadata.selectedRange || null
                            response.diceResult = game.metadata.diceResult || null
                        }
                        
                        // Add dragon tiger specific fields if it's a dragon tiger game
                        if (game.gameType === 'DRAGON_TIGER' && game.metadata) {
                            response.betType = game.metadata.betType || null
                            response.dragonCard = game.metadata.dragonCard || null
                            response.tigerCard = game.metadata.tigerCard || null
                            response.winningSide = game.metadata.winningSide || null
                        }
                        
                        // Add super over specific fields if it's a super over game
                        if (game.gameType === 'SUPER_OVER' && game.metadata) {
                            response.betType = game.metadata.betType || null
                            response.runThreshold = game.metadata.runThreshold || null
                            response.ballScores = game.metadata.ballScores || null
                            response.totalRunsScored = game.metadata.totalRunsScored || null
                        }
                        
                        // Add marble race specific fields if it's a marble race game
                        if (game.gameType === 'MARBLE_RACE' && game.metadata) {
                            response.selectedMarble = game.metadata.selectedMarble || null
                            response.winningMarble = game.metadata.winningMarble || null
                        }
                        
                        return response
                    }
                }
                
                // If no game found, return transaction without additional fields
                return {
                    ...transaction,
                    gameType: null,
                    userColor: null,
                    winningColor: null,
                    result: null,
                    betType: null,
                    selectedNumber: null,
                    selectedRange: null,
                    diceResult: null,
                    dragonCard: null,
                    tigerCard: null,
                    winningSide: null,
                    runThreshold: null,
                    ballScores: null,
                    totalRunsScored: null,
                    selectedMarble: null,
                    winningMarble: null
                }
            })
        )

        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit)

        return {
            transactions: enrichedTransactions,
            totalCount,
            currentPage: page,
            totalPages,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to fetch game transactions')
    }
}

/**
 * Place bet for Dragon Tiger Game
 */
export const placeBetDragonTiger = async (
    userId: string,
    betType: 'DRAGON' | 'TIGER' | 'TIE',
    betAmount: number
): Promise<{
    gameId: string
    result: GameResult
    betType: 'DRAGON' | 'TIGER' | 'TIE'
    dragonCard: { suit: string; rank: string; value: number }
    tigerCard: { suit: string; rank: string; value: number }
    winningSide: 'DRAGON' | 'TIGER' | 'TIE'
    betAmount: number
    winAmount?: number
    lossAmount?: number
    userProfitLoss: number
    gamingWalletBalance: number
    message: string
}> => {
    try {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }
        
        // Check if user has sufficient balance in gaming wallet
        if (wallet.gamingWallet < betAmount) {
            throw createBadRequestError('Insufficient balance in gaming wallet')
        }
        
        // Get game config to use DB multiplier for Dragon/Tiger bets
        const gameConfig = await getGameConfig(GameType.DRAGON_TIGER)
        
        // Determine game result using three-tier logic (fetches config from DB)
        // This determines if we allow the win or force a loss
        // Dragon/Tiger bets: Use multiplier from DB config (default 1x = bet back only, 2x = bet back + profit)
        // Tie bets: 11:1 payout (12x multiplier - bet back + 11x win)
        const winMultiplier = betType === 'TIE' ? 12 : gameConfig.winMultiplier
        const gameResult = await determineGameResult(
            userId,
            betAmount,
            GameType.DRAGON_TIGER,
            winMultiplier
        )
        
        // Generate cards based on game outcome
        // If user should win, ensure cards match their bet
        // If user should lose, ensure cards don't match (unless forced win)
        let dragonCard: { suit: string; rank: string; value: number }
        let tigerCard: { suit: string; rank: string; value: number }
        let winningSide: 'DRAGON' | 'TIGER' | 'TIE'
        
        if (gameResult.result === GameResult.WIN) {
            // User wins - generate cards that match their bet
            if (betType === 'DRAGON') {
                // Dragon must win
                dragonCard = generateRandomCard()
                tigerCard = generateRandomCard()
                // Ensure dragon value is higher than tiger
                while (dragonCard.value <= tigerCard.value) {
                    tigerCard = generateRandomCard()
                }
                winningSide = 'DRAGON'
            } else if (betType === 'TIGER') {
                // Tiger must win
                dragonCard = generateRandomCard()
                tigerCard = generateRandomCard()
                // Ensure tiger value is higher than dragon
                while (tigerCard.value <= dragonCard.value) {
                    dragonCard = generateRandomCard()
                }
                winningSide = 'TIGER'
            } else {
                // TIE must occur
                dragonCard = generateRandomCard()
                tigerCard = { ...dragonCard } // Same card for tie
                // Ensure different suit for visual distinction
                const otherSuits = CARD_SUITS.filter(s => s !== dragonCard.suit)
                if (otherSuits.length > 0) {
                    tigerCard.suit = getRandomItem(otherSuits)
                }
                winningSide = 'TIE'
            }
        } else {
            // User should lose - generate cards that don't match their bet
            dragonCard = generateRandomCard()
            tigerCard = generateRandomCard()
            
            // Determine actual winner
            if (dragonCard.value > tigerCard.value) {
                winningSide = 'DRAGON'
            } else if (tigerCard.value > dragonCard.value) {
                winningSide = 'TIGER'
            } else {
                winningSide = 'TIE'
            }
            
            // If the outcome matches user's bet, regenerate to ensure loss
            // Allow TIE to occur naturally if user bet Dragon or Tiger (TIE is still a loss for them)
            if (winningSide === betType) {
                if (betType === 'DRAGON') {
                    // User bet Dragon but should lose - force Tiger to win (or allow Tie)
                    // Regenerate to ensure Dragon doesn't win
                    while (dragonCard.value >= tigerCard.value) {
                        tigerCard = generateRandomCard()
                    }
                    winningSide = 'TIGER'
                } else if (betType === 'TIGER') {
                    // User bet Tiger but should lose - force Dragon to win (or allow Tie)
                    // Regenerate to ensure Tiger doesn't win
                    while (tigerCard.value >= dragonCard.value) {
                        dragonCard = generateRandomCard()
                    }
                    winningSide = 'DRAGON'
                } else {
                    // User bet TIE but should lose - force non-tie
                    while (dragonCard.value === tigerCard.value) {
                        tigerCard = generateRandomCard()
                    }
                    winningSide = dragonCard.value > tigerCard.value ? 'DRAGON' : 'TIGER'
                }
            }
            // Note: If user bet Dragon/Tiger and cards naturally tie, winningSide stays TIE
            // This is correct - user loses (they bet Dragon/Tiger, not TIE), but winningSide shows TIE
        }
        
        // Calculate new profit/loss (net profit/loss)
        const currentProfitLoss = await getUserTotalProfitLoss(userId)
        const netProfitLoss = calculateNetProfitLoss(gameResult, betAmount)
        const newProfitLoss = currentProfitLoss + netProfitLoss
        
        // Update wallet
        updateGamingWallet(wallet, gameResult, betAmount)
        
        await wallet.save()
        
        // Create game record
        const newGame = new Game({
            userId: new mongoose.Types.ObjectId(userId),
            gameType: GameType.DRAGON_TIGER,
            betAmount,
            result: gameResult.result,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            platformRiskCheck: gameResult.platformRiskCheck,
            forcedResult: gameResult.forcedResult,
            metadata: {
                betType,
                dragonCard,
                tigerCard,
                winningSide,
                winMultiplier: gameResult.winAmount ? gameResult.winAmount / betAmount : undefined,
                probability: gameResult.probability,
                notes: gameResult.forcedResult 
                    ? (gameResult.platformRiskCheck 
                        ? 'Result forced due to platform risk' 
                        : 'Result forced due to user profit/loss limits')
                    : 'Normal gameplay',
            },
        })
        await newGame.save()
        
        // Create transaction record
        const transactionCategory = gameResult.result === GameResult.WIN 
            ? TransactionCategory.GAME_WIN 
            : TransactionCategory.GAME_LOSE
        
        const transactionAmount = gameResult.result === GameResult.WIN 
            ? (gameResult.winAmount || 0) 
            : (gameResult.lossAmount || 0)
        
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            category: transactionCategory,
            status: TransactionStatus.COMPLETED,
            amount: transactionAmount,
            currency: 'USDT',
            network: 'INTERNAL',
            fee: 0,
            netAmount: transactionAmount,
            blockchainVerified: false,
            metadata: {
                gamingWalletAmount: wallet.gamingWallet,
                gameId: newGame.gameId,
                notes: `Dragon Tiger Game - ${gameResult.result}`,
            },
        })
        await newTransaction.save()
        
        // Prepare response message
        let message = ''
        if (gameResult.result === GameResult.WIN) {
            const winMultiplier = gameResult.winAmount ? (gameResult.winAmount / betAmount).toFixed(1) : '2.0'
            message = `Congratulations! ${winningSide} won. You won ${gameResult.winAmount} USDT (${winMultiplier}x)!`
        } else {
            message = `Sorry, ${winningSide} won. You lost ${gameResult.lossAmount} USDT. Better luck next time!`
        }
        
        return {
            gameId: newGame.gameId,
            result: gameResult.result,
            betType,
            dragonCard,
            tigerCard,
            winningSide,
            betAmount,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            gamingWalletBalance: wallet.gamingWallet,
            message,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to place bet')
    }
}

/**
 * Place bet for Super Over Game
 */
export const placeBetSuperOver = async (
    userId: string,
    betType: 'OVER' | 'UNDER',
    runThreshold: number,
    betAmount: number
): Promise<{
    gameId: string
    result: GameResult
    betType: 'OVER' | 'UNDER'
    runThreshold: number
    ballScores: number[]
    totalRunsScored: number
    betAmount: number
    winAmount?: number
    lossAmount?: number
    userProfitLoss: number
    gamingWalletBalance: number
    message: string
}> => {
    try {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }
        
        // Check if user has sufficient balance in gaming wallet
        if (wallet.gamingWallet < betAmount) {
            throw createBadRequestError('Insufficient balance in gaming wallet')
        }
        
        // Get game config to use DB multiplier and validate bet amount
        const gameConfig = await getGameConfig(GameType.SUPER_OVER)
        
        // Validate bet amount against game config
        if (betAmount < gameConfig.minBetAmount || betAmount > gameConfig.maxBetAmount) {
            throw createBadRequestError(`Bet amount must be between ${gameConfig.minBetAmount} and ${gameConfig.maxBetAmount}`)
        }
        
        // Validate run threshold
        const validThresholds = [6, 8, 10, 12, 14, 16]
        if (!validThresholds.includes(runThreshold)) {
            throw createBadRequestError('Run threshold must be one of: 6, 8, 10, 12, 14, 16')
        }
        
        // Determine game result using three-tier logic (fetches config from DB)
        // Super Over uses 2x multiplier (bet $10, win $20)
        const winMultiplier = gameConfig.winMultiplier
        const gameResult = await determineGameResult(
            userId,
            betAmount,
            GameType.SUPER_OVER,
            winMultiplier
        )
        
        // Generate ball scores based on game outcome
        // If user should win, ensure total runs match their bet
        // If user should lose, ensure total runs don't match their bet
        let ballScores: number[]
        let totalRunsScored: number
        
        if (gameResult.result === GameResult.WIN) {
            // User wins - generate runs that match their bet
            if (betType === 'OVER') {
                // Total runs must be greater than threshold
                ballScores = generateBallScores()
                totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                // Ensure total is above threshold
                while (totalRunsScored <= runThreshold) {
                    ballScores = generateBallScores()
                    totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                }
            } else {
                // UNDER - Total runs must be less than threshold
                ballScores = generateBallScores()
                totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                // Ensure total is below threshold
                while (totalRunsScored >= runThreshold) {
                    ballScores = generateBallScores()
                    totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                }
            }
        } else {
            // User should lose - generate runs that don't match their bet
            ballScores = generateBallScores()
            totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
            
            // Check if outcome matches user's bet
            const isWin = (betType === 'OVER' && totalRunsScored > runThreshold) || 
                         (betType === 'UNDER' && totalRunsScored < runThreshold)
            
            // If it matches, regenerate to ensure loss
            if (isWin) {
                if (betType === 'OVER') {
                    // Force total to be <= threshold
                    while (totalRunsScored > runThreshold) {
                        ballScores = generateBallScores()
                        totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                    }
                } else {
                    // Force total to be >= threshold
                    while (totalRunsScored < runThreshold) {
                        ballScores = generateBallScores()
                        totalRunsScored = ballScores.reduce((sum, runs) => sum + runs, 0)
                    }
                }
            }
        }
        
        // Calculate new profit/loss (net profit/loss)
        const currentProfitLoss = await getUserTotalProfitLoss(userId)
        const netProfitLoss = calculateNetProfitLoss(gameResult, betAmount)
        const newProfitLoss = currentProfitLoss + netProfitLoss
        
        // Update wallet
        updateGamingWallet(wallet, gameResult, betAmount)
        
        await wallet.save()
        
        // Create game record
        const newGame = new Game({
            userId: new mongoose.Types.ObjectId(userId),
            gameType: GameType.SUPER_OVER,
            betAmount,
            result: gameResult.result,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            platformRiskCheck: gameResult.platformRiskCheck,
            forcedResult: gameResult.forcedResult,
            metadata: {
                betType,
                runThreshold,
                ballScores,
                totalRunsScored,
                winMultiplier: gameResult.winAmount ? gameResult.winAmount / betAmount : undefined,
                probability: gameResult.probability,
                notes: gameResult.forcedResult 
                    ? (gameResult.platformRiskCheck 
                        ? 'Result forced due to platform risk' 
                        : 'Result forced due to user profit/loss limits')
                    : 'Normal gameplay',
            },
        })
        await newGame.save()
        
        // Create transaction record
        const transactionCategory = gameResult.result === GameResult.WIN 
            ? TransactionCategory.GAME_WIN 
            : TransactionCategory.GAME_LOSE
        
        const transactionAmount = gameResult.result === GameResult.WIN 
            ? (gameResult.winAmount || 0) 
            : (gameResult.lossAmount || 0)
        
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            category: transactionCategory,
            status: TransactionStatus.COMPLETED,
            amount: transactionAmount,
            currency: 'USDT',
            network: 'INTERNAL',
            fee: 0,
            netAmount: transactionAmount,
            blockchainVerified: false,
            metadata: {
                gamingWalletAmount: wallet.gamingWallet,
                gameId: newGame.gameId,
                notes: `Super Over Game - ${gameResult.result}`,
            },
        })
        await newTransaction.save()
        
        // Prepare response message
        let message = ''
        if (gameResult.result === GameResult.WIN) {
            const winMultiplier = gameResult.winAmount ? (gameResult.winAmount / betAmount).toFixed(1) : '2.0'
            message = `Congratulations! Score: ${totalRunsScored} runs. You won ${gameResult.winAmount} USDT (${winMultiplier}x)!`
        } else {
            message = `Sorry, Score: ${totalRunsScored} runs. You lost ${gameResult.lossAmount} USDT. Better luck next time!`
        }
        
        return {
            gameId: newGame.gameId,
            result: gameResult.result,
            betType,
            runThreshold,
            ballScores,
            totalRunsScored,
            betAmount,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            gamingWalletBalance: wallet.gamingWallet,
            message,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to place bet')
    }
}

/**
 * Place bet for Marble Race Game
 */
export const placeBetMarbleRace = async (
    userId: string,
    selectedMarble: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE',
    betAmount: number
): Promise<{
    gameId: string
    result: GameResult
    selectedMarble: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE'
    winningMarble: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE'
    betAmount: number
    winAmount?: number
    lossAmount?: number
    userProfitLoss: number
    gamingWalletBalance: number
    message: string
}> => {
    try {
        // Get user's wallet
        const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) })
        if (!wallet) {
            throw createNotFoundError('Wallet not found')
        }
        
        // Check if user has sufficient balance in gaming wallet
        if (wallet.gamingWallet < betAmount) {
            throw createBadRequestError('Insufficient balance in gaming wallet')
        }
        
        // Get game config to use DB multiplier
        const gameConfig = await getGameConfig(GameType.MARBLE_RACE)
        
        // Validate bet amount against game config
        if (betAmount < gameConfig.minBetAmount || betAmount > gameConfig.maxBetAmount) {
            throw createBadRequestError(`Bet amount must be between ${gameConfig.minBetAmount} and ${gameConfig.maxBetAmount}`)
        }
        
        // Determine game result using three-tier logic (fetches config from DB)
        // Marble Race uses multiplier from DB config (typically 3.5x based on UI)
        const winMultiplier = gameConfig.winMultiplier
        const gameResult = await determineGameResult(
            userId,
            betAmount,
            GameType.MARBLE_RACE,
            winMultiplier
        )
        
        // Generate winning marble based on game outcome
        // If user should win, ensure winning marble matches their selection
        // If user should lose, ensure winning marble doesn't match (unless forced win)
        let winningMarble: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE'
        
        if (gameResult.result === GameResult.WIN) {
            // User wins - winning marble matches their selection
            winningMarble = selectedMarble
        } else {
            // User loses - pick a different marble
            const otherMarbles = MARBLE_COLORS.filter(m => m !== selectedMarble) as ('RED' | 'BLUE' | 'GREEN' | 'ORANGE')[]
            winningMarble = getRandomItem(otherMarbles)
        }
        
        // Calculate new profit/loss (net profit/loss)
        const currentProfitLoss = await getUserTotalProfitLoss(userId)
        const netProfitLoss = calculateNetProfitLoss(gameResult, betAmount)
        const newProfitLoss = currentProfitLoss + netProfitLoss
        
        // Update wallet
        updateGamingWallet(wallet, gameResult, betAmount)
        
        await wallet.save()
        
        // Create game record
        const newGame = new Game({
            userId: new mongoose.Types.ObjectId(userId),
            gameType: GameType.MARBLE_RACE,
            betAmount,
            result: gameResult.result,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            platformRiskCheck: gameResult.platformRiskCheck,
            forcedResult: gameResult.forcedResult,
            metadata: {
                selectedMarble,
                winningMarble,
                winMultiplier: gameResult.winAmount ? gameResult.winAmount / betAmount : undefined,
                probability: gameResult.probability,
                notes: gameResult.forcedResult 
                    ? (gameResult.platformRiskCheck 
                        ? 'Result forced due to platform risk' 
                        : 'Result forced due to user profit/loss limits')
                    : 'Normal gameplay',
            },
        })
        await newGame.save()
        
        // Create transaction record
        const transactionCategory = gameResult.result === GameResult.WIN 
            ? TransactionCategory.GAME_WIN 
            : TransactionCategory.GAME_LOSE
        
        const transactionAmount = gameResult.result === GameResult.WIN 
            ? (gameResult.winAmount || 0) 
            : (gameResult.lossAmount || 0)
        
        const newTransaction = new Transaction({
            userId: new mongoose.Types.ObjectId(userId),
            category: transactionCategory,
            status: TransactionStatus.COMPLETED,
            amount: transactionAmount,
            currency: 'USDT',
            network: 'INTERNAL',
            fee: 0,
            netAmount: transactionAmount,
            blockchainVerified: false,
            metadata: {
                gamingWalletAmount: wallet.gamingWallet,
                gameId: newGame.gameId,
                notes: `Marble Race Game - ${gameResult.result}`,
            },
        })
        await newTransaction.save()
        
        // Prepare response message
        let message = ''
        if (gameResult.result === GameResult.WIN) {
            // Calculate actual multiplier from win amount (should match config)
            const actualMultiplier = gameResult.winAmount ? (gameResult.winAmount / betAmount).toFixed(1) : gameConfig.winMultiplier.toFixed(1)
            message = `Congratulations! ${winningMarble} won. You won ${gameResult.winAmount} USDT (${actualMultiplier}x)!`
        } else {
            message = `Sorry, ${winningMarble} won. You lost ${gameResult.lossAmount} USDT. Better luck next time!`
        }
        
        return {
            gameId: newGame.gameId,
            result: gameResult.result,
            selectedMarble,
            winningMarble,
            betAmount,
            winAmount: gameResult.winAmount,
            lossAmount: gameResult.lossAmount,
            userProfitLoss: newProfitLoss,
            gamingWalletBalance: wallet.gamingWallet,
            message,
        }
    } catch (error: any) {
        throw createBadRequestError(error.message || 'Failed to place bet')
    }
}

export default {
    placeBetColorChanger,
    placeBetDiceRoll,
    placeBetDragonTiger,
    placeBetSuperOver,
    placeBetMarbleRace,
    getGameTransactions,
}

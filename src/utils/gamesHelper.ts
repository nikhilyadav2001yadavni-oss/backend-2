import Game, { GameResult, GameType } from '../models/GameModel'
import GameConfig from '../models/GameConfigModel'
import mongoose from 'mongoose'

// Fallback defaults if a game's config row is missing from DB
const DEFAULT_MAX_USER_PROFIT = 25
const DEFAULT_WIN_PROBABILITY = 0.4
const DEFAULT_WIN_MULTIPLIER = 2

/**
 * No-op kept for backwards compatibility — config is always read live from DB now,
 * so there is nothing to clear. Safe to remove once callers are cleaned up.
 */
export const clearGameConfigCache = (_gameType?: GameType): void => {
    // intentionally empty
}

/**
 * Get game configuration from database (always live, no cache so admin edits apply immediately)
 */
export const getGameConfig = async (gameType: GameType): Promise<any> => {
    const config = await GameConfig.findOne({ gameType, isActive: true })
    if (config) return config

    // Fallback if config row is missing
    return {
        maxUserProfit: DEFAULT_MAX_USER_PROFIT,
        winProbability: DEFAULT_WIN_PROBABILITY,
        winMultiplier: DEFAULT_WIN_MULTIPLIER,
        minBetAmount: 1,
        maxBetAmount: 25,
    }
}

/**
 * Game result decision returned by determineGameResult()
 */
export interface GameResultDecision {
    result: GameResult
    winAmount?: number
    lossAmount?: number
    platformRiskCheck: boolean // kept for Game model compatibility, always false now
    forcedResult: boolean       // true when forced LOSE due to profit cap
    probability?: number
}

/**
 * Calculate user's total net profit/loss from all past games
 * Net profit per win  = winAmount - betAmount
 * Net loss per loss   = -betAmount
 */
export const getUserTotalProfitLoss = async (userId: string): Promise<number> => {
    const games = await Game.find({ userId: new mongoose.Types.ObjectId(userId) })
    return games.reduce((sum, game) => {
        if (game.result === GameResult.WIN) {
            return sum + ((game.winAmount || 0) - game.betAmount)
        }
        return sum - game.betAmount
    }, 0)
}

/**
 * Decide WIN or LOSE.
 *
 * Rules (kept simple):
 *   1. If user's total profit >= maxUserProfit  → force LOSE (platform protection)
 *   2. Otherwise                                 → RNG with winProbability
 *
 * Win payout = betAmount * winMultiplier (gross, includes the stake back)
 * Loss       = betAmount
 */
export const determineGameResult = async (
    userId: string,
    betAmount: number,
    gameType: GameType,
    winMultiplierOverride?: number
): Promise<GameResultDecision> => {
    const gameConfig = await getGameConfig(gameType)
    const winMultiplier = winMultiplierOverride ?? gameConfig.winMultiplier
    const winProbability = gameConfig.winProbability
    const maxUserProfit = gameConfig.maxUserProfit

    // Tier 1: Platform protection — cap total user profit
    const userProfitLoss = await getUserTotalProfitLoss(userId)
    if (userProfitLoss >= maxUserProfit) {
        return {
            result: GameResult.LOSE,
            lossAmount: betAmount,
            platformRiskCheck: false,
            forcedResult: true,
            probability: 0,
        }
    }

    // Tier 2: Normal RNG
    if (Math.random() < winProbability) {
        return {
            result: GameResult.WIN,
            winAmount: betAmount * winMultiplier,
            platformRiskCheck: false,
            forcedResult: false,
            probability: winProbability,
        }
    }
    return {
        result: GameResult.LOSE,
        lossAmount: betAmount,
        platformRiskCheck: false,
        forcedResult: false,
        probability: 1 - winProbability,
    }
}

/**
 * Net profit/loss for a single game (used to update running profit total)
 */
export const calculateNetProfitLoss = (
    gameResult: GameResultDecision,
    betAmount: number
): number => {
    if (gameResult.result === GameResult.WIN) {
        return (gameResult.winAmount || 0) - betAmount
    }
    return -betAmount
}

/**
 * Apply game result to the user's gaming wallet.
 *   WIN  → wallet - betAmount + winAmount   (net change = winAmount - betAmount)
 *   LOSE → wallet - betAmount
 */
export const updateGamingWallet = (
    wallet: any,
    gameResult: GameResultDecision,
    betAmount: number
): number => {
    if (gameResult.result === GameResult.WIN) {
        wallet.gamingWallet = wallet.gamingWallet - betAmount + (gameResult.winAmount || 0)
    } else {
        wallet.gamingWallet = wallet.gamingWallet - betAmount
    }
    return wallet.gamingWallet
}

/**
 * Random item helper
 */
export const getRandomItem = <T>(items: T[]): T => {
    return items[Math.floor(Math.random() * items.length)]
}

/**
 * Validate bet amount against game config
 */
export const validateBetAmount = async (
    betAmount: number,
    gameType: GameType
): Promise<{ isValid: boolean; error?: string }> => {
    const gameConfig = await getGameConfig(gameType)
    if (!Number.isInteger(betAmount)) {
        return { isValid: false, error: 'Bet amount must be an integer' }
    }
    if (betAmount < gameConfig.minBetAmount) {
        return { isValid: false, error: `Minimum bet amount is ${gameConfig.minBetAmount}` }
    }
    if (betAmount > gameConfig.maxBetAmount) {
        return { isValid: false, error: `Maximum bet amount is ${gameConfig.maxBetAmount}` }
    }
    return { isValid: true }
}

import mongoose from 'mongoose'
import { GameType } from './GameModel'

export interface GameConfig {
    _id: string
    gameType: GameType
    gameName: string // Display name for the game
    maxUserProfit: number // Maximum profit user can make (platform protection)
    maxUserLoss: number // Legacy: Not used - Users can lose freely
    winProbability: number // Win probability (0.0 to 1.0) for normal gameplay
    winMultiplier: number // Win multiplier (e.g., 2 = 2x bet amount)
    platformBalanceBuffer: number // Platform balance buffer multiplier (e.g., 1.1 = 10% buffer)
    maxSmallWinAmount: number // Legacy: Not used anymore
    minBetAmount: number // Minimum bet amount
    maxBetAmount: number // Maximum bet amount
    isActive: boolean // Whether the game is active/enabled
    metadata?: {
        description?: string
        rules?: string[]
        notes?: string
    }
    createdAt: Date
    updatedAt: Date
}

const gameConfigSchema = new mongoose.Schema(
    {
        gameType: {
            type: String,
            enum: Object.values(GameType),
            required: true,
            unique: true,
            index: true,
        },
        gameName: {
            type: String,
            required: true,
        },
        maxUserProfit: {
            type: Number,
            required: true,
            default: 25,
            min: 0,
            // Maximum profit a user can make - when reached, force losses until back to cap
        },
        maxUserLoss: {
            type: Number,
            required: true,
            default: 25,
            min: 0,
            // Legacy field: Not used in current logic - Users can lose freely
        },
        winProbability: {
            type: Number,
            required: true,
            default: 0.4,
            min: 0,
            max: 1,
        },
        winMultiplier: {
            type: Number,
            required: true,
            default: 2,
            min: 2,
        },
        platformBalanceBuffer: {
            type: Number,
            required: true,
            default: 1.1,
            min: 1,
        },
        maxSmallWinAmount: {
            type: Number,
            required: true,
            default: 5,
            min: 0,
            // Legacy field: Not used in current logic
        },
        minBetAmount: {
            type: Number,
            required: true,
            default: 1,
            min: 0,
        },
        maxBetAmount: {
            type: Number,
            required: true,
            default: 25,
            min: 1,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
            index: true,
        },
        metadata: {
            description: { type: String },
            rules: [{ type: String }],
            notes: { type: String },
        },
    },
    { timestamps: true }
)

// Index for active games
gameConfigSchema.index({ isActive: 1, gameType: 1 })

const GameConfig = mongoose.model<GameConfig & mongoose.Document>('GameConfig', gameConfigSchema)

// Seed default game configurations
export const seedDefaultGameConfigs = async (): Promise<void> => {
    try {
        const existingConfigs = await GameConfig.find()
        const existingGameTypes = existingConfigs.map(config => config.gameType)

        const defaultConfigs = [
            {
                gameType: GameType.COLOR_CHANGER,
                gameName: 'Color Changer',
                maxUserProfit: 25, // User cannot profit more than $25 total
                maxUserLoss: 25, // Legacy: Not enforced - Users can lose freely
                winProbability: 0.4, // 40% win chance in normal gameplay
                winMultiplier: 2, // Win = bet × 2 (e.g., bet $10, win $20)
                platformBalanceBuffer: 1.1, // 10% buffer for platform safety
                maxSmallWinAmount: 5, // Legacy: Not used
                minBetAmount: 1,
                maxBetAmount: 25,
                isActive: true,
                metadata: {
                    description: 'Select a color (RED, GREEN, or BLUE) and place your bet. Win 2x your bet amount!',
                    rules: [
                        'Select one of three colors: RED, GREEN, or BLUE',
                        'Bet amount must be between $1 and $25',
                        'Win multiplier: 2x your bet amount (bet $10, win $20)',
                        'Maximum total profit cap: $25 (platform protection)',
                        'No limit on losses - users can lose freely',
                        'Once you reach $25 profit, you must lose bets until back to $25 or below',
                    ],
                    notes: 'Platform never loses - user profits are capped at $25, but users can lose any amount',
                },
            },
            {
                gameType: GameType.DICE_ROLL,
                gameName: 'Dice Roll',
                maxUserProfit: 25,
                maxUserLoss: 25,
                winProbability: 0.4,
                winMultiplier: 2,
                platformBalanceBuffer: 1.1,
                maxSmallWinAmount: 5,
                minBetAmount: 1,
                maxBetAmount: 25,
                isActive: true,
                metadata: {
                    description: 'Roll the dice and predict the outcome. Win 2x your bet amount!',
                    rules: [
                        'Choose a single number (1-6) or a range of numbers',
                        'Win multiplier: 2x your bet amount',
                        'Maximum total profit cap is enforced via maxUserProfit',
                    ],
                    notes: 'Bet limits and multipliers are admin-editable via this config.',
                },
            }
        ]

        // Insert configs that don't exist yet
        const configsToInsert = defaultConfigs.filter(
            config => !existingGameTypes.includes(config.gameType)
        )

        if (configsToInsert.length > 0) {
            await GameConfig.insertMany(configsToInsert)
            console.log(`✅ Default game configurations seeded successfully (${configsToInsert.length} games)`)
        }

        // Reconcile: remove any GameConfig whose gameType isn't in the defaults list anymore.
        // This ensures that when a game is dropped from the defaults array, its stale config
        // is purged from the DB on next boot (otherwise admin/list endpoints keep returning it).
        const allowedGameTypes = defaultConfigs.map(c => c.gameType)
        const staleConfigs = existingConfigs.filter(c => !allowedGameTypes.includes(c.gameType))
        if (staleConfigs.length > 0) {
            const staleTypes = staleConfigs.map(c => c.gameType)
            const result = await GameConfig.deleteMany({ gameType: { $in: staleTypes } })
            console.log(
                `🧹 Pruned ${result.deletedCount} stale game configuration(s): ${staleTypes.join(', ')}`
            )
        }
    } catch (error: any) {
        console.error('❌ Error seeding default game configurations:', error.message)
    }
}

export default GameConfig

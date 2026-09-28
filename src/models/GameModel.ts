import mongoose from 'mongoose'

export enum GameType {
    COLOR_CHANGER = 'COLOR_CHANGER',
    DICE_ROLL = 'DICE_ROLL',
    DRAGON_TIGER = 'DRAGON_TIGER',
    SUPER_OVER = 'SUPER_OVER',
    MARBLE_RACE = 'MARBLE_RACE',
}

export enum GameResult {
    WIN = 'WIN',
    LOSE = 'LOSE',
}

export interface Game {
    _id: string
    gameId: string // Unique game ID
    userId: mongoose.Types.ObjectId
    gameType: GameType
    userColor?: string // RED, GREEN, or BLUE (for Color Changer only)
    winningColor?: string // RED, GREEN, or BLUE - The actual result color (for Color Changer only)
    betAmount: number
    result: GameResult
    winAmount?: number // Amount won (if result is WIN)
    lossAmount?: number // Amount lost (if result is LOSE)
    userProfitLoss: number // Cumulative profit/loss for this user (can be negative)
    platformRiskCheck: boolean // Whether platform risk check was triggered
    forcedResult: boolean // Whether result was forced due to limits
    metadata?: {
        // Color Changer specific
        selectedColor?: string
        winningColor?: string
        // Dice Roll specific
        betType?: 'SINGLE_NUMBERS' | 'NUMBER_RANGE' | 'DRAGON' | 'TIGER' | 'TIE' | 'OVER' | 'UNDER'
        selectedNumber?: number // Single number (1-6) for single numbers bet
        selectedRange?: { from: number; to: number } // Range for number range bet
        diceResult?: number // The actual dice result (1-6)
        // Dragon Tiger specific
        dragonCard?: { suit: string; rank: string; value: number } // Card for Dragon
        tigerCard?: { suit: string; rank: string; value: number } // Card for Tiger
        winningSide?: 'DRAGON' | 'TIGER' | 'TIE' // The winning side
        // Super Over specific
        runThreshold?: number // Run threshold (6, 8, 10, 12, 14, 16)
        ballScores?: number[] // Array of 6 ball scores (runs per ball)
        totalRunsScored?: number // Total runs scored in the over
        // Marble Race specific
        selectedMarble?: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE' // Marble selected by user
        winningMarble?: 'RED' | 'BLUE' | 'GREEN' | 'ORANGE' // Winning marble
        winMultiplier?: number
        // Common
        probability?: number
        notes?: string
    }
    createdAt: Date
    updatedAt: Date
}

const gameSchema = new mongoose.Schema(
    {
        gameId: {
            type: String,
            unique: true, // unique automatically creates an index
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            // Index created via compound indexes below
        },
        gameType: {
            type: String,
            enum: Object.values(GameType),
            required: true,
            // Index created via compound indexes below
        },
        userColor: {
            type: String,
            enum: ['RED', 'GREEN', 'BLUE'],
            required: false, // Only required for COLOR_CHANGER
        },
        winningColor: {
            type: String,
            enum: ['RED', 'GREEN', 'BLUE'],
            required: false, // Only populated for COLOR_CHANGER
        },
        betAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        result: {
            type: String,
            enum: Object.values(GameResult),
            required: true,
        },
        winAmount: {
            type: Number,
            default: 0,
        },
        lossAmount: {
            type: Number,
            default: 0,
        },
        userProfitLoss: {
            type: Number,
            required: true,
            default: 0,
        },
        platformRiskCheck: {
            type: Boolean,
            default: false,
        },
        forcedResult: {
            type: Boolean,
            default: false,
        },
        metadata: {
            // Color Changer specific
            selectedColor: { type: String },
            winningColor: { type: String },
            // Dice Roll specific
            betType: { type: String, enum: ['SINGLE_NUMBERS', 'NUMBER_RANGE', 'DRAGON', 'TIGER', 'TIE', 'OVER', 'UNDER'] },
            selectedNumber: { type: Number, min: 1, max: 6 },
            selectedRange: {
                from: { type: Number, min: 1, max: 6 },
                to: { type: Number, min: 1, max: 6 },
            },
            diceResult: { type: Number, min: 1, max: 6 },
            // Dragon Tiger specific
            dragonCard: {
                suit: { type: String },
                rank: { type: String },
                value: { type: Number },
            },
            tigerCard: {
                suit: { type: String },
                rank: { type: String },
                value: { type: Number },
            },
            winningSide: { type: String, enum: ['DRAGON', 'TIGER', 'TIE'] },
            // Super Over specific
            runThreshold: { type: Number, min: 6, max: 16 },
            ballScores: [{ type: Number, min: 0, max: 6 }], // Array of 6 ball scores
            totalRunsScored: { type: Number, min: 0 },
            // Marble Race specific
            selectedMarble: { type: String, enum: ['RED', 'BLUE', 'GREEN', 'ORANGE'] },
            winningMarble: { type: String, enum: ['RED', 'BLUE', 'GREEN', 'ORANGE'] },
            winMultiplier: { type: Number },
            // Common
            probability: { type: Number },
            notes: { type: String },
        },
    },
    { timestamps: true }
)

// Indexes for efficient querying
// Note: gameId index is automatically created by unique: true
gameSchema.index({ userId: 1, gameType: 1 })
gameSchema.index({ userId: 1, createdAt: -1 })

// Generate unique game ID before saving
gameSchema.pre('save', async function (next) {
    if (!this.gameId) {
        // Generate game ID: GAME + YYYYMMDDHHMMSS + random 3 digits
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
        
        this.gameId = `GAME${year}${month}${day}${hours}${minutes}${seconds}${random}`
        
        // Check if gameId already exists (very rare collision)
        const Game = mongoose.model('Game')
        const existing = await Game.findOne({ gameId: this.gameId })
        
        // If collision detected, add milliseconds and regenerate
        if (existing) {
            const ms = String(now.getMilliseconds()).padStart(3, '0')
            this.gameId = `GAME${year}${month}${day}${hours}${minutes}${seconds}${ms}`
        }
    }
    next()
})

const Game = mongoose.model<Game & mongoose.Document>('Game', gameSchema)

export default Game

import mongoose from 'mongoose'

export enum TransactionCategory {
    GAME_WIN = 'GAME_WIN',
    GAME_LOSE = 'GAME_LOSE',
    ROI_CREDIT = 'ROI_CREDIT',
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    REFERRAL_BONUS = 'REFERRAL_BONUS',
    ADMIN_CREDIT = 'ADMIN_CREDIT',   // Admin manually added funds to user wallet
    ADMIN_DEBIT = 'ADMIN_DEBIT',     // Admin manually deducted funds from user wallet
}

export enum TransactionStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',     // Verified by subadmin – ready for superadmin action
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REJECTED = 'REJECTED',
    DUPLICATE_HASH = 'DUPLICATE_HASH',  // Deposit attempt with transaction hash already used
}

export interface Transaction {
    _id: string
    transactionId: string // Unique transaction ID like TXN20251228143025001
    userId: mongoose.Types.ObjectId
    category: TransactionCategory
    status: TransactionStatus
    amount: number
    currency: string
    network: string // TRC20, BEP20, ERC20
    fee: number // Transaction fee deducted
    netAmount: number // Amount after fee deduction
    fromAddress?: string
    toAddress?: string
    transactionHash?: string
        blockchainVerified: boolean
    verifiedBy?: mongoose.Types.ObjectId  // Admin who verified this withdrawal
    metadata?: {
        mainWalletAmount?: number
        gamingWalletAmount?: number
        roiWalletAmount?: number
        walletType?: string          // Source wallet for withdrawals (gamingWallet | roiWallet only)
        gameId?: string
        referralUserId?: string
        notes?: string
    }
    createdAt: Date
    updatedAt: Date
}

const transactionSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            unique: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        category: {
            type: String,
            enum: Object.values(TransactionCategory),
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: Object.values(TransactionStatus),
            required: true,
            default: TransactionStatus.PENDING,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
            default: 'USDT',
        },
        network: {
            type: String,
            required: true,
            enum: ['TRC20', 'BEP20', 'ERC20', 'POLYGON', 'INTERNAL'],
        },
        fee: {
            type: Number,
            required: true,
            default: 0,
        },
        netAmount: {
            type: Number,
            required: true,
        },
        fromAddress: {
            type: String,
            default: null,
        },
        toAddress: {
            type: String,
            default: null,
        },
        transactionHash: {
            type: String,
            default: undefined,
        },
        blockchainVerified: {
            type: Boolean,
            default: false,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null,
        },
        metadata: {
            mainWalletAmount: { type: Number },
            gamingWalletAmount: { type: Number },
            roiWalletAmount: { type: Number },
            walletType: { type: String },   // Source wallet for withdrawals
            gameId: { type: String },
            referralUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            notes: { type: String },
            duplicateTransactionHash: { type: String },  // When status=DUPLICATE_HASH, the attempted hash
        },
    },
    { timestamps: true }
)

// Indexes for efficient querying
transactionSchema.index({ userId: 1, category: 1 })
transactionSchema.index({ userId: 1, status: 1 })
// Sparse unique index on transactionHash - allows multiple documents without this field
transactionSchema.index({ transactionHash: 1 }, { unique: true, sparse: true, background: true })
transactionSchema.index({ network: 1 })
transactionSchema.index({ createdAt: -1 })

// Generate unique transaction ID before saving
transactionSchema.pre('save', async function (next) {
    if (!this.transactionId) {
        // Generate transaction ID: TXN + YYYYMMDDHHMMSS + random 3 digits
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
        
        this.transactionId = `TXN${year}${month}${day}${hours}${minutes}${seconds}${random}`
        
        // Check if transactionId already exists (very rare collision)
        const Transaction = mongoose.model('Transaction')
        const existing = await Transaction.findOne({ transactionId: this.transactionId })
        
        // If collision detected, add milliseconds and regenerate
        if (existing) {
            const ms = String(now.getMilliseconds()).padStart(3, '0')
            this.transactionId = `TXN${year}${month}${day}${hours}${minutes}${seconds}${ms}`
        }
    }
    next()
})

const Transaction = mongoose.model<Transaction & mongoose.Document>('Transaction', transactionSchema)

export default Transaction

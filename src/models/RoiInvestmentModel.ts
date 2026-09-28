import mongoose from 'mongoose'

export interface RoiInvestment {
    _id: string
    userId: mongoose.Types.ObjectId
    depositTransactionId: mongoose.Types.ObjectId // Reference to the deposit transaction
    principalAmount: number // Initial investment amount (50% of deposit)
    currentBalance: number // Current balance with compounded ROI
    lockInPeriod: number // Lock-in period in days (default: 7)
    lockInStartDate: Date // When the lock-in period started
    lockInEndDate: Date // When the lock-in period ends
    isLocked: boolean // Whether investment is still in lock-in period
    lastRoiCalculationDate: Date // Last date ROI was calculated
    totalRoiEarned: number // Total ROI earned so far
    isActive: boolean // Whether investment is active
    createdAt: Date
    updatedAt: Date
}

const roiInvestmentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        depositTransactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transaction',
            required: true,
            index: true,
        },
        principalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        currentBalance: {
            type: Number,
            required: true,
            min: 0,
            default: function(this: RoiInvestment) {
                return this.principalAmount
            },
        },
        lockInPeriod: {
            type: Number,
            required: true,
            default: 7, // 7 days lock-in period
            min: 0,
        },
        lockInStartDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        lockInEndDate: {
            type: Date,
            required: true,
        },
        isLocked: {
            type: Boolean,
            required: true,
            default: true,
        },
        lastRoiCalculationDate: {
            type: Date,
            required: true,
            default: Date.now,
        },
        totalRoiEarned: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
)

// Indexes for efficient querying
roiInvestmentSchema.index({ userId: 1, isActive: 1 })
roiInvestmentSchema.index({ isActive: 1, isLocked: 1 })
roiInvestmentSchema.index({ lockInEndDate: 1 })
roiInvestmentSchema.index({ lastRoiCalculationDate: 1 })

// Pre-save hook to calculate lockInEndDate
roiInvestmentSchema.pre('save', function(next) {
    if (this.isNew && this.lockInStartDate && this.lockInPeriod) {
        const endDate = new Date(this.lockInStartDate)
        endDate.setDate(endDate.getDate() + this.lockInPeriod)
        this.lockInEndDate = endDate
    }
    next()
})

// Method to check if lock-in period has ended
roiInvestmentSchema.methods.checkLockInStatus = function(): boolean {
    const now = new Date()
    if (now >= this.lockInEndDate) {
        this.isLocked = false
        return false
    }
    return true
}

const RoiInvestment = mongoose.model<RoiInvestment & mongoose.Document>('RoiInvestment', roiInvestmentSchema)

export default RoiInvestment

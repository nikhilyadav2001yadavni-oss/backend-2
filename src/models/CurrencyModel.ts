import mongoose from 'mongoose'

export interface Currency {
    _id: string
    symbol: string // TRX, BNB, ETH
    name: string // Tron, Binance Coin, Ethereum
    chain: string // TRC20, BEP20, ERC20
    colorCode?: string // Hex color code for UI (e.g., #FF0000)
    image?: string // URL to currency image/icon
    depositAddress: string // Wallet address for receiving deposits (required)
    minimumDepositAmount: number
    minimumWithdrawalAmount: number
    depositFee: number // Deposit fee (percentage or fixed amount)
    depositFeeType: string // 'percentage' or 'fixed'
    withdrawalFee: number // Withdrawal fee
    withdrawalFeeType: string // 'percentage' or 'fixed'
    isActive: boolean // To show/hide currency on deposit/withdrawal screens
    depositEnabled: boolean // To enable/disable deposit functionality
    withdrawalEnabled: boolean // To enable/disable withdrawal functionality
    createdAt: Date
    updatedAt: Date
}

const currencySchema = new mongoose.Schema(
    {
        symbol: {
            type: String,
            required: true,
            unique: true,
            enum: ['TRX', 'BNB', 'ETH', 'SOL'],
        },
        name: {
            type: String,
            required: true,
        },
        chain: {
            type: String,
            required: true,
            enum: ['TRC20', 'BEP20', 'ERC20', 'POLYGON'],
        },
        colorCode: {
            type: String,
            required: false,
            default: null,
            validate: {
                validator: function(v: string) {
                    if (!v) return true // Optional field
                    // Validate hex color code format
                    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v)
                },
                message: 'Color code must be a valid hex color (e.g., #FF0000 or #F00)'
            }
        },
        image: {
            type: String,
            required: false,
            default: null,
        },
        depositAddress: {
            type: String,
            required: true,
            description: 'Wallet address for receiving deposits',
        },
        minimumDepositAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        minimumWithdrawalAmount: {
            type: Number,
            required: true,
            default: 0,
        },
        depositFee: {
            type: Number,
            required: true,
            default: 0,
        },
        depositFeeType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        withdrawalFee: {
            type: Number,
            required: true,
            default: 0,
        },
        withdrawalFeeType: {
            type: String,
            required: true,
            enum: ['percentage', 'fixed'],
            default: 'percentage',
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
            description: 'Show/hide currency on deposit/withdrawal screens',
        },
        depositEnabled: {
            type: Boolean,
            required: true,
            default: true,
            description: 'Enable/disable deposit functionality for this currency',
        },
        withdrawalEnabled: {
            type: Boolean,
            required: true,
            default: true,
            description: 'Enable/disable withdrawal functionality for this currency',
        },
    },
    { timestamps: true }
)

const Currency = mongoose.model<Currency>('Currency', currencySchema)

// Seed default currencies if they don't exist
export const seedDefaultCurrencies = async (): Promise<void> => {
    try {
        // First, backfill existing currencies with missing fields
        const result = await Currency.updateMany(
            {
                $or: [
                    { depositEnabled: { $exists: false } },
                    { withdrawalEnabled: { $exists: false } }
                ]
            },
            {
                $set: {
                    depositEnabled: true,
                    withdrawalEnabled: true
                }
            }
        )
        if (result.modifiedCount > 0) {
            console.log(`✅ Backfilled depositEnabled and withdrawalEnabled for ${result.modifiedCount} currencies`)
        }
        
        const count = await Currency.countDocuments()
        if (count === 0) {
            const defaultCurrencies = [
                {
                    symbol: 'TRX',
                    name: 'Tron',
                    chain: 'TRC20',
                    colorCode: '#FF0018', // Tron red
                    depositAddress: 'PLEASE_UPDATE_VIA_ADMIN_API', // Must be updated via admin API
                    minimumDepositAmount: 0,
                    minimumWithdrawalAmount: 0,
                    depositFee: 0,
                    depositFeeType: 'percentage',
                    withdrawalFee: 0,
                    withdrawalFeeType: 'percentage',
                    isActive: true,
                    depositEnabled: true,
                    withdrawalEnabled: true,
                },
                {
                    symbol: 'BNB',
                    name: 'Binance Coin',
                    chain: 'BEP20',
                    colorCode: '#F3BA2F', // Binance yellow
                    depositAddress: 'PLEASE_UPDATE_VIA_ADMIN_API', // Must be updated via admin API
                    minimumDepositAmount: 0,
                    minimumWithdrawalAmount: 0,
                    depositFee: 0,
                    depositFeeType: 'percentage',
                    withdrawalFee: 0,
                    withdrawalFeeType: 'percentage',
                    isActive: true,
                    depositEnabled: true,
                    withdrawalEnabled: true,
                },
                {
                    symbol: 'ETH',
                    name: 'Ethereum',
                    chain: 'ERC20',
                    colorCode: '#627EEA', // Ethereum blue
                    depositAddress: 'PLEASE_UPDATE_VIA_ADMIN_API', // Must be updated via admin API
                    minimumDepositAmount: 0,
                    minimumWithdrawalAmount: 0,
                    depositFee: 0,
                    depositFeeType: 'percentage',
                    withdrawalFee: 0,
                    withdrawalFeeType: 'percentage',
                    isActive: true,
                    depositEnabled: true,
                    withdrawalEnabled: true,
                },
                {
                    symbol: 'SOL',
                    name: 'Solana',
                    chain: 'POLYGON',
                    colorCode: '#14F195', // Solana green
                    depositAddress: 'PLEASE_UPDATE_VIA_ADMIN_API', // Must be updated via admin API
                    minimumDepositAmount: 0,
                    minimumWithdrawalAmount: 0,
                    depositFee: 0,
                    depositFeeType: 'percentage',
                    withdrawalFee: 0,
                    withdrawalFeeType: 'percentage',
                    isActive: true,
                    depositEnabled: true,
                    withdrawalEnabled: true,
                },
            ]
            await Currency.insertMany(defaultCurrencies)
            console.log('Default currencies seeded successfully')
        }
    } catch (error: any) {
        console.error('Error seeding default currencies:', error.message)
    }
}

export default Currency

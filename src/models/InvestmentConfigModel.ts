import mongoose from 'mongoose'

export interface InvestmentConfig {
    _id: string
    /** Direct referral commission rate (%) - default 3 */
    directCommissionRate: number
    /** Indirect referral commission rate (%) - default 1.5 */
    indirectCommissionRate: number
    /** Monthly ROI rate (%) - default 8 */
    monthlyRoiRate: number
    createdAt: Date
    updatedAt: Date
}

const investmentConfigSchema = new mongoose.Schema(
    {
        directCommissionRate: {
            type: Number,
            required: true,
            default: 3,
            min: 0,
            max: 100,
        },
        indirectCommissionRate: {
            type: Number,
            required: true,
            default: 1.5,
            min: 0,
            max: 100,
        },
        monthlyRoiRate: {
            type: Number,
            required: true,
            default: 8,
            min: 0,
            max: 100,
        },
    },
    { timestamps: true }
)

const InvestmentConfig = mongoose.model<InvestmentConfig & mongoose.Document>(
    'InvestmentConfig',
    investmentConfigSchema
)

const DAYS_IN_MONTH = 30

export async function getInvestmentConfig(): Promise<InvestmentConfig & { dailyRoiRate: number }> {
    let config = await InvestmentConfig.findOne().lean()
    if (!config) {
        const defaultConfig = new InvestmentConfig({
            directCommissionRate: 3,
            indirectCommissionRate: 1.5,
            monthlyRoiRate: 8,
        })
        await defaultConfig.save()
        config = (await InvestmentConfig.findOne().lean())!
    }
    const monthlyRoiDecimal = (config.monthlyRoiRate as number) / 100
    const dailyRoiRate = Math.pow(1 + monthlyRoiDecimal, 1 / DAYS_IN_MONTH) - 1
    return {
        ...config,
        _id: (config as any)._id.toString(),
        dailyRoiRate,
    } as InvestmentConfig & { dailyRoiRate: number }
}

export default InvestmentConfig

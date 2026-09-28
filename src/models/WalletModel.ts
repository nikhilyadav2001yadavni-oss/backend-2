import mongoose from 'mongoose'

export interface Wallet {
    userId: string;
    mainWallet: number;
    gamingWallet: number;
    roiWallet: number;
}

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    mainWallet: {
        type: Number,
        required: true,
    },
    gamingWallet: {
        type: Number,
        required: true,
    },
    roiWallet: {
        type: Number,
        required: true,
    },
}, { timestamps: true })

const Wallet = mongoose.model('Wallet', walletSchema)
export default Wallet
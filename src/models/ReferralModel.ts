import mongoose from "mongoose";

export interface Referral {
    _id: string;
    userId: mongoose.Types.ObjectId;
    referralCode: string;
    previousNode: mongoose.Types.ObjectId | null; // The user who referred this user (upline)
    nextNodes: mongoose.Types.ObjectId[]; // Array of users referred by this user (downline)
    level: number; // Level in the MLM hierarchy (0 for root users)
    totalReferrals: number; // Total direct referrals
    directCommissionRate: number; // Commission rate for direct referrals (default: 3%)
    allLevelsCommissionRate: number; // Commission rate for all levels (default: 1.5%)
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const referralSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        referralCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        previousNode: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null, // null if user signed up without a referral code
        },
        nextNodes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }],
        level: {
            type: Number,
            required: true,
            default: 0, // 0 for users without referrer, increments for each level down
        },
        totalReferrals: {
            type: Number,
            required: true,
            default: 0,
        },
        directCommissionRate: {
            type: Number,
            required: true,
            default: 3, // 3% commission for direct referrals
        },
        allLevelsCommissionRate: {
            type: Number,
            required: true,
            default: 1.5, // 1.5% commission for all levels
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

// Index for efficient querying
referralSchema.index({ previousNode: 1 });
referralSchema.index({ level: 1 });

// Method to add a referral
referralSchema.methods.addReferral = async function (newUserId: mongoose.Types.ObjectId) {
    this.nextNodes.push(newUserId);
    this.totalReferrals += 1;
    await this.save();
};

const Referral = mongoose.model<Referral & mongoose.Document>("Referral", referralSchema);

export default Referral;


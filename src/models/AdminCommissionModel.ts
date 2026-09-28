import mongoose from "mongoose";

export enum CommissionType {
    DEPOSIT_FEE = "DEPOSIT_FEE",
    WITHDRAWAL_FEE = "WITHDRAWAL_FEE",
    GAME_FEE = "GAME_FEE",
    PLATFORM_FEE = "PLATFORM_FEE"
}

export interface AdminCommission {
    _id: string;
    transactionId: mongoose.Types.ObjectId; // Reference to the transaction
    userId: mongoose.Types.ObjectId; // User who paid the fee
    type: CommissionType;
    amount: number; // Fee amount collected
    currency: string;
    network: string; // TRC20, BEP20, ERC20
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

const adminCommissionSchema = new mongoose.Schema(
    {
        transactionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(CommissionType),
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            required: true,
        },
        network: {
            type: String,
            required: true,
            enum: ['TRC20', 'BEP20', 'ERC20'],
        },
        description: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

// Indexes for efficient querying
adminCommissionSchema.index({ type: 1, createdAt: -1 });
adminCommissionSchema.index({ currency: 1 });
adminCommissionSchema.index({ network: 1 });
adminCommissionSchema.index({ userId: 1, type: 1 });

const AdminCommission = mongoose.model<AdminCommission & mongoose.Document>("AdminCommission", adminCommissionSchema);

export default AdminCommission;


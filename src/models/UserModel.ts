import mongoose from "mongoose";
import Wallet from "./WalletModel";

export type UserStatus = 'active' | 'suspended';

export interface User {
    _id: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    status?: UserStatus;
    referralCode?: string;
    otp?: string;
    isVerified: boolean;
    dob?: Date;
    country?: string;
    city?: string;
    address?: string;
    profilepicture?: string;
    is2fa?: boolean;
    isBiometric?: boolean;
    themeMode?: string;
    fcmToken?: string;
    pushNotificationStatus?: boolean;
    withdrawalLimit?: {
        enabled: boolean;
        period: 'daily' | 'weekly' | 'monthly';
        amount: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      required: false,
    },
    referralCode: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    otp: {
      type: String,
      required: false,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    dob: {
      type: Date,
      required: false,
    },
    country: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    profilepicture: {
      type: String,
      required: false,
    },
    is2fa: {
      type: Boolean,
      required: false,
      default: false,
    },
    isBiometric: {
      type: Boolean,
      required: false,
      default: false,
    },
    themeMode: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
      required: false,
    },
    fcmToken: {
      type: String,
      required: false,
      default: null,
      description: 'Firebase Cloud Messaging token for push notifications',
    },
    pushNotificationStatus: {
      type: Boolean,
      required: false,
      default: true,
      description: 'Enable/disable push notifications for the user',
    },
    withdrawalLimit: {
      type: {
        enabled: { type: Boolean, default: false },
        period: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
        amount: { type: Number, default: 0 },
      },
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

// Post-save hook to create wallet when a new user is created
userSchema.post('save', async function (doc, next) {
  try {
    // Check if wallet already exists to avoid duplicates
    const existingWallet = await Wallet.findOne({ userId: doc._id });
    if (!existingWallet) {
      const newWallet = new Wallet({
        userId: doc._id,
        mainWallet: '0',
        gamingWallet: '0',
        roiWallet: '0',
      });
      await newWallet.save();
    }
    next();
  } catch (error: any) {
    next(error);
  }
});

const User = mongoose.model("User", userSchema);

export default User;

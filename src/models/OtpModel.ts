import mongoose from "mongoose";

export interface Otp {
    _id: string;
    email: string;
    phone?: string;
    eotp: string;
    motp?: string;
    expiresAt: Date;
    referrerUserId?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      index: true,
    },
    phone: {
      type: String,
      default: null,
      index: true,
    },
    eotp: {
      type: String,
      required: true,
    },
    motp: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    referrerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const Otp = mongoose.model("Otp", otpSchema);

export default Otp;

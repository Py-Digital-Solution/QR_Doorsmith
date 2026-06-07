import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One-time passcode for khati phone login (SOW 1.3).
 * Codes are stored hashed and auto-expire via a TTL index.
 */
const otpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// TTL index: MongoDB removes the doc once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpDoc = InferSchemaType<typeof otpSchema>;

export const Otp: Model<OtpDoc> =
  (models.Otp as Model<OtpDoc>) ?? model<OtpDoc>("Otp", otpSchema);

import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const REDEMPTION_STATUSES = ["pending", "approved", "rejected"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

const redemptionSchema = new Schema(
  {
    khatiId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    counterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    points: { type: Number, required: true },
    status: {
      type: String,
      enum: REDEMPTION_STATUSES,
      default: "pending",
      index: true,
    },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, default: "" },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    /** Settlement with the counter (admin reimburses the counter for points it paid out). */
    settledAt: { type: Date, default: null, index: true },
    settledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    settlementId: { type: Schema.Types.ObjectId, ref: "Settlement", default: null },
  },
  { timestamps: true },
);

export type RedemptionDoc = InferSchemaType<typeof redemptionSchema>;

export const Redemption: Model<RedemptionDoc> =
  (models.Redemption as Model<RedemptionDoc>) ??
  model<RedemptionDoc>("Redemption", redemptionSchema);

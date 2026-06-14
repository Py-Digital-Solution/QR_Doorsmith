import mongoose, { Schema } from "mongoose";

export type PtType =
  | "scan_product"
  | "scan_small_box"
  | "return_reversal"
  | "redemption_lock"
  | "redemption_unlock"
  | "manual_adjustment";

const pointTransactionSchema = new Schema(
  {
    khatiId:      { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    qrCodeId:     { type: Schema.Types.ObjectId, ref: "QrCode" },
    returnId:     { type: Schema.Types.ObjectId, ref: "Return" },
    redemptionId: { type: Schema.Types.ObjectId, ref: "Redemption" },
    type:         { type: String, enum: ["scan_product","scan_small_box","return_reversal","redemption_lock","redemption_unlock","manual_adjustment"], required: true },
    points:       { type: Number, required: true },   // positive = earned, negative = deducted
    balanceAfter: { type: Number, required: true },
    description:  { type: String },
    sku:          { type: String },
    serialNo:     { type: String },
  },
  { timestamps: true },
);

pointTransactionSchema.index({ khatiId: 1, createdAt: -1 });
pointTransactionSchema.index({ createdAt: -1 });

export const PointTransaction =
  mongoose.models.PointTransaction ??
  mongoose.model("PointTransaction", pointTransactionSchema);

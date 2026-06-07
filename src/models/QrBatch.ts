import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { QR_BATCH_STATUSES } from "../lib/qr";

/**
 * A generation batch (SOW 1.8 — "Batch Activation & Status Control").
 * Records who generated it, the structure, the reserved serial range, the
 * print sheet/label config, and the batch status for the audit trail.
 */
const sheetConfigSchema = new Schema(
  {
    sheetWidthMm: Number,
    sheetHeightMm: Number,
    labelWidthMm: Number,
    labelHeightMm: Number,
    columns: Number,
    rows: Number,
  },
  { _id: false },
);

const qrBatchSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    masterCount: { type: Number, default: 0 },
    smallPerMaster: { type: Number, default: 0 },
    productPerSmall: { type: Number, default: 0 },
    totalCodes: { type: Number, required: true },
    serialStart: { type: Number, required: true },
    serialEnd: { type: Number, required: true },
    sheetConfig: sheetConfigSchema,
    status: {
      type: String,
      enum: QR_BATCH_STATUSES,
      required: true,
      default: "in_warehouse",
      index: true,
    },
  },
  { timestamps: true },
);

export type QrBatchDoc = InferSchemaType<typeof qrBatchSchema>;

export const QrBatch: Model<QrBatchDoc> =
  (models.QrBatch as Model<QrBatchDoc>) ??
  model<QrBatchDoc>("QrBatch", qrBatchSchema);

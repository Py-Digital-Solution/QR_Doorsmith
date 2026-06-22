import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { QR_TYPES, QR_STATUSES } from "../lib/qr";

/**
 * A single QR code (SOW 1.8). `serialNo` is globally unique (serialization
 * guard). `parentQrId` builds the Master → Small → Product traceability tree.
 *
 * `productId` is the source of truth for what this code represents. The
 * sku/mrp/salesPrice/rewardPoints below are an at-generation snapshot kept for
 * the printed label + audit ONLY. Reward crediting uses the LIVE product value
 * at scan time (decision 2026-06-06), and the credited amount is recorded on
 * the points-ledger transaction (Phase 4) so returns reverse the exact amount.
 */
const qrCodeSchema = new Schema(
  {
    serialNo: { type: String, required: true, unique: true },
    type: { type: String, enum: QR_TYPES, required: true, index: true },
    parentQrId: { type: Schema.Types.ObjectId, ref: "QrCode", default: null, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: "QrBatch", required: true, index: true },
    status: {
      type: String,
      enum: QR_STATUSES,
      required: true,
      default: "inactive",
      index: true,
    },

    // Dispatch / inventory (Inventory & Dispatch module): which counter this code
    // was dispatched to, and the dispatch bill it belongs to.
    counterId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    dispatchId: { type: Schema.Types.ObjectId, ref: "Dispatch", default: null, index: true },

    // metadata snapshot (SOW 1.8 embedded metadata)
    sku: { type: String },
    mrp: { type: Number },
    salesPrice: { type: Number },
    rewardPoints: { type: Number },

    // scan lifecycle (filled in Phase 4)
    scannedByKhatiId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    scannedAt: { type: Date, default: null },
    // return lifecycle  scannedByKhatiId is kept for history; returned=true means points were reversed
    returned: { type: Boolean, default: false },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type QrCodeDoc = InferSchemaType<typeof qrCodeSchema>;

export const QrCode: Model<QrCodeDoc> =
  (models.QrCode as Model<QrCodeDoc>) ??
  model<QrCodeDoc>("QrCode", qrCodeSchema);

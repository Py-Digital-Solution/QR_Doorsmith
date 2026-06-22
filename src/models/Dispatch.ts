import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const DISPATCH_STATUSES = ["dispatched"] as const;

/**
 * Dispatch ("bill")  warehouse sends one or more scanned units (and everything
 * inside them) to a counter. A unit can be a master box, a small box, or a
 * single unique product code (client feedback 2026-06-08). Auto-assigned: on
 * creation the contained codes are linked to the counter and activated.
 *
 * `rootQrIds` are the actually-scanned units. `masterQrIds`/`masterCount` are
 * kept for backward compatibility with bills created before multi-level
 * dispatch and mirror `rootQrIds` for new bills.
 */
const dispatchSchema = new Schema(
  {
    billNo: { type: String, required: true, unique: true },
    counterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    rootQrIds: [{ type: Schema.Types.ObjectId, ref: "QrCode" }],
    rootCount: { type: Number, default: 0 },
    // legacy (pre-multi-level dispatch)
    masterQrIds: [{ type: Schema.Types.ObjectId, ref: "QrCode" }],
    masterCount: { type: Number, default: 0 },
    totalCodes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: DISPATCH_STATUSES,
      required: true,
      default: "dispatched",
    },
  },
  { timestamps: true },
);

export type DispatchDoc = InferSchemaType<typeof dispatchSchema>;

export const Dispatch: Model<DispatchDoc> =
  (models.Dispatch as Model<DispatchDoc>) ??
  model<DispatchDoc>("Dispatch", dispatchSchema);

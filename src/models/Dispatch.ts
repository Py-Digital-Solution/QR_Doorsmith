import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const DISPATCH_STATUSES = ["dispatched"] as const;

/**
 * Dispatch ("bill") — warehouse sends one or more master boxes (and everything
 * inside them) to a counter. Created by scanning master box QRs. Auto-assigned:
 * on creation the contained codes are linked to the counter and activated.
 */
const dispatchSchema = new Schema(
  {
    billNo: { type: String, required: true, unique: true },
    counterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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

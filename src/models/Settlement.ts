import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A settle-up event: the admin reimburses a counter for the redemption points
 * that counter has paid out to karigars. Each settlement closes a batch of the
 * counter's approved-but-unsettled redemptions (see services/settlement.ts).
 */
const settlementSchema = new Schema(
  {
    /** The counter being settled with (Redemption.processedBy). */
    counterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** The admin who performed the settlement. */
    settledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Total redemption points settled in this event. */
    points: { type: Number, required: true },
    /** How many redemptions were closed by this settlement. */
    redemptionCount: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

settlementSchema.index({ createdAt: -1 });

export type SettlementDoc = InferSchemaType<typeof settlementSchema>;

export const Settlement: Model<SettlementDoc> =
  (models.Settlement as Model<SettlementDoc>) ??
  model<SettlementDoc>("Settlement", settlementSchema);

import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "suspended", "cancelled"],
      default: "active",
      index: true,
    },
    /** Hard limits per plan. 0 = unlimited. */
    maxUsers: { type: Number, default: 50 },
    maxQrCodes: { type: Number, default: 5000 },
    maxProducts: { type: Number, default: 100 },
    /** When the current billing cycle expires. Null = no expiry (free plan). */
    expiresAt: { type: Date, default: null },
    /** Notes from super admin (e.g. payment ref, plan reason) */
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof subscriptionSchema>;

export const Subscription: Model<SubscriptionDoc> =
  (models.Subscription as Model<SubscriptionDoc>) ??
  model<SubscriptionDoc>("Subscription", subscriptionSchema);

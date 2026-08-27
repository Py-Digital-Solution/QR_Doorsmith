import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const magicTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Auto-expire documents from MongoDB after expiration
magicTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type MagicTokenDoc = InferSchemaType<typeof magicTokenSchema>;

export const MagicToken: Model<MagicTokenDoc> =
  (models.MagicToken as Model<MagicTokenDoc>) ??
  model<MagicTokenDoc>("MagicToken", magicTokenSchema);

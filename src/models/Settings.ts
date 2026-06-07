import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Settings — global key/value flags.
 * Seeded with `distributor_enabled = false` because the Distributor role is
 * deactivated by default (SOW 1.2); the admin can enable it later.
 */
const settingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
  },
  { timestamps: true },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ??
  model<SettingsDoc>("Settings", settingsSchema);

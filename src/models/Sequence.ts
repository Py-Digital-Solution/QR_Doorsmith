import { Schema, model, models, type Model } from "mongoose";

/**
 * Atomic named counter — used to reserve unique, gap-free serial-number ranges
 * for QR generation (the serialization guard, SOW 1.8).
 */
type SequenceDoc = { _id: string; value: number };

const sequenceSchema = new Schema<SequenceDoc>(
  {
    _id: { type: String },
    value: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Sequence: Model<SequenceDoc> =
  (models.Sequence as Model<SequenceDoc>) ??
  model<SequenceDoc>("Sequence", sequenceSchema);

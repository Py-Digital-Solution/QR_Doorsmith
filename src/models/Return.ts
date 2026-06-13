import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const returnSchema = new Schema(
  {
    counterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    khatiId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    serialNo: { type: String, required: true },
    sku: { type: String, default: "" },
    pointsReversed: { type: Number, required: true },
    counterName: { type: String, default: "" },
    khatiName: { type: String, default: "" },
  },
  { timestamps: true },
);

export type ReturnDoc = InferSchemaType<typeof returnSchema>;

export const Return: Model<ReturnDoc> =
  (models.Return as Model<ReturnDoc>) ??
  model<ReturnDoc>("Return", returnSchema);

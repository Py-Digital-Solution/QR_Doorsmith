import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PRODUCT_STATUSES } from "../lib/product";

/**
 * Product / SKU (SOW 1.8). MRP, sales price and reward points are the values
 * that get snapshotted onto each generated QR code.
 */
const productSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    mrp: { type: Number, required: true, min: 0 },
    salesPrice: { type: Number, required: true, min: 0 },
    rewardPoints: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    // SOW 1.3  installation video links (YouTube/Instagram/Facebook) shown to khatis.
    videoLinks: { type: [String], default: [] },
    status: {
      type: String,
      enum: PRODUCT_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

export type ProductDoc = InferSchemaType<typeof productSchema>;

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) ??
  model<ProductDoc>("Product", productSchema);

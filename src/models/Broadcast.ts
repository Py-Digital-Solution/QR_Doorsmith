import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Broadcast — an admin promotional WhatsApp message sent to one or more role
 * audiences. Recipients are resolved + sent in small throttled batches; progress
 * is tracked on this document (a `cursor` over user _id keeps it resumable).
 */
const broadcastSchema = new Schema(
  {
    audienceRoles: { type: [String], required: true },
    message: { type: String, required: true },
    // Optional public image URL. Sent as a real WhatsApp image attachment with
    // the message as its caption (see services/broadcast.ts + the bridge /send).
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["queued", "sending", "completed"],
      default: "queued",
      index: true,
    },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    // Last processed recipient _id, so draining can resume where it left off.
    cursor: { type: Schema.Types.ObjectId, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true },
);

export type BroadcastDoc = InferSchemaType<typeof broadcastSchema>;

export const Broadcast: Model<BroadcastDoc> =
  (models.Broadcast as Model<BroadcastDoc>) ?? model<BroadcastDoc>("Broadcast", broadcastSchema);

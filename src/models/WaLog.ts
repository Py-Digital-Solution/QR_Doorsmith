import { Schema, model, models, type Model } from "mongoose";

const waLogSchema = new Schema(
  {
    phone: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: "message" },
    status: { type: String, enum: ["sent", "failed"], required: true },
    error: { type: String },
  },
  { timestamps: true },
);

waLogSchema.index({ createdAt: -1 });

export type WaLogDoc = {
  _id: unknown;
  phone: string;
  message: string;
  type: string;
  status: "sent" | "failed";
  error?: string;
  createdAt: Date;
  updatedAt: Date;
};

export const WaLog: Model<WaLogDoc> =
  (models.WaLog as Model<WaLogDoc>) ?? model<WaLogDoc>("WaLog", waLogSchema);

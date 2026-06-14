import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { USER_ROLES, USER_STATUSES } from "../lib/roles";

/**
 * User — every actor in the system (SOW 1.2 five-role hierarchy).
 * Khatis (carpenters) authenticate by phone (OTP); staff by email + password.
 *
 * NOTE: MongoDB does not enforce referential integrity, so `createdBy` and
 * future relations are validated in the app/service layer, not the database.
 *
 * Role/status constants + types live in `@/lib/roles` (mongoose-free) so they
 * can be imported by client components too.
 */
export { USER_ROLES, USER_STATUSES };
export type { UserRole, UserStatus } from "../lib/roles";

const userSchema = new Schema(
  {
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    name: { type: String },
    // sparse + unique: not every user has both phone and email.
    phone: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    photoUrl: { type: String },
    status: {
      type: String,
      enum: USER_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    // Explicit counter link for khatis. When a counter creates a khati, this
    // equals createdBy. When an admin creates a khati, createdBy = admin but
    // counterId = the selected counter.
    counterId: { type: Schema.Types.ObjectId, ref: "User" },
    // Khati rewards (Phase 4). Default 0 so old documents behave correctly.
    points: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    // KYC registration profile
    address: { type: String },
    dob: { type: Date },
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending_counter", "pending_sales_rep", "pending_admin", "approved", "rejected"],
      default: "not_submitted",
    },
    // One-time token included in the WhatsApp registration link; cleared on approval
    registrationToken: { type: String, sparse: true, unique: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>("User", userSchema);

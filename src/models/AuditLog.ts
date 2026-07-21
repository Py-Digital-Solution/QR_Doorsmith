import mongoose, { Schema } from "mongoose";

export type AuditAction =
  | "kyc_approve"
  | "kyc_reject"
  | "kyc_submit"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "qr_batch_create"
  | "qr_code_edit"
  | "qr_code_delete"
  | "dispatch_draft_create"
  | "dispatch_draft_update"
  | "dispatch_create"
  | "return_create"
  | "return_approve"
  | "return_reject"
  | "redemption_request"
  | "redemption_settle"
  | "redemption_reject"
  | "counter_settle"
  | "scan_qr"
  | "broadcast_create";

const auditLogSchema = new Schema(
  {
    actorId:    { type: Schema.Types.ObjectId, ref: "User" },
    actorRole:  { type: String },
    actorName:  { type: String },
    action:     { type: String, required: true, index: true },
    entityType: { type: String },   // "user" | "qrBatch" | "qrCode" | "dispatch" | "return" | "redemption"
    entityId:   { type: Schema.Types.ObjectId },
    meta:       { type: Schema.Types.Mixed },  // extra context (name, sku, reason, points…)
    ip:         { type: String },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog =
  mongoose.models.AuditLog ?? mongoose.model("AuditLog", auditLogSchema);

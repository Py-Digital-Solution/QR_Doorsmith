import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    branding: {
      logo: { type: String, default: "" },
      favicon: { type: String, default: "" },
      brandColor: { type: String, default: "#F97316" },
      brandSecondary: { type: String, default: "#0F2444" },
      brandDark: { type: String, default: "#D96D10" },
      brandLight: { type: String, default: "#FFF3E8" },
      fontFamily: { type: String, default: "geist" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      tagline: { type: String, default: "" },
      website: { type: String, default: "" },
      instagramUrl: { type: String, default: "" },
      facebookUrl: { type: String, default: "" },
      youtubeUrl: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof organizationSchema>;

export const Organization: Model<OrganizationDoc> =
  (models.Organization as Model<OrganizationDoc>) ??
  model<OrganizationDoc>("Organization", organizationSchema);

import "server-only";
import { getSetting } from "@/services/settings";

export type BannerSettings = {
  image: string;
  enabled: boolean;
};

export async function getBannerSettings(): Promise<BannerSettings> {
  const [image, enabled] = await Promise.all([
    getSetting<string>("banner_image", ""),
    getSetting<boolean>("banner_enabled", false),
  ]);
  return { image, enabled };
}

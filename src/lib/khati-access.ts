import { createHash, randomBytes } from "crypto";

/** Direct Carpenter links are short-lived bearer invitations and are consumed once. */
export const KHATI_ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashKhatiAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createKhatiAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashKhatiAccessToken(token),
    expiresAt: new Date(Date.now() + KHATI_ACCESS_TTL_MS),
  };
}


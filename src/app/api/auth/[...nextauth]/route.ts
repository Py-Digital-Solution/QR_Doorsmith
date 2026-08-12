import { handlers } from "@/auth";
import { NextRequest } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const { GET: authGET, POST: authPOST } = handlers;

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const rl = rateLimit(`auth:${ip}`, 30, 60_000);
  const rlRes = rateLimitResponse(rl);
  if (rlRes) return rlRes;
  return authGET(req as any);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const rl = rateLimit(`auth:${ip}`, 30, 60_000);
  const rlRes = rateLimitResponse(rl);
  if (rlRes) return rlRes;
  return authPOST(req as any);
}

/**
 * Lightweight structured logger.
 * Outputs JSON lines to stdout in production, readable format in development.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const prefix = { debug: "[DEBUG]", info: "[INFO]", warn: "[WARN]", error: "[ERROR]" }[level];
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    if (level === "error") console.error(`${prefix} ${message}${ctx}`);
    else if (level === "warn") console.warn(`${prefix} ${message}${ctx}`);
    else console.log(`${prefix} ${message}${ctx}`);
    return;
  }

  // Production: structured JSON
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...context,
  };
  if (level === "error") console.error(JSON.stringify(entry));
  else if (level === "warn") console.warn(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log("error", msg, ctx),
};

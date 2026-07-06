import type { UsageMode } from "@/lib/usage/usage-types";

export function getUsageMode(): UsageMode {
  const mode = process.env.REVENEW_USAGE_MODE;
  if (mode === "off" || mode === "observe" || mode === "enforce") {
    return mode;
  }

  return process.env.NODE_ENV === "production" ? "enforce" : "observe";
}

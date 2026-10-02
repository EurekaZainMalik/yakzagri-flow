/**
 * Trade status normalisation.
 *
 * The API and the Soroban contract report a trade status in several shapes
 * (`FUNDED`, `settled`, `in_transit`, `Forwarded to Mediator`, …). The shared
 * `StatusBadge` understands a single canonical union, so the mapping lives here
 * once and is used by every surface that renders a trade status.
 */

import type { TradeStatus } from "@/components/ui/StatusBadge";

/**
 * Map a raw trade status string onto the canonical `TradeStatus` union used by
 * `@/components/ui/StatusBadge`. Unknown statuses fall back to `pending`.
 */
export function toBadgeStatus(status: string): TradeStatus {
  const normalized = status.toLowerCase().replace(/_/g, "-");
  if (normalized === "disputed") return "disputed";
  if (normalized === "delivered") return "delivered";
  if (normalized === "funded" || normalized === "locked") return "locked";
  if (["completed", "settled", "released", "resolved"].includes(normalized)) {
    return "delivered";
  }
  if (normalized === "draft" || normalized === "cancelled") return "draft";
  if (["in-transit", "in transit"].includes(normalized)) return "in-transit";
  return "pending";
}

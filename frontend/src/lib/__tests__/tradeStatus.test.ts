/**
 * Tests for src/lib/trades/status.ts
 *
 * The mapper is the single source of truth for how a raw trade status renders
 * in the shared `StatusBadge`, so every shape the API/contract emits is pinned
 * here.
 */

import { toBadgeStatus } from "../trades/status";

describe("toBadgeStatus", () => {
  it.each([
    ["DISPUTED", "disputed"],
    ["disputed", "disputed"],
    ["DELIVERED", "delivered"],
    ["FUNDED", "locked"],
    ["locked", "locked"],
    ["SETTLED", "delivered"],
    ["COMPLETED", "delivered"],
    ["RELEASED", "delivered"],
    ["RESOLVED", "delivered"],
    ["DRAFT", "draft"],
    ["CANCELLED", "draft"],
    ["IN_TRANSIT", "in-transit"],
    ["In Transit", "in-transit"],
    ["PENDING", "pending"],
  ])("maps %s to %s", (raw, expected) => {
    expect(toBadgeStatus(raw)).toBe(expected);
  });

  it("normalises snake_case statuses before mapping", () => {
    expect(toBadgeStatus("in_transit")).toBe("in-transit");
  });

  it("falls back to pending for unknown statuses", () => {
    expect(toBadgeStatus("FORWARDED_TO_MEDIATOR")).toBe("pending");
    expect(toBadgeStatus("")).toBe("pending");
  });
});

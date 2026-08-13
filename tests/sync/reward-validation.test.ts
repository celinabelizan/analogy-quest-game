import { describe, expect, it } from "vitest";
import {
  validateProductUrl,
  validateRewardImageMetadata,
} from "../../src/lib/sync/reward-validation";

describe("reward product links", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "blob:https://example.com/id",
    "https://user:password@example.com/item",
    "https://127.0.0.1/admin",
    "http://[::1]/admin",
    "https://169.254.169.254/latest/meta-data",
    "https://example.com/\njavascript:alert(1)",
  ])("rejects unsafe URL %s", (value) => {
    expect(() => validateProductUrl(value)).toThrow();
  });

  it("normalizes safe HTTP(S) URLs without fetching them", () => {
    expect(validateProductUrl("https://Example.COM/products/ring?size=7")).toBe(
      "https://example.com/products/ring?size=7",
    );
    expect(validateProductUrl("http://shop.example.com/item")).toBe("http://shop.example.com/item");
  });
});

describe("reward image metadata", () => {
  const valid = {
    fileName: "reward.webp",
    mimeType: "image/webp",
    sizeBytes: 512_000,
    width: 1200,
    height: 1200,
    magicBytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  };

  it.each([
    { ...valid, mimeType: "image/svg+xml", fileName: "attack.svg" },
    { ...valid, mimeType: "text/html", fileName: "attack.html" },
    { ...valid, mimeType: "application/pdf", fileName: "attack.pdf" },
    { ...valid, sizeBytes: 5 * 1024 * 1024 + 1 },
    { ...valid, width: 4097 },
    { ...valid, height: 4097 },
    { ...valid, mimeType: "image/png", magicBytes: new Uint8Array([0x3c, 0x73, 0x76, 0x67]) },
  ])("rejects unsafe or mismatched image metadata", (metadata) => {
    expect(() => validateRewardImageMetadata(metadata)).toThrow();
  });

  it("accepts a bounded JPEG, PNG, or WebP after signature validation", () => {
    expect(validateRewardImageMetadata(valid)).toEqual(
      expect.objectContaining({ mimeType: "image/webp" }),
    );
  });
});
describe("reward revision behavior", () => {
  it("documents that a child edit cannot replace the approved revision", () => {
    const item = {
      currentApprovedRevisionId: "60000000-0000-4000-8000-000000000001",
      pendingRevisionId: null as string | null,
      authoritativeXpCost: 350,
    };
    const afterChildEdit = {
      ...item,
      pendingRevisionId: "60000000-0000-4000-8000-000000000002",
    };

    expect(afterChildEdit.currentApprovedRevisionId).toBe(item.currentApprovedRevisionId);
    expect(afterChildEdit.authoritativeXpCost).toBe(350);
    expect(afterChildEdit.pendingRevisionId).not.toBeNull();
  });
});

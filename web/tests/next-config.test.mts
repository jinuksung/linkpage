import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.ts";

test("allowedDevOrigins covers local and Cloudflare dev hosts", () => {
  assert.ok(Array.isArray(nextConfig.allowedDevOrigins), "allowedDevOrigins should be configured");

  const origins = new Set(nextConfig.allowedDevOrigins);

  assert.ok(origins.has("localhost"));
  assert.ok(origins.has("127.0.0.1"));
  assert.ok(origins.has("*.trycloudflare.com"));
});

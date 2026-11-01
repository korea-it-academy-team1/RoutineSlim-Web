// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import configureVite from "../../vite.config";
afterEach(() => vi.unstubAllEnvs());
it("keeps the fixed backend on localhost:8080 and uses a separate development port", () => {
  vi.stubEnv("API_PROXY_TARGET", "http://localhost:8080");
  const config = configureVite({ mode: "test" });
  expect(config.server.port).toBe(5173);
  expect(config.preview.port).toBe(4173);
  expect(config.server.proxy["/api"].target).toBe("http://localhost:8080");
  expect(config.server.proxy["/auth"].target).toBe("http://localhost:8080");
});
it("rejects a proxy target that points back at the development server", () => {
  vi.stubEnv("API_PROXY_TARGET", "http://localhost:5173");
  expect(() => configureVite({ mode: "test" })).toThrow("프록시 주소가 같습니다");
});

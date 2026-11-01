import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const frontendPort = 5173;
  const backendTarget = env.API_PROXY_TARGET || "http://localhost:8080";
  const backendUrl = new URL(backendTarget);
  if (!["http:", "https:"].includes(backendUrl.protocol)) {
    throw new Error("API_PROXY_TARGET에는 Spring 서버의 HTTP 또는 HTTPS 주소를 입력해주세요.");
  }
  if (
    ["localhost", "127.0.0.1", "[::1]"].includes(backendUrl.hostname) &&
    Number(backendUrl.port || (backendUrl.protocol === "https:" ? 443 : 80)) === frontendPort
  ) {
    throw new Error(
      "개발 서버와 백엔드 프록시 주소가 같습니다. API_PROXY_TARGET에는 별도로 실행 중인 Spring 서버 주소를 지정해주세요.",
    );
  }
  const proxy = Object.fromEntries(
    ["/api", "/auth"].map((path) => [path, { target: backendTarget, changeOrigin: true }]),
  );
  return {
    test: {
      environment: "jsdom",
      globals: true,
      pool: "threads",
      poolOptions: { threads: { singleThread: true } },
    },
    server: { port: frontendPort, strictPort: true, proxy },
    preview: { port: 4173, strictPort: true, proxy },
  };
});

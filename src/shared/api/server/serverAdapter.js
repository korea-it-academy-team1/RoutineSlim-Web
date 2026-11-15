import { accountRoutes } from "./routes/accountRoutes";
import { browserRoutes } from "./routes/browserRoutes";
import { financeRoutes } from "./routes/financeRoutes";
import { subscriptionRoutes } from "./routes/subscriptionRoutes";
import { unsupported } from "./unsupportedFeature";
const handlers = [accountRoutes, browserRoutes, financeRoutes, subscriptionRoutes];
export async function requestServerApi(path, options = {}) {
  const url = new URL(path, "http://frontend.local");
  const context = {
    path,
    options,
    url,
    route: url.pathname,
    method: (options.method || "GET").toUpperCase(),
    body: options.body,
  };
  for (const handler of handlers) {
    const result = await handler(context);
    if (result !== undefined) return result;
  }
  return unsupported(path);
}

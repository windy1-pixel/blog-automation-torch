import { ProxyAgent } from "undici";
import { logger } from "../lib/logger.js";

// Builds a proxy dispatcher from the TORCH_PROXY_* values in .env.
// Every scraping request routes through this — search engines and competitor
// sites see a Torch residential IP, not this machine.
// `freshSession: true` swaps the session ID in the password for a random one,
// which makes the proxy assign a brand-new exit IP for this request.
export function getProxyAgent(opts: { freshSession?: boolean } = {}): ProxyAgent | undefined {
  const { TORCH_PROXY_HOST, TORCH_PROXY_PORT, TORCH_PROXY_USERNAME, TORCH_PROXY_PASSWORD } =
    process.env;

  if (!TORCH_PROXY_HOST || !TORCH_PROXY_PORT || !TORCH_PROXY_USERNAME || !TORCH_PROXY_PASSWORD) {
    logger.warn("Torch proxy not configured — scraping will use the direct connection");
    return undefined;
  }

  let password = TORCH_PROXY_PASSWORD;
  if (opts.freshSession) {
    const rand = Math.random().toString(36).slice(2, 10);
    password = password.replace(/session-[a-z0-9]+/i, `session-${rand}`);
  }

  return new ProxyAgent({
    uri: `http://${TORCH_PROXY_HOST}:${TORCH_PROXY_PORT}`,
    token: `Basic ${Buffer.from(`${TORCH_PROXY_USERNAME}:${password}`).toString("base64")}`,
  });
}

// A realistic desktop browser identity — sites treat obvious bots differently.
export const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

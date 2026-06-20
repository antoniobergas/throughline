import https from "https";
import { URL } from "url";

// Create an OAuth App at https://github.com/settings/applications/new
// Name: throughline | Homepage: any | Callback URL: any | Enable Device Flow: ✓
// Paste the Client ID below (it is public — safe to commit).
export const GITHUB_OAUTH_CLIENT_ID = "Ov23lieVpVe3vqnmEhkh";

const SCOPE = "repo read:user";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
  error?: string;
}

interface TokenResponse {
  access_token?: string;
  error?: string;
}

function post<T>(url: string, body: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error(`Non-JSON response: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export async function requestDeviceCode(clientId: string): Promise<{
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}> {
  const result = await post<DeviceCodeResponse>(
    "https://github.com/login/device/code",
    { client_id: clientId, scope: SCOPE },
  );
  if (result.error) throw new Error(result.error);
  return result;
}

export async function pollForToken(
  clientId: string,
  deviceCode: string,
  intervalSeconds: number,
  signal: AbortSignal,
): Promise<string> {
  let currentInterval = intervalSeconds;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, currentInterval * 1000);
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new Error("CANCELLED"));
        },
        { once: true },
      );
    });

    if (signal.aborted) throw new Error("CANCELLED");

    const result = await post<TokenResponse>(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      },
    );

    if (result.access_token) return result.access_token;

    switch (result.error) {
      case "authorization_pending":
        continue;
      case "slow_down":
        currentInterval += 5;
        continue;
      case "expired_token":
        throw new Error("CODE_EXPIRED");
      case "access_denied":
        throw new Error("ACCESS_DENIED");
      default:
        throw new Error(result.error ?? "POLL_UNKNOWN");
    }
  }
}

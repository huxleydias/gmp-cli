import { OAuth2Client } from "google-auth-library";
import * as fs from "fs";
import * as http from "http";
import {
  SCOPES,
  createOAuth2Client,
  getTokenPath,
} from "./auth-config.js";

export {
  setCredentials,
  setDeveloperToken,
  setLoginCustomerId,
  getAdsConfig,
} from "./auth-config.js";

export async function login(): Promise<void> {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  // Start local server to catch the callback
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || "", `http://localhost:3847`);
        const authCode = url.searchParams.get("code");
        if (authCode) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            "<h1>Authentication successful!</h1><p>You can close this window.</p>"
          );
          server.close();
          resolve(authCode);
        } else {
          res.writeHead(400);
          res.end("No code received");
        }
      } catch (err) {
        reject(err);
      }
    });

    server.listen(3847, () => {
      console.log(`\nOpening browser for authentication...\n`);
      console.log(`If the browser doesn't open, visit:\n${authUrl}\n`);
      import("open").then((open) => open.default(authUrl));
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timed out"));
    }, 120000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  fs.writeFileSync(getTokenPath(), JSON.stringify(tokens, null, 2));
  console.log("Authentication successful! Tokens saved.");
}

export function getAuthClient(): OAuth2Client {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    throw new Error(
      "Not authenticated. Run `gmp auth login` first."
    );
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);

  // Auto-refresh: save new tokens when refreshed
  oauth2Client.on("tokens", (newTokens) => {
    const existing = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
    const merged = { ...existing, ...newTokens };
    fs.writeFileSync(tokenPath, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

export function isAuthenticated(): boolean {
  return fs.existsSync(getTokenPath());
}

export function logout(): void {
  const tokenPath = getTokenPath();
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
    console.log("Logged out. Tokens removed.");
  } else {
    console.log("No tokens found.");
  }
}

export function status(): void {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    console.log("Status: Not authenticated");
    return;
  }
  const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
  const expiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : "unknown";
  console.log("Status: Authenticated");
  console.log(`Token expiry: ${expiry}`);
  console.log(`Scopes: ${tokens.scope || "unknown"}`);
}

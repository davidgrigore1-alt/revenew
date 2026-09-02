import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const buildIdPath = path.join(root, ".next", "BUILD_ID");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

if (!fs.existsSync(buildIdPath)) {
  throw new Error("Build-ul Next lipsește. Rulează npm run build înainte de validate:http-security.");
}

function getLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Nu s-a putut rezerva un port loopback."));
        return;
      }
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("Serverul Next s-a oprit înainte ca smoke test-ul să se poată conecta.");
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status > 0) return;
    } catch {
      // The loopback server has not started yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Serverul Next nu a devenit disponibil pe loopback în 30 de secunde.");
}

function assertPublicSecurityHeaders(response, route) {
  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/, `${route} must emit default-src 'self'`);
  assert.match(csp, /object-src 'none'/, `${route} must block objects`);
  assert.match(csp, /base-uri 'self'/, `${route} must constrain base-uri`);
  assert.match(csp, /form-action 'self'/, `${route} must constrain form actions`);
  assert.match(csp, /frame-ancestors 'none'/, `${route} must block framing`);
  assert.match(csp, /upgrade-insecure-requests/, `${route} must upgrade insecure requests in production`);
  assert.doesNotMatch(csp, /unsafe-eval/, `${route} must not emit unsafe-eval in production`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${route} must retain nosniff`);
  assert.equal(response.headers.get("x-frame-options"), "DENY", `${route} must retain DENY`);
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin", `${route} must retain its referrer policy`);
  assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000", `${route} must retain production HSTS`);
  assert.equal(response.headers.get("x-powered-by"), null, `${route} must not expose Next.js`);
}

const port = await getLoopbackPort();
const baseUrl = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, [nextBin, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production" },
  stdio: "ignore"
});

try {
  await waitForServer(`${baseUrl}/`, child);

  for (const route of ["/", "/login", "/privacy"]) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    assert.ok(response.status >= 200 && response.status < 400, `${route} must be reachable without external services`);
    assertPublicSecurityHeaders(response, route);
  }

  const authResponse = await fetch(`${baseUrl}/auth/callback`, { redirect: "manual" });
  assert.ok(authResponse.status >= 300 && authResponse.status < 400, "the invalid auth callback remains a safe redirect");
  assert.equal(authResponse.headers.get("cache-control"), "private, no-store", "auth routes must be private no-store");
  assertPublicSecurityHeaders(authResponse, "/auth/callback");
  console.log("HTTP security smoke test passed for /, /login, /privacy, and /auth/callback.");
} finally {
  if (child.exitCode === null) child.kill();
}


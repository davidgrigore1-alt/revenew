import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardUrl = new URL("../src/app/(protected)/dashboard/page.tsx", import.meta.url);

test("dashboard preserves Next redirects instead of reporting them as workspace failures", async () => {
  const dashboard = await readFile(dashboardUrl, "utf8");
  const catchIndex = dashboard.indexOf("} catch (error) {");
  const redirectIndex = dashboard.indexOf("if (isRedirectError(error)) throw error;", catchIndex);
  const fallbackIndex = dashboard.indexOf("Dashboard revenue workspace error", catchIndex);

  assert.match(dashboard, /import \{ isRedirectError \} from "next\/dist\/client\/components\/redirect-error";/);
  assert.ok(catchIndex >= 0, "dashboard should retain its guarded fallback");
  assert.ok(redirectIndex > catchIndex, "redirect errors must be rethrown from the fallback boundary");
  assert.ok(fallbackIndex > redirectIndex, "redirect errors must be rethrown before generic error reporting");
});

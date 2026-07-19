import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { createLocalAdminClient, runLocalSql } from "./local-supabase.mjs";
import { DEMO } from "./fixtures.mjs";

async function resetDemoOnly() {
  runLocalSql(`delete from public.businesses where id = '${DEMO.businessId}';`);
  console.log("Datele marcate pentru workspace-ul demo local au fost eliminate. Contul local a fost păstrat.");
}

function fullReset() {
  createLocalAdminClient();
  const entrypoint = join(process.cwd(), "node_modules", "supabase", "dist", "supabase.js");
  const result = spawnSync(process.execPath, [entrypoint, "db", "reset"], { cwd: process.cwd(), stdio: "inherit", windowsHide: true });
  if (result.status !== 0) throw new Error("Resetarea completă Supabase a eșuat.");
}

(async () => {
  if (process.argv.includes("--full")) fullReset();
  else await resetDemoOnly();
})().catch((error) => {
  console.error(`Reset demo eșuat: ${error.message}`);
  process.exitCode = 1;
});

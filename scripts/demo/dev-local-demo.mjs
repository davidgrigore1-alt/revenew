import { runWithLocalEnvironment } from "./local-supabase.mjs";

const npmExecutable = process.env.npm_execpath;
if (!npmExecutable) throw new Error("Rulează launcher-ul prin `npm run demo:dev`.");
runWithLocalEnvironment(process.execPath, [npmExecutable, "run", "dev", "--", ...process.argv.slice(2)]);

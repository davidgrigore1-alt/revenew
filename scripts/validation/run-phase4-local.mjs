// Existing local Supabase only; disables external sending and paid OpenAI calls.
import {runWithLocalEnvironment} from '../demo/local-supabase.mjs';
const mode=process.argv[2];
if(!['build','start'].includes(mode))throw new Error('Use: node scripts/validation/run-phase4-local.mjs build|start');
runWithLocalEnvironment(process.execPath,['node_modules/next/dist/bin/next',mode,...(mode==='start'?['--hostname','localhost','--port','3001']:[])]);

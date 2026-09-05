import "server-only";
import { setTimeout, clearTimeout } from "node:timers";

/** A slow read cannot hold up independent evidence. Read adapters have no writes. */
export async function withinIntelligenceReadBudget<T>(read:()=>Promise<T>,signal?:AbortSignal,milliseconds=12000):Promise<T> {
  if(signal?.aborted)throw new Error("analysis_cancelled");
  let timer:ReturnType<typeof setTimeout>|undefined;
  let cancel:()=>void=()=>{};
  try {
    return await Promise.race([read(),new Promise<T>((_,reject)=>{
      timer=setTimeout(()=>reject(new Error("source_read_timeout")),milliseconds);
      cancel=()=>reject(new Error("analysis_cancelled"));
      signal?.addEventListener("abort",cancel,{once:true});
    })]);
  } finally {if(timer)clearTimeout(timer);signal?.removeEventListener("abort",cancel);}
}

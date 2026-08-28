export type VisualCase = {id:string;value:number|null;currency:string;deadline:string|null;overdue:boolean;severity:"critical"|"attention"|"informative"};
export function buildControlCenterVisuals(cases:VisualCase[]) {
 const unique=Array.from(new Map(cases.map(item=>[item.id,item])).values());
 const currencies=Array.from(new Set(unique.filter(item=>item.value!==null&&Number.isFinite(item.value)).map(item=>item.currency))).sort();
 const exposure=currencies.map(currency=>{
  const points=new Map<string,number>(); let undated=0, undatedCount=0, unknownCount=0;
  for(const item of unique.filter(item=>item.currency===currency)){
   if(item.value===null||!Number.isFinite(item.value)){unknownCount++;continue;}
   const date=item.deadline&&Number.isFinite(Date.parse(item.deadline))?item.deadline.slice(0,10):null;
   if(!date){undated+=item.value;undatedCount++;continue;}
   points.set(date,(points.get(date)??0)+item.value);
  }
  let cumulative=0;
  return {currency,undated,undatedCount,unknownCount,points:Array.from(points).sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value,cumulative:cumulative+=value}))};
 });
 return {exposure, unknownCount:unique.filter(item=>item.value===null||!Number.isFinite(item.value)).length,
 distribution:[
  {label:"Restante",count:unique.filter(item=>item.overdue).length,tone:"danger"},
  {label:"Necesită atenție",count:unique.filter(item=>!item.overdue&&item.severity!=="informative").length,tone:"warning"},
  {label:"De urmărit",count:unique.filter(item=>!item.overdue&&item.severity==="informative").length,tone:"neutral"}
 ],count:unique.length};
}

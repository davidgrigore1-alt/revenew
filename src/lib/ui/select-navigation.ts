export function nextSelectOption(choices:readonly {disabled:boolean}[], current:number, key:string):number {
 const enabled=choices.map((choice,index)=>choice.disabled?-1:index).filter(index=>index>=0);
 if(!enabled.length)return -1;
 if(key==="Home")return enabled[0];
 if(key==="End")return enabled[enabled.length-1];
 const position=enabled.indexOf(current);
 if(position<0)return key==="ArrowUp"?enabled[enabled.length-1]:enabled[0];
 return enabled[Math.max(0,Math.min(enabled.length-1,position+(key==="ArrowUp"?-1:1)))];
}

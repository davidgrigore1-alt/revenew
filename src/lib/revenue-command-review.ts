import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
export type ReviewTicket={businessId:string;actorId:string;scope:"business"|"owned";through:string;requestId:string};
export function signReviewTicket(ticket:ReviewTicket,secret:string){
 if(!secret)throw new Error("review_signing_unavailable");
 const payload=Buffer.from(JSON.stringify(ticket)).toString("base64url");
 return payload+"."+createHmac("sha256",secret).update("revenew.executive-review.v1:"+payload).digest("base64url");
}
export function verifyReviewTicket(token:string,secret:string,actor:{businessId:string;actorId:string;scope:string},now=new Date()):ReviewTicket{
 if(!secret||typeof token!=="string"||token.length>2000)throw new Error("review_invalid");
 const [payload,signature,...extra]=token.split(".");
 const expected=createHmac("sha256",secret).update("revenew.executive-review.v1:"+payload).digest();
 const supplied=Buffer.from(signature??"","base64url");
 if(extra.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error("review_invalid");
 const ticket=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as ReviewTicket;
 if(ticket.businessId!==actor.businessId||ticket.actorId!==actor.actorId||ticket.scope!==actor.scope||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.requestId))throw new Error("review_forbidden");
 const age=now.getTime()-Date.parse(ticket.through);
 if(!Number.isFinite(age)||age<0||age>30*60*1000)throw new Error("review_expired");
 return ticket;
}

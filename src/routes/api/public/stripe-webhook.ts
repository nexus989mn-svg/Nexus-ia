import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { emitOperationalEvent } from "@/lib/ops.server";

function verifyStripeSignature(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(",").map(x => x.split("=",2) as [string,string]));
  if (!parts.t || !parts.v1) return false;
  const age = Math.abs(Math.floor(Date.now()/1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = createHmac("sha256",secret).update(`${parts.t}.${raw}`).digest("hex");
  const a=Buffer.from(expected,"hex"), b=Buffer.from(parts.v1,"hex");
  return a.length===b.length && timingSafeEqual(a,b);
}

async function stripeGet(path:string) {
  const key=process.env.STRIPE_SECRET_KEY?.trim();
  if(!key) throw new Error("Stripe não configurado.");
  const auth=Buffer.from(`${key}:`).toString("base64");
  const r=await fetch(`https://api.stripe.com/v1/${path}`,{headers:{Authorization:`Basic ${auth}`}});
  const body:any=await r.json().catch(()=>null);
  if(!r.ok) throw new Error(body?.error?.message||`Stripe HTTP ${r.status}`);
  return body;
}

export const Route=createFileRoute("/api/public/stripe-webhook")({server:{handlers:{POST:async({request})=>{
  const secret=process.env.STRIPE_WEBHOOK_SECRET?.trim(); const signature=request.headers.get("stripe-signature");
  if(!secret) return new Response("Webhook não configurado.",{status:503});
  if(!signature) return new Response("Missing signature",{status:400});
  const raw=await request.text(); if(!verifyStripeSignature(raw,signature,secret)) return new Response("Invalid signature",{status:400});
  let event:any; try{event=JSON.parse(raw)}catch{return new Response("Invalid JSON",{status:400})}
  const {data:existing}=await supabaseAdmin.from("billing_events").select("id").eq("external_event_id",event.id).maybeSingle();
  if(existing) return new Response("ok",{status:200});
  await supabaseAdmin.from("billing_events").insert({provider:"stripe",external_event_id:event.id,event_type:event.type,user_id:null,payload:event});
  try{
    const obj=event.data?.object||{};
    if(event.type==="checkout.session.completed"){
      const userId=obj.metadata?.user_id||obj.client_reference_id; const planCode=obj.metadata?.plan_code;
      if(userId && obj.mode==="subscription" && obj.payment_status==="paid"){
        const sub=await stripeGet(`subscriptions/${encodeURIComponent(obj.subscription)}`);
        const {data:plan}=await supabaseAdmin.from("plans").select("id").eq("code",planCode).maybeSingle();
        await supabaseAdmin.from("subscriptions").upsert({user_id:userId,plan_id:plan?.id??null,status:"active",current_period_start:new Date((sub.current_period_start||Math.floor(Date.now()/1000))*1000).toISOString(),current_period_end:new Date((sub.current_period_end||Math.floor(Date.now()/1000))*1000).toISOString(),stripe_customer_id:obj.customer,stripe_subscription_id:obj.subscription,cancel_at_period_end:!!sub.cancel_at_period_end,blocked_reason:null},{onConflict:"user_id"});
        await emitOperationalEvent({eventType:"PAYMENT_CONFIRMED",severity:"info",userId,payload:{plan:planCode,session_id:obj.id}});
      }
    } else if(event.type==="invoice.paid") {
      const customer=obj.customer; const subId=obj.subscription; const sub=await stripeGet(`subscriptions/${encodeURIComponent(subId)}`);
      const {data:row}=await supabaseAdmin.from("subscriptions").select("user_id,plan_id").eq("stripe_subscription_id",subId).maybeSingle();
      if(row?.user_id) {
        await supabaseAdmin.from("subscriptions").update({status:"active",current_period_start:new Date(sub.current_period_start*1000).toISOString(),current_period_end:new Date(sub.current_period_end*1000).toISOString(),stripe_customer_id:customer,cancel_at_period_end:!!sub.cancel_at_period_end,blocked_reason:null}).eq("user_id",row.user_id);
        await emitOperationalEvent({eventType:"PAYMENT_CONFIRMED",severity:"info",userId:row.user_id,payload:{invoice_id:obj.id}});
      }
    } else if(event.type==="invoice.payment_failed") {
      const subId=obj.subscription; const {data:row}=await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_subscription_id",subId).maybeSingle();
      if(row?.user_id){await supabaseAdmin.from("subscriptions").update({status:"blocked",blocked_reason:"Pagamento Stripe falhou"}).eq("user_id",row.user_id); await emitOperationalEvent({eventType:"PAYMENT_FAILED",severity:"error",userId:row.user_id,payload:{invoice_id:obj.id}});}
    } else if(event.type==="customer.subscription.deleted" || event.type==="customer.subscription.updated") {
      const subId=obj.id; const {data:row}=await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_subscription_id",subId).maybeSingle();
      if(row?.user_id){const active=["active","trial"].includes(obj.status); await supabaseAdmin.from("subscriptions").update({status:active?"active":"canceled",current_period_start:obj.current_period_start?new Date(obj.current_period_start*1000).toISOString():null,current_period_end:obj.current_period_end?new Date(obj.current_period_end*1000).toISOString():null,cancel_at_period_end:!!obj.cancel_at_period_end,blocked_reason:active?null:`Stripe status: ${obj.status}`}).eq("user_id",row.user_id); await emitOperationalEvent({eventType:active?"SUBSCRIPTION_NORMALIZED":"SUBSCRIPTION_BLOCKED",severity:active?"info":"warning",userId:row.user_id,payload:{stripe_status:obj.status}});}
    }
    await supabaseAdmin.from("billing_events").update({processed_at:new Date().toISOString()}).eq("external_event_id",event.id);
    return new Response("ok",{status:200});
  }catch(error){console.error("[stripe-webhook]",error); await emitOperationalEvent({eventType:"BILLING_WEBHOOK_ERROR",severity:"critical",payload:{event_id:event.id,error:error instanceof Error?error.message:String(error)}}); return new Response("Webhook processing failed",{status:500});}
}}}});

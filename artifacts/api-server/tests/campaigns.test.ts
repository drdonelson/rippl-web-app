import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
const state:any={practices:{volvo:{id:'volvo',name:'Volvo',twilio_phone_number:'+18885496615'},hallmark:{id:'hallmark',name:'Hallmark',twilio_phone_number:'+18555027538'},unconfigured:{id:'unconfigured'}},messages:[],clientPractices:[],inserts:[],queries:[],rows:[]};
state.db={execute:async(query:any)=>{state.queries.push(new PgDialect().sqlToQuery(query));return {rows:state.rows}},insert:()=>({values:(v:any)=>{state.inserts.push(v);return {returning:async()=>[{id:'campaign'}]}}}),update:()=>({set:()=>({where:async()=>{}})})};
(globalThis as any).fixture=state;
const {default:router}=await import('../src/routes/campaigns');
async function call(path:string,body:any,actor:any={role:'super_admin',practice_id:'hallmark',id:'admin'}){
 const layer=(router as any).stack.find((l:any)=>l.route?.path===path);let status=200,payload:any;
 await layer.route.stack[0].handle({body,authUser:actor,log:{error(){}}},{status(n:number){status=n;return this},json(v:any){payload=v}});
 await new Promise(resolve=>setImmediate(resolve));return {status,payload};
}
const message={name:'Volvo welcome',channel:'sms',filter:'not_contacted',message_template:'Hello {{first_name}}',practice_id:'volvo'};
test('campaign selects Volvo sender and tenant even when super-admin belongs to Hallmark',async()=>{
 state.rows=[{id:'buyer',name:'Buyer',phone:'+15555550100',referral_code:'BUYER',office_id:null}];
 const result=await call('/send',message);assert.equal(result.status,200);
 assert.equal(state.inserts.at(-1).practice_id,'volvo');assert.equal(state.clientPractices.at(-1),'volvo');assert.equal(state.messages.at(-1).from,'+18885496615');
 const query=state.queries.at(-1);assert.match(query.sql,/r\.practice_id/);assert.ok(query.params.includes('volvo'));assert.match(query.sql,/sms_opt_out_permanent IS NOT TRUE/);
});
test('unconfigured practice refuses SMS before creating a campaign',async()=>{const before=state.inserts.length;const result=await call('/send',{...message,practice_id:'unconfigured'});assert.equal(result.status,409);assert.equal(state.inserts.length,before)});
test('practice admin cannot select another tenant',async()=>{await call('/count',{filter:'not_contacted',practice_id:'volvo'},{role:'practice_admin',practice_id:'hallmark'});assert.ok(state.queries.at(-1).params.includes('hallmark'));assert.ok(!state.queries.at(-1).params.includes('volvo'))});
test('unscoped super-admin must select a practice',async()=>{const result=await call('/send',{...message,practice_id:undefined},{role:'super_admin',id:'admin'});assert.equal(result.status,400)});
test('preview includes customers without offices using their own practice ownership',async()=>{await call('/count',{filter:'not_contacted',practice_id:'volvo'});const query=state.queries.at(-1);assert.match(query.sql,/LEFT JOIN offices/);assert.match(query.sql,/r\.practice_id/);assert.ok(query.params.includes('volvo'))});

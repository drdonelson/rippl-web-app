import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('tmp/campaign-tests', { recursive: true });
await build({entryPoints:['tests/campaigns.test.ts'],outfile:'tmp/campaign-tests/test.mjs',bundle:true,platform:'node',format:'esm',external:['express','drizzle-orm','drizzle-orm/*'],plugins:[{name:'isolated-campaign-dependencies',setup(b){
 b.onResolve({filter:/^(?:@workspace\/db(?:\/schema)?|\.\.\/lib\/(?:practiceConfig|smsEnabled|email|logger))$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents: a.path==='@workspace/db'?'export const db=globalThis.fixture.db;':a.path.endsWith('/schema')?'export const referrersTable={id:"id"}; export const campaignsTable={practice_id:"practice_id",created_at:"created_at"};':a.path.endsWith('practiceConfig')?'export const getPracticeConfig=async id=>globalThis.fixture.practices[id]??null; export const resolveTwilioPhone=p=>p.twilio_phone_number??""; export const resolveTwilioClient=p=>{globalThis.fixture.clientPractices.push(p.id); return {messages:{create:async message=>globalThis.fixture.messages.push(message)}}};':a.path.endsWith('smsEnabled')?'export const SMS_ENABLED=true;':a.path.endsWith('email')?'export const sendEmail=async()=>{};':'export const logger={info(){},error(){}};',loader:'js'}));
}}]});
const result=spawnSync(process.execPath,['--test','tmp/campaign-tests/test.mjs'],{stdio:'inherit'});process.exitCode=result.status??1;

import test from "node:test";
import assert from "node:assert/strict";
import {parseCsv,selectLatestBatch,validateStoreRows} from "../src/services/driveCentricFiles";
const now=Date.parse("2026-10-11T18:00:00Z");
const batch=(store="3364",stamp="202610110730",range="2026-10-10_2026-10-10") => ["deal","customer","customercontact","sourcedescriptiongroup","storeinfo"].map(t=>({name:`${store}_v2_${t}_${range}_${stamp}.csv`,type:"-"}));
test("parses BOM, CRLF, quoted commas, escaped quotes and multiline notes",()=>{
 assert.deepEqual(parseCsv('\uFEFF"Id","Notes","Empty"\r\n"1","Hello, ""Sam""\r\nnext line",""\r\n'),[{Id:"1",Notes:'Hello, "Sam"\r\nnext line',Empty:""}]);
});
test("refuses malformed CSV rather than misaligning identities",()=>{
 assert.throws(()=>parseCsv('A,B\n1,2,3'),/width/);
 assert.throws(()=>parseCsv('A,B\n1,"unfinished'),/Unterminated/);
});
test("keeps store scope in a mixed directory",()=>{
 const result=selectLatestBatch([...batch(),...batch("3367")],"/exports/","3364",now);
 assert.match(result.deal,/\/exports\/3364_v2_deal/);
 assert.match(result.storeInfo,/3364_v2_storeinfo/);
});
test("reports wrong-store files distinctly from empty directories",()=>{
 assert.throws(()=>selectLatestBatch(batch("3367"),"/exports","3364",now),/expected store 3364; observed stores: 3367/);
});
test("rejects stale July data even if a successful download is possible",()=>{
 assert.throws(()=>selectLatestBatch(batch("3364","202607310733","2026-07-30_2026-07-30"),"/exports","3364",now),/Stale export/);
});
test("sorts by export timestamp rather than reporting-period start",()=>{
 const files=[...batch("3364","202610100730","2026-10-09_2026-10-09"),...batch("3364","202610110730","2026-10-01_2026-10-10")];
 assert.match(selectLatestBatch(files,"/exports","3364",now).deal,/202610110730/);
});
test("refuses partial latest batch and mismatched companion reporting periods",()=>{
 assert.throws(()=>selectLatestBatch([...batch("3364","202610100730"),batch()[0]],"/exports","3364",now),/Incomplete/);
 const files=batch();files[1].name=files[1].name.replace('2026-10-10_2026-10-10','2026-10-09_2026-10-10');
 assert.throws(()=>selectLatestBatch(files,"/exports","3364",now),/customer/);
});
test("requires expected dealership ID and validates all table rows before writes",()=>{
 const info=[{StoreId:"volvo",Name:"Volvo"}];
 validateStoreRows("volvo",info,{deal:[{StoreId:"volvo"}],sourceGroup:[]});
 assert.throws(()=>validateStoreRows("carlock",info,{}),/StoreInfo/);
 assert.throws(()=>validateStoreRows("volvo",info,{customer:[{StoreId:"carlock"}]}),/customer/);
 assert.throws(()=>validateStoreRows("",info,{}),/sftp_store_id/);
});

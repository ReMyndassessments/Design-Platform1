import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { PARENT_LITERACY_METADATA as meta } from "../src/lib/chineseLiteracyParent.js";
import { emptyLiteracyInput } from "../src/lib/chineseLiteracy.js";

// Opt-in, development-only synthetic fixtures. Never target production.
const f = JSON.parse(await readFile("/tmp/raos-clp-credentials.json","utf8"));
const base = "http://127.0.0.1:8080/api";
let token="", checks=0;
async function req(path:string,method="GET",body?:unknown,staff=true,status=200) {
  const res=await fetch(base+path,{method,headers:{"Content-Type":"application/json",...(staff&&token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json(); assert.equal(res.status,status,`${method} ${path.replace(/\/external\/form\/[^/]+/,"/external/form/[synthetic]")}: ${JSON.stringify(data).slice(0,250)}`);checks++;return data;
}
token=(await req("/users/login","POST",{email:f.email,password:f.password},false)).token;
assert(token);
const m=(await req(`/chinese-literacy/metadata?instrument=${meta.key}`,"GET",undefined,false)).metadata;
assert.equal(m.domains.flatMap((d:any)=>d.items).length,78); assert.equal(m.respondent,"parent");
await req(`/cases/${f.caseId}/chinese-literacy`,"GET",undefined,false,401);
await req(`/cases/${f.caseId}/assignments`,"POST",{toolId:meta.key,toolName:meta.name,respondentType:"teacher1"},true,422);
const assign=(toolId:string,type:string,label:string,email:string)=>req(`/cases/${f.caseId}/assignments`,"POST",{toolId,toolName:meta.name,respondentType:type,respondentLabel:label,assignedToName:`SYNTHETIC ${label}`,assignedToEmail:email},true,201);
const teacher=await assign("REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION","teacher1","Teacher","qa-teacher@example.invalid");
const p=await assign(meta.key,"parent","Parent one","qa-parent-one@example.invalid");
const p2=await assign(meta.key,"parent","Parent two","qa-parent-two@example.invalid");
const ui=await assign(meta.key,"parent","UI Parent","qa-parent-ui@example.invalid");
const path=`/external/form/${p.uniqueToken}/chinese-literacy`;
function inputFor(selected=meta.domains.map(d=>d.id),reading=false) {
  const input=emptyLiteracyInput("6");
  input.context=Object.fromEntries(["relationship","contactFrequency","setting","homeLanguages","activities","observationLanguage","reason","strengths","currentSupports","exposureHistory","accessInformation","unknownInformation","schoolFeedback","schoolFeedbackSource","participationImpact","questions"].map(k=>[k,"Unknown: this is a synthetic home-observation fixture."]));
  Object.assign(input.context,{grade:"6",relationship:"Parent",contactFrequency:"Daily",setting:"Home shared reading",homeLanguages:"Mandarin and English",activities:"Ordinary shared reading and homework",observationLanguage:"Mandarin",
    observationStart:"2026-09-01",observationEnd:"2026-10-01",completionDate:"2026-10-02",confirmationDate:"2026-10-02",parentConfirmed:"yes",script:"simplified",spokenVariety:"mandarin",readingConfidence:"some_limits",writingConfidence:"some_limits",assistanceMode:"independent"});
  for(const d of meta.domains.filter(d=>selected.includes(d.id))) {input.sections[d.id]={decision:reading&&d.id==="R"?"complete":"not_observed"};input.responses.push(...d.items.map((i,n)=>reading&&d.id==="R"&&n<8?{itemId:i.id,status:"rated" as const,value:n<5?4:3}:{itemId:i.id,status:"not_observed" as const,value:null}));}
  if(reading)input.evidence.R={examples:[{text:"Synthetic home reading example only.",itemIds:["P-R1","P-R2","P-R3","P-R4","P-R5"]}],strengths:"Understands shared reading",supports:"Ordinary read aloud",impact:2,setting:"Home shared reading",language:"Mandarin"};
  input.summary={strengths:"Unknown: limited reliable home observations.",barriers:"Unknown: synthetic test only.",supportResponse:"Unknown: usual supports not observed.",discussion:"Discuss access to home shared reading.",priorities:[]};
  return input;
}
let a=(await req(path,"GET",undefined,false)).administration;
assert.equal(a.input.responses.length,0);assert.equal(a.scoringVersion,meta.scoringVersion);
await req(path,"PUT",{revision:a.revision,scoringVersion:"wrong",input:inputFor()},false,409);
const draft=inputFor();draft.sections.R={decision:"complete"};draft.responses=draft.responses.map(r=>r.itemId==="P-R1"?{itemId:r.itemId,status:"not_applicable",value:null,reason:""}:r);
a=(await req(path,"PUT",{revision:a.revision,input:draft},false)).administration;assert.equal(a.input.responses[0].reason,"");
await req(path+"/submit","POST",{revision:a.revision,input:draft},false,422);
await req(path,"PUT",{revision:0,input:draft},false,409);
await req(`/external/form/${p.uniqueToken}/submit`,"POST",{answers:{"P-R1":4}},false,409);
const input=inputFor(undefined,true), baseRevision=a.revision;
a=(await req(path+"/submit","POST",{revision:baseRevision,input},false)).administration;
const reading=a.scores.find((s:any)=>s.id==="R");assert.equal(reading.mean,3.625);assert.equal(reading.displayMean,"3.6");assert.equal(reading.frequentDifficultyCount,5);
assert(!a.report&&!a.plan&&a.history.length===0&&!a.baselineSnapshot);
assert.equal((await req(path+"/submit","POST",{revision:baseRevision,input},false)).administration.revision,a.revision);
assert.equal((await req(`/external/form/${p2.uniqueToken}/chinese-literacy`,"GET",undefined,false)).administration.input.responses.length,0);
let family=await req(`/cases/${f.caseId}/chinese-literacy`);
assert.equal(family.administrations.find((d:any)=>d.assignmentId===teacher.id).status,"not_started");
assert.equal((await req(`/cases/${f.caseId}/scores`)).length,0);
await req(`/cases/${f.caseId}/scores/manual`,"POST",{toolId:meta.key,toolName:meta.name,respondentType:"parent",rawScore:5,domainScores:{R:5}},true,409);
const action=`/cases/${f.caseId}/chinese-literacy/${p.id}/action`;
await req(`/cases/${f.otherCaseId}/chinese-literacy/${p.id}/action`,"POST",{action:"review",revision:a.revision},true,404);
await req(`/cases/${f.caseId}/chinese-literacy/${p.id}/export`,"GET",undefined,false,401);
await req("/external/form/not-an-assignment/chinese-literacy","GET",undefined,false,404);
a=(await req(action,"POST",{action:"report",revision:a.revision,report:{narrative:"Synthetic professional description of the parent's home observations. No diagnosis."}})).administration;
assert.equal(a.report.classroomObservationsAvailable,false);
await req(action,"POST",{action:"approve",revision:a.revision-1},true,409);
const approvedBase=a.revision;a=(await req(action,"POST",{action:"approve",revision:approvedBase})).administration;
assert.equal((await req(action,"POST",{action:"approve",revision:approvedBase})).administration.revision,a.revision);
a=(await req(action,"POST",{action:"plan",revision:a.revision,plan:{rationale:"A synthetic agreed access support, not an automatic prescription.",pathway:"additional_information_needed",priorities:[{text:"Discuss shared reading access",itemIds:["P-R1"],strategyId:"reading-access",owner:"SYNTHETIC responsible adult",indicator:"Actual participation note after shared reading",reviewDate:"2026-11-01"}]}})).administration;
a=(await req(action,"POST",{action:"monitor",revision:a.revision,entry:{date:"2026-10-02",supportDelivered:"Shared reading access",participation:"Joined ordinary home reading",note:"Synthetic monitoring"}})).administration;
const follow=await req(action,"POST",{action:"followup",revision:a.revision,domains:["R"]});
assert.equal((await req(action,"POST",{action:"followup",revision:a.revision,domains:["R"]})).assignmentId,follow.assignmentId);
family=await req(`/cases/${f.caseId}/chinese-literacy`);const followDoc=family.administrations.find((d:any)=>d.assignmentId===follow.assignmentId);
assert.equal(followDoc.metadata.key,meta.key);assert.equal(followDoc.input.context.parentConfirmed,"");
const assignmentList=await req(`/cases/${f.caseId}/assignments`),fa=assignmentList.find((x:any)=>x.id===follow.assignmentId);
const fp=`/external/form/${fa.uniqueToken}/chinese-literacy`;const fs=(await req(fp+"/submit","POST",{revision:0,input:inputFor(["R"],true)},false)).administration;
assert(fs.scores.filter((s:any)=>s.id!=="R").every((s:any)=>s.status==="not_administered"));
for(const format of ["html","doc"]) { const r=await fetch(base+`/cases/${f.caseId}/chinese-literacy/${p.id}/export?format=${format}`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(r.status,200);const html=await r.text();assert(html.includes("Parent-reported observations in the home setting"));assert(html.includes(meta.reportLimitation));assert(html.includes("P-R1"));checks++; }
const paper=inputFor();Object.assign(paper.context,{assistanceMode:"paper",assistantIdentity:"SYNTHETIC staff",assistantLanguage:"English",staffSourceConfirmed:"yes"});
await req(`/external/form/${p2.uniqueToken}/chinese-literacy/submit`,"POST",{revision:0,input:paper},false,403);
const paperDoc=(await req(`/external/form/${p2.uniqueToken}/chinese-literacy/submit`,"POST",{revision:0,input:paper})).administration;assert.equal(paperDoc.status,"submitted");
const uiInput=inputFor();uiInput.responses=[];uiInput.sections={};uiInput.evidence={};
await req(`/external/form/${ui.uniqueToken}/chinese-literacy`,"PUT",{revision:0,input:uiInput},false);
await writeFile("/tmp/raos-clp-qa.json",JSON.stringify({caseId:f.caseId,uiAssignmentId:ui.id,uiLink:`/external/${ui.uniqueToken}`,teacherId:teacher.id,parentId:p.id,adminToken:token,credentialsPath:"/tmp/raos-clp-credentials.json"}),{mode:0o600});
console.log(`PASS: ${checks} parent API checks, with teacher/second-parent independence, privacy, conflicts, approvals, exports, follow-ups and assisted entry.`);

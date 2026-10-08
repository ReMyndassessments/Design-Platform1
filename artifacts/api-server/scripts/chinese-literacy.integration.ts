import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { LITERACY_DOMAINS, LITERACY_METADATA, emptyLiteracyInput } from "../src/lib/chineseLiteracy.ts";

// Explicit opt-in development-only QA. Credentials and the synthetic case are
// prepared outside the repository; never run this against production.
const fixture = JSON.parse(await readFile("/tmp/raos-cl-qa-credentials.json", "utf8"));
const base = "http://127.0.0.1:8080/api";
let token = "", checks = 0;
async function request(path: string, method = "GET", body?: unknown, authenticated = true, expected = 200) {
  const r = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(authenticated && token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text();
  let result: any;
  try { result = JSON.parse(text); } catch { throw new Error(`${method} ${path.replace(/\/external\/form\/[^/]+/, "/external/form/[token]")} returned HTTP ${r.status} ${r.headers.get("content-type")} instead of JSON.`); }
  assert.equal(r.status, expected, `${method} ${path.replace(/\/external\/form\/[^/]+/, "/external/form/[token]")}: ${JSON.stringify(result).slice(0,400)}`);
  checks++;
  return result;
}
const auth = await request("/users/login", "POST", { email: fixture.email, password: fixture.password }, false);
assert(auth.token); token = auth.token;
const metadata = (await request("/chinese-literacy/metadata", "GET", undefined, false)).metadata;
assert.equal(metadata.domains.flatMap((d: any) => d.items).length, 78);
assert.equal(metadata.anchors.length, 7);
await request(`/cases/${fixture.caseId}/chinese-literacy`, "GET", undefined, false, 401);
await request(`/cases/${fixture.caseId}/assignments`, "POST", { toolId: metadata.key, toolName: metadata.name, respondentType: "parent" }, true, 422);
async function assign(type = "teacher1", email = "synthetic-cl-teacher@example.invalid") {
  return request(`/cases/${fixture.caseId}/assignments`, "POST", { toolId: metadata.key, toolName: metadata.name,
    respondentType: type, respondentLabel: `Teacher assessment package ${type === "teacher2" ? "2" : "1"}`,
    assignedToName: "SYNTHETIC Chinese teacher", assignedToEmail: email }, true, 201);
}
function inputFor(domains = LITERACY_DOMAINS.map(d => d.id)) {
  const input = emptyLiteracyInput("6");
  input.context = { grade: 6, teacherRole: "Chinese teacher", contactFrequency: "Daily", setting: "Classroom", timeTeaching: "Six months",
    observationStart: "2026-09-01", observationEnd: "2026-10-01", script: "simplified", spokenVariety: "mandarin", instruction: "main curriculum",
    observationLanguage: "Mandarin", exposureHistory: "Not known: previous records unavailable.", curriculum: "Classroom text instruction",
    reason: "Synthetic QA only", strengths: "Not yet observed: limited opportunities.", currentSupports: "Accessible text",
    accessInformation: "Usual classroom access", unknownInformation: "Not known: prior teaching records unavailable." };
  for (const d of LITERACY_DOMAINS.filter(d=>domains.includes(d.id))) {
    input.sections[d.id]={decision:"not_observed"};
    input.responses.push(...d.items.map(i=>({itemId:i.id,status:"not_observed" as const,value:null})));
  }
  input.summary={strengths:"Not yet observed: limited opportunities.",barriers:"Not known: more classroom observation opportunities are needed.",supportResponse:"Not yet observed: supports recently started.",discussion:"Synthetic professional review only",priorities:[]};
  return input;
}
const assignment = await assign();
const path = `/external/form/${assignment.uniqueToken}/chinese-literacy`;
let a = (await request(path, "GET", undefined, false)).administration;
assert.equal(a.revision, 0); assert.equal(a.instrumentVersion, "0.1.0");
assert.equal(a.input.responses.length, 0); assert.equal(a.selectedDomains.length, 13);
const input = inputFor();
a = (await request(path, "PUT", { revision: a.revision, input }, false)).administration;
await request(path, "PUT", {revision:0,input}, false, 409);
await request(`/external/form/${assignment.uniqueToken}/submit`, "POST", {answers:{"R1":5}}, false, 409);
const submitted = (await request(path+"/submit", "POST", {revision:a.revision,input}, false)).administration;
assert.equal(submitted.status,"submitted"); assert.equal(submitted.evidenceStatus,"Additional information needed");
const replay = (await request(path+"/submit", "POST", {revision:a.revision,input}, false)).administration;
assert.equal(replay.revision,submitted.revision); a=submitted;
assert.equal((await request(`/cases/${fixture.caseId}/scores`)).length,0);
await request(`/cases/${fixture.caseId}/scores/manual`,"POST",{toolId:metadata.key,toolName:metadata.name,respondentType:"teacher1",rawScore:5,domainScores:{R:5}},true,409);
const actionPath = `/cases/${fixture.caseId}/chinese-literacy/${assignment.id}/action`;
const reportRequest={action:"report",revision:a.revision,report:{narrative:"Synthetic QA teacher-only developmental observation. More observation information is required; no diagnostic inference is made."}};
a=(await request(actionPath,"POST",reportRequest)).administration;
assert.equal((await request(actionPath,"POST",reportRequest)).administration.revision,a.revision);
const publicDraft=(await request(path,"GET",undefined,false)).administration;
assert.equal(publicDraft.report,null); assert.equal(publicDraft.plan,null); assert(!("baselineSnapshot" in publicDraft));
await request(actionPath,"POST",{action:"approve",revision:a.revision-1},true,409);
a=(await request(actionPath,"POST",{action:"approve",revision:a.revision})).administration;
assert.equal(a.status,"approved");
const approvedRevision=a.revision;
const prior={text:"Record accessible reading opportunities for R1",itemIds:["R1"],strategyId:LITERACY_METADATA.strategies[0].id,owner:"SYNTHETIC Chinese teacher",indicator:"Classroom opportunities and delivery recorded",reviewDate:"2026-11-19"};
a=(await request(actionPath,"POST",{action:"plan",revision:a.revision,plan:{pathway:"additional_information_needed",rationale:"Professional agreement to gather context and provide access support without delaying assistance.",priorities:[prior]}})).administration;
assert(a.plan.approvedAt);
a=(await request(actionPath,"POST",{action:"monitor",revision:a.revision,entry:{date:"2026-10-08",supportDelivered:"Accessible text provided",participation:"Participated in a classroom opportunity",note:"Synthetic delivery check"}})).administration;
assert.equal(a.monitoring.entries.length,1);
const followupReq={action:"followup",revision:a.revision,domains:["R"]};
const followup=await request(actionPath,"POST",followupReq);
assert.equal((await request(actionPath,"POST",followupReq)).assignmentId,followup.assignmentId);
const rows=await request(`/cases/${fixture.caseId}/assignments`);
const followupAssignment=rows.find((row:any)=>row.id===followup.assignmentId);
assert(followupAssignment);
const followPath=`/external/form/${followupAssignment.uniqueToken}/chinese-literacy`;
let f=(await request(followPath,"GET",undefined,false)).administration;
assert.deepEqual(f.selectedDomains,["R"]); assert(!("baselineSnapshot" in f));
f=(await request(followPath+"/submit","POST",{revision:f.revision,input:inputFor(["R"])},false)).administration;
assert(f.scores.filter((s:any)=>s.id!=="R").every((s:any)=>s.status==="not_administered"));
for(const format of ["html","doc"]){
  const exported=await fetch(base+`/cases/${fixture.caseId}/chinese-literacy/${assignment.id}/export?format=${format}`,{headers:{Authorization:`Bearer ${token}`}});
  assert.equal(exported.status,200); const text=await exported.text();
  assert(text.includes(metadata.reportLimitation)); assert(text.includes("No total, norm or risk")); checks++;
}
await request(path,"PUT",{revision:a.revision,input},false,409);
a=(await request(actionPath,"POST",{action:"return",revision:a.revision,reason:"Synthetic revision-history test."})).administration;
assert.equal(a.status,"returned");
const staff=await request(`/cases/${fixture.caseId}/chinese-literacy`);
const original=staff.administrations.find((d:any)=>d.assignmentId===assignment.id);
assert(original.history.some((d:any)=>d.revision===approvedRevision && d.status==="approved"));
const followed=staff.administrations.find((d:any)=>d.assignmentId===followup.assignmentId);
assert(followed.baselineSnapshot.status==="approved"); assert(followed.baselineSnapshot.report.narrative);
const uiAssignment=await assign("teacher1","synthetic-ui-teacher@example.invalid");
const optional=await assign("teacher2","synthetic-optional-teacher@example.invalid");
assert(optional.id !== assignment.id);
await writeFile("/tmp/raos-cl-qa.json",JSON.stringify({caseId:fixture.caseId,assignmentId:uiAssignment.id,token:uiAssignment.uniqueToken,teacherLink:`/external/${uiAssignment.uniqueToken}`,credentialsPath:"/tmp/raos-cl-qa-credentials.json",adminToken:token,assignmentIds:[assignment.id,followup.assignmentId,uiAssignment.id,optional.id]}),{mode:0o600});
console.log(`PASS: ${checks} development API checks: assignment, role restrictions, drafts/conflicts, idempotent submission/report/follow-up, independent teacher2, approval, plans, monitoring, exports and frozen history.`);

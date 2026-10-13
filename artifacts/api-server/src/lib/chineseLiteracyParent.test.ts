import test from "node:test";
import assert from "node:assert/strict";
import { PARENT_LITERACY_DOMAINS as domains, PARENT_LITERACY_FORM_ITEMS as items, PARENT_LITERACY_METADATA as meta } from "./chineseLiteracyParent.js";
import { emptyLiteracyInput, validateLiteracyInput, scoreLiteracyDomain, scoreLiteracy, literacyEvidenceStatus, compareLiteracy, LITERACY_METADATA } from "./chineseLiteracy.js";
import { literacyExport, literacyReportExport } from "./chineseLiteracyExport.js";

const ids = (id: string) => domains.find(d => d.id === id)!.items.map(i => i.id);
const rated = (itemId: string, value: number) => ({ itemId, status: "rated" as const, value });
const no = (itemId: string) => ({ itemId, status: "not_observed" as const, value: null });
const na = (itemId: string) => ({ itemId, status: "not_applicable" as const, value: null, reason: "This activity has not been taught or used." });
function fixture() {
  const input = emptyLiteracyInput("6");
  input.context = Object.fromEntries(["relationship","contactFrequency","setting","homeLanguages","activities","observationLanguage","reason","strengths","currentSupports","exposureHistory","accessInformation","unknownInformation","schoolFeedback","schoolFeedbackSource","participationImpact","questions"].map(k => [k, "Unknown: not available in this synthetic home observation."]));
  Object.assign(input.context, { grade:"6", relationship:"Parent", setting:"Home", observationStart:"2026-09-01", observationEnd:"2026-10-01",
    completionDate:"2026-10-02", confirmationDate:"2026-10-02", parentConfirmed:"yes", script:"simplified", spokenVariety:"mandarin",
    readingConfidence:"unable_to_judge", writingConfidence:"some_limits", assistanceMode:"independent" });
  for (const d of domains) { input.sections[d.id] = {decision:"not_observed"}; input.responses.push(...d.items.map(i=>no(i.id))); }
  input.summary = { strengths:"Unknown: observation opportunities were limited.", barriers:"Unknown: no reliable judgement.", supportResponse:"Unknown: supports not observed.", discussion:"Discuss home access supports.", priorities:[] };
  return input;
}
test("parent bank is separate: 78 P- IDs, 13 domains, own version", () => {
  assert.equal(items.length,78); assert.equal(new Set(items.map(i=>i.id)).size,78);
  assert(items.every(i=>i.id.startsWith("P-"))); assert.equal(domains.length,13);
  assert.deepEqual(domains.map(d=>d.items.length),[10,5,7,12,6,3,7,5,4,5,5,2,7]);
  assert.equal(meta.scoringVersion,"parent-descriptive-domain-v0.1.0");
  assert.equal(items[0].text,"Understands similar Chinese content more successfully when someone reads it aloud than when reading it independently.");
});
test("parent Reading reference has exact mean 3.625 and displayed 3.6", () => {
  const s=scoreLiteracyDomain(ids("R"),ids("R").map((id,i)=>i<8?rated(id,i<5?4:3):no(id)));
  assert.equal(s.validCount,8); assert.equal(s.applicableCount,10); assert.equal(s.coverage,.8); assert.equal(s.mean,3.625); assert.equal(s.displayMean,"3.6"); assert.equal(s.frequentDifficultyCount,5);
  assert.equal(scoreLiteracyDomain(ids("R"),ids("R").map((id,i)=>i<7?rated(id,3):no(id))).mean,null);
});
test("parent writing/spatial minimum counts and NA denominator", () => {
  for (const n of [6,5]) assert.equal(scoreLiteracyDomain(ids("W"),ids("W").map((id,i)=>i<n?rated(id,3):no(id))).mean,n===6?3:null);
  assert.equal(scoreLiteracyDomain(ids("SP"),[rated("P-SP1",2),rated("P-SP2",4)]).mean,3);
  for(const missing of [no("P-SP2"),na("P-SP2")]) assert.equal(scoreLiteracyDomain(ids("SP"),[rated("P-SP1",2),missing]).mean,null);
  const reduced=scoreLiteracyDomain(ids("R"),ids("R").map((id,i)=>i<7?rated(id,3):i===7?no(id):na(id)));
  assert.equal(reduced.applicableCount,8);assert.equal(reduced.coverage,.875);assert.equal(reduced.mean,3);
});
test("NO, NA and unanswered never turn into numbers or normal findings", () => {
  const allNo=scoreLiteracyDomain(ids("R"),ids("R").map(no)); assert.equal(allNo.mean,null); assert.equal(allNo.coverage,0);assert.equal(allNo.presentationLabel,"Not observed");
  const allNa=scoreLiteracyDomain(ids("R"),ids("R").map(na)); assert.equal(allNa.mean,null);assert.equal(allNa.coverage,null);
  assert.equal(scoreLiteracyDomain(ids("R"),[]).unansweredCount,10);
});
test("one parent all-NO can submit without teacher/student/testing prerequisites", () => {
  const input=fixture(); assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true,meta));
  const scores=scoreLiteracy(input,undefined,meta); assert.equal(literacyEvidenceStatus(scores),"Additional information needed");
  assert(scores.every(s=>s.mean===null));assert(scores.every(s=>!("total" in s)&&!("risk" in s)&&!("normalizedScores" in s)));
});
test("strict parent bank rejects teacher IDs, duplicates, invalid ratings and client scores", () => {
  for (const r of [rated("R1",3),rated("P-R1",1.5),rated("P-R1",6),{...no("P-R1"),value:0}]) {
    assert.throws(()=>validateLiteracyInput({...fixture(),responses:[r]},undefined,false,meta));
  }
  assert.throws(()=>validateLiteracyInput({...fixture(),responses:[no("P-R1"),no("P-R1")]},undefined,false,meta));
  assert.throws(()=>validateLiteracyInput({...fixture(),mean:5},undefined,false,meta));
});
test("parent submission permits high ratings without examples but still requires real NA reasons", () => {
  const input=fixture();input.sections.R={decision:"complete"};
  input.responses=input.responses.map(r=>r.itemId==="P-R1"||r.itemId==="P-R2"?rated(r.itemId,4):r);
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,false,meta));
  assert.throws(()=>validateLiteracyInput(input,undefined,true,meta));
  input.evidence.R={examples:[{text:"Two home reading examples",itemIds:["P-R1","P-R2"]}],strengths:"Understands shared reading",supports:"Read aloud",impact:2,setting:"Shared reading at home",language:"Mandarin"};
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true,meta));
  input.evidence.R.examples=[];
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true,meta));
  input.responses=input.responses.map(r=>r.itemId==="P-R3"?{itemId:r.itemId,status:"not_applicable",value:null,reason:""}:r);
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,false,meta));assert.throws(()=>validateLiteracyInput(input,undefined,true,meta));
});
test("confirmation, assistance and short observation contexts are enforced without fabricated evidence", () => {
  for(const changes of [{parentConfirmed:""},{readingConfidence:"expert"},{assistanceMode:"interpreter"},{observationStart:"2026-09-28"}]) assert.throws(()=>validateLiteracyInput({...fixture(),context:{...fixture().context,...changes}},undefined,true,meta));
  const input=fixture();Object.assign(input.context,{observationStart:"2026-09-28",shortWindowExplanation:"Three ordinary shared-reading evenings were available.",assistanceMode:"interpreter",assistantIdentity:"Synthetic interpreter",assistantLanguage:"Korean"});
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true,meta));
});
test("motor/mathematics cannot change parent literacy domain results", () => {
  const input=fixture(),before=scoreLiteracy(input,undefined,meta).slice(0,4);
  input.responses=input.responses.map(r=>r.itemId.startsWith("P-M")?rated(r.itemId,5):r);
  assert.deepEqual(scoreLiteracy(input,undefined,meta).slice(0,4),before);
});
test("parent follow-up omitted domains are not administered; cross-source changes are suppressed", () => {
  const input=fixture();input.sections={R:input.sections.R};input.responses=input.responses.filter(r=>ids("R").includes(r.itemId));
  assert(scoreLiteracy(input,["R"],meta).filter(s=>s.id!=="R").every(s=>s.status==="not_administered"));
  const score={id:"R",status:"scored",mean:3,applicableItemIds:ids("R"),scoredItemIds:ids("R")};
  const baseline={metadata:meta,instrumentVersion:meta.version,scoringVersion:meta.scoringVersion,respondentIdentity:"parent-one",scores:[score],input:fixture()};
  assert.equal(compareLiteracy(baseline,{...baseline,scores:[{...score,mean:2}]})[0].change,-1);
  assert.equal(compareLiteracy(baseline,{...baseline,respondentIdentity:"parent-two"})[0].change,null);
  assert.equal(compareLiteracy(baseline,{...baseline,metadata:LITERACY_METADATA})[0].change,null);
});
test("parent exports show home source, confirmation, exact P- wording and safe HTML", () => {
  const doc:any={metadata:meta,input:fixture(),selectedDomains:domains.map(d=>d.id),scores:scoreLiteracy(fixture(),undefined,meta),contextSnapshot:{studentId:"synthetic"},teacherName:"SYNTHETIC Parent",instrumentVersion:meta.version,scoringVersion:meta.scoringVersion,languageVersion:"en-0.1.0",revision:2,monitoring:{entries:[]},sourceConfirmation:{confirmed:true,date:"2026-10-02"},report:{narrative:"<script>do not execute</script>",classroomAvailabilityNote:"Classroom observations were not available for this profile."}};
  const html=literacyExport(doc);assert(html.includes("Parent-reported observations in the home setting"));assert(html.includes("P-R1"));assert(html.includes(meta.reportLimitation));
  assert(html.includes("Classroom observations were not available"));assert(html.includes("Source-parent confirmation: Confirmed"));assert(!html.includes("<script>"));assert(!html.includes("one teacher’s perspective"));
  assert(!html.includes("Open Support plan"), "the report body must not embed a support-plan action");
  const reportOnly = literacyReportExport(doc);
  assert(reportOnly.includes("Recommendations and next steps"));
  assert(!reportOnly.includes("Open Support plan"), "the printable report must not embed a support-plan action");
});
test("full snapshot includes the report, agreed plan, monitoring and linked follow-up comparison", () => {
  const input = fixture();
  const baseline: any = {
    metadata: meta, input, selectedDomains: domains.map(d => d.id), scores: scoreLiteracy(input, undefined, meta),
    contextSnapshot: { studentId: "synthetic-case" }, teacherName: "SYNTHETIC Parent", instrumentVersion: meta.version,
    scoringVersion: meta.scoringVersion, languageVersion: "en-0.1.0", revision: 3, status: "approved",
    submittedAt: "2026-10-02", sourceConfirmation: { confirmed: true, date: "2026-10-02" },
    report: { narrative: "# Observation report\n\n## Observations by Domain\nThis section is generated from the selected respondent.\n\n## Recommended monitoring plan\nReview shared reading participation after support starts.\n\n## Recommended follow-up plan\nConsider repeating the same respondent form after six to eight weeks.", approvedAt: "2026-10-10", approvedBy: "Synthetic reviewer" },
    plan: { pathway: "classroom_support_review", rationale: "Continue supported shared reading.", approvedAt: "2026-10-11",
      priorities: [{ text: "Shared reading", itemIds: ["P-R1"], strategyId: "shared-reading", owner: "Teacher", indicator: "Reads a short passage", reviewDate: "2026-11-20" }] },
    monitoring: { entries: [{ date: "2026-10-12", supportDelivered: "Shared reading", participation: "Joined for ten minutes", note: "Synthetic note." }] },
  };
  const followup: any = {
    ...baseline, assignmentId: "synthetic-followup", baselineId: "synthetic-baseline", status: "submitted", revision: 1,
    report: null, plan: null, submittedAt: "2026-11-20",
    monitoring: { entries: [], comparison: [{ domainId: "R",
      baseline: { displayMean: "2.0", validCount: 5, applicableCount: 5, coverage: 1 },
      followup: { displayMean: "3.0", validCount: 5, applicableCount: 5, coverage: 1 },
      change: 1, limitations: ["Same respondent and item set"] }] },
  };
  const html = literacyExport({ ...baseline, linkedFollowups: [followup] });
  for (const text of ["Professional report", "Support plan", "Continue supported shared reading", "Recommended monitoring plan",
    "Review shared reading participation", "Recommended follow-up plan", "same respondent form", "Recorded monitoring activity",
    "Completed repeat-observation results", "Baseline and follow-up comparison", "Same respondent and item set", "Differences are descriptive only"]) {
    assert(html.includes(text), `expected full report export to contain: ${text}`);
  }
  assert(html.indexOf("<h2>Recommendations and next steps</h2>") < html.indexOf("<h2>Support plan</h2>"), "the report recommendations must conclude the report before the separate support-plan section");
  assert(!html.includes("<pre>"), "the report narrative should be formatted as a professional report, not raw Markdown");
  const followupWithoutComparison = literacyExport({ ...baseline, linkedFollowups: [{ ...followup, monitoring: { entries: [], comparison: [] } }] });
  assert(followupWithoutComparison.includes("A comparable baseline and follow-up rating set is not available"), "completed repeat forms without a comparable baseline must still export safely");
  const reportOnly = literacyExport({ ...baseline, monitoring: { entries: [] }, linkedFollowups: [] });
  assert(!reportOnly.includes("Recorded monitoring activity") && !reportOnly.includes("Completed repeat-observation results"), "empty operational logs must not replace the narrative recommendations with blank sections");
});

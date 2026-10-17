import test from "node:test";
import assert from "node:assert/strict";
import { LITERACY_DOMAINS, LITERACY_FORM_ITEMS, emptyLiteracyInput, scoreLiteracyDomain, validateLiteracyInput, scoreLiteracy, literacyEvidenceStatus, compareLiteracy } from "./chineseLiteracy.ts";

const ids = (domain: string) => LITERACY_DOMAINS.find(d => d.id === domain)!.items.map(i => i.id);
const rated = (itemId: string, value: number) => ({ itemId, status: "rated", value });
const no = (itemId: string) => ({ itemId, status: "not_observed", value: null });
const na = (itemId: string) => ({ itemId, status: "not_applicable", value: null, reason: "Not taught in this curriculum." });
function fixture() {
  const input = emptyLiteracyInput("6");
  input.context = { grade: 6, teacherRole: "Chinese teacher", contactFrequency: "Daily", setting: "Chinese classroom", timeTeaching: "6 months",
    observationStart: "2026-01-01", observationEnd: "2026-01-14", script: "simplified", spokenVariety: "mandarin", instruction: "main curriculum",
    observationLanguage: "Mandarin", exposureHistory: "Not known: records unavailable.", curriculum: "Taught classroom texts",
    reason: "Support review", strengths: "Not yet observed: short window.", currentSupports: "Accessible text",
    accessInformation: "Regular classroom observations", unknownInformation: "Not known: previous instruction history unavailable." };
  for (const d of LITERACY_DOMAINS) {
    input.sections[d.id] = { decision: "not_observed" };
    input.responses.push(...d.items.map(i => no(i.id) as any));
  }
  input.summary = { strengths: "Not yet observed: limited opportunities.", barriers: "Not known: more classroom opportunities needed.", supportResponse: "Not yet observed: support just started.", discussion: "Classroom review requested", priorities: [] };
  return input;
}
test("exact item counts and GP6; domains remain independent", () => {
  assert.equal(LITERACY_FORM_ITEMS.length, 78); assert.equal(new Set(LITERACY_FORM_ITEMS.map(i => i.id)).size, 78);
  assert.equal(LITERACY_DOMAINS.length, 13);
  assert.deepEqual(LITERACY_DOMAINS.map(d=>d.items.length), [10,5,7,12,6,3,7,5,4,5,5,2,7]);
  assert.equal(LITERACY_FORM_ITEMS.find(i=>i.id==="GP6")!.text, "Needs substantially more effort or time to complete literacy tasks than the instructional task allows.");
});
test("Reading reference example retains unrounded 3.625", () => {
  const score = scoreLiteracyDomain(ids("R"), ids("R").map((id,i)=> i<8 ? rated(id,i<5?4:3) : no(id)));
  assert.equal(score.sum,29); assert.equal(score.validCount,8); assert.equal(score.coverage,.8);
  assert.equal(score.mean,3.625); assert.equal(score.displayMean,"3.6"); assert.equal(score.frequentDifficultyCount,5);
});
test("seven of ten Reading observations suppress mean, not sum", () => {
  const s=scoreLiteracyDomain(ids("R"),ids("R").map((id,i)=>i<7?rated(id,3):no(id)));
  assert.equal(s.mean,null); assert.equal(s.sum,21); assert.equal(s.status,"insufficient_observations");
});
test("six of seven Writing is eligible; five of seven is not", () => {
  for(const count of [6,5]) { const s=scoreLiteracyDomain(ids("W"),ids("W").map((id,i)=>i<count?rated(id,3):no(id))); assert.equal(s.mean,count===6?3:null); assert.equal(s.coverage,count/7); }
});
test("spatial minimum two numeric items survives 100 percent reduced coverage", () => {
  assert.equal(scoreLiteracyDomain(ids("SP"),[rated("SP1",2),no("SP2")]).mean,null);
  assert.equal(scoreLiteracyDomain(ids("SP"),[rated("SP1",2),rated("SP2",4)]).mean,3);
  const s=scoreLiteracyDomain(ids("SP"),[rated("SP1",2),na("SP2")]); assert.equal(s.coverage,1); assert.equal(s.mean,null);
});
test("all NA, all NO and reduced denominator are explicit", () => {
  const allNA=scoreLiteracyDomain(ids("R"),ids("R").map(na)); assert.equal(allNA.status,"not_applicable"); assert.equal(allNA.coverage,null); assert.equal(allNA.mean,null);
  const allNO=scoreLiteracyDomain(ids("R"),ids("R").map(no)); assert.equal(allNO.coverage,0); assert.equal(allNO.presentationLabel,"Not observed"); assert.equal(allNO.mean,null);
  const reduced=scoreLiteracyDomain(ids("R"),ids("R").map((id,i)=>i<7?rated(id,3):i===7?no(id):na(id)));
  assert.equal(reduced.applicableCount,8); assert.equal(reduced.validCount,7); assert.equal(reduced.coverage,.875); assert.equal(reduced.mean,3);
});
test("unanswered remains applicable; whole section NO is not an unvisited section", () => {
  const s=scoreLiteracyDomain(ids("R"),[rated("R1",3)]); assert.equal(s.unansweredCount,9); assert.equal(s.applicableCount,10); assert.equal(s.mean,null);
  const input=fixture(); assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true)); delete input.sections.M;
  assert.throws(()=>validateLiteracyInput(input,undefined,true));
});
test("duplicates, unknowns, fractional/string/out-of-range values and NA without reasons fail", () => {
  for(const values of [[rated("R1",3),rated("R1",4)],[rated("FAKE",3)],[rated("R1",0)],[rated("R1",6)],[rated("R1",1.5)],[{...rated("R1",3),value:"3"}],[{...no("R1"),value:0}],[{...na("R1"),reason:""}]]) assert.throws(()=>scoreLiteracyDomain(ids("R"),values));
});
test("teacher submission permits high ratings without examples and preserves supplied examples", () => {
  const input=fixture(); input.sections.R={decision:"complete"}; input.responses=input.responses.map(r=>r.itemId==="R1"||r.itemId==="R2"?rated(r.itemId,4) as any:r);
  assert.doesNotThrow(()=>validateLiteracyInput(input));
  assert.throws(()=>validateLiteracyInput(input,undefined,true));
  input.evidence.R={ examples:[{text:"In two taught reading passages the same characters were not recognized.",itemIds:["R1","R2"]}], strengths:"Responds successfully with audio support", supports:"Accessible text",impact:2 };
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true));
  input.evidence.R.examples=[];
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,true));
});
test("incomplete NA drafts save without invented reasons; submission and scoring reject them", () => {
  const input=fixture(); input.responses=input.responses.map(r=>r.itemId==="R1"?{itemId:"R1",status:"not_applicable",value:null,reason:""}:r);
  input.sections.R={decision:"complete"};
  assert.doesNotThrow(()=>validateLiteracyInput(input));
  assert.throws(()=>validateLiteracyInput(input,undefined,true));
  assert.throws(()=>scoreLiteracyDomain(ids("R"),[{itemId:"R1",status:"not_applicable",value:null,reason:""}]));
});
test("support-plan approval draft accepts blank priority details and review date", () => {
  const input=fixture();
  input.summary.priorities=[{text:"",itemIds:[],strategyId:"",owner:"",indicator:"",reviewDate:""}];
  assert.doesNotThrow(()=>validateLiteracyInput(input,undefined,false));
});
test("teacher with no current contact can submit historical all-NO observations without examples or optional discussion", () => {
  const input=fixture();
  input.context.contactFrequency="No longer in contact";
  input.context.timeTeaching="Previously taught during a two-week period; no contact in over two years.";
  input.context.setting="Chinese classroom during the historical observation period.";
  input.context.observationStart="2024-10-01";
  input.context.observationEnd="2024-10-14";
  input.summary.discussion="";
  validateLiteracyInput(input,undefined,true); assert.equal(literacyEvidenceStatus(scoreLiteracy(input)),"Additional information needed");
  const scores=scoreLiteracy(input); assert(!("total" in scores)); assert(scores.every(s=>!("normalizedScores" in s)));
});
test("client score fields cannot override deterministic results", () => {
  assert.throws(()=>validateLiteracyInput({...fixture(),mean:5}));
});
test("optional motor/math never alters literacy domain means", () => {
  const input=fixture(); const before=scoreLiteracy(input).slice(0,4);
  input.responses=input.responses.map(r=>["M","MC"].some(prefix=>r.itemId.startsWith(prefix))?rated(r.itemId,5) as any:r);
  assert.deepEqual(scoreLiteracy(input).slice(0,4),before);
});
test("followup domains are declared; omitted domains are not administered", () => {
  const input=fixture(); input.responses=input.responses.filter(r=>ids("R").includes(r.itemId)); input.sections={R:input.sections.R}; input.evidence={};
  validateLiteracyInput(input,["R"],true); assert(scoreLiteracy(input,["R"]).filter(s=>s.id!=="R").every(s=>s.status==="not_administered"));
});
test("comparison suppresses changed membership and rater; no significance claim", () => {
  const s={id:"R",status:"scored",mean:3,scoredItemIds:["R1","R2"],applicableItemIds:["R1","R2"]};
  const base={instrumentVersion:"0.1.0",scoringVersion:"descriptive-domain-v0.1.0",respondentIdentity:"teacher-a",input:fixture(),scores:[s]};
  const follow={...base,scores:[{...s,mean:2}]};
  assert.equal(compareLiteracy(base,follow)[0].change,-1);
  assert.equal(compareLiteracy(base,{...follow,respondentIdentity:"teacher-b"})[0].change,null);
  assert.equal(compareLiteracy(base,{...follow,scores:[{...s,scoredItemIds:["R1","R3"]}]})[0].change,null);
});

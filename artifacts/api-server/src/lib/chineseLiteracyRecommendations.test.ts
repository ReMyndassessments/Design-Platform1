import test from "node:test";
import assert from "node:assert/strict";
import { buildIntakeAnalysisPrompt } from "./ai.js";
import { CHINESE_LITERACY_KEYS } from "./chineseLiteracyInstruments.js";
import { chineseLiteracyGradeEligible, eligibleRecommendationTools, recommendationToolName, chineseLiteracyRecommendationGuidance, normalizeLiteracyRecommendations } from "./chineseLiteracyRecommendations.js";
import { parseIntakeAnalysisResult } from "./intakeAnalysisValidation.js";

const [teacher, parent] = CHINESE_LITERACY_KEYS;
const tools = [
  {id:teacher,name:"Same profile",description:"Teacher classroom observations",domains:["Chinese reading"],respondentTypes:["teacher1"],category:"ReMynd Tools",isRemyndOwned:true},
  {id:parent,name:"Same profile",description:"Parent home observations",domains:["Chinese reading"],respondentTypes:["parent"],category:"ReMynd Tools",isRemyndOwned:true},
  {id:"OTHER",name:"Other tool",description:"Other concerns",domains:["Attention"],respondentTypes:["parent"],category:"Other",isRemyndOwned:false},
];
test("actual intake prompt includes both exact IDs and distinct respondent/settings",()=>{
  const prompt=buildIntakeAnalysisPrompt({studentName:"Synthetic",school:"Synthetic",grade:"Grade 6",referralReason:"Difficulty with Chinese character reading and homework",assessmentTools:tools});
  assert(prompt.includes(teacher));assert(prompt.includes(parent));
  assert(prompt.includes("(Teacher Observation Form)"));assert(prompt.includes("(Parent Observation Form)"));
  assert(prompt.includes("Chinese-language teacher"));assert(prompt.includes("parent/caregiver-reported ordinary home"));
  assert(prompt.includes("Neither requires the other"));assert(prompt.includes("homework upload"));
  assert(prompt.includes("not validated dyslexia screeners"));assert(prompt.includes("never pool"));
});
test("out-of-range authoritative grades exclude both, not unrelated tools",()=>{
  for(const grade of ["Grade 2","13","Year 1"]) {
    assert(!chineseLiteracyGradeEligible(grade));
    assert.deepEqual(eligibleRecommendationTools(tools,grade).map(t=>t.id),["OTHER"]);
    const prompt=buildIntakeAnalysisPrompt({studentName:"Synthetic",school:"Synthetic",grade,referralReason:"Chinese reading",assessmentTools:tools});
    assert(!prompt.includes(teacher));assert(!prompt.includes(parent));assert(prompt.includes("Do not recommend them."));
    assert.equal(normalizeLiteracyRecommendations([{toolId:parent,name:"Parent"}],CHINESE_LITERACY_KEYS,grade).length,0);
  }
  for(const grade of ["3","Grade 12","Year 6"]) assert(chineseLiteracyGradeEligible(grade));
});
test("unknown grades request verification rather than inventing demographics",()=>{
  const prompt=buildIntakeAnalysisPrompt({studentName:"Synthetic",school:"Synthetic",referralReason:"Chinese reading concern",assessmentTools:tools});
  assert(prompt.includes("Current grade (authoritative case field): Not specified"));
  assert(prompt.includes("flag the need to verify it before assignment"));
  assert(prompt.includes(parent));assert(prompt.includes(teacher));
});
test("language preference alone and English-only difficulties do not justify automatic selection",()=>{
  const guidance=chineseLiteracyRecommendationGuidance(CHINESE_LITERACY_KEYS,"6");
  assert(guidance.includes("merely because a family speaks Mandarin/Cantonese"));
  assert(guidance.includes("English-only literacy difficulties"));
  assert(guidance.includes("Do not automatically assign or send"));
});
test("either single version or both may be recommended, without same-name collisions",()=>{
  const candidates=CHINESE_LITERACY_KEYS.map(toolId=>({toolId,name:"Same name",priority:"recommended" as const,rationale:"Reported observations"}));
  for(const selected of [candidates.slice(0,1),candidates.slice(1),candidates]) {
    const out=normalizeLiteracyRecommendations(selected,CHINESE_LITERACY_KEYS,"6");
    assert.equal(out.length,selected.length);assert.deepEqual(out.map(t=>t.toolId),selected.map(t=>t.toolId));
    for(const item of out) assert.equal(item.rationale,"Reported observations");
  }
  const both=normalizeLiteracyRecommendations(candidates,CHINESE_LITERACY_KEYS,"6");
  assert.notEqual(both[0].name,both[1].name);assert(both[0].name.includes("Teacher"));assert(both[1].name.includes("Parent"));
  assert.equal(recommendationToolName("OTHER","Preserve"),"Preserve");
});
test("unavailable forms are excluded while model priority and staff review remain unchanged",()=>{
  const out=normalizeLiteracyRecommendations([{toolId:parent,name:"Profile",priority:"essential"}],CHINESE_LITERACY_KEYS,"6");
  assert.equal(out[0].priority,"essential");
  assert.equal(normalizeLiteracyRecommendations([{toolId:parent,name:"Profile"}],[teacher],"6").length,0);
  assert(!chineseLiteracyRecommendationGuidance([teacher],"6").includes(parent));
});
test("normalization works on actual parsed AI shape and leaves other clinical fields unchanged",()=>{
  const result=parseIntakeAnalysisResult(JSON.stringify({recommendedTools:CHINESE_LITERACY_KEYS.map(toolId=>({toolId,name:"Same profile",priority:"recommended",rationale:"Chinese learning concerns"})),recommendedDomains:["Chinese literacy"],riskLevel:"low",summary:"Reported Chinese literacy concerns require contextual educational observation.",flags:[],suggestedQuestions:{parent:["What happens during ordinary homework?"],teacher:["What is observed in Chinese lessons?"]}}));
  const original=structuredClone(result);
  const normalized=normalizeLiteracyRecommendations(result.recommendedTools,CHINESE_LITERACY_KEYS,"6");
  assert(normalized[0].name.includes("Teacher"));assert(normalized[1].name.includes("Parent"));
  assert.deepEqual(result,original);
});

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { AlertTriangle, Upload, FileText, CheckSquare, LayoutGrid, Users, MessageSquare, BarChart3, FileCheck, ChevronRight, ChevronLeft, Plus, Trash2, Check, X, Wand2, Brain, Eye, EyeOff, RefreshCw, Download, BookOpen, Star, ThumbsUp, ThumbsDown, Minus, Loader2, Bell, Sparkles, Printer, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function getAuth() {
  return { Authorization: `Bearer ${localStorage.getItem("raos_token")}` };
}
function jsonHeaders() {
  return { "Content-Type": "application/json", ...getAuth() };
}

const PHASES = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "samples", label: "Samples", icon: FileText },
  { id: "review", label: "Review", icon: CheckSquare },
  { id: "bank", label: "Sample Bank", icon: LayoutGrid },
  { id: "choicesets", label: "Choice Sets", icon: Users },
  { id: "interview", label: "Interview", icon: MessageSquare },
  { id: "scoring", label: "Scoring & Report", icon: BarChart3 },
] as const;
type Phase = typeof PHASES[number]["id"];

const DOMAINS = [
  "Number Sense", "Addition Reasoning", "Subtraction Reasoning", "Multiplicative Reasoning",
  "Division Reasoning", "Fractions", "Decimals", "Percentages", "Ratio and Proportional Reasoning",
  "Algebraic Reasoning", "Pattern and Relational Reasoning", "Mathematical Problem-Solving",
  "Measurement", "Geometry", "Spatial Reasoning", "Data Interpretation", "Statistics",
  "Probability", "Money", "Time", "Other",
];

const REASONING_DOMAINS = [
  "Conceptual Understanding", "Strategy Awareness", "Procedural Reasoning",
  "Mathematical Communication", "Error Awareness", "Verification and Reasonableness",
  "Strategy Flexibility", "Transfer", "Metacognition", "Independence",
];

const RATING_LABELS: Record<number, string> = {
  0: "No evidence",
  1: "Emerging with substantial support",
  2: "Developing with moderate support",
  3: "Demonstrated with limited support",
  4: "Demonstrated independently",
};

const EVIDENCE_STRENGTH = ["strong", "moderate", "limited", "insufficient"];

type WorkDoc = {
  id: string; file_name: string; file_url: string; file_type: string;
  source_type: string; completion_date: string; math_topic: string;
  independence_reported: string; teacher_marked: string;
  teacher_comments: string; contributor_notes: string; extraction_status: string;
};

type ExtractionCandidate = {
  _key: string;
  extractedProblem: string;
  studentAnswer: string;
  visibleWorking: string;
  answerStatus: string;
  teacherCorrection: string | null;
  examinerNotes: string;
  sourceDocId: string;
  sourceDocName: string;
  gradeLevel: string | null;
  mathTopic: string | null;
};

type WorkSample = {
  id: string; document_id: string | null; case_id: string; image_url: string | null;
  extracted_problem: string; student_answer: string; visible_working: string;
  teacher_correction: string; teacher_comments: string; domain: string;
  skill: string; reasoning_focus: string[] | string; difficulty: string;
  estimated_grade: string; answer_status: string; language_demand: string;
  suitability: string; approved: boolean; examiner_notes: string;
};

type ChoiceSet = {
  id: string; title: string; choice_type: string; target_domain: string | null;
  student_prompt: string; display_order: number; created_by: string | null;
  items: Array<{ id: string; choice_set_id: string; work_sample_id: string; display_order: number }>;
};

type Selection = {
  id: string; session_id: string; choice_set_id: string | null; work_sample_id: string;
  selection_latency_label: string; selection_behavior: string; sequence_number: number;
};

type DomainRating = {
  domain: string; rating: number | null; evidence_strength: string; supporting_evidence: string;
};

type Report = {
  id: string; status: string; generated_narrative: Record<string, unknown> | null;
  edited_narrative: Record<string, unknown> | null;
};

type Session = {
  id: string; status: string; general_notes: string | null;
  opening_script_delivered: string | null; opening_notes: string | null; stop_reason: string | null;
};

// ── Compact Rating button ─────────────────────────────────────────────────────
function RatingBtn({ value, selected, onClick }: { value: number | "NO"; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all ${
        selected
          ? value === "NO"
            ? "bg-slate-700 border-slate-500 text-white"
            : "bg-violet-600 border-violet-500 text-white"
          : "bg-white border-slate-200 text-slate-600 hover:border-violet-300"
      }`}
    >
      {value}
    </button>
  );
}

// ── Upload file via presigned URL ─────────────────────────────────────────────
async function uploadFileToStorage(file: File): Promise<string> {
  const urlRes = await fetch(`${BASE_URL}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!urlRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
  const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Failed to upload file");
  return objectPath;
}

export default function RamriInterviewPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const [phase, setPhase] = useState<Phase>("upload");
  const [pageError, setPageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Core data
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assignmentToken, setAssignmentToken] = useState<string | null>(null);
  const [docs, setDocs] = useState<WorkDoc[]>([]);
  const [samples, setSamples] = useState<WorkSample[]>([]);
  const [choiceSets, setChoiceSets] = useState<ChoiceSet[]>([]);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [ratings, setRatings] = useState<DomainRating[]>([]);
  const [report, setReport] = useState<Report | null>(null);

  // Role & invigilator identity
  const [userRole, setUserRole] = useState<string | null>(null);
  const [invigilatorId, setInvigilatorId] = useState<string | null>(null);
  const [invigilatorName, setInvigilatorName] = useState<string | null>(null);

  // Contributor-upload notification & gating
  const [newDocsCount, setNewDocsCount] = useState(0);
  const knownDocIds = useRef<Set<string>>(new Set());
  const [uploadsClosed, setUploadsClosed] = useState(false);
  const [togglingUploads, setTogglingUploads] = useState(false);

  // Upload phase state
  const [uploading, setUploading] = useState(false);
  const [uploadMeta, setUploadMeta] = useState({ sourceType: "teacher", mathTopic: "", gradeLevel: "", independenceReported: "unknown", teacherMarked: "unknown", teacherComments: "", contributorNotes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample phase state
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [newSampleForm, setNewSampleForm] = useState({ extractedProblem: "", studentAnswer: "", visibleWorking: "yes", teacherCorrection: "", teacherComments: "", domain: "", skill: "", difficulty: "developing", answerStatus: "correct", examinerNotes: "" });
  const [showAddSample, setShowAddSample] = useState(false);
  const [classifying, setClassifying] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractCandidates, setExtractCandidates] = useState<ExtractionCandidate[]>([]);
  const [extractErrors, setExtractErrors] = useState<string[]>([]);

  // Choice set phase state
  const [newSetForm, setNewSetForm] = useState({ title: "", choiceType: "open", targetDomain: "", studentPrompt: "" });
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingSetItems, setEditingSetItems] = useState<string[]>([]);
  const [recommending, setRecommending] = useState(false);
  const [recommendRationale, setRecommendRationale] = useState<Record<string, string>>({});
  const [generatingChoiceSets, setGeneratingChoiceSets] = useState(false);

  // Interview phase state
  const [activeSelId, setActiveSelId] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<Record<string, {
    ownership: Record<string, unknown> | null;
    responses: Array<Record<string, unknown>>;
    transfer: Record<string, unknown> | null;
    observations: Record<string, unknown> | null;
  }>>({});
  const [generatingQs, setGeneratingQs] = useState(false);
  const [generatedQs, setGeneratedQs] = useState<Array<{ type: string; question: string; purpose: string }>>([]);
  const [generatingTransfer, setGeneratingTransfer] = useState(false);

  // Scoring phase state
  const [localRatings, setLocalRatings] = useState<Record<string, { rating: number | null; evidenceStrength: string; supportingEvidence: string }>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editedNarrative, setEditedNarrative] = useState<Record<string, unknown>>({});

  // Persist phase in sessionStorage so remounts restore the correct step
  useEffect(() => {
    if (sessionId) sessionStorage.setItem(`ramri-phase-${sessionId}`, phase);
  }, [phase, sessionId]);

  // Init
  useEffect(() => {
    const init = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions`, {
          method: "POST",
          headers: jsonHeaders(),
          body: JSON.stringify({ assignmentId }),
        });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json() as {
          session: Session; docs: WorkDoc[]; samples: WorkSample[];
          choiceSets: ChoiceSet[]; selections: Selection[]; ratings: DomainRating[]; report: Report | null;
          userRole?: string; invigilatorId?: string | null; invigilatorName?: string | null;
        };
        setSession(data.session);
        setSessionId(data.session.id);
        if (data.assignmentToken) setAssignmentToken(data.assignmentToken as unknown as string);
        if (typeof (data as Record<string, unknown>).uploadsClosed === "boolean") setUploadsClosed((data as Record<string, boolean>).uploadsClosed);
        if (data.userRole) setUserRole(data.userRole);
        if (data.invigilatorId) setInvigilatorId(data.invigilatorId);
        if (data.invigilatorName) setInvigilatorName(data.invigilatorName);
        setDocs(data.docs);
        knownDocIds.current = new Set(data.docs.map((d: WorkDoc) => d.id));
        setSamples(data.samples);
        setChoiceSets(data.choiceSets);
        setSelections(data.selections);
        setRatings(data.ratings);
        setReport(data.report);
        // Invigilators always land on the interview phase — ignore sessionStorage
        if (data.userRole === "assessment_invigilator") {
          setPhase("interview");
        } else {
          const savedPhase = sessionStorage.getItem(`ramri-phase-${data.session.id}`);
          if (savedPhase) setPhase(savedPhase as Phase);
        }
        // Init local ratings from DB
        const lr: typeof localRatings = {};
        for (const dr of data.ratings) {
          lr[dr.domain] = { rating: dr.rating, evidenceStrength: dr.evidence_strength, supportingEvidence: dr.supporting_evidence };
        }
        setLocalRatings(lr);
        if (data.report?.edited_narrative) setEditedNarrative(data.report.edited_narrative as Record<string, unknown>);
        else if (data.report?.generated_narrative) setEditedNarrative(data.report.generated_narrative as Record<string, unknown>);
      } catch (e: unknown) {
        setPageError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [caseId, assignmentId]);

  // Poll for new contributor uploads every 30 s while on Phase 1
  useEffect(() => {
    if (phase !== "upload" || !sessionId || !caseId) return;
    const poll = async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/documents`, {
          headers: getAuth(),
        });
        if (!r.ok) return;
        const d = await r.json() as { documents: WorkDoc[]; uploadsClosed?: boolean };
        // Self-correct stale uploadsClosed state (survives HMR and remounts)
        if (typeof d.uploadsClosed === "boolean") setUploadsClosed(d.uploadsClosed);
        const fresh = d.documents;
        const arrived = fresh.filter(doc => !knownDocIds.current.has(doc.id));
        if (arrived.length > 0) {
          setDocs(fresh);
          arrived.forEach(doc => knownDocIds.current.add(doc.id));
          setNewDocsCount(n => n + arrived.length);
        }
      } catch {
        // silent — don't disturb the examiner if poll fails
      }
    };
    poll(); // fire immediately to self-correct any stale uploadsClosed state
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, [phase, sessionId, caseId]);

  const saveSession = useCallback(async (patch: Partial<Session>) => {
    if (!sessionId) return;
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}`, {
      method: "PATCH", headers: jsonHeaders(), body: JSON.stringify(patch),
    });
    if (r.ok) { const d = await r.json() as { session: Session }; setSession(d.session); }
  }, [sessionId, caseId]);

  // ── Upload phase ────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    setUploading(true);
    try {
      const fileUrl = await uploadFileToStorage(file);
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/documents`, {
        method: "POST", headers: jsonHeaders(),
        body: JSON.stringify({ fileName: file.name, fileUrl, fileType: file.type.includes("pdf") ? "pdf" : "image", ...uploadMeta }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { document: WorkDoc };
      setDocs(prev => [...prev, d.document]);
      setUploadMeta({ sourceType: "teacher", mathTopic: "", gradeLevel: "", independenceReported: "unknown", teacherMarked: "unknown", teacherComments: "", contributorNotes: "" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (docId: string) => {
    if (!sessionId || !confirm("Delete this document?")) return;
    await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/documents/${docId}`, { method: "DELETE", headers: getAuth() });
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  // ── Samples phase ───────────────────────────────────────────────────────────
  const addSample = async () => {
    if (!sessionId || !newSampleForm.extractedProblem.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify(newSampleForm),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { sample: WorkSample };
      setSamples(prev => [...prev, d.sample]);
      setNewSampleForm({ extractedProblem: "", studentAnswer: "", visibleWorking: "yes", teacherCorrection: "", teacherComments: "", domain: "", skill: "", difficulty: "developing", answerStatus: "correct", examinerNotes: "" });
      setShowAddSample(false);
    } finally { setSaving(false); }
  };

  const extractSamples = async () => {
    if (!sessionId) return;
    setExtracting(true);
    setExtractCandidates([]);
    setExtractErrors([]);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/extract-samples`, {
        method: "POST", headers: jsonHeaders(),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { candidates: Array<Record<string, unknown>>; errors: string[] };
      const keyed = (d.candidates ?? []).map((c, i) => ({ ...c, _key: `candidate-${Date.now()}-${i}` })) as ExtractionCandidate[];
      setExtractCandidates(keyed);
      setExtractErrors(d.errors ?? []);
    } catch {
      setExtractErrors(["Extraction request failed — please try again"]);
    } finally {
      setExtracting(false);
    }
  };

  const acceptCandidate = async (candidate: ExtractionCandidate) => {
    if (!sessionId) return;
    const body = {
      extractedProblem: candidate.extractedProblem,
      studentAnswer: candidate.studentAnswer ?? "",
      visibleWorking: candidate.visibleWorking ?? "yes",
      answerStatus: candidate.answerStatus ?? "unclear",
      teacherCorrection: candidate.teacherCorrection ?? "",
      teacherComments: "",
      domain: "",
      skill: "",
      difficulty: "developing",
      examinerNotes: candidate.examinerNotes ?? "",
    };
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples`, {
      method: "POST", headers: jsonHeaders(), body: JSON.stringify(body),
    });
    if (r.ok) {
      const d = await r.json() as { sample: WorkSample };
      setSamples(prev => [...prev, d.sample]);
    }
    setExtractCandidates(prev => prev.filter(c => c._key !== candidate._key));
  };

  const rejectCandidate = (key: string) => {
    setExtractCandidates(prev => prev.filter(c => c._key !== key));
  };

  const acceptAllCandidates = async () => {
    for (const c of [...extractCandidates]) {
      await acceptCandidate(c);
    }
  };

  const classifySample = async (sample: WorkSample) => {
    setClassifying(sample.id);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples/${sample.id}/classify`, {
        method: "POST", headers: jsonHeaders(),
        body: JSON.stringify({ extractedProblem: sample.extracted_problem, studentAnswer: sample.student_answer, visibleWorking: sample.visible_working }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { sample: WorkSample };
      setSamples(prev => prev.map(s => s.id === sample.id ? d.sample : s));
    } finally { setClassifying(null); }
  };

  const approveSample = async (sampleId: string, approved: boolean) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples/${sampleId}`, {
      method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ approved }),
    });
    if (r.ok) { const d = await r.json() as { sample: WorkSample }; setSamples(prev => prev.map(s => s.id === sampleId ? d.sample : s)); }
  };

  const deleteSample = async (sampleId: string) => {
    if (!confirm("Delete this work sample?")) return;
    await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples/${sampleId}`, { method: "DELETE", headers: getAuth() });
    setSamples(prev => prev.filter(s => s.id !== sampleId));
  };

  const updateSampleField = async (sampleId: string, field: string, value: unknown) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/samples/${sampleId}`, {
      method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ [field]: value }),
    });
    if (r.ok) { const d = await r.json() as { sample: WorkSample }; setSamples(prev => prev.map(s => s.id === sampleId ? d.sample : s)); }
  };

  // ── Choice Sets phase ───────────────────────────────────────────────────────
  const createChoiceSet = async () => {
    if (!sessionId || !newSetForm.title.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/choice-sets`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify({ ...newSetForm, sampleIds: [] }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { choiceSet: ChoiceSet };
      setChoiceSets(prev => [...prev, d.choiceSet]);
      setNewSetForm({ title: "", choiceType: "open", targetDomain: "", studentPrompt: "" });
    } finally { setSaving(false); }
  };

  const saveChoiceSetItems = async (setId: string, sampleIds: string[]) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/choice-sets/${setId}`, {
      method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ sampleIds }),
    });
    if (r.ok) { const d = await r.json() as { choiceSet: ChoiceSet }; setChoiceSets(prev => prev.map(cs => cs.id === setId ? d.choiceSet : cs)); }
  };

  const recommendChoiceSet = async (setId: string, domain: string) => {
    setRecommending(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/recommend-choice-set`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify({ targetDomain: domain || undefined }),
      });
      if (!r.ok) return;
      const d = await r.json() as { recommendedIds: string[]; rationale: string };
      setEditingSetItems(d.recommendedIds);
      setEditingSetId(setId);
      setRecommendRationale(prev => ({ ...prev, [setId]: d.rationale }));
    } finally { setRecommending(false); }
  };

  const deleteChoiceSet = async (setId: string) => {
    if (!confirm("Delete this choice set?")) return;
    await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/choice-sets/${setId}`, { method: "DELETE", headers: getAuth() });
    setChoiceSets(prev => prev.filter(cs => cs.id !== setId));
  };

  const callToggleUploads = async (closed: boolean) => {
    if (!sessionId) return;
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/toggle-uploads`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify({ closed }),
      });
      if (r.ok) { const d = await r.json() as { uploadsClosed: boolean }; setUploadsClosed(d.uploadsClosed); }
    } catch { /* non-fatal */ }
  };

  const printStudentSheet = () => {
    const letters = ["A", "B", "C", "D"];
    const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const setsHtml = choiceSets
      .filter(cs => cs.items.length > 0)
      .sort((a, b) => a.display_order - b.display_order)
      .map((cs, si) => {
        const prompt = cs.student_prompt || "Which piece of work would you like to show me?";
        const itemsHtml = cs.items
          .sort((a, b) => a.display_order - b.display_order)
          .map((item, ii) => {
            const s = samples.find(x => x.id === item.work_sample_id);
            if (!s) return "";
            return `
              <div class="problem">
                <div class="problem-label">Option ${letters[ii] ?? ii + 1}</div>
                <div class="problem-text">${s.extracted_problem}</div>
                ${s.student_answer ? `<div class="problem-answer">Original answer: ${s.student_answer}</div>` : ""}
                <div class="work-space">
                  <div class="work-space-label">Student's explanation / work</div>
                </div>
              </div>`;
          }).join("");
        return `
          <div class="set">
            <div class="set-header">
              <span class="set-number">Set ${si + 1}</span>
              <span class="set-title">${cs.title}</span>
            </div>
            <p class="set-prompt">"${prompt}"</p>
            ${itemsHtml}
            <div class="examiner-notes">
              <strong>Examiner notes</strong>
              <div class="notes-lines">
                <div class="notes-line"></div>
                <div class="notes-line"></div>
                <div class="notes-line"></div>
              </div>
            </div>
          </div>`;
      }).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RAMRI Student Work Sheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, serif; font-size: 13pt; color: #111; background: #fff; padding: 24mm 20mm; }
    header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 24px; }
    header h1 { font-size: 16pt; font-weight: bold; letter-spacing: 0.02em; }
    header .meta { font-size: 10pt; color: #555; margin-top: 6px; display: flex; gap: 32px; }
    header .meta span { display: inline-flex; align-items: baseline; gap: 6px; }
    header .meta .blank { display: inline-block; border-bottom: 1px solid #555; min-width: 120px; height: 14px; }
    .set { margin-bottom: 32px; page-break-inside: avoid; }
    .set-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; }
    .set-number { font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
    .set-title { font-size: 13pt; font-weight: bold; }
    .set-prompt { font-size: 10.5pt; font-style: italic; color: #444; margin-bottom: 14px; border-left: 3px solid #bbb; padding-left: 10px; }
    .problem { background: #fafafa; border: 1px solid #ddd; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; }
    .problem-label { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #777; margin-bottom: 6px; }
    .problem-text { font-size: 13pt; line-height: 1.5; margin-bottom: 6px; }
    .problem-answer { font-size: 10pt; color: #555; margin-bottom: 8px; }
    .work-space { border: 1px dashed #bbb; border-radius: 4px; min-height: 64px; padding: 8px 10px; }
    .work-space-label { font-size: 8.5pt; color: #aaa; font-style: italic; }
    .examiner-notes { margin-top: 10px; }
    .examiner-notes strong { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; color: #777; }
    .notes-lines { margin-top: 6px; }
    .notes-line { border-bottom: 1px solid #ccc; height: 22px; }
    @media print {
      body { padding: 14mm 16mm; }
      .set { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>RAMRI — Student Work Sheet</h1>
    <div class="meta">
      <span>Student: <span class="blank"></span></span>
      <span>Date: ${date}</span>
      <span>Examiner: <span class="blank"></span></span>
    </div>
  </header>
  ${setsHtml || "<p>No choice sets with samples yet.</p>"}
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Pop-up blocked — please allow pop-ups for this page."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const generateChoiceSets = async () => {
    if (!sessionId) return;
    setGeneratingChoiceSets(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/generate-choice-sets`, {
        method: "POST", headers: jsonHeaders(),
      });
      if (!r.ok) { const e = await r.json() as { error: string }; alert(e.error ?? "Generation failed"); return; }
      const d = await r.json() as { choiceSets: ChoiceSet[] };
      setChoiceSets(prev => {
        const aiIds = new Set(d.choiceSets.map(c => c.id));
        const manual = prev.filter(c => !aiIds.has(c.id) && c.created_by !== "ai");
        return [...manual, ...d.choiceSets];
      });
    } finally { setGeneratingChoiceSets(false); }
  };

  // ── Interview phase ─────────────────────────────────────────────────────────
  const recordSelection = async (sampleId: string, choiceSetId?: string) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections`, {
      method: "POST", headers: jsonHeaders(), body: JSON.stringify({ workSampleId: sampleId, choiceSetId: choiceSetId ?? null }),
    });
    if (r.ok) {
      const d = await r.json() as { selection: Selection };
      setSelections(prev => [...prev, d.selection]);
      setActiveSelId(d.selection.id);
    }
  };

  const loadSelectionData = async (selId: string) => {
    if (interviewData[selId]) return;
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${selId}`, { headers: getAuth() });
    if (r.ok) {
      const d = await r.json();
      setInterviewData(prev => ({ ...prev, [selId]: d }));
    }
  };

  useEffect(() => {
    if (activeSelId) loadSelectionData(activeSelId);
  }, [activeSelId]);

  const generateQuestions = async (selId: string) => {
    const sel = selections.find(s => s.id === selId);
    if (!sel) return;
    const sample = samples.find(s => s.id === sel.work_sample_id);
    if (!sample) return;
    setGeneratingQs(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${selId}/generate-questions`, {
        method: "POST", headers: jsonHeaders(),
        body: JSON.stringify({ domain: sample.domain, skill: sample.skill, extractedProblem: sample.extracted_problem, studentAnswer: sample.student_answer, answerStatus: sample.answer_status, visibleWorking: sample.visible_working, teacherCorrection: sample.teacher_correction }),
      });
      if (!r.ok) throw new Error("Failed to generate questions");
      const d = await r.json() as { questions: Array<{ type: string; question: string; purpose: string }> };
      setGeneratedQs(d.questions);
    } finally { setGeneratingQs(false); }
  };

  const saveResponse = async (selId: string, questionType: string, generatedQ: string, directQuote: string, examinerParaphrase: string) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${selId}/responses`, {
      method: "POST", headers: jsonHeaders(),
      body: JSON.stringify({ questionType, generatedQuestion: generatedQ, approvedQuestion: generatedQ, directQuote, examinerParaphrase }),
    });
    if (r.ok) {
      const d = await r.json() as { response: Record<string, unknown> };
      setInterviewData(prev => {
        const ex = prev[selId] ?? { ownership: null, responses: [], transfer: null, observations: null };
        return { ...prev, [selId]: { ...ex, responses: [...ex.responses, d.response] } };
      });
    }
  };

  const saveObservations = async (selId: string, obs: { anxietyRating?: number; confidenceRating?: number; engagementRating?: number; notes?: string }) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${selId}/observations`, {
      method: "PUT", headers: jsonHeaders(), body: JSON.stringify(obs),
    });
    if (r.ok) {
      const d = await r.json() as { observations: Record<string, unknown> };
      setInterviewData(prev => ({ ...prev, [selId]: { ...(prev[selId] ?? { ownership: null, responses: [], transfer: null, observations: null }), observations: d.observations } }));
    }
  };

  const generateTransfer = async (selId: string, level: string) => {
    const sel = selections.find(s => s.id === selId);
    const sample = samples.find(s => s.id === sel?.work_sample_id);
    if (!sample) return;
    setGeneratingTransfer(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${selId}/generate-transfer`, {
        method: "POST", headers: jsonHeaders(),
        body: JSON.stringify({ domain: sample.domain, skill: sample.skill, extractedProblem: sample.extracted_problem, studentAnswer: sample.student_answer, transferLevel: level }),
      });
      if (!r.ok) throw new Error("Failed");
      const d = await r.json() as { prompt: string; examinerNote: string; level: string };
      return d;
    } finally { setGeneratingTransfer(false); }
  };

  // ── Scoring & Report ────────────────────────────────────────────────────────
  const saveRatings = async () => {
    const ratingsArray = REASONING_DOMAINS.map(domain => ({
      domain,
      rating: localRatings[domain]?.rating ?? null,
      evidenceStrength: localRatings[domain]?.evidenceStrength ?? null,
      supportingEvidence: localRatings[domain]?.supportingEvidence ?? null,
    }));
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/ratings`, {
      method: "PUT", headers: jsonHeaders(), body: JSON.stringify({ ratings: ratingsArray }),
    });
    if (r.ok) {
      const d = await r.json() as { ratings: DomainRating[] };
      setRatings(d.ratings);
    }
  };

  const generateReport = async () => {
    if (!sessionId) return;
    setGeneratingReport(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/report`, {
        method: "POST", headers: jsonHeaders(), body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json() as { report: Report };
      setReport(d.report);
      const narrative = (d.report.edited_narrative ?? d.report.generated_narrative) as Record<string, unknown>;
      setEditedNarrative(narrative ?? {});
    } catch (err) {
      alert("Report generation failed: " + (err instanceof Error ? err.message : String(err)));
    } finally { setGeneratingReport(false); }
  };

  const saveReport = async (status?: string) => {
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/report`, {
      method: "PATCH", headers: jsonHeaders(), body: JSON.stringify({ editedNarrative: editedNarrative, status }),
    });
    if (r.ok) { const d = await r.json() as { report: Report }; setReport(d.report); }
  };

  const resetSamples = async () => {
    if (!confirm("This will delete all extracted samples, choice sets, and interview data — but keep your uploaded documents so you can re-extract. Continue?")) return;
    const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/reset-samples`, {
      method: "POST", headers: jsonHeaders(),
    });
    if (!r.ok) { alert("Reset failed — please try again."); return; }
    setSamples([]);
    setChoiceSets([]);
    setSelections([]);
    setInterviewData({});
    setPhase("upload");
  };

  const approvedSamples = samples.filter(s => s.approved);

  // ── Error screen ────────────────────────────────────────────────────────────
  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
          <p className="font-semibold text-red-600 mb-1">Failed to load RAMRI session.</p>
          <p className="text-xs text-slate-400 mb-4">{pageError}</p>
          <a href={caseId ? `/cases/${caseId}` : "/"} className="text-sm text-violet-600 underline">← Back to Case</a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <a href={`/cases/${caseId}`} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={18} />
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">RAMRI</p>
          <h1 className="text-sm font-semibold text-slate-800 truncate">ReMynd Authentic Mathematical Reasoning Interview</h1>
        </div>
        <Badge variant="outline" className="text-xs">
          {approvedSamples.length} approved samples
        </Badge>
        {userRole !== "assessment_invigilator" && (
          <button onClick={resetSamples} title="Reset samples — keep documents, start extraction fresh" className="text-slate-400 hover:text-red-500 transition-colors">
            <RotateCcw size={15} />
          </button>
        )}
        {saving && <Loader2 size={14} className="animate-spin text-slate-400" />}
      </div>

      {/* Phase tabs */}
      <div className="bg-white border-b border-slate-200 px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {PHASES.filter(p => {
            if (userRole === "assessment_invigilator" && p.id === "scoring") return false;
            return true;
          }).map((p, i) => {
            const Icon = p.icon;
            const active = phase === p.id;
            const showDot = p.id === "upload" && newDocsCount > 0;
            const locked = userRole === "assessment_invigilator" && p.id !== "interview";
            return (
              <button
                key={p.id}
                disabled={locked}
                onClick={async () => {
                  if (locked) return;
                  if (p.id !== "upload" && phase === "upload" && !uploadsClosed) await callToggleUploads(true);
                  setPhase(p.id);
                }}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? "border-violet-600 text-violet-700"
                  : locked ? "border-transparent text-slate-300 cursor-not-allowed"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon size={14} />
                {i + 1}. {p.label}
                {showDot && (
                  <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 max-w-5xl mx-auto w-full">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 1: UPLOAD */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "upload" && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>Important:</strong> A completed or correct answer does not, by itself, establish that the student completed the work independently or understood the underlying concept.
            </div>

            {/* Uploads closed banner */}
            {uploadsClosed && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">Uploads are closed</p>
                  <p className="text-xs text-amber-700 mt-0.5">Contributors see a "submissions closed" message and cannot upload new samples. Click to reopen.</p>
                </div>
                <Button
                  size="sm"
                  disabled={togglingUploads}
                  onClick={async () => {
                    if (!sessionId) return;
                    setTogglingUploads(true);
                    try {
                      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/toggle-uploads`, {
                        method: "POST", headers: jsonHeaders(),
                        body: JSON.stringify({ closed: false }),
                      });
                      if (r.ok) {
                        const d = await r.json() as { uploadsClosed: boolean };
                        setUploadsClosed(d.uploadsClosed);
                      }
                    } finally {
                      setTogglingUploads(false);
                    }
                  }}
                >
                  {togglingUploads ? <Loader2 size={14} className="animate-spin" /> : "Reopen uploads"}
                </Button>
              </div>
            )}

            {/* New contributor uploads banner */}
            {newDocsCount > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <Bell size={16} className="text-emerald-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-emerald-800">
                    {newDocsCount === 1
                      ? "1 new document uploaded by contributor"
                      : `${newDocsCount} new documents uploaded by contributor`}
                  </p>
                  <p className="text-xs text-emerald-700">The document list below has been updated automatically.</p>
                </div>
                <button
                  onClick={() => setNewDocsCount(0)}
                  className="text-emerald-500 hover:text-emerald-700 shrink-0"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Contributor link */}
            {assignmentToken && (
              <div className={`bg-white rounded-xl border p-4 space-y-3 ${uploadsClosed ? "border-amber-200 bg-amber-50/40" : "border-slate-200"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-slate-700">Contributor upload link</p>
                      {uploadsClosed && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">Closed</span>
                      )}
                    </div>
                    <p className="text-xs truncate text-slate-400">
                      {window.location.origin}/ramri-upload/{assignmentToken}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/ramri-upload/${assignmentToken}`);
                    }}>
                      Copy link
                    </Button>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <p className="text-xs text-slate-400">
                    {uploadsClosed
                      ? "Contributors see a 'submissions closed' message and cannot upload."
                      : "Contributors can upload work samples via this link."}
                  </p>
                  {!uploadsClosed && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="shrink-0 text-xs ml-3"
                      disabled={togglingUploads}
                      onClick={async () => {
                        if (!sessionId) return;
                        setTogglingUploads(true);
                        try {
                          const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/toggle-uploads`, {
                            method: "POST", headers: jsonHeaders(),
                            body: JSON.stringify({ closed: true }),
                          });
                          if (r.ok) {
                            const d = await r.json() as { uploadsClosed: boolean };
                            setUploadsClosed(d.uploadsClosed);
                          }
                        } finally {
                          setTogglingUploads(false);
                        }
                      }}
                    >
                      {togglingUploads ? <Loader2 size={12} className="animate-spin" /> : "Close uploads"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Upload form */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h2 className="font-semibold text-slate-800 text-sm">Upload Work Document</h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-xs text-slate-600">Source</Label>
                  <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={uploadMeta.sourceType} onChange={e => setUploadMeta(p => ({ ...p, sourceType: e.target.value }))}>
                    {["teacher", "parent", "student", "school", "other"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Mathematics Topic</Label>
                  <Input className="mt-1 h-7 text-xs" placeholder="e.g. Addition" value={uploadMeta.mathTopic} onChange={e => setUploadMeta(p => ({ ...p, mathTopic: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Grade / Year Level</Label>
                  <Input className="mt-1 h-7 text-xs" placeholder="e.g. Year 4" value={uploadMeta.gradeLevel} onChange={e => setUploadMeta(p => ({ ...p, gradeLevel: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Completed Independently?</Label>
                  <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={uploadMeta.independenceReported} onChange={e => setUploadMeta(p => ({ ...p, independenceReported: e.target.value }))}>
                    {["yes", "no", "partially", "unknown"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Teacher Marked?</Label>
                  <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={uploadMeta.teacherMarked} onChange={e => setUploadMeta(p => ({ ...p, teacherMarked: e.target.value }))}>
                    {["yes", "no", "partially", "unknown"].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Teacher Comments</Label>
                  <Input className="mt-1 h-7 text-xs" placeholder="Optional" value={uploadMeta.teacherComments} onChange={e => setUploadMeta(p => ({ ...p, teacherComments: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-600">Contributor Notes</Label>
                <Textarea className="mt-1 text-xs" rows={2} placeholder="Any additional context about this work..." value={uploadMeta.contributorNotes} onChange={e => setUploadMeta(p => ({ ...p, contributorNotes: e.target.value }))} />
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs text-slate-500 mb-2">Photo (JPEG/PNG), PDF, or Word document — all accepted</p>
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <><Loader2 size={12} className="animate-spin mr-1" /> Uploading…</> : "Choose File"}
                </Button>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>

            {/* Uploaded docs */}
            {docs.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Uploaded Documents ({docs.length})</h3>
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <FileText size={16} className="text-violet-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{doc.file_name}</p>
                        <p className="text-xs text-slate-400">{doc.source_type} · {doc.math_topic || "No topic"} · Independence: {doc.independence_reported}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{doc.extraction_status}</Badge>
                      <button onClick={() => deleteDoc(doc.id)} className="text-slate-400 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button className="bg-violet-600 hover:bg-violet-700" onClick={async () => {
              if (!uploadsClosed) await callToggleUploads(true);
              setPhase("samples");
            }}>
              Continue to Samples <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 2: SAMPLES (manual entry + AI classification) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "samples" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">Work Samples ({samples.length})</h2>
                <p className="text-xs text-slate-500">AI reads your uploaded images and extracts individual problems. Review, then add or remove before saving.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {docs.length > 0 && (
                  <Button size="sm" variant="outline" className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50" onClick={extractSamples} disabled={extracting}>
                    {extracting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {extracting ? "Extracting…" : "Extract from Docs"}
                  </Button>
                )}
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5" onClick={() => setShowAddSample(true)}>
                  <Plus size={14} /> Add Sample
                </Button>
              </div>
            </div>

            {/* Extraction errors / info */}
            {extractErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
                {extractErrors.map((e, i) => (
                  <p key={i} className="text-xs text-amber-800">{e}</p>
                ))}
              </div>
            )}

            {/* AI-extracted candidates tray */}
            {extractCandidates.length > 0 && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-violet-600" />
                    <span className="text-sm font-semibold text-violet-800">AI found {extractCandidates.length} problem{extractCandidates.length !== 1 ? "s" : ""} — review before saving</span>
                  </div>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs h-7 gap-1" onClick={acceptAllCandidates}>
                    <Check size={11} /> Accept All
                  </Button>
                </div>
                <div className="space-y-2">
                  {extractCandidates.map(c => {
                    const crossRef = /\b(both problems?|question \d|the above|problem [a-z\d]|these problems?|either problem|each problem|compare|what did you notice|explain why you cannot)\b/i.test(c.extractedProblem ?? "");
                    return (
                    <div key={c._key} className={`bg-white border rounded-lg p-3 flex items-start gap-3 ${crossRef ? "border-amber-300 bg-amber-50/40" : "border-violet-100"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={`text-xs ${c.answerStatus === "correct" ? "text-emerald-600 border-emerald-200" : c.answerStatus === "incorrect" ? "text-red-600 border-red-200" : "text-amber-600 border-amber-200"}`}>
                            {(c.answerStatus ?? "unclear").replace("_", " ")}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-slate-500">working: {c.visibleWorking ?? "?"}</Badge>
                          <span className="text-xs text-slate-400">from {c.sourceDocName}</span>
                          {crossRef && (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border border-amber-300 gap-1">
                              ⚠ cross-reference — likely not standalone
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800">{c.extractedProblem}</p>
                        {c.studentAnswer && <p className="text-xs text-slate-500 mt-0.5">Answer: {c.studentAnswer}</p>}
                        {c.teacherCorrection && <p className="text-xs text-slate-400">Teacher: {c.teacherCorrection}</p>}
                        {c.examinerNotes && <p className="text-xs text-slate-400 italic">{c.examinerNotes}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => acceptCandidate(c)} className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200" title="Accept">
                          <Check size={13} />
                        </button>
                        <button onClick={() => rejectCandidate(c._key)} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-500 border border-red-200" title="Reject">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {showAddSample && (
              <div className="bg-white rounded-xl border-2 border-violet-200 p-5 space-y-3">
                <h3 className="font-semibold text-sm text-violet-800">New Work Sample</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs text-slate-600">Problem / Task *</Label>
                    <Textarea className="mt-1 text-xs" rows={2} placeholder="e.g. 368 + 157 = ___" value={newSampleForm.extractedProblem} onChange={e => setNewSampleForm(p => ({ ...p, extractedProblem: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Student's Answer</Label>
                    <Input className="mt-1 h-7 text-xs" placeholder="e.g. 525" value={newSampleForm.studentAnswer} onChange={e => setNewSampleForm(p => ({ ...p, studentAnswer: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Answer Status</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={newSampleForm.answerStatus} onChange={e => setNewSampleForm(p => ({ ...p, answerStatus: e.target.value }))}>
                      <option value="correct">Correct</option>
                      <option value="incorrect">Incorrect</option>
                      <option value="partially_correct">Partially Correct</option>
                      <option value="unclear">Unclear</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Visible Working?</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={newSampleForm.visibleWorking} onChange={e => setNewSampleForm(p => ({ ...p, visibleWorking: e.target.value }))}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                      <option value="partial">Partial</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Difficulty</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={newSampleForm.difficulty} onChange={e => setNewSampleForm(p => ({ ...p, difficulty: e.target.value }))}>
                      {["introductory", "developing", "expected", "advanced"].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Domain (optional)</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={newSampleForm.domain} onChange={e => setNewSampleForm(p => ({ ...p, domain: e.target.value }))}>
                      <option value="">— Let AI classify —</option>
                      {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Skill</Label>
                    <Input className="mt-1 h-7 text-xs" placeholder="e.g. Regrouping" value={newSampleForm.skill} onChange={e => setNewSampleForm(p => ({ ...p, skill: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Teacher Correction</Label>
                    <Input className="mt-1 h-7 text-xs" placeholder="Optional" value={newSampleForm.teacherCorrection} onChange={e => setNewSampleForm(p => ({ ...p, teacherCorrection: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-slate-600">Examiner Notes</Label>
                    <Textarea className="mt-1 text-xs" rows={1} placeholder="Optional observations" value={newSampleForm.examinerNotes} onChange={e => setNewSampleForm(p => ({ ...p, examinerNotes: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={addSample} disabled={saving || !newSampleForm.extractedProblem.trim()}>
                    {saving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Plus size={12} className="mr-1" />} Add Sample
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddSample(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {samples.length === 0 && !showAddSample && (
              <div className="text-center py-12 text-slate-400 text-sm">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p>No samples yet. Add problems from the uploaded documents.</p>
              </div>
            )}

            <div className="space-y-3">
              {samples.map(sample => {
                const reasoningFocus = Array.isArray(sample.reasoning_focus)
                  ? sample.reasoning_focus
                  : (typeof sample.reasoning_focus === "string" && sample.reasoning_focus
                    ? JSON.parse(sample.reasoning_focus) as string[]
                    : []);
                return (
                  <div key={sample.id} className={`bg-white rounded-xl border p-4 ${sample.approved ? "border-emerald-200" : "border-slate-200"}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {sample.approved && <Badge className="bg-emerald-100 text-emerald-700 text-xs border-0">Approved</Badge>}
                          {sample.domain && <Badge variant="outline" className="text-xs">{sample.domain}</Badge>}
                          {sample.answer_status && (
                            <Badge variant="outline" className={`text-xs ${sample.answer_status === "correct" ? "text-emerald-600 border-emerald-200" : sample.answer_status === "incorrect" ? "text-red-600 border-red-200" : "text-amber-600 border-amber-200"}`}>
                              {sample.answer_status.replace("_", " ")}
                            </Badge>
                          )}
                          {sample.difficulty && <Badge variant="outline" className="text-xs text-slate-500">{sample.difficulty}</Badge>}
                        </div>
                        <p className="text-sm font-medium text-slate-800">{sample.extracted_problem || "No problem text"}</p>
                        {sample.student_answer && <p className="text-xs text-slate-500 mt-0.5">Answer: {sample.student_answer}</p>}
                        {sample.skill && <p className="text-xs text-slate-400">Skill: {sample.skill}</p>}
                        {reasoningFocus.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-1">
                            {reasoningFocus.map((f: string) => <span key={f} className="text-xs bg-violet-50 text-violet-600 rounded px-1.5 py-0.5">{f}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => classifySample(sample)} disabled={classifying === sample.id}>
                          {classifying === sample.id ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} AI Classify
                        </Button>
                        <Button size="sm" variant="outline" className={`text-xs h-7 gap-1 ${sample.approved ? "border-emerald-300 text-emerald-700" : ""}`} onClick={() => approveSample(sample.id, !sample.approved)}>
                          {sample.approved ? <><Check size={10} /> Approved</> : <><Check size={10} /> Approve</>}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 text-red-500 border-red-200 hover:bg-red-50" onClick={() => deleteSample(sample.id)}>
                          <Trash2 size={10} />
                        </Button>
                      </div>
                    </div>
                    {sample.examiner_notes && <p className="text-xs text-slate-500 mt-2 italic">Note: {sample.examiner_notes}</p>}
                  </div>
                );
              })}
            </div>

            {samples.length > 0 && (
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setPhase("review")}>
                Continue to Review <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 3: REVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "review" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">Clinical Review</h2>
              <p className="text-xs text-slate-500">Review and approve samples for the Student Work Sample Bank. Only approved samples will appear in choice sets.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>AI extraction must never be treated as final. Verify every sample before approving.</span>
            </div>

            {samples.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">No samples to review. Add samples in the previous step.</div>
            )}

            <div className="grid gap-3">
              {samples.map(sample => (
                <div key={sample.id} className={`bg-white rounded-xl border p-4 ${sample.approved ? "border-emerald-300 bg-emerald-50/30" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold text-slate-800">{sample.extracted_problem}</p>
                      <div className="flex gap-2 flex-wrap text-xs">
                        <span className="text-slate-500">Answer: <strong>{sample.student_answer || "—"}</strong></span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">Domain: <strong>{sample.domain || "Unclassified"}</strong></span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">Status: <strong>{sample.answer_status?.replace("_", " ") || "—"}</strong></span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">Working: <strong>{sample.visible_working || "—"}</strong></span>
                      </div>
                      {sample.teacher_correction && <p className="text-xs text-amber-700">Teacher correction: {sample.teacher_correction}</p>}
                      {sample.examiner_notes && <p className="text-xs text-slate-400 italic">{sample.examiner_notes}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button size="sm" className={`text-xs h-8 gap-1 ${sample.approved ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"}`} onClick={() => approveSample(sample.id, !sample.approved)}>
                        {sample.approved ? <><CheckSquare size={12} /> Approved</> : <><Check size={12} /> Approve</>}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs h-8 gap-1 text-red-500" onClick={() => updateSampleField(sample.id, "suitability", "excluded")}>
                        <X size={12} /> Exclude
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">
                <strong className="text-emerald-700">{approvedSamples.length}</strong> of <strong>{samples.length}</strong> samples approved
              </div>
              {approvedSamples.length > 0 && (
                <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setPhase("bank")}>
                  View Sample Bank <ChevronRight size={14} className="ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 4: SAMPLE BANK */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "bank" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">Student Work Sample Bank</h2>
              <p className="text-xs text-slate-500">{approvedSamples.length} approved samples ready for interview use.</p>
            </div>

            {approvedSamples.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                <LayoutGrid size={32} className="mx-auto mb-2 opacity-40" />
                <p>No approved samples yet. Review and approve samples first.</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setPhase("review")}>Go to Review</Button>
              </div>
            )}

            {/* Group by domain */}
            {(() => {
              const byDomain: Record<string, WorkSample[]> = {};
              for (const s of approvedSamples) {
                const d = s.domain || "Unclassified";
                if (!byDomain[d]) byDomain[d] = [];
                byDomain[d].push(s);
              }
              return Object.entries(byDomain).map(([domain, domainSamples]) => (
                <div key={domain} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain size={14} className="text-violet-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">{domain}</h3>
                    <Badge variant="outline" className="text-xs">{domainSamples.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {domainSamples.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 text-xs">
                        <CheckSquare size={12} className="text-emerald-500 shrink-0" />
                        <span className="flex-1 text-slate-700">{s.extracted_problem}</span>
                        <span className={`${s.answer_status === "correct" ? "text-emerald-600" : s.answer_status === "incorrect" ? "text-red-500" : "text-amber-600"}`}>
                          {s.answer_status?.replace("_", " ")}
                        </span>
                        <span className="text-slate-400">{s.difficulty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}

            {approvedSamples.length > 0 && (
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setPhase("choicesets")}>
                Build Choice Sets <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 5: CHOICE SETS */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "choicesets" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-slate-800">Choice Sets</h2>
              <p className="text-xs text-slate-500">AI groups your approved samples into sets of 2–3 for the student to choose from. You can edit or remove samples within each set.</p>
            </div>

            {/* Handoff banner — visible to admin/psychometrician once sets are ready */}
            {userRole !== "assessment_invigilator" && choiceSets.length > 0 && (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-900">Ready for interview</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {choiceSets.length} choice set{choiceSets.length !== 1 ? "s" : ""} prepared.
                    {invigilatorName
                      ? ` Invigilator: ${invigilatorName}`
                      : " The invigilator can now log in and access the Interview tab."}
                  </p>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0" onClick={() => setPhase("interview")}>
                  Go to Interview
                </Button>
              </div>
            )}

            {/* AI Generate button */}
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-violet-800">AI Choice Set Generator</p>
                <p className="text-xs text-violet-600 mt-0.5">
                  {approvedSamples.length === 0
                    ? "No approved samples yet — approve samples in the Sample Bank first."
                    : `${approvedSamples.length} approved sample${approvedSamples.length !== 1 ? "s" : ""} ready to group.`}
                  {choiceSets.some(c => c.created_by === "ai") && " Re-generate to replace AI sets."}
                </p>
              </div>
              <Button
                className="bg-violet-600 hover:bg-violet-700 gap-2 shrink-0"
                onClick={generateChoiceSets}
                disabled={generatingChoiceSets || approvedSamples.length === 0}
              >
                {generatingChoiceSets ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate Choice Sets</>}
              </Button>
            </div>

            {/* Manual add (secondary) */}
            <details className="bg-white rounded-xl border border-slate-200">
              <summary className="px-4 py-3 text-xs text-slate-500 cursor-pointer select-none font-medium hover:text-slate-700">+ Add set manually</summary>
              <div className="px-4 pb-4 pt-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-600">Title *</Label>
                    <Input className="mt-1 h-7 text-xs" placeholder="e.g. Open Choice 1" value={newSetForm.title} onChange={e => setNewSetForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Type</Label>
                    <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs" value={newSetForm.choiceType} onChange={e => setNewSetForm(p => ({ ...p, choiceType: e.target.value }))}>
                      <option value="open">Open Choice</option>
                      <option value="domain_guided">Domain-Guided</option>
                      <option value="challenge">Challenge Choice</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Student Prompt</Label>
                    <Input className="mt-1 h-7 text-xs" placeholder="Which piece would you like to show me?" value={newSetForm.studentPrompt} onChange={e => setNewSetForm(p => ({ ...p, studentPrompt: e.target.value }))} />
                  </div>
                </div>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1" onClick={createChoiceSet} disabled={saving || !newSetForm.title.trim()}>
                  <Plus size={12} /> Create Set
                </Button>
              </div>
            </details>

            {/* Existing choice sets */}
            {choiceSets.map(cs => {
              const isEditing = editingSetId === cs.id;
              const currentItems = isEditing ? editingSetItems : cs.items.map(i => i.work_sample_id);
              return (
                <div key={cs.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{cs.title}</h3>
                      <p className="text-xs text-slate-400">{cs.choice_type.replace("_", " ")} · {cs.items.length} samples</p>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setEditingSetId(cs.id); setEditingSetItems(cs.items.map(i => i.work_sample_id)); }}>
                            Edit Samples
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => recommendChoiceSet(cs.id, cs.target_domain ?? "")} disabled={recommending}>
                            {recommending ? <Loader2 size={10} className="animate-spin" /> : <Star size={10} />} AI Suggest
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs h-7 text-red-500" onClick={() => deleteChoiceSet(cs.id)}>
                            <Trash2 size={10} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs h-7" onClick={() => { saveChoiceSetItems(cs.id, editingSetItems); setEditingSetId(null); }}>Save</Button>
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEditingSetId(null)}>Cancel</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {cs.student_prompt && (
                    <p className="text-xs text-slate-500 italic mb-2">Prompt: "{cs.student_prompt}"</p>
                  )}

                  {isEditing ? (
                    <div className="space-y-1">
                      {recommendRationale[cs.id] && (
                        <div className="flex items-start gap-2 mb-3 bg-violet-50 border border-violet-200 rounded-lg p-2.5 text-xs text-violet-800">
                          <Star size={12} className="mt-0.5 shrink-0 text-violet-500" />
                          <div className="flex-1">
                            <span className="font-semibold">AI suggestion: </span>{recommendRationale[cs.id]}
                          </div>
                          <button onClick={() => setRecommendRationale(prev => { const n = { ...prev }; delete n[cs.id]; return n; })} className="text-violet-400 hover:text-violet-600 shrink-0">✕</button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mb-2">Select 2–4 approved samples:</p>
                      {approvedSamples.map(s => (
                        <label key={s.id} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={currentItems.includes(s.id)} onChange={e => setEditingSetItems(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                          <span className="flex-1">{s.extracted_problem}</span>
                          <span className="text-slate-400">{s.domain}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {cs.items.map(item => {
                        const s = samples.find(s => s.id === item.work_sample_id);
                        return s ? (
                          <div key={item.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-slate-50">
                            <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">{item.display_order + 1}</div>
                            <span className="flex-1">{s.extracted_problem}</span>
                            <span className="text-slate-400">{s.domain}</span>
                          </div>
                        ) : null;
                      })}
                      {cs.items.length === 0 && <p className="text-xs text-slate-400 italic">No samples added yet. Click "Edit Samples" to add.</p>}
                    </div>
                  )}
                </div>
              );
            })}

            {choiceSets.some(cs => cs.items.length > 0) && (
              <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" className="gap-2 text-slate-700 border-slate-300" onClick={printStudentSheet}>
                  <Printer size={14} /> Print Student Sheet
                </Button>
                <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setPhase("interview")}>
                  Start Interview <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 6: INTERVIEW */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "interview" && (
          <div className="space-y-4">
            {/* Invigilator identity badge — shown to both roles once invigilator has connected */}
            {invigilatorId && (
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 text-xs text-violet-800">
                <Users size={13} className="shrink-0" />
                <span>
                  Invigilator: <strong>{invigilatorName ?? invigilatorId}</strong>
                  {userRole === "assessment_invigilator" && " (you)"}
                </span>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Opening Script</p>
              <p className="italic">"Today, we are going to look at some maths you have already done. You will choose which pieces you would like to show me. I am interested in how you were thinking when you did them. You can explain with words, point to the page, draw something, or show me in another way. This is not about doing the same test again."</p>
              <div className="flex gap-2 mt-2">
                {["Script delivered as written", "Script adapted", "Student appeared reassured", "Student remained hesitant"].map(opt => (
                  <label key={opt} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="w-3 h-3" />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Session general notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <Label className="text-xs text-slate-600 font-semibold">Session Notes</Label>
              <Textarea className="mt-1 text-xs" rows={2} placeholder="General session observations..." defaultValue={session?.general_notes ?? ""} onBlur={e => saveSession({ generalNotes: e.target.value } as Partial<Session>)} />
            </div>

            {/* Choice sets / sample selection */}
            {choiceSets.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">Present Choice Set to Student</h3>
                {choiceSets.map(cs => (
                  <div key={cs.id} className="border border-slate-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{cs.choice_type.replace("_", " ")}</Badge>
                      <span className="text-sm font-medium text-slate-700">{cs.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 italic">{cs.student_prompt || "Which piece of maths would you most like to show me?"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {cs.items.map(item => {
                        const s = samples.find(s => s.id === item.work_sample_id);
                        if (!s) return null;
                        const alreadySelected = selections.some(sel => sel.work_sample_id === s.id && sel.choice_set_id === cs.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => !alreadySelected && recordSelection(s.id, cs.id)}
                            disabled={alreadySelected}
                            className={`text-left p-3 rounded-lg border-2 text-xs transition-all ${alreadySelected ? "border-violet-300 bg-violet-50 cursor-default" : "border-slate-200 hover:border-violet-300 bg-white"}`}
                          >
                            <p className="font-medium text-slate-700 mb-1">{s.extracted_problem}</p>
                            {alreadySelected && <span className="text-violet-600 text-xs">✓ Student selected this</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick ad-hoc selection from approved samples */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
              <h3 className="font-semibold text-slate-800 text-sm">Or — Direct Sample Selection</h3>
              <p className="text-xs text-slate-500">Use when student picks from full bank without a preset choice set.</p>
              <div className="grid grid-cols-2 gap-2">
                {approvedSamples.map(s => (
                  <button key={s.id} onClick={() => recordSelection(s.id)} className="text-left p-2 rounded-lg border border-slate-100 hover:border-violet-300 bg-slate-50 text-xs">
                    <p className="font-medium text-slate-700 truncate">{s.extracted_problem}</p>
                    <p className="text-slate-400">{s.domain}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Active selections */}
            {selections.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 text-sm">Sample Interviews ({selections.length})</h3>
                {selections.map((sel, idx) => {
                  const sample = samples.find(s => s.id === sel.work_sample_id);
                  const isActive = activeSelId === sel.id;
                  const selData = interviewData[sel.id];

                  return (
                    <div key={sel.id} className="bg-white rounded-xl border border-slate-200">
                      <button
                        className="w-full flex items-center gap-3 p-4 text-left"
                        onClick={() => { setActiveSelId(isActive ? null : sel.id); if (!isActive) loadSelectionData(sel.id); }}
                      >
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{sample?.extracted_problem || "Unknown sample"}</p>
                          <p className="text-xs text-slate-400">{sample?.domain} · {sample?.skill}</p>
                        </div>
                        {isActive ? <ChevronLeft size={14} className="text-slate-400 rotate-90" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </button>

                      {isActive && (
                        <div className="border-t border-slate-100 p-4 space-y-4">
                          {/* Work sample display */}
                          {sample && (
                            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
                              <p className="font-semibold text-slate-700">Problem: {sample.extracted_problem}</p>
                              <p className="text-slate-500">Student's answer: <strong>{sample.student_answer || "—"}</strong> · {sample.answer_status?.replace("_", " ")}</p>
                              {sample.visible_working !== "no" && <p className="text-slate-500">Working visible: {sample.visible_working}</p>}
                              {sample.teacher_correction && <p className="text-amber-700">Teacher correction: {sample.teacher_correction}</p>}
                            </div>
                          )}

                          {/* Generate questions */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-xs font-semibold text-slate-700">Interview Questions</h4>
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => generateQuestions(sel.id)} disabled={generatingQs}>
                                {generatingQs ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} AI Generate Questions
                              </Button>
                            </div>

                            {generatedQs.length > 0 && (
                              <div className="space-y-2">
                                {generatedQs.map((q, qi) => (
                                  <InterviewQuestionCard key={qi} question={q} selId={sel.id} onSave={saveResponse} />
                                ))}
                              </div>
                            )}

                            {(selData?.responses?.length ?? 0) > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs text-slate-500 font-medium">Saved responses ({selData!.responses.length})</p>
                                {(selData!.responses as Array<Record<string, unknown>>).map((resp, ri) => (
                                  <div key={ri} className="p-2 rounded-lg bg-slate-50 text-xs">
                                    <p className="text-slate-600 font-medium">Q: {resp.approved_question as string || resp.generated_question as string}</p>
                                    {resp.direct_quote && <p className="text-violet-700 italic mt-0.5">"{resp.direct_quote as string}"</p>}
                                    {resp.examiner_paraphrase && <p className="text-slate-500 mt-0.5">Paraphrase: {resp.examiner_paraphrase as string}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Behavioral observations */}
                          <BehavioralObsPanel selId={sel.id} existing={selData?.observations as Record<string, unknown> | null ?? null} onSave={saveObservations} />

                          {/* Transfer prompt */}
                          <TransferPromptPanel
                            selId={sel.id} sample={sample ?? null}
                            existing={selData?.transfer as Record<string, unknown> | null ?? null}
                            generating={generatingTransfer}
                            onGenerate={generateTransfer}
                            onSave={async (data) => {
                              const r = await fetch(`${BASE_URL}/api/cases/${caseId}/ramri/sessions/${sessionId}/selections/${sel.id}/transfer`, {
                                method: "POST", headers: jsonHeaders(), body: JSON.stringify(data),
                              });
                              if (r.ok) {
                                const d = await r.json() as { transferPrompt: Record<string, unknown> };
                                setInterviewData(prev => ({ ...prev, [sel.id]: { ...(prev[sel.id] ?? { ownership: null, responses: [], transfer: null, observations: null }), transfer: d.transferPrompt } }));
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selections.length > 0 && userRole !== "assessment_invigilator" && (
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setPhase("scoring")}>
                Go to Scoring & Report <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* PHASE 7: SCORING & REPORT */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {phase === "scoring" && userRole !== "assessment_invigilator" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-800">Scoring & Report</h2>
              <p className="text-xs text-slate-500">Rate each reasoning domain 0–4 or mark as Not Observed. Evidence strength reflects confidence in the rating.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <strong>RAMRI Disclaimer:</strong> RAMRI is a structured qualitative and criterion-referenced reasoning interview. Results must not be represented as standardized scores, age equivalents, grade equivalents, or diagnostic conclusions.
            </div>

            {/* Domain ratings */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">Mathematical Reasoning Domains</h3>
              <div className="space-y-4">
                {REASONING_DOMAINS.map(domain => {
                  const lr = localRatings[domain] ?? { rating: null, evidenceStrength: "", supportingEvidence: "" };
                  return (
                    <div key={domain} className="space-y-2 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{domain}</span>
                        {lr.rating !== null && (
                          <span className="text-xs text-slate-500">{RATING_LABELS[lr.rating]}</span>
                        )}
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        {[0, 1, 2, 3, 4].map(v => (
                          <RatingBtn key={v} value={v} selected={lr.rating === v} onClick={() => setLocalRatings(prev => ({ ...prev, [domain]: { ...lr, rating: v } }))} />
                        ))}
                        <RatingBtn value="NO" selected={lr.rating === null && localRatings[domain] !== undefined} onClick={() => setLocalRatings(prev => ({ ...prev, [domain]: { ...lr, rating: null } }))} />
                      </div>
                      {lr.rating !== null && (
                        <div className="flex gap-2">
                          <select className="border border-slate-200 rounded-md px-2 py-1 text-xs" value={lr.evidenceStrength} onChange={e => setLocalRatings(prev => ({ ...prev, [domain]: { ...lr, evidenceStrength: e.target.value } }))}>
                            <option value="">Evidence strength…</option>
                            {EVIDENCE_STRENGTH.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                          </select>
                          <Input className="h-7 text-xs flex-1" placeholder="Supporting evidence…" value={lr.supportingEvidence} onChange={e => setLocalRatings(prev => ({ ...prev, [domain]: { ...lr, supportingEvidence: e.target.value } }))} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" className="gap-1" onClick={saveRatings}>
                <Check size={14} /> Save Ratings
              </Button>
            </div>

            {/* Report generation */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">Clinical Report</h3>
                  {report && <p className="text-xs text-slate-400">Status: <strong className={report.status === "approved" ? "text-emerald-600" : "text-amber-600"}>{report.status}</strong></p>}
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700 gap-1" onClick={generateReport} disabled={generatingReport}>
                  {generatingReport ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Wand2 size={14} /> {report ? "Regenerate" : "Generate"} Report</>}
                </Button>
              </div>

              {report && (
                <>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>AI-generated report — human review and approval required before release.</span>
                  </div>

                  {/* Editable narrative sections */}
                  {(["assessmentContext", "participationSummary", "reasoningProfile", "performanceVsReasoning", "conditionEffect"] as const).map(key => {
                    const labels: Record<string, string> = {
                      assessmentContext: "Assessment Context",
                      participationSummary: "Participation & Emotional Presentation",
                      reasoningProfile: "Mathematical Reasoning Profile",
                      performanceVsReasoning: "Performance vs. Reasoning",
                      conditionEffect: "Effect of Assessment Conditions",
                    };
                    const value = (editedNarrative[key] as string) ?? "";
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">{labels[key]}</Label>
                        <Textarea
                          className="text-xs"
                          rows={3}
                          value={value}
                          onChange={e => setEditedNarrative(prev => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    );
                  })}

                  {/* Lists */}
                  {(["strengths", "areasForDevelopment", "recommendations", "limitations"] as const).map(key => {
                    const labels: Record<string, string> = { strengths: "Strengths", areasForDevelopment: "Areas for Development", recommendations: "Recommendations", limitations: "Limitations" };
                    const items = (editedNarrative[key] as string[]) ?? [];
                    return (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700">{labels[key]}</Label>
                        {items.map((item, i) => (
                          <div key={i} className="flex gap-2">
                            <Input
                              className="h-7 text-xs flex-1"
                              value={item}
                              onChange={e => setEditedNarrative(prev => {
                                const newItems = [...(prev[key] as string[] ?? [])];
                                newItems[i] = e.target.value;
                                return { ...prev, [key]: newItems };
                              })}
                            />
                            <button onClick={() => setEditedNarrative(prev => ({ ...prev, [key]: (prev[key] as string[]).filter((_, j) => j !== i) }))} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
                          </div>
                        ))}
                        <Button size="sm" variant="outline" className="text-xs h-6 gap-1" onClick={() => setEditedNarrative(prev => ({ ...prev, [key]: [...(prev[key] as string[] ?? []), ""] }))}>
                          <Plus size={10} /> Add
                        </Button>
                      </div>
                    );
                  })}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="gap-1" onClick={() => saveReport()}>
                      <FileCheck size={14} /> Save Draft
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1" onClick={() => saveReport("approved")}>
                      <Check size={14} /> Approve & Release
                    </Button>
                    <Button variant="outline" className="gap-1" onClick={() => window.print()}>
                      <Download size={14} /> Print / PDF
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InterviewQuestionCard({ question, selId, onSave }: {
  question: { type: string; question: string; purpose: string };
  selId: string;
  onSave: (selId: string, type: string, q: string, quote: string, paraphrase: string) => void;
}) {
  const [quote, setQuote] = useState("");
  const [paraphrase, setParaphrase] = useState("");
  const [saved, setSaved] = useState(false);

  const typeColors: Record<string, string> = {
    universal: "bg-blue-50 text-blue-700 border-blue-100",
    conceptual: "bg-violet-50 text-violet-700 border-violet-100",
    strategy: "bg-emerald-50 text-emerald-700 border-emerald-100",
    verification: "bg-amber-50 text-amber-700 border-amber-100",
    error_awareness: "bg-red-50 text-red-700 border-red-100",
    metacognition: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={`rounded-lg border p-3 text-xs ${typeColors[question.type] ?? "bg-slate-50 border-slate-100"}`}>
      <div className="flex items-start gap-2 mb-2">
        <Badge variant="outline" className="text-xs shrink-0 capitalize">{question.type.replace("_", " ")}</Badge>
        <p className="font-medium">{question.question}</p>
      </div>
      <p className="text-xs opacity-70 mb-2 italic">{question.purpose}</p>
      {!saved && (
        <div className="space-y-1">
          <Textarea className="text-xs" rows={1} placeholder='Student quote: "…"' value={quote} onChange={e => setQuote(e.target.value)} />
          <Textarea className="text-xs" rows={1} placeholder="Examiner paraphrase…" value={paraphrase} onChange={e => setParaphrase(e.target.value)} />
          <Button size="sm" className="text-xs h-6 bg-violet-600 hover:bg-violet-700 gap-1" onClick={() => { onSave(selId, question.type, question.question, quote, paraphrase); setSaved(true); }}>
            <Check size={10} /> Save Response
          </Button>
        </div>
      )}
      {saved && <p className="text-xs text-emerald-600 mt-1">✓ Response saved</p>}
    </div>
  );
}

function BehavioralObsPanel({ selId, existing, onSave }: {
  selId: string;
  existing: Record<string, unknown> | null;
  onSave: (selId: string, obs: { anxietyRating?: number; confidenceRating?: number; engagementRating?: number; notes?: string }) => void;
}) {
  const [anxiety, setAnxiety] = useState<number | null>(existing?.anxiety_rating as number ?? null);
  const [confidence, setConfidence] = useState<number | null>(existing?.confidence_rating as number ?? null);
  const [engagement, setEngagement] = useState<number | null>(existing?.engagement_rating as number ?? null);
  const [notes, setNotes] = useState((existing?.notes as string) ?? "");
  const [saved, setSaved] = useState(false);

  const ratingLabel = (v: number | null) => v === null ? "—" : ["None", "Mild", "Noticeable", "Significant", "Severe"][v] ?? String(v);

  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-3">
      <h4 className="text-xs font-semibold text-slate-700">Behavioral Observations</h4>
      {[
        { label: "Anxiety (0=none → 4=severe)", val: anxiety, set: setAnxiety },
        { label: "Confidence (0=unable → 4=confident)", val: confidence, set: setConfidence },
        { label: "Engagement (0=none → 4=active)", val: engagement, set: setEngagement },
      ].map(({ label, val, set }) => (
        <div key={label}>
          <p className="text-xs text-slate-500 mb-1">{label} — <strong>{ratingLabel(val)}</strong></p>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(v => (
              <button key={v} onClick={() => { set(v); setSaved(false); }} className={`w-8 h-8 rounded-lg text-xs font-bold border-2 ${val === v ? "bg-violet-600 border-violet-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <Textarea className="text-xs" rows={1} placeholder="Observation notes…" value={notes} onChange={e => { setNotes(e.target.value); setSaved(false); }} />
      <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { onSave(selId, { anxietyRating: anxiety ?? undefined, confidenceRating: confidence ?? undefined, engagementRating: engagement ?? undefined, notes }); setSaved(true); }}>
        {saved ? <><Check size={10} /> Saved</> : <><Check size={10} /> Save Observations</>}
      </Button>
    </div>
  );
}

function TransferPromptPanel({ selId, sample, existing, generating, onGenerate, onSave }: {
  selId: string;
  sample: WorkSample | null;
  existing: Record<string, unknown> | null;
  generating: boolean;
  onGenerate: (selId: string, level: string) => Promise<{ prompt: string; examinerNote: string } | undefined>;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const [level, setLevel] = useState("A");
  const [genPrompt, setGenPrompt] = useState((existing?.generated_prompt as string) ?? "");
  const [approvedPrompt, setApprovedPrompt] = useState((existing?.approved_prompt as string) ?? "");
  const [studentResponse, setStudentResponse] = useState((existing?.student_response as string) ?? "");
  const [rating, setRating] = useState<number | null>(existing?.transfer_rating as number ?? null);
  const [notes, setNotes] = useState((existing?.notes as string) ?? "");
  const [examinerNote, setExaminerNote] = useState("");
  const [saved, setSaved] = useState(false);

  const LEVEL_LABELS: Record<string, string> = {
    A: "A — Verbal variation (no calculation required)",
    B: "B — Partial demonstration (first step only)",
    C: "C — Similar complete problem",
    D: "D — Different representation",
  };

  return (
    <div className="border border-slate-100 rounded-lg p-3 space-y-3">
      <h4 className="text-xs font-semibold text-slate-700">Transfer Prompt (Optional)</h4>
      <div className="flex gap-2 items-center">
        <select className="border border-slate-200 rounded-md px-2 py-1 text-xs flex-1" value={level} onChange={e => setLevel(e.target.value)}>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button size="sm" variant="outline" className="text-xs h-7 gap-1 shrink-0" onClick={async () => {
          const d = await onGenerate(selId, level);
          if (d) { setGenPrompt(d.prompt); setApprovedPrompt(d.prompt); setExaminerNote(d.examinerNote); }
        }} disabled={generating}>
          {generating ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} Generate
        </Button>
      </div>
      {genPrompt && (
        <div className="space-y-2">
          {examinerNote && <p className="text-xs text-slate-500 italic">Examiner note: {examinerNote}</p>}
          <Textarea className="text-xs" rows={2} placeholder="Edit the transfer prompt before showing student…" value={approvedPrompt} onChange={e => setApprovedPrompt(e.target.value)} />
          <Textarea className="text-xs" rows={1} placeholder="Student response…" value={studentResponse} onChange={e => setStudentResponse(e.target.value)} />
          <div>
            <p className="text-xs text-slate-500 mb-1">Transfer rating (0–4 or NO):</p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map(v => (
                <button key={v} onClick={() => setRating(v)} className={`w-8 h-8 rounded-lg text-xs font-bold border-2 ${rating === v ? "bg-violet-600 border-violet-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>{v}</button>
              ))}
              <button onClick={() => setRating(null)} className={`px-2 h-8 rounded-lg text-xs font-bold border-2 ${rating === null ? "bg-slate-700 border-slate-500 text-white" : "bg-white border-slate-200 text-slate-600"}`}>NO</button>
            </div>
          </div>
          <Textarea className="text-xs" rows={1} placeholder="Transfer notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => { onSave({ transferLevel: level, generatedPrompt: genPrompt, approvedPrompt, studentResponse, transferRating: rating, notes }); setSaved(true); }}>
            {saved ? <><Check size={10} /> Saved</> : <><Check size={10} /> Save Transfer</>}
          </Button>
        </div>
      )}
    </div>
  );
}

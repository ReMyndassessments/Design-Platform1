import React, { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type Lang = "english" | "mandarin" | "korean";

const T = {
  title:             { english: "ReMynd — Work Upload",                    mandarin: "ReMynd — 作业上传",                korean: "ReMynd — 과제 업로드" },
  subtitle:          { english: "Mathematical Reasoning Interview preparation", mandarin: "数学推理访谈准备",            korean: "수학적 추론 인터뷰 준비" },
  instructions:      { english: (name: string) => `Please share a piece of ${name}'s recent mathematics work.`,
                       mandarin: (name: string) => `请提供一份 ${name} 近期的数学作业。`,
                       korean:   (name: string) => `${name}의 최근 수학 과제를 하나 공유해 주세요.` },
  instructionsSub:   { english: "Upload a photo, PDF, or Word document. For photos, make sure the page is flat, well-lit, and all writing is clearly visible. You can submit multiple documents — one at a time.",
                       mandarin: "您可以上传手机拍摄的照片、PDF 或 Word 文档。如果上传照片，请确保页面平整、光线充足、所有书写清晰可见。每次提交一份作业。",
                       korean:   "사진, PDF, 또는 Word 문서를 업로드해 주세요. 사진의 경우 페이지가 평평하고 밝은 곳에서 글씨가 선명하게 보이도록 해주세요. 한 번에 하나씩 제출할 수 있습니다." },
  submitted:         { english: (n: number) => `${n} document${n > 1 ? "s" : ""} submitted — thank you!`,
                       mandarin: (n: number) => `已提交 ${n} 份文件——谢谢！`,
                       korean:   (n: number) => `${n}개 문서 제출됨 — 감사합니다!` },
  submittedSub:      { english: "You can submit another piece of work below.",
                       mandarin: "您可以在下方再提交一份作业。",
                       korean:   "아래에서 다른 과제를 제출할 수 있습니다." },
  uploadLabel:       { english: "Tap to upload a photo or document",
                       mandarin: "点击上传照片或文档",
                       korean:   "탭하여 사진 또는 문서 업로드" },
  uploadSub:         { english: "Photo, PDF, or Word document",
                       mandarin: "照片、PDF 或 Word 文档",
                       korean:   "사진, PDF 또는 Word 문서" },
  uploading:         { english: "Uploading…",                  mandarin: "上传中…",               korean: "업로드 중…" },
  remove:            { english: "Remove",                      mandarin: "删除",                   korean: "제거" },
  sectionTitle:      { english: "About this piece of work",    mandarin: "关于这份作业",           korean: "이 과제에 대하여" },
  whoProvided:       { english: "Who provided this work?",     mandarin: "谁提供了这份作业？",     korean: "이 과제를 누가 제공했나요?" },
  srcTeacher:        { english: "Teacher",                     mandarin: "教师",                   korean: "교사" },
  srcParent:         { english: "Parent / Caregiver",          mandarin: "家长 / 看护人",          korean: "부모 / 보호자" },
  srcStudent:        { english: "Student",                     mandarin: "学生",                   korean: "학생" },
  srcSchool:         { english: "School",                      mandarin: "学校",                   korean: "학교" },
  srcOther:          { english: "Other",                       mandarin: "其他",                   korean: "기타" },
  mathTopic:         { english: "Mathematics topic (optional)", mandarin: "数学主题（可选）",      korean: "수학 주제 (선택 사항)" },
  mathTopicPh:       { english: "e.g. Addition, Fractions",   mandarin: "例如：加法、分数",       korean: "예: 덧셈, 분수" },
  gradeLevel:        { english: "Grade / Year level (optional)", mandarin: "年级（可选）",         korean: "학년 (선택 사항)" },
  gradeLevelPh:      { english: "e.g. Year 4",                 mandarin: "例如：四年级",           korean: "예: 4학년" },
  independence:      { english: "Completed independently?",   mandarin: "独立完成？",             korean: "스스로 완성했나요?" },
  indYes:            { english: "Yes — on their own",         mandarin: "是——独立完成",           korean: "예 — 스스로" },
  indPartially:      { english: "Partially — some help",      mandarin: "部分——有一些帮助",       korean: "부분적으로 — 약간의 도움" },
  indNo:             { english: "No — significant help",      mandarin: "否——有较多帮助",         korean: "아니요 — 상당한 도움" },
  indUnknown:        { english: "Not sure",                   mandarin: "不确定",                 korean: "잘 모르겠어요" },
  teacherMarked:     { english: "Teacher marked / corrected?", mandarin: "教师批改/纠正了吗？",   korean: "교사가 채점/수정했나요?" },
  tmYes:             { english: "Yes",                         mandarin: "是",                     korean: "예" },
  tmNo:              { english: "No",                          mandarin: "否",                     korean: "아니요" },
  tmPartially:       { english: "Partially",                   mandarin: "部分",                   korean: "부분적으로" },
  tmUnknown:         { english: "Not sure",                    mandarin: "不确定",                 korean: "잘 모르겠어요" },
  teacherComments:   { english: "Teacher comments (optional)", mandarin: "教师评语（可选）",       korean: "교사 의견 (선택 사항)" },
  teacherCommentsPh: { english: "e.g. needs more practice with carrying",
                       mandarin: "例如：需要更多进位练习",
                       korean:   "예: 올림 연습이 더 필요함" },
  additionalContext: { english: "Additional notes (optional)", mandarin: "额外备注（可选）",       korean: "추가 메모 (선택 사항)" },
  additionalPh:      { english: "e.g. timed test, done during class, student was unwell…",
                       mandarin: "例如：限时测验、课堂上完成、学生身体不适……",
                       korean:   "예: 시간 제한 있음, 수업 중 완성, 학생 컨디션 불량…" },
  submit:            { english: "Submit",                      mandarin: "提交",                   korean: "제출" },
  submitting:        { english: "Submitting…",                 mandarin: "提交中…",               korean: "제출 중…" },
  noFileSel:         { english: "Please upload a photo or document first.",
                       mandarin: "请先上传照片或文档。",
                       korean:   "먼저 사진 또는 문서를 업로드해 주세요." },
  uploadFail:        { english: "File upload failed. Please try again.",
                       mandarin: "文件上传失败，请重试。",
                       korean:   "파일 업로드에 실패했습니다. 다시 시도해 주세요." },
  submitFail:        { english: "Something went wrong. Please try again.",
                       mandarin: "发生错误，请重试。",
                       korean:   "오류가 발생했습니다. 다시 시도해 주세요." },
  notFoundTitle:     { english: "Link not found",              mandarin: "链接未找到",             korean: "링크를 찾을 수 없습니다" },
  notFoundBody:      { english: "This upload link is invalid or has expired. Please contact the assessment team.",
                       mandarin: "此上传链接无效或已过期，请联系评估团队。",
                       korean:   "이 업로드 링크가 유효하지 않거나 만료되었습니다. 평가팀에 문의하세요." },
  closedTitle:       { english: "Submissions closed",          mandarin: "提交已关闭",             korean: "제출이 마감되었습니다" },
  closedBody:        { english: "The assessment team has collected enough work samples for this student. No further uploads are needed — thank you for your help.",
                       mandarin: "评估团队已收集了该学生足够的作业样本，无需再上传。感谢您的帮助！",
                       korean:   "평가팀이 이 학생의 충분한 과제 샘플을 수집했습니다. 더 이상 업로드가 필요하지 않습니다 — 도와주셔서 감사합니다." },
  footer:            { english: "This link was shared by the ReMynd assessment team. Your submission is confidential and will only be used as part of this assessment.",
                       mandarin: "此链接由 ReMynd 评估团队共享。您的提交内容保密，仅用于本次评估。",
                       korean:   "이 링크는 ReMynd 평가팀이 공유한 것입니다. 제출 내용은 기밀이며 이 평가에만 사용됩니다." },
};

function t<K extends keyof typeof T>(key: K, lang: Lang): typeof T[K][Lang] {
  return T[key][lang];
}

type Meta = {
  sourceType: string;
  mathTopic: string;
  gradeLevel: string;
  independenceReported: string;
  teacherMarked: string;
  teacherComments: string;
  contributorNotes: string;
};

const DEFAULT_META: Meta = {
  sourceType: "teacher",
  mathTopic: "",
  gradeLevel: "",
  independenceReported: "unknown",
  teacherMarked: "unknown",
  teacherComments: "",
  contributorNotes: "",
};

type SessionInfo = {
  ok: boolean;
  studentName: string;
  caseId: string;
  assignmentId: string;
  sessionId: string | null;
  uploadsClosed: boolean;
};

function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1">
      {(["english", "mandarin", "korean"] as Lang[]).map((l, i) => (
        <React.Fragment key={l}>
          {i > 0 && <span className="text-slate-300 text-xs">|</span>}
          <button
            onClick={() => setLang(l)}
            className={`text-sm px-2 py-1.5 rounded transition-colors ${lang === l ? "text-violet-700 font-semibold" : "text-slate-400"}`}
          >
            {l === "english" ? "EN" : l === "mandarin" ? "中文" : "한국어"}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent";
const selectCls = "w-full border border-slate-200 rounded-xl px-4 py-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-violet-400";

export default function RamriUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [lang, setLang] = useState<Lang>("english");
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SESSION_KEY = `ramri_pending_file_${token}`;

  const [pendingFile, _setPendingFile] = useState<{ url: string; name: string; type: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem(`ramri_pending_file_${token}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const setPendingFile = (f: { url: string; name: string; type: string } | null) => {
    _setPendingFile(f);
    try {
      if (f) sessionStorage.setItem(SESSION_KEY, JSON.stringify(f));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "__mobile-upload-lock__";
    style.textContent = "html,body,#root{max-width:100vw!important;overflow-x:hidden!important;}";
    document.head.appendChild(style);
    return () => { document.getElementById("__mobile-upload-lock__")?.remove(); };
  }, []);

  useEffect(() => {
    fetch(`${BASE_URL}/api/ramri-upload/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: SessionInfo) => { setInfo(d); setLoading(false); })
      .catch((s) => { setNotFound(s === 404); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (loading || notFound) return;
    const id = setInterval(() => {
      fetch(`${BASE_URL}/api/ramri-upload/${token}`)
        .then(r => r.ok ? r.json() : null)
        .then((d: SessionInfo | null) => {
          if (d && d.uploadsClosed) setInfo(prev => prev ? { ...prev, uploadsClosed: true } : prev);
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, [token, loading, notFound]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const urlRes = await fetch(`${BASE_URL}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("upload-url");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("put");
      setPendingFile({ url: objectPath, name: file.name, type: file.type });
    } catch {
      setError(t("uploadFail", lang) as string);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    if (!pendingFile) {
      setError(t("noFileSel", lang) as string);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/ramri-upload/${token}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: pendingFile.name,
          fileUrl: pendingFile.url,
          fileType: pendingFile.type,
          sourceType: meta.sourceType,
          gradeLevel: meta.gradeLevel,
          mathTopic: meta.mathTopic,
          independenceReported: meta.independenceReported,
          teacherMarked: meta.teacherMarked,
          teacherComments: meta.teacherComments,
          contributorNotes: meta.contributorNotes,
        }),
      });
      if (res.status === 403) {
        setInfo(prev => prev ? { ...prev, uploadsClosed: true } : prev);
        return;
      }
      if (!res.ok) throw new Error("submit");
      setSubmitted(n => n + 1);
      setMeta(DEFAULT_META);
      setPendingFile(null);
    } catch {
      setError(t("submitFail", lang) as string);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 gap-4">
        <LangSwitcher lang={lang} setLang={setLang} />
        <AlertTriangle size={40} className="text-amber-500" />
        <h1 className="text-lg font-semibold text-slate-800 text-center">{t("notFoundTitle", lang) as string}</h1>
        <p className="text-sm text-slate-500 text-center max-w-xs">{t("notFoundBody", lang) as string}</p>
      </div>
    );
  }

  if (info.uploadsClosed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 gap-4">
        <LangSwitcher lang={lang} setLang={setLang} />
        <CheckCircle size={48} className="text-emerald-500" />
        <h1 className="text-xl font-semibold text-slate-800 text-center">{t("closedTitle", lang) as string}</h1>
        <p className="text-sm text-slate-500 text-center max-w-sm leading-relaxed">{t("closedBody", lang) as string}</p>
      </div>
    );
  }

  const studentName = info.studentName;

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{t("title", lang) as string}</p>
              <p className="text-xs text-slate-400 truncate">{t("subtitle", lang) as string}</p>
            </div>
          </div>
          <LangSwitcher lang={lang} setLang={setLang} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 py-4 space-y-4 pb-10">
        {/* Instructions */}
        <div className="bg-violet-600 rounded-2xl p-5 text-white">
          <p className="font-bold text-lg leading-snug">
            {(t("instructions", lang) as (name: string) => string)(studentName)}
          </p>
          <p className="text-base text-violet-100 mt-2 leading-relaxed">{t("instructionsSub", lang) as string}</p>
        </div>

        {/* Success banner */}
        {submitted > 0 && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <CheckCircle size={26} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-base font-semibold text-emerald-800">
                {(t("submitted", lang) as (n: number) => string)(submitted)}
              </p>
              <p className="text-base text-emerald-700 mt-0.5">{t("submittedSub", lang) as string}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Upload zone — primary action, top of form */}
          <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {pendingFile ? (
              <div className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <FileText size={28} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-slate-800 truncate">{pendingFile.name}</p>
                  <p className="text-sm text-slate-400 mt-0.5">Ready to submit</p>
                </div>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
                  onClick={() => setPendingFile(null)}
                >
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
            ) : uploading ? (
              <div className="p-10 flex flex-col items-center gap-3">
                <Loader2 size={40} className="animate-spin text-violet-500" />
                <p className="text-base text-slate-500">{t("uploading", lang) as string}</p>
              </div>
            ) : (
              <button
                type="button"
                className="w-full py-10 px-6 flex flex-col items-center gap-4 active:bg-slate-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Upload size={36} className="text-violet-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-800">{t("uploadLabel", lang) as string}</p>
                  <p className="text-base text-slate-400 mt-1">{t("uploadSub", lang) as string}</p>
                </div>
              </button>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <p className="font-bold text-lg text-slate-800">{t("sectionTitle", lang) as string}</p>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("whoProvided", lang) as string}</label>
              <select className={selectCls} value={meta.sourceType} onChange={e => setMeta(p => ({ ...p, sourceType: e.target.value }))}>
                <option value="teacher">{t("srcTeacher", lang) as string}</option>
                <option value="parent">{t("srcParent", lang) as string}</option>
                <option value="student">{t("srcStudent", lang) as string}</option>
                <option value="school">{t("srcSchool", lang) as string}</option>
                <option value="other">{t("srcOther", lang) as string}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("independence", lang) as string}</label>
              <select className={selectCls} value={meta.independenceReported} onChange={e => setMeta(p => ({ ...p, independenceReported: e.target.value }))}>
                <option value="yes">{t("indYes", lang) as string}</option>
                <option value="partially">{t("indPartially", lang) as string}</option>
                <option value="no">{t("indNo", lang) as string}</option>
                <option value="unknown">{t("indUnknown", lang) as string}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("teacherMarked", lang) as string}</label>
              <select className={selectCls} value={meta.teacherMarked} onChange={e => setMeta(p => ({ ...p, teacherMarked: e.target.value }))}>
                <option value="yes">{t("tmYes", lang) as string}</option>
                <option value="no">{t("tmNo", lang) as string}</option>
                <option value="partially">{t("tmPartially", lang) as string}</option>
                <option value="unknown">{t("tmUnknown", lang) as string}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("mathTopic", lang) as string}</label>
              <input className={inputCls} placeholder={t("mathTopicPh", lang) as string} value={meta.mathTopic} onChange={e => setMeta(p => ({ ...p, mathTopic: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("gradeLevel", lang) as string}</label>
              <input className={inputCls} placeholder={t("gradeLevelPh", lang) as string} value={meta.gradeLevel} onChange={e => setMeta(p => ({ ...p, gradeLevel: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("teacherComments", lang) as string}</label>
              <input className={inputCls} placeholder={t("teacherCommentsPh", lang) as string} value={meta.teacherComments} onChange={e => setMeta(p => ({ ...p, teacherComments: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-slate-700">{t("additionalContext", lang) as string}</label>
              <Textarea className="text-base rounded-xl px-4 py-4" rows={3} placeholder={t("additionalPh", lang) as string} value={meta.contributorNotes} onChange={e => setMeta(p => ({ ...p, contributorNotes: e.target.value }))} />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
              <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-base text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full h-16 rounded-2xl bg-violet-600 text-white text-lg font-semibold flex items-center justify-center gap-2 active:bg-violet-700 disabled:opacity-60 transition-colors shadow-md"
          >
            {submitting
              ? <><Loader2 size={20} className="animate-spin" />{t("submitting", lang) as string}</>
              : t("submit", lang) as string}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 leading-relaxed px-2 pb-6">
          {t("footer", lang) as string}
        </p>
      </div>
    </div>
  );
}

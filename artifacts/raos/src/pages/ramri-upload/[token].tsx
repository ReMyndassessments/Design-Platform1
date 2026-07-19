import React, { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type Lang = "english" | "mandarin" | "korean";

const T = {
  title:             { english: "ReMynd — Work Upload",                    mandarin: "ReMynd — 作业上传",                korean: "ReMynd — 과제 업로드" },
  subtitle:          { english: "Mathematical Reasoning Interview preparation", mandarin: "数学推理访谈准备",            korean: "수학적 추론 인터뷰 준비" },
  instructions:      { english: (name: string) => `Please share a piece of ${name}'s recent mathematics work.`,
                       mandarin: (name: string) => `请提供一份 ${name} 近期的数学作业。`,
                       korean:   (name: string) => `${name}의 최근 수학 과제를 하나 공유해 주세요.` },
  instructionsSub:   { english: "You can upload a photo taken on your phone, a PDF, or a Word document. If uploading a photo, make sure the page is flat, well-lit, and all writing is clearly visible. You can submit multiple documents — one form per piece of work.",
                       mandarin: "您可以上传手机拍摄的照片、PDF 或 Word 文档。如果上传照片，请确保页面平整、光线充足、所有书写清晰可见。每份作业填写一次表格，可提交多份。",
                       korean:   "스마트폰으로 찍은 사진, PDF, 또는 Word 문서를 업로드할 수 있습니다. 사진을 업로드할 경우 페이지가 평평하고 밝은 곳에서 모든 글씨가 선명하게 보이도록 해주세요. 과제 하나당 양식 하나씩, 여러 개 제출할 수 있습니다." },
  submitted:         { english: (n: number) => `${n} document${n > 1 ? "s" : ""} submitted — thank you!`,
                       mandarin: (n: number) => `已提交 ${n} 份文件——谢谢！`,
                       korean:   (n: number) => `${n}개 문서 제출됨 — 감사합니다!` },
  submittedSub:      { english: "You can submit another piece of work using the form below.",
                       mandarin: "您可以使用下面的表格再提交一份作业。",
                       korean:   "아래 양식을 사용하여 다른 과제를 제출할 수 있습니다." },
  sectionTitle:      { english: "About this piece of work",    mandarin: "关于这份作业",           korean: "이 과제에 대하여" },
  whoProvided:       { english: "Who provided this work?",     mandarin: "谁提供了这份作业？",     korean: "이 과제를 누가 제공했나요?" },
  srcTeacher:        { english: "Teacher",                     mandarin: "教师",                   korean: "교사" },
  srcParent:         { english: "Parent / Caregiver",          mandarin: "家长 / 看护人",          korean: "부모 / 보호자" },
  srcStudent:        { english: "Student",                     mandarin: "学生",                   korean: "학생" },
  srcSchool:         { english: "School",                      mandarin: "学校",                   korean: "학교" },
  srcOther:          { english: "Other",                       mandarin: "其他",                   korean: "기타" },
  mathTopic:         { english: "Mathematics Topic",           mandarin: "数学主题",               korean: "수학 주제" },
  mathTopicPh:       { english: "e.g. Addition, Fractions",   mandarin: "例如：加法、分数",       korean: "예: 덧셈, 분수" },
  gradeLevel:        { english: "Grade / Year Level",          mandarin: "年级",                   korean: "학년" },
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
  teacherComments:   { english: "Teacher comments on work",    mandarin: "教师对作业的评语",       korean: "교사의 과제 의견" },
  teacherCommentsPh: { english: "Optional",                    mandarin: "可选",                   korean: "선택 사항" },
  additionalContext: { english: "Additional context",          mandarin: "额外背景信息",           korean: "추가 맥락" },
  additionalOpt:     { english: "(optional)",                  mandarin: "（可选）",               korean: "(선택 사항)" },
  additionalPh:      { english: "Anything else the examiner should know about this work — e.g. it was timed, done during class, the student was unwell...",
                       mandarin: "检查者应了解的关于这份作业的其他信息——例如：有时间限制、在课堂上完成、学生当时身体不适……",
                       korean:   "검사자가 이 과제에 대해 알아야 할 다른 사항 — 예: 시간 제한 있음, 수업 중 완성, 학생 컨디션 불량..." },
  uploadLabel:       { english: "Upload the work",             mandarin: "上传作业",               korean: "과제 업로드" },
  uploadOpt:         { english: "(optional — you can also describe it above)",
                       mandarin: "（可选——也可以在上方描述）",
                       korean:   "(선택 사항 — 위에서 설명할 수도 있습니다)" },
  uploadHint:        { english: "Photo, PDF, or Word document — tap to choose",
                       mandarin: "照片、PDF 或 Word 文档 — 点击选择",
                       korean:   "사진, PDF 또는 Word 문서 — 탭하여 선택" },
  uploading:         { english: "Uploading…",                  mandarin: "上传中…",               korean: "업로드 중…" },
  remove:            { english: "Remove",                      mandarin: "删除",                   korean: "제거" },
  submit:            { english: "Submit Work Document",        mandarin: "提交作业文件",           korean: "과제 문서 제출" },
  submitting:        { english: "Submitting…",                 mandarin: "提交中…",               korean: "제출 중…" },
  noFileSel:         { english: "Please select a file before submitting.",
                       mandarin: "请先选择文件再提交。",
                       korean:   "제출하기 전에 파일을 선택해 주세요." },
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
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/ramri-upload/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: SessionInfo) => { setInfo(d); setLoading(false); })
      .catch((s) => { setNotFound(s === 404); setLoading(false); });
  }, [token]);

  // Poll every 60 s so the closed screen appears if examiner closes while page is open
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
          fileName: pendingFile?.name ?? null,
          fileUrl: pendingFile?.url ?? null,
          fileType: pendingFile?.type ?? null,
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
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          {/* Language switcher even on error screens */}
          <div className="flex items-center justify-center gap-1 mb-2">
            {(["english", "mandarin", "korean"] as Lang[]).map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="text-slate-300 text-xs">|</span>}
                <button onClick={() => setLang(l)} className={`text-xs px-1 py-0.5 ${lang === l ? "text-violet-700 font-semibold" : "text-slate-400 hover:text-slate-600"}`}>
                  {l === "english" ? "EN" : l === "mandarin" ? "中文" : "한국어"}
                </button>
              </React.Fragment>
            ))}
          </div>
          <AlertTriangle size={36} className="mx-auto text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-800">{t("notFoundTitle", lang) as string}</h1>
          <p className="text-sm text-slate-500">{t("notFoundBody", lang) as string}</p>
        </div>
      </div>
    );
  }

  if (info.uploadsClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <div className="flex items-center justify-center gap-1 mb-2">
            {(["english", "mandarin", "korean"] as Lang[]).map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="text-slate-300 text-xs">|</span>}
                <button onClick={() => setLang(l)} className={`text-xs px-1 py-0.5 ${lang === l ? "text-violet-700 font-semibold" : "text-slate-400 hover:text-slate-600"}`}>
                  {l === "english" ? "EN" : l === "mandarin" ? "中文" : "한국어"}
                </button>
              </React.Fragment>
            ))}
          </div>
          <CheckCircle size={40} className="mx-auto text-emerald-500" />
          <h1 className="text-lg font-semibold text-slate-800">{t("closedTitle", lang) as string}</h1>
          <p className="text-sm text-slate-500">{t("closedBody", lang) as string}</p>
        </div>
      </div>
    );
  }

  const studentName = info.studentName;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header row with language switcher */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t("title", lang) as string}</h1>
              <p className="text-xs text-slate-500">{t("subtitle", lang) as string}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 pt-1">
            {(["english", "mandarin", "korean"] as Lang[]).map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <span className="text-slate-300 text-xs">|</span>}
                <button
                  onClick={() => setLang(l)}
                  className={`text-xs px-1 py-0.5 transition-colors ${lang === l ? "text-violet-700 font-semibold" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {l === "english" ? "EN" : l === "mandarin" ? "中文" : "한국어"}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-1">
          <p className="text-sm font-semibold text-violet-800">
            {(t("instructions", lang) as (name: string) => string)(studentName)}
          </p>
          <p className="text-xs text-violet-700">{t("instructionsSub", lang) as string}</p>
        </div>

        {/* Success banner */}
        {submitted > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {(t("submitted", lang) as (n: number) => string)(submitted)}
              </p>
              <p className="text-xs text-emerald-700">{t("submittedSub", lang) as string}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 text-sm">{t("sectionTitle", lang) as string}</h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs text-slate-600">{t("whoProvided", lang) as string}</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.sourceType} onChange={e => setMeta(p => ({ ...p, sourceType: e.target.value }))}>
                <option value="teacher">{t("srcTeacher", lang) as string}</option>
                <option value="parent">{t("srcParent", lang) as string}</option>
                <option value="student">{t("srcStudent", lang) as string}</option>
                <option value="school">{t("srcSchool", lang) as string}</option>
                <option value="other">{t("srcOther", lang) as string}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">{t("mathTopic", lang) as string}</Label>
              <Input className="mt-1 h-7 text-xs" placeholder={t("mathTopicPh", lang) as string} value={meta.mathTopic} onChange={e => setMeta(p => ({ ...p, mathTopic: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">{t("gradeLevel", lang) as string}</Label>
              <Input className="mt-1 h-7 text-xs" placeholder={t("gradeLevelPh", lang) as string} value={meta.gradeLevel} onChange={e => setMeta(p => ({ ...p, gradeLevel: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">{t("independence", lang) as string}</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.independenceReported} onChange={e => setMeta(p => ({ ...p, independenceReported: e.target.value }))}>
                <option value="yes">{t("indYes", lang) as string}</option>
                <option value="partially">{t("indPartially", lang) as string}</option>
                <option value="no">{t("indNo", lang) as string}</option>
                <option value="unknown">{t("indUnknown", lang) as string}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">{t("teacherMarked", lang) as string}</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.teacherMarked} onChange={e => setMeta(p => ({ ...p, teacherMarked: e.target.value }))}>
                <option value="yes">{t("tmYes", lang) as string}</option>
                <option value="no">{t("tmNo", lang) as string}</option>
                <option value="partially">{t("tmPartially", lang) as string}</option>
                <option value="unknown">{t("tmUnknown", lang) as string}</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">{t("teacherComments", lang) as string}</Label>
              <Input className="mt-1 h-7 text-xs" placeholder={t("teacherCommentsPh", lang) as string} value={meta.teacherComments} onChange={e => setMeta(p => ({ ...p, teacherComments: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600">
              {t("additionalContext", lang) as string}{" "}
              <span className="text-slate-400">{t("additionalOpt", lang) as string}</span>
            </Label>
            <Textarea className="mt-1 text-xs" rows={2} placeholder={t("additionalPh", lang) as string} value={meta.contributorNotes} onChange={e => setMeta(p => ({ ...p, contributorNotes: e.target.value }))} />
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">
              {t("uploadLabel", lang) as string}{" "}
              <span className="text-slate-400">{t("uploadOpt", lang) as string}</span>
            </Label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center hover:border-violet-300 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {pendingFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={18} className="text-violet-500" />
                  <span className="text-xs font-medium text-slate-700">{pendingFile.name}</span>
                  <button
                    type="button"
                    className="text-xs text-red-500 underline ml-2"
                    onClick={e => { e.stopPropagation(); setPendingFile(null); }}
                  >
                    {t("remove", lang) as string}
                  </button>
                </div>
              ) : uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                  <span className="text-xs text-slate-500">{t("uploading", lang) as string}</span>
                </div>
              ) : (
                <>
                  <Upload size={22} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500">{t("uploadHint", lang) as string}</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} /> {error}
            </p>
          )}

          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={submitting || uploading}>
            {submitting
              ? <><Loader2 size={14} className="animate-spin mr-1" />{t("submitting", lang) as string}</>
              : t("submit", lang) as string}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          {t("footer", lang) as string}
        </p>
      </div>
    </div>
  );
}

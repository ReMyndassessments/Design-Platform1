import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  customFetch,
  getGetStrengthenCoreApplicationQueryKey,
  getGetStrengthenCoreProgramAdminQueryKey,
  getGetStrengthenCoreProgramQueryKey,
  getListStrengthenCoreApplicationsQueryKey,
  useAnalyzeStrengthenCoreApplication,
  useGetStrengthenCoreApplication,
  useGetStrengthenCoreProgramAdmin,
  useListStrengthenCoreApplications,
  useReviewStrengthenCoreApplication,
  useUpdateStrengthenCoreProgram,
} from "@workspace/api-client-react";
import type { StrengthenCoreApplication, StrengthenCoreApplicationReviewDecision, StrengthenCoreProgramUpdateAllowedExtensionsItem } from "@workspace/api-client-react";
import { Activity, AlertCircle, ArrowRight, Check, ChevronRight, Clock3, Copy, Download, ExternalLink, FileText, LockKeyhole, RefreshCw, Save, Search, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type Lang = "en" | "zh" | "ko";
type ConsentLinks = { guardianUrl: string | null; studentAssentUrl: string | null; expiresAt: string };
const text = {
  en: {
    title: "Strengthen Your Core", eyebrow: "REMYND · ADMINISTRATION", subtitle: "Application intake and review", language: "Language", queue: "Application queue", queueNote: "Intake and reviewer decisions only", search: "Search schools or concerns", all: "All statuses", pending: "Pending review", approved: "Approved", declined: "Declined", more: "Information requested", routed: "Routed for review", empty: "No applications match this view.", loading: "Loading application queue…", queueError: "Applications could not be loaded.", retry: "Try again", select: "Select an application to review.", overview: "Application details", submitted: "Submitted", languageLabel: "Form language", noStudentIds: "De-identified intake only. Do not add student direct identifiers.", analysis: "AI intake suggestions", analyze: "Generate suggestions", analyzing: "Preparing…", analysisNote: "Suggestions are assistive only. A reviewer must assess them; they are not a decision or diagnosis.", noAnalysis: "No suggestions generated. Use this only when a reviewer requests it.", review: "Reviewer decision", decision: "Decision", reason: "Reason (required)", reasonPlaceholder: "Record the rationale for this intake decision…", extension: "Approved extension override", noExtension: "No override", saveReview: "Save decision", saving: "Saving…", requiredReason: "A reason is required.", settings: "Programme configuration", settingsNote: "Changes affect public application availability and programme terms.", availability: "Accepting applications", coreInstrument: "Core instrument enabled", maxSchools: "Maximum schools", closeDate: "Closing date", duration: "Portal duration (days)", extensions: "Allowed extensions", saveSettings: "Save programme settings", settingsSaved: "Programme settings saved.", settingsError: "Could not save programme settings.", decisionSaved: "Decision saved.", decisionError: "Could not save the decision.", analysisError: "Could not generate suggestions.", detailError: "Application details could not be loaded.", noDetails: "No additional application details.", status: "Status", count: "applications", open: "Open", closed: "Closed", caveat: "This workspace supports application review and separate guardian-consent/student-assent collection. The case is created only after both responses are received and an administrator verifies them. Assessment assignments are restricted to enabled approved instruments; reporting and Case Portal remain out of scope.", school: "School", concern: "Primary concern", submittedAt: "Received", data: "Submitted responses", noItems: "No submitted response fields.", approvedDefault: "One student per approved school by default", freePilot: "Complimentary pilot subject to ReMynd approval", coordinator: "Named implementation coordinator required", consent: "Parent/guardian consent and student assent are required before assessment.", nonDiagnostic: "Non-diagnostic pathway", refresh: "Refresh queue", noReason: "No review reason recorded.", mark: "Intake review", durationError: "Duration must be 1–90 days.", savedAt: "Configuration is managed through the programme API.",
    consentStage: "Consent and assessment readiness", guardianName: "Parent / guardian full name", guardianEmail: "Parent / guardian email", guardianRelationship: "Relationship to student", studentName: "Student full name", studentDob: "Student date of birth", createConsentLinks: "Create / refresh consent links", guardianLink: "Parent / guardian consent link", studentLink: "Student assent link", copy: "Copy", copied: "Link copied.", consentPending: "Pending", consentReceived: "Received", consentDeclined: "Declined", verifyConsent: "Verify consent and create RAOS case", verifying: "Verifying…", caseCreated: "Consent verified. RAOS case created:", consentError: "Could not create consent links.", verifyError: "Both affirmative responses are required before verification.", expiredNote: "Links expire after 14 days. Creating new links invalidates any previous pending links.", signedBy: "Signed by", verified: "Verified",
  },
  zh: {
    title: "强化学习核心", eyebrow: "REMYND · 管理", subtitle: "申请受理与审核", language: "语言", queue: "申请队列", queueNote: "仅提供受理和审核决定", search: "搜索学校或关注事项", all: "所有状态", pending: "待审核", approved: "已批准", declined: "已拒绝", more: "待补充信息", routed: "转交审核", empty: "此视图中没有符合条件的申请。", loading: "正在加载申请队列……", queueError: "无法加载申请。", retry: "重试", select: "请选择一项申请进行审核。", overview: "申请详情", submitted: "提交时间", languageLabel: "表单语言", noStudentIds: "仅限去身份化受理。请勿添加学生直接身份信息。", analysis: "AI 受理建议", analyze: "生成建议", analyzing: "正在准备……", analysisNote: "建议仅供辅助，必须由审核人员评估；不构成决定或诊断。", noAnalysis: "尚未生成建议。仅在审核人员提出要求时使用。", review: "审核决定", decision: "决定", reason: "理由（必填）", reasonPlaceholder: "记录此受理决定的理由……", extension: "获批扩展覆盖", noExtension: "无覆盖", saveReview: "保存决定", saving: "正在保存……", requiredReason: "必须填写理由。", settings: "项目配置", settingsNote: "此处更改会影响公开申请状态和项目条款。", availability: "接受申请", coreInstrument: "核心工具已启用", maxSchools: "学校数量上限", closeDate: "截止日期", duration: "门户有效天数", extensions: "允许的扩展", saveSettings: "保存项目配置", settingsSaved: "项目配置已保存。", settingsError: "无法保存项目配置。", decisionSaved: "决定已保存。", decisionError: "无法保存决定。", analysisError: "无法生成建议。", detailError: "无法加载申请详情。", noDetails: "没有其他申请详情。", status: "状态", count: "份申请", open: "开放", closed: "关闭", caveat: "此工作区支持申请审核和独立的家长同意／学生本人同意收集。只有收到两份答复并由管理员核实后才会创建个案。评估派发仅限已启用且获批的工具；报告与 Case Portal 尚未开放。", school: "学校", concern: "主要关注", submittedAt: "收到时间", data: "提交的回答", noItems: "没有提交的回答字段。", approvedDefault: "默认每所获批学校一名学生", freePilot: "免费试点须经 ReMynd 审批", coordinator: "须指定项目实施协调员", consent: "评估前必须取得家长／监护人同意及学生本人同意。", nonDiagnostic: "非诊断性路径", refresh: "刷新队列", noReason: "尚未记录审核理由。", mark: "受理审核", durationError: "有效期须为 1–90 天。", savedAt: "配置通过项目 API 管理。", consentStage: "同意与评估准备", guardianName: "家长／监护人姓名", guardianEmail: "家长／监护人邮箱", guardianRelationship: "与学生的关系", studentName: "学生姓名", studentDob: "学生出生日期", createConsentLinks: "创建／刷新同意链接", guardianLink: "家长／监护人同意链接", studentLink: "学生本人同意链接", copy: "复制", copied: "链接已复制。", consentPending: "待处理", consentReceived: "已收到", consentDeclined: "已拒绝", verifyConsent: "核实同意并创建 RAOS 个案", verifying: "正在核实……", caseCreated: "同意已核实。RAOS 个案已创建：", consentError: "无法创建同意链接。", verifyError: "必须先收到两份同意答复。", expiredNote: "链接 14 天后过期。创建新链接会使此前尚未完成的链接失效。", signedBy: "签名", verified: "已核实",
  },
  ko: {
    title: "학습 핵심 강화", eyebrow: "REMYND · 관리자", subtitle: "신청 접수 및 검토", language: "언어", queue: "신청 대기열", queueNote: "접수 및 검토 결정만 지원", search: "학교 또는 우려 사항 검색", all: "모든 상태", pending: "검토 대기", approved: "승인", declined: "거절", more: "정보 요청", routed: "검토 전달", empty: "이 보기에 해당하는 신청이 없습니다.", loading: "신청 대기열을 불러오는 중…", queueError: "신청을 불러오지 못했습니다.", retry: "다시 시도", select: "검토할 신청을 선택하세요.", overview: "신청 상세", submitted: "제출", languageLabel: "양식 언어", noStudentIds: "비식별 접수 전용입니다. 학생 직접 식별 정보를 추가하지 마세요.", analysis: "AI 접수 제안", analyze: "제안 생성", analyzing: "준비 중…", analysisNote: "제안은 보조 자료이며 검토자가 반드시 평가해야 합니다. 결정이나 진단이 아닙니다.", noAnalysis: "생성된 제안이 없습니다. 검토자가 요청한 경우에만 사용하세요.", review: "검토 결정", decision: "결정", reason: "사유(필수)", reasonPlaceholder: "접수 결정의 근거를 기록하세요…", extension: "승인 확장 재정의", noExtension: "재정의 없음", saveReview: "결정 저장", saving: "저장 중…", requiredReason: "사유를 입력해야 합니다.", settings: "프로그램 설정", settingsNote: "변경 사항은 공개 신청 가능 여부와 프로그램 조건에 적용됩니다.", availability: "신청 접수 중", coreInstrument: "핵심 도구 활성화", maxSchools: "학교 최대 수", closeDate: "마감일", duration: "포털 기간(일)", extensions: "허용 확장", saveSettings: "프로그램 설정 저장", settingsSaved: "프로그램 설정을 저장했습니다.", settingsError: "프로그램 설정을 저장하지 못했습니다.", decisionSaved: "결정을 저장했습니다.", decisionError: "결정을 저장하지 못했습니다.", analysisError: "제안을 생성하지 못했습니다.", detailError: "신청 상세를 불러오지 못했습니다.", noDetails: "추가 신청 상세가 없습니다.", status: "상태", count: "건", open: "접수 중", closed: "마감", caveat: "이 작업 공간은 신청 검토와 보호자 동의 및 학생 본인 동의 수집을 지원합니다. 두 응답을 받은 후 관리자가 확인해야만 사례가 생성됩니다. 평가는 활성화되고 승인된 도구로만 배정할 수 있습니다. 보고서와 Case Portal은 아직 제공되지 않습니다.", school: "학교", concern: "주요 우려", submittedAt: "접수", data: "제출 응답", noItems: "제출된 응답 항목이 없습니다.", approvedDefault: "승인 학교당 기본 학생 1명", freePilot: "무료 파일럿은 ReMynd 승인 대상", coordinator: "학교 지정 실행 코디네이터 필요", consent: "평가 전에 보호자 및 학생 본인의 동의가 필요합니다.", nonDiagnostic: "비진단 경로", refresh: "대기열 새로고침", noReason: "기록된 검토 사유가 없습니다.", mark: "접수 검토", durationError: "기간은 1~90일이어야 합니다.", savedAt: "프로그램 API를 통해 설정을 관리합니다.", consentStage: "동의 및 평가 준비", guardianName: "부모／보호자 성명", guardianEmail: "부모／보호자 이메일", guardianRelationship: "학생과의 관계", studentName: "학생 성명", studentDob: "학생 생년월일", createConsentLinks: "동의 링크 생성／새로고침", guardianLink: "부모／보호자 동의 링크", studentLink: "학생 본인 동의 링크", copy: "복사", copied: "링크를 복사했습니다.", consentPending: "대기", consentReceived: "접수됨", consentDeclined: "거절됨", verifyConsent: "동의 확인 후 RAOS 사례 생성", verifying: "확인 중…", caseCreated: "동의를 확인했습니다. RAOS 사례가 생성되었습니다:", consentError: "동의 링크를 만들지 못했습니다.", verifyError: "확인하려면 두 개의 긍정적인 응답이 필요합니다.", expiredNote: "링크는 14일 후 만료됩니다. 새 링크를 만들면 사용되지 않은 이전 링크는 무효가 됩니다.", signedBy: "서명", verified: "확인됨",
  },
} as const;

const shareCopy = {
  en: {
    title: "Share the application",
    description: "Copy this direct link or download the QR code for school emails, flyers, and posters.",
    linkLabel: "Direct application link",
    copyLink: "Copy link",
    copied: "Application link copied.",
    copyError: "Could not copy automatically. Select and copy the link above.",
    downloadQr: "Download QR for poster",
    openForm: "Open application form",
    openStatus: "Applications are open",
    closedStatus: "Applications are closed",
    previewWarning: "This is a workspace preview link. Use the published admin site to create a link for schools.",
    qrAlt: "QR code linking directly to the Strengthen Your Core application form",
  },
  zh: {
    title: "分享申请表",
    description: "复制此直达链接，或下载二维码，用于学校邮件、宣传单和海报。",
    linkLabel: "申请表直达链接",
    copyLink: "复制链接",
    copied: "申请链接已复制。",
    copyError: "无法自动复制，请选择上方链接并手动复制。",
    downloadQr: "下载海报二维码",
    openForm: "打开申请表",
    openStatus: "目前开放申请",
    closedStatus: "目前暂未开放申请",
    previewWarning: "这是工作区预览链接。请在已发布的管理页面中生成供学校使用的链接。",
    qrAlt: "二维码：直接打开 Strengthen Your Core 申请表",
  },
  ko: {
    title: "신청 링크 공유",
    description: "학교 이메일, 안내문, 포스터에 사용할 직접 링크를 복사하거나 QR 코드를 다운로드하세요.",
    linkLabel: "신청서 바로가기 링크",
    copyLink: "링크 복사",
    copied: "신청 링크를 복사했습니다.",
    copyError: "자동으로 복사하지 못했습니다. 위 링크를 선택해 복사하세요.",
    downloadQr: "포스터용 QR 다운로드",
    openForm: "신청서 열기",
    openStatus: "현재 신청 접수 중",
    closedStatus: "현재 신청을 받지 않습니다",
    previewWarning: "현재 작업 공간 미리보기 링크입니다. 학교에 공유할 링크는 게시된 관리자 페이지에서 만드세요.",
    qrAlt: "Strengthen Your Core 신청서로 바로 연결되는 QR 코드",
  },
} as const;

const EXTENSIONS: StrengthenCoreProgramUpdateAllowedExtensionsItem[] = ["REFI", "RARPS", "RFII", "RSSC"];
const extensionNames: Record<string, string> = { REFI: "REFI", RARPS: "RARPS", RFII: "RFII", RSSC: "RSSC" };
const decisionNames: Record<string, keyof typeof text.en> = {
  submitted: "pending",
  ai_analysis_complete: "pending",
  additional_information_requested: "more",
  professional_pathway_review_required: "routed",
  approved: "approved",
  declined: "declined",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function StrengthenCoreAdmin() {
  const [lang, setLang] = useState<Lang>("en");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [decision, setDecision] = useState<StrengthenCoreApplicationReviewDecision>("route_review");
  const [reason, setReason] = useState("");
  const [approvedExtension, setApprovedExtension] = useState("");
  const [feedback, setFeedback] = useState("");
  const [programForm, setProgramForm] = useState({ open: false, coreInstrumentEnabled: false, maxSchools: "", closesAt: "", portalDurationDays: "30", allowedExtensions: [] as StrengthenCoreProgramUpdateAllowedExtensionsItem[] });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [consentForm, setConsentForm] = useState({ guardianName: "", guardianEmail: "", guardianRelationship: "", studentName: "", studentDob: "" });
  const [consentLinks, setConsentLinks] = useState<ConsentLinks | null>(null);
  const [consentMessage, setConsentMessage] = useState("");
  const [createdCaseId, setCreatedCaseId] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const t = text[lang];
  const share = shareCopy[lang];
  const applicationUrl = useMemo(
    () => `${window.location.origin}/strengthen-your-core/apply`,
    [],
  );
  const isWorkspacePreview = /(^localhost$|^127\.0\.0\.1$|\.replit\.dev$)/i.test(window.location.hostname);
  const queue = useListStrengthenCoreApplications();
  const adminProgram = useGetStrengthenCoreProgramAdmin({
    query: { queryKey: getGetStrengthenCoreProgramAdminQueryKey() },
  });
  const detail = useGetStrengthenCoreApplication(selectedId, {
    query: { enabled: Boolean(selectedId), queryKey: getGetStrengthenCoreApplicationQueryKey(selectedId) },
  });
  const analyze = useAnalyzeStrengthenCoreApplication();
  const review = useReviewStrengthenCoreApplication();
  const updateProgram = useUpdateStrengthenCoreProgram();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!adminProgram.data) return;
    const closesAt = adminProgram.data.closesAt
      ? new Date(new Date(adminProgram.data.closesAt).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
      : "";
    setProgramForm({
      open: adminProgram.data.open,
      coreInstrumentEnabled: adminProgram.data.coreInstrumentEnabled,
      maxSchools: adminProgram.data.maxSchools === null ? "" : String(adminProgram.data.maxSchools),
      closesAt,
      portalDurationDays: String(adminProgram.data.portalDurationDays),
      allowedExtensions: adminProgram.data.allowedExtensions,
    });
  }, [adminProgram.data]);
  const visible = useMemo(() => (queue.data ?? []).filter((app) => {
    const matchesSearch = `${app.schoolName} ${app.primaryConcern} ${app.id}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (statusFilter === "all" || app.status === statusFilter);
  }), [queue.data, search, statusFilter]);
  const current = detail.data as StrengthenCoreApplication | undefined;
  const appData = current?.data && typeof current.data === "object" ? current.data : {};
  const analysis = current?.analysis && typeof current.analysis === "object" ? current.analysis as Record<string, unknown> : null;

  function selectApplication(app: StrengthenCoreApplication) {
    setSelectedId(app.id);
    setReason(app.reviewReason ?? "");
    setApprovedExtension(app.approvedExtension ?? "");
    setFeedback("");
    setConsentForm({
      guardianName: app.consent?.guardianName ?? "",
      guardianEmail: app.consent?.guardianEmail ?? "",
      guardianRelationship: app.consent?.guardianRelationship ?? "",
      studentName: app.consent?.studentName ?? "",
      studentDob: "",
    });
    setConsentLinks(null);
    setConsentMessage("");
    setCreatedCaseId(app.consent?.caseId ?? "");
  }
  function saveDecision() {
    if (!current || !reason.trim()) {
      setFeedback(t.requiredReason);
      return;
    }
    setFeedback("");
    review.mutate({ applicationId: current.id, data: { decision, reason: reason.trim(), approvedExtension: approvedExtension ? approvedExtension as StrengthenCoreProgramUpdateAllowedExtensionsItem : null } }, {
      onSuccess: () => {
        setFeedback(t.decisionSaved);
        void queryClient.invalidateQueries({ queryKey: getListStrengthenCoreApplicationsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreApplicationQueryKey(current.id) });
      },
      onError: () => setFeedback(t.decisionError),
    });
  }
  function runAnalysis() {
    if (!current) return;
    analyze.mutate({ applicationId: current.id }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreApplicationQueryKey(current.id) });
        void queryClient.invalidateQueries({ queryKey: getListStrengthenCoreApplicationsQueryKey() });
      },
      onError: () => setFeedback(t.analysisError),
    });
  }
  async function createConsentLinks() {
    if (!current) return;
    setConsentMessage("");
    try {
      const result = await customFetch<ConsentLinks>(`/api/strengthen-core/applications/${encodeURIComponent(current.id)}/consent-links`, {
        method: "POST",
        responseType: "json",
        body: JSON.stringify(consentForm),
      });
      setConsentLinks(result);
      setConsentMessage(t.expiredNote);
      void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreApplicationQueryKey(current.id) });
      void queryClient.invalidateQueries({ queryKey: getListStrengthenCoreApplicationsQueryKey() });
    } catch {
      setConsentMessage(t.consentError);
    }
  }
  async function verifyConsent() {
    if (!current) return;
    setConsentMessage("");
    try {
      const result = await customFetch<{ verified: boolean; caseId: string }>(`/api/strengthen-core/applications/${encodeURIComponent(current.id)}/verify-consent`, {
        method: "POST",
        responseType: "json",
      });
      setCreatedCaseId(result.caseId);
      setConsentMessage(t.caseCreated);
      void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreApplicationQueryKey(current.id) });
      void queryClient.invalidateQueries({ queryKey: getListStrengthenCoreApplicationsQueryKey() });
    } catch {
      setConsentMessage(t.verifyError);
    }
  }
  async function copyConsentLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setConsentMessage(t.copied);
    } catch {
      setConsentMessage(url);
    }
  }
  async function copyApplicationLink() {
    try {
      await navigator.clipboard.writeText(applicationUrl);
      setShareMessage(share.copied);
    } catch {
      setShareMessage(share.copyError);
    }
  }
  function downloadApplicationQr() {
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgFile = new Blob([new XMLSerializer().serializeToString(copy)], {
      type: "image/svg+xml;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(svgFile);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = "strengthen-your-core-application-qr.svg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
  function saveProgram() {
    const duration = Number(programForm.portalDurationDays);
    if (!Number.isFinite(duration) || duration < 1 || duration > 90) {
      setSettingsMessage(t.durationError);
      return;
    }
    updateProgram.mutate({ data: {
      open: programForm.open,
      maxSchools: programForm.maxSchools.trim() ? Number(programForm.maxSchools) : null,
      closesAt: programForm.closesAt ? new Date(programForm.closesAt).toISOString() : null,
      portalDurationDays: duration,
      coreInstrumentEnabled: programForm.coreInstrumentEnabled,
      allowedExtensions: programForm.allowedExtensions,
    } }, {
      onSuccess: () => {
        setSettingsMessage(t.settingsSaved);
        void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreProgramQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetStrengthenCoreProgramAdminQueryKey() });
      },
      onError: () => setSettingsMessage(t.settingsError),
    });
  }
  function toggleExtension(extension: StrengthenCoreProgramUpdateAllowedExtensionsItem) {
    setProgramForm((old) => ({ ...old, allowedExtensions: old.allowedExtensions.includes(extension) ? old.allowedExtensions.filter((item) => item !== extension) : [...old.allowedExtensions, extension] }));
  }
  const statusLabel = (status: string) => {
    const key = decisionNames[status];
    return key ? t[key] : status.replaceAll("_", " ");
  };

  return (
    <main className="min-h-[100dvh] bg-[#f1f5f2] text-[#233e3c]" lang={lang}>
      <header className="border-b border-[#d7e1da] bg-[#f8faf7]">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-5 xl:px-8">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#1d504e] text-white"><Activity size={19} /></span><div><p className="text-[10px] font-bold tracking-[.18em] text-[#779087]">{t.eyebrow}</p><h1 className="font-display text-xl font-semibold text-[#254442]">{t.title}</h1></div></div>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-[#788a83] sm:inline">{t.subtitle}</span><label className="sr-only" htmlFor="admin-language">{t.language}</label><select id="admin-language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-lg border border-[#d1ddd4] bg-[#f8faf7] px-3 py-2 text-sm font-semibold" data-testid="select-admin-language"><option value="en">English</option><option value="zh">简体中文</option><option value="ko">한국어</option></select></div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 py-6 xl:px-8">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#d9e4db] bg-[#e8f0e8] p-4 text-sm leading-6 text-[#536c61]" data-testid="notice-admin-scope"><LockKeyhole size={18} className="mt-0.5 shrink-0 text-[#668872]" /><p>{t.caveat}</p></div>
        <section className="mb-6 rounded-2xl border border-[#d6e1d9] bg-[#f9fbf8] p-5 shadow-sm md:p-7" aria-labelledby="share-application-title" data-testid="panel-application-sharing">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h2 id="share-application-title" className="font-display text-xl font-semibold text-[#254442]">{share.title}</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${adminProgram.data?.open ? "bg-[#e4efe5] text-[#427450]" : "bg-[#f7e9e5] text-[#9d5848]"}`} data-testid="status-application-availability">
                  {adminProgram.isLoading ? "…" : adminProgram.data?.open ? share.openStatus : share.closedStatus}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#71817a]">{share.description}</p>
              <label htmlFor="share-application-url" className="mt-5 block text-xs font-bold uppercase tracking-wide text-[#70837a]">{share.linkLabel}</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input id="share-application-url" readOnly value={applicationUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-[#d7e1d9] bg-white px-3 py-2.5 text-sm text-[#405951]" data-testid="input-share-application-url" />
                <button type="button" onClick={() => void copyApplicationLink()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#275c53] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#1f4e47]" data-testid="button-copy-application-link"><Copy size={15} />{share.copyLink}</button>
                <a href={applicationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d1ddd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#45635b] transition hover:bg-[#edf3ed]" data-testid="link-open-application-form"><ExternalLink size={15} />{share.openForm}</a>
              </div>
              {shareMessage && <p className="mt-2 text-xs font-semibold text-[#477755]" role="status" data-testid="status-share-link">{shareMessage}</p>}
              {isWorkspacePreview && <p className="mt-3 rounded-lg bg-[#fbf6e9] px-3 py-2 text-xs leading-5 text-[#75653d]" data-testid="notice-preview-share-link">{share.previewWarning}</p>}
            </div>
            <div className="flex flex-col items-center gap-3 rounded-xl border border-[#e1e9e2] bg-white p-4">
              <div ref={qrContainerRef} className="rounded-lg bg-white p-2" role="img" aria-label={share.qrAlt} data-testid="img-application-qr">
                <QRCodeSVG value={applicationUrl} size={184} level="H" includeMargin />
              </div>
              <button type="button" onClick={downloadApplicationQr} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d1ddd4] bg-white px-3 py-2 text-xs font-bold text-[#45635b] transition hover:bg-[#edf3ed]" data-testid="button-download-application-qr"><Download size={14} />{share.downloadQr}</button>
            </div>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[minmax(300px,370px)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-[#d6e1d9] bg-[#f9fbf8] shadow-sm">
            <div className="border-b border-[#e0e8e1] p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-xl font-semibold">{t.queue}</h2><p className="mt-1 text-xs text-[#82918a]">{t.queueNote}</p></div><button type="button" onClick={() => void queue.refetch()} className="rounded-lg p-2 text-[#637f72] transition hover:bg-[#e9f0e9]" aria-label={t.refresh} data-testid="button-refresh-queue"><RefreshCw size={16} /></button></div>
              <div className="mt-4 flex gap-2"><div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a9b92]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.search} className="w-full rounded-lg border border-[#d7e1d9] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#69937e]" data-testid="input-queue-search" /></div><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-[128px] rounded-lg border border-[#d7e1d9] bg-white px-2 text-xs text-[#526a60]" data-testid="select-queue-status"><option value="all">{t.all}</option><option value="submitted">{t.pending}</option><option value="approved">{t.approved}</option><option value="declined">{t.declined}</option><option value="additional_information_requested">{t.more}</option><option value="professional_pathway_review_required">{t.routed}</option></select></div>
            </div>
            {queue.isLoading ? <div className="space-y-3 p-5" aria-label={t.loading}>{[1, 2, 3, 4].map((n) => <div key={n} className="h-[84px] animate-pulse rounded-xl bg-[#edf2ed]" />)}</div> : queue.isError ? <div className="p-6 text-sm text-[#697b73]" data-testid="status-queue-error"><AlertCircle size={18} className="mb-2 text-[#b76a53]" /><p>{t.queueError}</p><button onClick={() => void queue.refetch()} className="mt-3 font-semibold text-[#3e7660]" data-testid="button-retry-queue">{t.retry}</button></div> : visible.length === 0 ? <div className="p-8 text-center text-sm text-[#7a8b83]" data-testid="empty-application-queue"><FileText size={24} className="mx-auto mb-3 text-[#8ba096]" />{t.empty}</div> : <div className="max-h-[calc(100dvh-270px)] overflow-y-auto p-2">{visible.map((app) => <button type="button" key={app.id} onClick={() => selectApplication(app)} className={`mb-1 w-full rounded-xl p-4 text-left transition ${selectedId === app.id ? "bg-[#e5eee6] ring-1 ring-[#c8d9cc]" : "hover:bg-[#f0f5f0]"}`} data-testid={`row-application-${app.id}`}><div className="flex items-start justify-between gap-2"><span className="font-semibold text-[#304d48]" data-testid={`text-school-${app.id}`}>{app.schoolName}</span><ChevronRight size={15} className="mt-1 shrink-0 text-[#91a199]" /></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#74847d]">{app.primaryConcern}</p><div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${app.status === "approved" ? "bg-[#e4efe5] text-[#427450]" : app.status === "declined" ? "bg-[#f7e9e5] text-[#9d5848]" : "bg-[#f0eedf] text-[#827649]"}`} data-testid={`status-application-${app.id}`}>{statusLabel(app.status)}</span><span className="text-[10px] text-[#95a29b]">{new Date(app.submittedAt).toLocaleDateString(lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en")}</span></div></button>)}</div>}
          </section>

          <div className="min-w-0 space-y-6">
            {!selectedId ? <section className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-[#cbdad0] bg-[#f8faf7] p-8 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e6eee7] text-[#6f917b]"><FileText size={24} /></span><p className="mt-4 text-sm text-[#71847b]" data-testid="text-select-application">{t.select}</p></div></section>
              : detail.isLoading ? <div className="h-96 animate-pulse rounded-2xl bg-[#e4ece5]" aria-label={t.loading} />
              : detail.isError || !current ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" data-testid="status-detail-error">{t.detailError}</div>
              : <section className="rounded-2xl border border-[#d6e1d9] bg-[#f9fbf8] shadow-sm" data-testid="panel-application-detail">
                <div className="border-b border-[#e0e8e1] p-5 md:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[.16em] text-[#82958a]">{t.overview} · {current.id}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#244542]" data-testid="text-detail-school">{current.schoolName}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#60766d]" data-testid="text-detail-concern">{current.primaryConcern}</p></div><span className="rounded-full bg-[#eaf0e7] px-3 py-1.5 text-xs font-bold capitalize text-[#5e7665]" data-testid="status-detail-application">{statusLabel(current.status)}</span></div><div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#778980]"><span><Clock3 size={13} className="mr-1 inline" />{t.submittedAt}: {new Date(current.submittedAt).toLocaleString(lang === "zh" ? "zh-CN" : lang === "ko" ? "ko-KR" : "en")}</span><span>{t.languageLabel}: {current.language}</span></div><p className="mt-4 flex gap-2 text-xs text-[#648071]"><ShieldCheck size={14} className="shrink-0" />{t.noStudentIds}</p></div>
                <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1fr_1fr]">
                  <div><h3 className="mb-3 text-sm font-bold text-[#38594e]">{t.data}</h3><div className="max-h-[440px] space-y-3 overflow-y-auto pr-1">{Object.entries(appData).length === 0 ? <p className="text-sm text-[#84938c]">{t.noItems}</p> : Object.entries(appData).map(([key, value]) => <div key={key} className="rounded-lg border border-[#e1e9e2] bg-white p-3" data-testid={`field-detail-${key}`}><p className="text-[10px] font-bold uppercase tracking-wide text-[#87978f]">{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#405951]">{displayValue(value)}</p></div>)}</div></div>
                  <div className="space-y-5">
                    <section className="rounded-xl border border-[#d9e6dc] bg-[#edf4ee] p-4"><div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-bold text-[#426552]"><Sparkles size={16} />{t.analysis}</h3><button type="button" onClick={runAnalysis} disabled={analyze.isPending} className="rounded-lg border border-[#c4d8c9] bg-[#f8faf7] px-3 py-2 text-xs font-bold text-[#4b725a] transition hover:bg-white disabled:opacity-50" data-testid="button-analyze-application">{analyze.isPending ? t.analyzing : t.analyze}</button></div><p className="mt-2 text-xs leading-5 text-[#73857b]">{t.analysisNote}</p>{analysis ? <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 font-sans text-xs leading-5 text-[#466052]" data-testid="content-ai-analysis">{JSON.stringify(analysis, null, 2)}</pre> : <p className="mt-4 text-xs text-[#819189]" data-testid="empty-ai-analysis">{t.noAnalysis}</p>}{analyze.isError && <p className="mt-3 text-xs text-rose-700" role="alert">{t.analysisError}</p>}</section>
                    <section className="rounded-xl border border-[#e1e7dc] bg-[#fcfbf6] p-4"><h3 className="flex items-center gap-2 text-sm font-bold text-[#685f3e]"><Settings2 size={16} />{t.review}</h3><p className="mt-1 text-xs leading-5 text-[#827b62]">{t.analysisNote}</p>{current.reviewReason && <p className="mt-3 rounded-lg bg-[#f2f0e8] p-3 text-xs leading-5 text-[#6b654f]" data-testid="text-review-reason">{current.reviewReason}</p>}{!current.reviewReason && <p className="mt-3 text-xs text-[#89836d]">{t.noReason}</p>}
                      <div className="mt-4 space-y-3"><label className="block text-xs font-semibold text-[#637469]">{t.decision}<select value={decision} onChange={(e) => setDecision(e.target.value as StrengthenCoreApplicationReviewDecision)} className="mt-1.5 w-full rounded-lg border border-[#d8dfd4] bg-white px-3 py-2.5 text-sm text-[#354d43]" data-testid="select-review-decision"><option value="route_review">{t.routed}</option><option value="request_information">{t.more}</option><option value="approve">{t.approved}</option><option value="decline">{t.declined}</option></select></label>
                        <label className="block text-xs font-semibold text-[#637469]">{t.reason}<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t.reasonPlaceholder} className="mt-1.5 w-full rounded-lg border border-[#d8dfd4] bg-white px-3 py-2.5 text-sm leading-5 text-[#354d43] outline-none focus:border-[#779b82]" data-testid="input-review-reason" /></label>
                        <label className="block text-xs font-semibold text-[#637469]">{t.extension}<select value={approvedExtension} onChange={(e) => setApprovedExtension(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[#d8dfd4] bg-white px-3 py-2.5 text-sm text-[#354d43]" data-testid="select-review-extension"><option value="">{t.noExtension}</option>{(adminProgram.data?.allowedExtensions ?? []).map((ext) => <option key={ext} value={ext}>{extensionNames[ext]}</option>)}</select></label>
                        <button type="button" onClick={saveDecision} disabled={review.isPending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#275c53] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1f4e47] disabled:opacity-50" data-testid="button-save-review"><Check size={16} />{review.isPending ? t.saving : t.saveReview}</button>
                        {feedback && <p className={`text-xs ${feedback === t.decisionSaved ? "text-[#477755]" : "text-rose-700"}`} role="status" data-testid="status-review-feedback">{feedback}</p>}
                      </div>
                    </section>
                  </div>
                </div>
               </section>}

             {current && ["approved", "consent_requested", "guardian_consent_received", "student_assent_received", "consent_verified"].includes(current.status) && (
               <section className="rounded-2xl border border-[#d6e1d9] bg-[#f9fbf8] p-5 shadow-sm md:p-7" data-testid="panel-consent-readiness">
                 <div className="flex flex-wrap items-start justify-between gap-4">
                   <div>
                     <p className="text-[10px] font-bold tracking-[.16em] text-[#82958a]">{t.consentStage}</p>
                     <h2 className="mt-2 font-display text-xl font-semibold text-[#244542]">{t.consent}</h2>
                     <p className="mt-2 max-w-3xl text-xs leading-5 text-[#73857b]">{t.expiredNote}</p>
                   </div>
                   {current.consent?.caseId && <a href={`/cases/${encodeURIComponent(current.consent.caseId)}`} className="rounded-lg bg-[#275c53] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1f4e47]" data-testid="link-consent-verified-case">{t.caseCreated} {current.consent.caseId} <ArrowRight size={14} className="ml-1 inline" /></a>}
                 </div>
                 {current.consent && (
                   <div className="mt-5 grid gap-3 sm:grid-cols-2">
                     <div className="rounded-xl border border-[#dce6dc] bg-white p-4 text-sm">
                       <p className="font-semibold text-[#405951]">{t.guardianName}: {current.consent.guardianName}</p>
                       <p className="mt-1 text-xs text-[#708178]">{current.consent.guardianEmail} · {current.consent.guardianRelationship}</p>
                       <p className="mt-3 text-xs font-semibold text-[#567263]">{t.status}: {current.consent.guardianStatus === "consented" ? t.consentReceived : current.consent.guardianStatus === "declined" ? t.consentDeclined : t.consentPending}</p>
                       {current.consent.guardianSignatureName && <p className="mt-1 text-xs text-[#708178]">{t.signedBy}: {current.consent.guardianSignatureName}</p>}
                       {current.consent.guardianSignedAt && <p className="mt-1 text-[11px] text-[#8a9790]">{new Date(current.consent.guardianSignedAt).toLocaleString()}</p>}
                     </div>
                     <div className="rounded-xl border border-[#dce6dc] bg-white p-4 text-sm">
                       <p className="font-semibold text-[#405951]">{t.studentName}: {current.consent.studentName}</p>
                       <p className="mt-3 text-xs font-semibold text-[#567263]">{t.status}: {current.consent.studentStatus === "assented" ? t.consentReceived : current.consent.studentStatus === "declined" ? t.consentDeclined : t.consentPending}</p>
                       {current.consent.studentSignatureName && <p className="mt-1 text-xs text-[#708178]">{t.signedBy}: {current.consent.studentSignatureName}</p>}
                       {current.consent.studentAssentedAt && <p className="mt-1 text-[11px] text-[#8a9790]">{new Date(current.consent.studentAssentedAt).toLocaleString()}</p>}
                     </div>
                   </div>
                 )}
                 {!current.consent?.caseId && current.status !== "consent_declined" && (
                   <>
                     <div className="mt-5 grid gap-3 sm:grid-cols-2">
                       <label className="text-xs font-semibold text-[#65766d]">{t.guardianName}<input value={consentForm.guardianName} onChange={(event) => setConsentForm((old) => ({ ...old, guardianName: event.target.value }))} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm font-normal" data-testid="input-consent-guardian-name" /></label>
                       <label className="text-xs font-semibold text-[#65766d]">{t.guardianEmail}<input type="email" value={consentForm.guardianEmail} onChange={(event) => setConsentForm((old) => ({ ...old, guardianEmail: event.target.value }))} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm font-normal" data-testid="input-consent-guardian-email" /></label>
                       <label className="text-xs font-semibold text-[#65766d]">{t.guardianRelationship}<input value={consentForm.guardianRelationship} onChange={(event) => setConsentForm((old) => ({ ...old, guardianRelationship: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm font-normal" data-testid="input-consent-relationship" /></label>
                       <label className="text-xs font-semibold text-[#65766d]">{t.studentName}<input value={consentForm.studentName} onChange={(event) => setConsentForm((old) => ({ ...old, studentName: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm font-normal" data-testid="input-consent-student-name" /></label>
                       <label className="text-xs font-semibold text-[#65766d]">{t.studentDob}<input type="date" value={consentForm.studentDob} onChange={(event) => setConsentForm((old) => ({ ...old, studentDob: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm font-normal" data-testid="input-consent-student-dob" /></label>
                     </div>
                     <button type="button" onClick={() => void createConsentLinks()} disabled={!consentForm.guardianName || !consentForm.guardianEmail || !consentForm.guardianRelationship || !consentForm.studentName || !consentForm.studentDob} className="mt-4 rounded-lg bg-[#275c53] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1f4e47] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-create-consent-links">{t.createConsentLinks}</button>
                   </>
                 )}
                 {consentLinks && (
                   <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="panel-consent-links">
                     {consentLinks.guardianUrl && <div className="rounded-xl border border-[#dce6dc] bg-white p-4"><p className="text-xs font-semibold">{t.guardianLink}</p><a className="mt-1 block break-all text-xs text-[#376f5a] underline" href={consentLinks.guardianUrl} target="_blank" rel="noreferrer">{consentLinks.guardianUrl}</a><button onClick={() => void copyConsentLink(consentLinks.guardianUrl!)} className="mt-2 text-xs font-bold text-[#376f5a]">{t.copy}</button></div>}
                     {consentLinks.studentAssentUrl && <div className="rounded-xl border border-[#dce6dc] bg-white p-4"><p className="text-xs font-semibold">{t.studentLink}</p><a className="mt-1 block break-all text-xs text-[#376f5a] underline" href={consentLinks.studentAssentUrl} target="_blank" rel="noreferrer">{consentLinks.studentAssentUrl}</a><button onClick={() => void copyConsentLink(consentLinks.studentAssentUrl!)} className="mt-2 text-xs font-bold text-[#376f5a]">{t.copy}</button></div>}
                   </div>
                 )}
                 {current.consent?.guardianStatus === "consented" && current.consent.studentStatus === "assented" && !current.consent.caseId && (
                   <button type="button" onClick={() => void verifyConsent()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#276455] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1f5144]" data-testid="button-verify-consent"><ShieldCheck size={16} />{t.verifyConsent}</button>
                 )}
                 {consentMessage && <p className="mt-3 break-all text-xs text-[#567263]" role="status" data-testid="status-consent-feedback">{consentMessage}{createdCaseId && !current.consent?.caseId && <a href={`/cases/${encodeURIComponent(createdCaseId)}`} className="ml-1 font-bold underline">{createdCaseId}</a>}</p>}
               </section>
             )}

            <section className="rounded-2xl border border-[#d6e1d9] bg-[#f9fbf8] shadow-sm">
              <div className="border-b border-[#e0e8e1] p-5"><h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Settings2 size={19} className="text-[#688875]" />{t.settings}</h2><p className="mt-1 text-xs leading-5 text-[#819088]">{t.settingsNote}</p></div>
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
                <label className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe5dc] bg-white p-4"><span><span className="block text-sm font-semibold">{t.availability}</span><span className="text-xs text-[#77877f]">{programForm.open ? t.open : t.closed}</span></span><input type="checkbox" checked={programForm.open} onChange={(e) => setProgramForm((old) => ({ ...old, open: e.target.checked }))} className="h-5 w-5 accent-[#2c6b59]" data-testid="toggle-program-open" /></label>
                 <label className="flex items-center justify-between gap-4 rounded-xl border border-[#dbe5dc] bg-white p-4"><span><span className="block text-sm font-semibold">{t.coreInstrument}</span><span className="text-xs text-[#77877f]">{lang === "zh" ? "确认授权与运营准备就绪后再启用。" : lang === "ko" ? "라이선스와 운영 준비를 확인한 후 활성화하세요." : "Confirm licensing and readiness before enabling."}</span></span><input type="checkbox" checked={programForm.coreInstrumentEnabled} onChange={(e) => setProgramForm((old) => ({ ...old, coreInstrumentEnabled: e.target.checked }))} className="h-5 w-5 accent-[#2c6b59]" data-testid="toggle-core-instrument" /></label>
                <label className="text-xs font-semibold text-[#65766d]">{t.maxSchools}<input type="number" min="1" value={programForm.maxSchools} onChange={(e) => setProgramForm((old) => ({ ...old, maxSchools: e.target.value }))} placeholder="No limit" className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm" data-testid="input-program-max-schools" /></label>
                <label className="text-xs font-semibold text-[#65766d]">{t.closeDate}<input type="datetime-local" value={programForm.closesAt} onChange={(e) => setProgramForm((old) => ({ ...old, closesAt: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm" data-testid="input-program-close-date" /></label>
                <label className="text-xs font-semibold text-[#65766d]">{t.duration}<input type="number" min="1" max="90" value={programForm.portalDurationDays} onChange={(e) => setProgramForm((old) => ({ ...old, portalDurationDays: e.target.value }))} className="mt-1.5 w-full rounded-lg border border-[#d8e1d9] bg-white px-3 py-2.5 text-sm" data-testid="input-program-duration" /></label>
                <fieldset className="md:col-span-2"><legend className="mb-2 text-xs font-semibold text-[#65766d]">{t.extensions}</legend><div className="flex flex-wrap gap-2">{EXTENSIONS.map((ext) => <label key={ext} className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-bold transition ${programForm.allowedExtensions.includes(ext) ? "border-[#9fbea5] bg-[#e9f1e9] text-[#466c52]" : "border-[#d9e1d9] bg-white text-[#7e8c84]"}`}><input type="checkbox" className="sr-only" checked={programForm.allowedExtensions.includes(ext)} onChange={() => toggleExtension(ext)} data-testid={`toggle-extension-${ext}`} />{ext}</label>)}</div></fieldset>
                 <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e9e2] pt-4"><p className="text-xs leading-5 text-[#839188]">{t.approvedDefault}. {t.freePilot}. {t.coordinator}. {t.consent} {t.nonDiagnostic}.</p><button type="button" onClick={saveProgram} disabled={updateProgram.isPending || !adminProgram.data} className="inline-flex items-center gap-2 rounded-lg bg-[#275c53] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1f4e47] disabled:opacity-50" data-testid="button-save-program"><Save size={15} />{updateProgram.isPending ? t.saving : t.saveSettings}<ArrowRight size={15} /></button></div>
                {settingsMessage && <p className="md:col-span-2 text-xs text-[#4f795d]" role="status" data-testid="status-program-settings">{settingsMessage}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

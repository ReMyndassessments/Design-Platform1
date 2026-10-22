import { useState } from "react";
import type { ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { getListStrengthenCoreApplicationsQueryKey, useGetStrengthenCoreProgram, useSubmitStrengthenCoreApplication } from "@workspace/api-client-react";

type Lang = "en" | "zh" | "ko";
type Field = { key: string; label: string; hint?: string; type?: "text" | "email" | "textarea" | "select" | "checkbox"; required?: boolean; options?: string[] };
type Section = { title: string; intro: string; fields: Field[] };
const availabilityCopy: Record<Lang, { loading: string; closed: string; error: string; retry: string }> = {
  en: { loading: "Checking application availability…", closed: "Applications are currently closed.", error: "We could not check programme availability.", retry: "Try again" },
  zh: { loading: "正在确认是否接受申请……", closed: "目前暂不接受申请。", error: "无法确认项目申请状态。", retry: "重试" },
  ko: { loading: "신청 가능 여부를 확인하는 중…", closed: "현재 신청을 접수하지 않습니다.", error: "프로그램 신청 상태를 확인하지 못했습니다.", retry: "다시 시도" },
};

const formCopy: Record<Lang, { brand: string; kicker: string; title: string; intro: string; language: string; required: string; privacy: string; nonDiag: string; noId: string; consent: string; assent: string; evidence: string; submit: string; submitting: string; receipt: string; receiptCopy: string; ref: string; error: string; validation: string; back: string; section: string; of: string; next: string; previous: string; review: string; received: string; open: string; sections: Section[] }> = {
  en: {
    brand: "REMYND · STRENGTHEN YOUR CORE", kicker: "SCHOOL APPLICATION · INTAKE & REVIEW", title: "A thoughtful starting point.", intro: "Tell us what your team notices and what support could look like. Please use de-identified referral text; do not include a student’s name, email address or other direct identifiers.", language: "Form language", required: "Required", privacy: "Please do not include student names, email addresses, dates of birth, or other information that directly identifies a student in referral text.", nonDiag: "Strengthen Your Core is a non-diagnostic educational pathway. It does not diagnose or replace clinical care.", noId: "I understand this is a non-diagnostic pathway and will keep student referral text de-identified.", consent: "I understand parent or guardian consent must be obtained before any assessment.", assent: "I understand student assent must also be obtained before any assessment.", evidence: "I confirm the school can provide supporting educational evidence through appropriate, approved channels if requested; I will not attach identifiable student records here.", submit: "Submit application", submitting: "Submitting…", receipt: "Application received", receiptCopy: "Your application has been submitted for intake and review. This receipt does not approve the application or start an assessment.", ref: "Application reference", error: "We couldn’t submit this application. Please review the form and try again.", validation: "Complete the required fields and acknowledgements to continue.", back: "Programme overview", section: "Section", of: "of", next: "Continue", previous: "Previous section", review: "Review and submit", received: "Submitted securely", open: "Complimentary pilot, subject to ReMynd approval. One student per approved school by default.", sections: [
      { title: "School details", intro: "Help us understand the setting making this request.", fields: [{ key: "schoolName", label: "School name", required: true }, { key: "schoolLocation", label: "School location (city / region)" }, { key: "schoolType", label: "School type", type: "select", options: ["Primary", "Secondary", "All-through", "Other"] }] },
      { title: "Implementation coordinator", intro: "A named school coordinator is required to make the pathway workable.", fields: [{ key: "coordinatorName", label: "Coordinator name", required: true }, { key: "coordinatorRole", label: "Role at school", required: true }, { key: "coordinatorEmail", label: "Work email", type: "email", required: true }, { key: "coordinatorPhone", label: "Work phone (optional)" }] },
      { title: "Learner context", intro: "Use a grade or age band only—never a name or direct identifier.", fields: [{ key: "gradeBand", label: "Grade or age band", required: true }, { key: "learningLanguage", label: "Primary language(s) of learning" }, { key: "context", label: "What context would help us understand this learner?", type: "textarea", hint: "Describe learning context only. Do not include names, dates of birth, contact details or unique identifiers." }] },
      { title: "What prompted this referral?", intro: "Describe the learning concern in observable, school-based terms.", fields: [{ key: "primaryConcern", label: "What has your team noticed, and how does it affect learning?", type: "textarea", required: true, hint: "Share observations rather than a diagnosis or assumption." }, { key: "duration", label: "How long has this concern been present?", type: "select", options: ["Less than one term", "1–2 terms", "More than two terms", "Not sure"] }] },
      { title: "Student strengths", intro: "Start with what the learner can do and what helps them thrive.", fields: [{ key: "strengths", label: "What are this learner’s strengths, interests or successful conditions?", type: "textarea", required: true, hint: "At least one meaningful strength response is required." }, { key: "successContext", label: "When or where do you see these strengths?", type: "textarea" }] },
      { title: "Learning barriers", intro: "Describe situations that make participation or progress harder.", fields: [{ key: "barriers", label: "What learning tasks, settings or transitions are difficult?", type: "textarea" }, { key: "patterns", label: "Are there patterns across subjects, times or settings?", type: "textarea" }] },
      { title: "Evidence and observations", intro: "Summarise evidence already held by the school without sharing records here.", fields: [{ key: "evidenceSummary", label: "What school-based observations or evidence inform this application?", type: "textarea", hint: "Do not paste reports, student records or identifying information." }, { key: "evidenceAvailable", label: "The school can provide relevant supporting evidence through approved channels if requested.", type: "checkbox", required: true }] },
      { title: "Support already tried", intro: "Share what has been attempted and what your team has learned.", fields: [{ key: "supportsTried", label: "What strategies or supports have been tried?", type: "textarea" }, { key: "responseToSupport", label: "How has the learner responded?", type: "textarea" }] },
      { title: "Student perspective", intro: "Share the learner’s perspective in an age-appropriate, de-identified way.", fields: [{ key: "studentPerspective", label: "What has the student shared about learning or support?", type: "textarea" }, { key: "studentAssentPlan", label: "How will the school explain the process and seek student assent?", type: "textarea" }] },
      { title: "Family and caregiver perspective", intro: "Include relevant context shared by the family, without identifying details.", fields: [{ key: "familyPerspective", label: "What perspective or priorities has the family shared?", type: "textarea" }, { key: "familyEngagement", label: "How does the school plan to involve the family?", type: "textarea" }] },
      { title: "Six-week outcome", intro: "Name a practical, observable change the team hopes to see in six weeks.", fields: [{ key: "sixWeekOutcome", label: "At six weeks, what would be different for the learner at school?", type: "textarea", required: true, hint: "Make the outcome specific and observable—for example, participation, confidence or access to a learning task." }, { key: "outcomeMeasure", label: "How will the team notice or record that change?", type: "textarea" }] },
      { title: "Readiness and acknowledgements", intro: "Confirm the school’s readiness and shared safeguards.", fields: [{ key: "coordinatorCapacity", label: "What time or coordination capacity can the school commit?", type: "textarea", required: true }, { key: "oneStudent", label: "I understand one student per approved school is the default and the complimentary pilot is subject to ReMynd approval.", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "I understand parent or guardian consent is required before any assessment.", type: "checkbox", required: true }, { key: "assentAcknowledgement", label: "I understand student assent is required before any assessment.", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "I understand this is a non-diagnostic educational pathway.", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "I confirm referral text contains no student name, email address or other direct identifier.", type: "checkbox", required: true }] },
    ],
  },
  zh: {
    brand: "REMYND · 强化学习核心", kicker: "学校申请 · 受理与审核", title: "从审慎的了解开始。", intro: "请分享团队的观察及可能的支持方向。转介文字必须去身份化；请勿填写学生姓名、电子邮箱或其他直接身份识别信息。", language: "表单语言", required: "必填", privacy: "请勿在转介文字中填写学生姓名、电子邮箱、出生日期或其他可直接识别学生的信息。", nonDiag: "「强化学习核心」是非诊断性的教育支持路径，不用于诊断，也不替代临床服务。", noId: "我了解本路径不提供诊断，并会确保学生转介文字已去身份化。", consent: "我了解任何评估开始前必须取得家长或监护人同意。", assent: "我了解任何评估开始前也必须取得学生本人的同意。", evidence: "我确认如有需要，学校可通过适当且获批准的渠道提供教育支持证据；此处不会上传可识别学生身份的记录。", submit: "提交申请", submitting: "正在提交……", receipt: "已收到申请", receiptCopy: "申请已提交，等待受理与审核。此回执不代表申请获批，也不会启动评估。", ref: "申请编号", error: "无法提交申请，请检查表单后重试。", validation: "请完成必填项和确认声明后继续。", back: "返回项目介绍", section: "部分", of: "/", next: "继续", previous: "上一部分", review: "检查并提交", received: "已安全提交", open: "免费试点须经 ReMynd 审批。默认每所获批学校一名学生。", sections: [
      { title: "学校资料", intro: "请介绍提出申请的学校环境。", fields: [{ key: "schoolName", label: "学校名称", required: true }, { key: "schoolLocation", label: "学校所在地（城市／地区）" }, { key: "schoolType", label: "学校类型", type: "select", options: ["小学", "中学", "一贯制学校", "其他"] }] },
      { title: "项目实施协调员", intro: "学校须指定一名协调员，确保项目可行。", fields: [{ key: "coordinatorName", label: "协调员姓名", required: true }, { key: "coordinatorRole", label: "校内职务", required: true }, { key: "coordinatorEmail", label: "工作邮箱", type: "email", required: true }, { key: "coordinatorPhone", label: "工作电话（选填）" }] },
      { title: "学习者背景", intro: "仅填写年级或年龄范围，请勿填写姓名或直接身份信息。", fields: [{ key: "gradeBand", label: "年级或年龄范围", required: true }, { key: "learningLanguage", label: "主要学习语言" }, { key: "context", label: "哪些背景有助于我们理解这位学习者？", type: "textarea", hint: "仅描述学习背景。请勿填写姓名、出生日期、联系方式或独特身份信息。" }] },
      { title: "申请缘由", intro: "请以可观察的校内情况描述学习方面的关注。", fields: [{ key: "primaryConcern", label: "团队观察到什么？这对学习有何影响？", type: "textarea", required: true, hint: "请分享观察，而非诊断或假设。" }, { key: "duration", label: "这一情况持续多久？", type: "select", options: ["少于一学期", "1–2 学期", "超过两学期", "不确定"] }] },
      { title: "学生优势", intro: "从学习者能做到的事以及帮助其发展的条件开始。", fields: [{ key: "strengths", label: "这位学习者有哪些优势、兴趣或成功条件？", type: "textarea", required: true, hint: "至少填写一项有意义的优势。" }, { key: "successContext", label: "在何时或何种情境中能看到这些优势？", type: "textarea" }] },
      { title: "学习障碍", intro: "描述使参与或进步更加困难的情境。", fields: [{ key: "barriers", label: "哪些学习任务、环境或转换较为困难？", type: "textarea" }, { key: "patterns", label: "不同科目、时段或环境之间有何规律？", type: "textarea" }] },
      { title: "证据与观察", intro: "概述学校已有的证据，请勿在此分享记录。", fields: [{ key: "evidenceSummary", label: "哪些校内观察或证据支持本申请？", type: "textarea", hint: "请勿粘贴报告、学生记录或可识别身份的信息。" }, { key: "evidenceAvailable", label: "如有需要，学校可通过获批准的渠道提供相关支持证据。", type: "checkbox", required: true }] },
      { title: "已尝试的支持", intro: "分享已尝试的方法以及团队的观察。", fields: [{ key: "supportsTried", label: "已尝试哪些策略或支持？", type: "textarea" }, { key: "responseToSupport", label: "学习者的反应如何？", type: "textarea" }] },
      { title: "学生视角", intro: "请以适龄且去身份化的方式分享学生的观点。", fields: [{ key: "studentPerspective", label: "学生如何描述学习或支持？", type: "textarea" }, { key: "studentAssentPlan", label: "学校将如何说明流程并征求学生本人同意？", type: "textarea" }] },
      { title: "家庭与照护者视角", intro: "请分享家庭提出的相关背景，不含身份识别信息。", fields: [{ key: "familyPerspective", label: "家庭分享了哪些观点或优先事项？", type: "textarea" }, { key: "familyEngagement", label: "学校计划如何邀请家庭参与？", type: "textarea" }] },
      { title: "六周目标", intro: "请说明团队希望在六周内看到的实际、可观察变化。", fields: [{ key: "sixWeekOutcome", label: "六周后，学生在校内的哪些方面会有所不同？", type: "textarea", required: true, hint: "目标应具体且可观察，例如参与度、信心或完成学习任务的能力。" }, { key: "outcomeMeasure", label: "团队将如何观察或记录这一变化？", type: "textarea" }] },
      { title: "准备情况与确认声明", intro: "请确认学校的准备度及共同遵循的保障原则。", fields: [{ key: "coordinatorCapacity", label: "学校可投入哪些时间或协调资源？", type: "textarea", required: true }, { key: "oneStudent", label: "我了解每所获批学校默认一名学生，免费试点须经 ReMynd 审批。", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "我了解评估前必须取得家长或监护人同意。", type: "checkbox", required: true }, { key: "assentAcknowledgement", label: "我了解评估前必须取得学生本人同意。", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "我了解本路径属于非诊断性教育支持。", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "我确认转介文字不含学生姓名、电子邮箱或其他直接身份信息。", type: "checkbox", required: true }] },
    ],
  },
  ko: {
    brand: "REMYND · 학습 핵심 강화", kicker: "학교 신청 · 접수 및 검토", title: "세심한 이해에서 시작합니다.", intro: "팀이 관찰한 내용과 가능한 지원 방향을 알려 주세요. 의뢰 문구는 비식별 처리해야 합니다. 학생 이름, 이메일 주소 또는 직접 식별 정보를 포함하지 마세요.", language: "양식 언어", required: "필수", privacy: "의뢰 문구에 학생 이름, 이메일 주소, 생년월일 또는 학생을 직접 식별하는 정보를 포함하지 마세요.", nonDiag: "학습 핵심 강화는 비진단 교육 지원 경로이며 진단을 제공하거나 임상 서비스를 대체하지 않습니다.", noId: "이 경로가 비진단적임을 이해하며 학생 의뢰 문구를 비식별 처리하겠습니다.", consent: "평가 전에 보호자 동의를 받아야 함을 이해합니다.", assent: "평가 전에 학생 본인의 동의도 받아야 함을 이해합니다.", evidence: "요청 시 적절히 승인된 경로로 교육 자료를 제공할 수 있음을 확인합니다. 식별 가능한 학생 기록은 여기에 첨부하지 않겠습니다.", submit: "신청 제출", submitting: "제출 중…", receipt: "신청이 접수되었습니다", receiptCopy: "신청이 접수 검토를 위해 제출되었습니다. 접수 확인은 승인이나 평가 시작을 의미하지 않습니다.", ref: "신청 참조 번호", error: "신청을 제출하지 못했습니다. 양식을 확인하고 다시 시도해 주세요.", validation: "필수 항목과 확인 사항을 완료한 후 계속해 주세요.", back: "프로그램 안내", section: "섹션", of: "/", next: "계속", previous: "이전 섹션", review: "검토 후 제출", received: "안전하게 제출됨", open: "무료 파일럿은 ReMynd 승인이 필요합니다. 승인 학교당 기본 학생 1명입니다.", sections: [
      { title: "학교 정보", intro: "신청을 제출하는 학교 환경을 알려 주세요.", fields: [{ key: "schoolName", label: "학교명", required: true }, { key: "schoolLocation", label: "학교 위치(도시 / 지역)" }, { key: "schoolType", label: "학교 유형", type: "select", options: ["초등학교", "중학교", "통합 학교", "기타"] }] },
      { title: "실행 코디네이터", intro: "경로를 원활히 운영하기 위해 학교 지정 코디네이터가 필요합니다.", fields: [{ key: "coordinatorName", label: "코디네이터 이름", required: true }, { key: "coordinatorRole", label: "학교 내 역할", required: true }, { key: "coordinatorEmail", label: "업무 이메일", type: "email", required: true }, { key: "coordinatorPhone", label: "업무 전화(선택)" }] },
      { title: "학습자 맥락", intro: "학년 또는 연령대만 입력하고 이름이나 직접 식별 정보는 입력하지 마세요.", fields: [{ key: "gradeBand", label: "학년 또는 연령대", required: true }, { key: "learningLanguage", label: "주요 학습 언어" }, { key: "context", label: "학습자를 이해하는 데 도움이 될 맥락은 무엇인가요?", type: "textarea", hint: "학습 맥락만 설명해 주세요. 이름, 생년월일, 연락처 또는 고유 식별 정보는 입력하지 마세요." }] },
      { title: "신청 배경", intro: "관찰 가능한 학교 상황을 중심으로 학습 우려를 설명해 주세요.", fields: [{ key: "primaryConcern", label: "팀이 관찰한 점과 학습에 미치는 영향은 무엇인가요?", type: "textarea", required: true, hint: "진단이나 추정이 아닌 관찰 내용을 공유해 주세요." }, { key: "duration", label: "이 우려가 지속된 기간은 어느 정도인가요?", type: "select", options: ["한 학기 미만", "1~2학기", "두 학기 초과", "잘 모르겠음"] }] },
      { title: "학생의 강점", intro: "학생이 잘하는 점과 성장에 도움이 되는 조건부터 살펴봅니다.", fields: [{ key: "strengths", label: "학생의 강점, 관심사 또는 잘 되는 조건은 무엇인가요?", type: "textarea", required: true, hint: "의미 있는 강점을 최소 한 가지 작성해 주세요." }, { key: "successContext", label: "언제 또는 어떤 상황에서 이 강점이 나타나나요?", type: "textarea" }] },
      { title: "학습 장벽", intro: "참여나 성장을 어렵게 만드는 상황을 설명해 주세요.", fields: [{ key: "barriers", label: "어떤 학습 과제, 환경 또는 전환이 어렵나요?", type: "textarea" }, { key: "patterns", label: "교과, 시간 또는 환경에 따른 패턴이 있나요?", type: "textarea" }] },
      { title: "근거와 관찰", intro: "학교가 보유한 근거를 요약하고 기록 자체는 공유하지 마세요.", fields: [{ key: "evidenceSummary", label: "신청을 뒷받침하는 학교 관찰 또는 근거는 무엇인가요?", type: "textarea", hint: "보고서, 학생 기록 또는 식별 정보를 붙여 넣지 마세요." }, { key: "evidenceAvailable", label: "요청 시 학교는 승인된 경로로 관련 교육 근거를 제공할 수 있습니다.", type: "checkbox", required: true }] },
      { title: "시도한 지원", intro: "시도한 방법과 팀이 알게 된 점을 공유해 주세요.", fields: [{ key: "supportsTried", label: "어떤 전략이나 지원을 시도했나요?", type: "textarea" }, { key: "responseToSupport", label: "학생은 어떻게 반응했나요?", type: "textarea" }] },
      { title: "학생의 관점", intro: "학생의 관점을 연령에 맞고 비식별 방식으로 공유해 주세요.", fields: [{ key: "studentPerspective", label: "학생은 학습이나 지원에 관해 무엇을 이야기했나요?", type: "textarea" }, { key: "studentAssentPlan", label: "과정을 설명하고 학생 동의를 어떻게 구할 계획인가요?", type: "textarea" }] },
      { title: "가족 및 보호자 관점", intro: "식별 정보 없이 가족이 공유한 관련 맥락을 알려 주세요.", fields: [{ key: "familyPerspective", label: "가족이 공유한 관점이나 우선순위는 무엇인가요?", type: "textarea" }, { key: "familyEngagement", label: "가족을 어떻게 참여시킬 계획인가요?", type: "textarea" }] },
      { title: "6주 목표", intro: "6주 안에 기대하는 실질적이고 관찰 가능한 변화를 정해 주세요.", fields: [{ key: "sixWeekOutcome", label: "6주 후 학교에서 학생에게 어떤 변화가 있기를 바라나요?", type: "textarea", required: true, hint: "참여, 자신감 또는 학습 과제 접근성처럼 구체적이고 관찰 가능한 결과를 작성해 주세요." }, { key: "outcomeMeasure", label: "팀은 그 변화를 어떻게 관찰하거나 기록할까요?", type: "textarea" }] },
      { title: "준비 상태 및 확인", intro: "학교의 준비 상태와 안전 원칙을 확인해 주세요.", fields: [{ key: "coordinatorCapacity", label: "학교가 투입할 수 있는 시간이나 조정 역량은 무엇인가요?", type: "textarea", required: true }, { key: "oneStudent", label: "승인 학교당 기본 1명이며 무료 파일럿은 ReMynd 승인이 필요함을 이해합니다.", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "평가 전에 보호자 동의가 필요함을 이해합니다.", type: "checkbox", required: true }, { key: "assentAcknowledgement", label: "평가 전에 학생 본인의 동의가 필요함을 이해합니다.", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "이 경로가 비진단 교육 지원임을 이해합니다.", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "의뢰 문구에 학생 이름, 이메일 또는 직접 식별 정보가 없음을 확인합니다.", type: "checkbox", required: true }] },
    ],
  },
};

export default function StrengthenCoreApplication() {
  const [lang, setLang] = useState<Lang>("en");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null);
  const queryClient = useQueryClient();
  const program = useGetStrengthenCoreProgram();
  const submit = useSubmitStrengthenCoreApplication();
  const t = formCopy[lang];
  const sections = t.sections;

  function validateCurrent() {
    const missing = sections[step].fields.filter((f) => f.required && (f.type === "checkbox" ? values[f.key] !== true : !String(values[f.key] ?? "").trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values[f.key] ?? "").trim())))).map((f) => f.key);
    setErrors(missing);
    if (missing.length) window.scrollTo({ top: 0, behavior: "smooth" });
    return missing.length === 0;
  }

  function handleSubmit() {
    const missing = sections.flatMap((section) => section.fields.filter((f) => f.required && (f.type === "checkbox" ? values[f.key] !== true : !String(values[f.key] ?? "").trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values[f.key] ?? "").trim())))).map((f) => f.key));
    setErrors(missing);
    if (missing.length) {
      const firstStep = sections.findIndex((section) => section.fields.some((f) => missing.includes(f.key)));
      setStep(firstStep >= 0 ? firstStep : 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    submit.mutate({ data: { language: lang, data: { ...values } } }, {
      onSuccess: (result) => {
        setReceipt({ id: result.id, status: result.status });
        void queryClient.invalidateQueries({ queryKey: getListStrengthenCoreApplicationsQueryKey() });
      },
    });
  }

  function fieldControl(field: Field) {
    const common = { id: field.key, "data-testid": `input-${field.key}`, required: field.required, "aria-invalid": errors.includes(field.key), onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      setValues((old) => ({ ...old, [field.key]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value }));
      setErrors((old) => old.filter((key) => key !== field.key));
    } };
    if (field.type === "checkbox") return <label key={field.key} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm leading-6 ${errors.includes(field.key) ? "border-rose-400 bg-rose-50" : "border-[#d6e1da] bg-[#f7faf6]"}`}><input {...common} type="checkbox" checked={values[field.key] === true} className="mt-1 h-4 w-4 accent-[#1d5b58]" /><span>{field.label}{field.required && <b className="ml-1 text-[#b55243]">*</b>}</span></label>;
    return <div key={field.key} className="space-y-2"><label htmlFor={field.key} className="block text-sm font-semibold text-[#304d49]">{field.label}{field.required && <b className="ml-1 text-[#b55243]">*</b>}</label>{field.type === "textarea" ? <textarea {...common} value={String(values[field.key] ?? "")} rows={4} className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-[#284542] outline-none transition focus:border-[#528d78] focus:ring-2 focus:ring-[#528d78]/15 ${errors.includes(field.key) ? "border-rose-400" : "border-[#d1ded6]"}`} /> : field.type === "select" ? <select {...common} value={String(values[field.key] ?? "")} className="w-full rounded-xl border border-[#d1ded6] bg-white px-4 py-3 text-sm text-[#284542] outline-none focus:border-[#528d78]"><option value="">—</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input {...common} type={field.type === "email" ? "email" : "text"} value={String(values[field.key] ?? "")} className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#284542] outline-none transition focus:border-[#528d78] focus:ring-2 focus:ring-[#528d78]/15 ${errors.includes(field.key) ? "border-rose-400" : "border-[#d1ded6]"}`} />}{field.hint && <p className="text-xs leading-5 text-[#71827c]">{field.hint}</p>}{errors.includes(field.key) && <p className="text-xs font-semibold text-rose-700" data-testid={`error-${field.key}`}>{t.validation}</p>}</div>;
  }

  if (receipt) return <main className="min-h-[100dvh] bg-[#f3f7f3] px-4 py-12 text-[#244442]" lang={lang}><div className="mx-auto max-w-2xl rounded-3xl border border-[#d4e2d8] bg-[#fbfcf9] p-8 shadow-xl shadow-[#284a40]/5 md:p-12"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e4f0e6] text-[#39765a]"><CheckCircle2 size={27} /></div><p className="mt-7 text-xs font-bold tracking-[.17em] text-[#769183]">{t.received}</p><h1 className="mt-3 font-display text-3xl font-semibold">{t.receipt}</h1><p className="mt-4 leading-7 text-[#5e746f]" data-testid="status-submission-receipt">{t.receiptCopy}</p><div className="mt-7 rounded-xl bg-[#eef4ee] p-4"><span className="text-xs font-semibold uppercase tracking-wider text-[#718781]">{t.ref}</span><p className="mt-1 font-mono text-lg font-semibold" data-testid="text-receipt-id">{receipt.id}</p><p className="mt-1 text-sm text-[#668078]">{receipt.status}</p></div><p className="mt-5 text-sm text-[#627972]">{t.open}</p><Link href="/strengthen-your-core" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#1d5b58]" data-testid="link-receipt-home"><ArrowLeft size={16} />{t.back}</Link></div></main>;

  if (program.isLoading || program.isError || !program.data?.open) {
    const copy = availabilityCopy[lang];
    const message = program.isLoading ? copy.loading : program.isError ? copy.error : copy.closed;
    return <main className="grid min-h-[100dvh] place-items-center bg-[#f3f7f3] px-4 py-12 text-[#244442]" lang={lang}>
      <section className="w-full max-w-xl rounded-3xl border border-[#d4e2d8] bg-[#fbfcf9] p-8 shadow-xl shadow-[#284a40]/5 md:p-12">
        <p className="text-xs font-bold tracking-[.17em] text-[#769183]">{formCopy[lang].brand}</p>
        <h1 className="mt-4 font-display text-2xl font-semibold" data-testid="status-application-availability">{message}</h1>
        <label className="mt-6 block text-xs font-semibold text-[#688079]">{formCopy[lang].language}
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="ml-3 rounded-lg border border-[#cedbd2] bg-white px-3 py-2 text-sm" data-testid="select-application-language-closed"><option value="en">English</option><option value="zh">简体中文</option><option value="ko">한국어</option></select>
        </label>
        {program.isError && <button type="button" onClick={() => void program.refetch()} className="mt-5 rounded-lg border border-[#d1ded6] px-4 py-2 text-sm font-semibold" data-testid="button-retry-availability">{availabilityCopy[lang].retry}</button>}
        <Link href="/strengthen-your-core" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#1d5b58]" data-testid="link-closed-application-home"><ArrowLeft size={16} />{formCopy[lang].back}</Link>
      </section>
    </main>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7f3] text-[#244442]" lang={lang}>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/strengthen-your-core" className="inline-flex items-center gap-2 text-sm font-semibold text-[#315b54]" data-testid="link-application-back"><ArrowLeft size={16} />{t.back}</Link>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#688079]">{t.language}<select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setErrors([]); }} className="rounded-lg border border-[#cedbd2] bg-[#fbfcf9] px-2 py-2 text-sm text-[#31534e]" data-testid="select-application-language"><option value="en">English</option><option value="zh">简体中文</option><option value="ko">한국어</option></select></label>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-16 pt-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <section>
          <div className="mb-7"><p className="text-xs font-bold tracking-[.18em] text-[#739083]">{t.kicker}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.04em] text-[#203f3d]">{t.title}</h1><p className="mt-3 max-w-2xl leading-7 text-[#5c7470]">{t.intro}</p></div>
          <div className="mb-6 rounded-xl border border-[#e5d8bb] bg-[#fbf6e9] p-4 text-sm leading-6 text-[#75653d]"><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 shrink-0" /><p>{t.privacy}</p></div></div>
          <div className="mb-6 flex items-center justify-between rounded-xl border border-[#d6e2d9] bg-[#fbfcf9] px-4 py-3"><span className="text-sm font-semibold text-[#58706a]">{t.section} {step + 1} {t.of} {sections.length}</span><span className="font-mono text-xs text-[#82948b]">{String(step + 1).padStart(2, "0")} / 12</span></div>
          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-[#e0e9e2]"><div className="h-full rounded-full bg-[#52866f] transition-all duration-300" style={{ width: `${((step + 1) / sections.length) * 100}%` }} /></div>
          {errors.length > 0 && <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert" data-testid="status-validation-error"><CircleAlert size={17} className="mt-0.5 shrink-0" />{t.validation}</div>}
          <section className="rounded-2xl border border-[#d8e3db] bg-[#fbfcf9] p-5 shadow-sm shadow-[#2d4d40]/[.03] md:p-8" data-testid={`section-application-${step + 1}`}>
            <div className="mb-7 flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6efe7] font-mono text-sm font-bold text-[#54816d]">{String(step + 1).padStart(2, "0")}</span><div><h2 className="font-display text-2xl font-semibold text-[#264744]">{sections[step].title}</h2><p className="mt-1 text-sm leading-6 text-[#71817a]">{sections[step].intro}</p></div></div>
            <div className="space-y-6">{sections[step].fields.map(fieldControl)}</div>
            {step === 11 && <div className="mt-7 space-y-3 border-t border-[#e2e9e3] pt-6"><p className="flex gap-2 text-sm leading-6 text-[#506b63]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#638f75]" />{t.nonDiag}</p><p className="flex gap-2 text-sm leading-6 text-[#506b63]"><ClipboardCheck size={17} className="mt-0.5 shrink-0 text-[#638f75]" />{t.consent} {t.assent}</p><p className="text-xs leading-5 text-[#758680]">{t.evidence}</p></div>}
          </section>
          {submit.isError && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert" data-testid="status-submit-error">{t.error}</div>}
          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <button type="button" onClick={() => { setStep((s) => Math.max(0, s - 1)); setErrors([]); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={step === 0} className="rounded-xl border border-[#ccd9d0] bg-[#fbfcf9] px-5 py-3 text-sm font-semibold text-[#45635b] transition hover:bg-[#edf3ed] disabled:opacity-40" data-testid="button-previous-section">{t.previous}</button>
            {step < sections.length - 1 ? <button type="button" onClick={() => { if (validateCurrent()) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } }} className="inline-flex items-center gap-2 rounded-xl bg-[#1d5b58] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#154846]" data-testid="button-next-section">{t.next}<ArrowRight size={16} /></button> : <button type="button" onClick={handleSubmit} disabled={submit.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#1d5b58] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#154846] disabled:opacity-60" data-testid="button-submit-application">{submit.isPending ? t.submitting : t.review}<ArrowRight size={16} /></button>}
          </div>
        </section>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-[#d7e3da] bg-[#e8f0e8] p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#718b7a]">STRENGTHEN YOUR CORE</p><p className="mt-3 text-sm leading-6 text-[#526f66]">{t.open}</p></div>
          <div className="rounded-2xl border border-[#d7e3da] bg-[#fbfcf9] p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-[#365951]"><ShieldCheck size={17} />{t.nonDiag}</h3><p className="mt-3 text-sm leading-6 text-[#687d76]">{t.consent} {t.assent}</p></div>
          <div className="hidden rounded-2xl border border-[#d7e3da] bg-[#fbfcf9] p-5 lg:block"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#718b7a]">APPLICATION SECTIONS</p><ol className="mt-3 space-y-2">{sections.map((s, i) => <li key={s.title} className={`text-xs ${step === i ? "font-bold text-[#285c51]" : "text-[#82918b]"}`}><span className="mr-2 font-mono">{String(i + 1).padStart(2, "0")}</span>{s.title}</li>)}</ol></div>
        </aside>
      </div>
    </main>
  );
}

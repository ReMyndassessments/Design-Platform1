/**
 * Public workshop page — /training/:slug
 * No authentication required.
 * Handles free registration (immediate), paid Airwallex checkout, and the
 * server-controlled workshop manual-sales inquiry flow.
 *
 * Airwallex gotchas (from lsc-checkout.tsx):
 * - SDK global is window.AirwallexComponentsSDK
 * - createElement() is async — must be awaited
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import {
  Calendar, Clock, MapPin, Monitor, Award, DollarSign,
  Users, Mail, Phone, User, Building2, Globe, Check,
  AlertCircle, Loader2, Wifi, Heart, ShieldCheck, Languages,
} from "lucide-react";

declare global {
  interface Window {
    AirwallexComponentsSDK?: {
      init: (opts: { env: string; origin: string }) => Promise<void>;
      createElement: (type: string, opts: Record<string, unknown>) => Promise<{
        mount: (el: HTMLElement) => void;
      }>;
    };
  }
}

type SessionDate = { date?: string; start_time?: string; end_time?: string };
type Workshop = {
  id: string; slug: string; title: string; subtitle?: string;
  description?: string; additional_info?: string;
  image_object_id?: string; image_alt?: string;
  session_dates: SessionDate[]; timezone: string;
  delivery_method: string; venue_info?: string;
  facilitator_name?: string; pl_hours?: number;
  registration_opens_at?: string; registration_closes_at?: string;
  max_participants?: number; is_free: boolean;
  price?: number; currency: string; hosted_card_payment_url?: string; contact_email?: string;
  status: string; registration_count: number; manual_sales_mode?: boolean;
};

type RegStep = "form" | "payment" | "verify" | "inquiry-success" | "success" | "error" | "duplicate";

function getBaseUrl() {
  const prefix = window.location.pathname.startsWith("/raos") ? "/raos" : "";
  return prefix;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1.05rem;font-weight:700;margin:1.2rem 0 .4rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:700;margin:1.4rem 0 .5rem">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.5rem;font-weight:800;margin:1.5rem 0 .6rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*•]\s+(.+)$/gm, '<li style="margin-left:1.2rem;margin-bottom:.3rem">$1</li>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li style="margin-left:1.2rem;margin-bottom:.3rem;list-style-type:decimal">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#0d9488;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin-bottom:.8rem">')
    .replace(/\n/g, '<br>');
}

const TIMEZONES = [
  "Asia/Hong_Kong","Asia/Singapore","Asia/Tokyo","Asia/Seoul",
  "Asia/Shanghai","Asia/Taipei","Australia/Sydney","Europe/London",
  "America/New_York","America/Los_Angeles","Pacific/Auckland",
];
const CURRENCIES: Record<string, string> = { USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", CNY: "¥", JPY: "¥", KRW: "₩", GBP: "£", EUR: "€" };
const PROFESSIONAL_ROLES = [
  "Principal / Head of School", "Senior School Leader", "SENCO / Inclusion Leader",
  "Learning Support Coordinator", "School Counsellor", "School Psychologist",
  "Student Support Professional", "Teacher", "Pastoral / Wellbeing Leader",
  "School Administrator", "Education Consultant", "Other",
];
const SCHOOL_TYPES = [
  "International School", "Private / Independent School", "Public / Government School",
  "Bilingual School", "Early Years / Kindergarten", "Learning Centre",
  "University / Higher Education", "Other",
];
const SCHOOL_SIZES = ["Under 250", "250–499", "500–999", "1,000–1,999", "2,000+", "Not sure / Prefer not to say"];
const INTEREST_AREAS = [
  "Learning Difficulties", "Literacy / Reading", "Mathematics",
  "Academic English / Multilingual Learners", "Executive Function", "Attention",
  "Behaviour", "Social-Emotional Needs", "Mental Health & Wellbeing",
  "Neurodiversity", "School Readiness", "Assessment & Referral",
  "Tier 2 Intervention", "Parent Support", "Teacher Support / Differentiation", "Other",
];

function formatSessions(sessions: SessionDate[], timezone: string): string {
  if (!sessions.length) return "";
  return sessions
    .filter(s => s.date)
    .map(s => {
      const parts = [s.date];
      if (s.start_time) parts.push(`${s.start_time}${s.end_time ? `–${s.end_time}` : ""}`);
      return parts.join(" ");
    })
    .join(" · ");
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-teal-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

type ParentLocale = "en" | "zh-CN" | "ko";

const parentCopy: Record<ParentLocale, {
  language: string; register: string; date: string; online: string; family: string;
  overview: string; learn: string; included: string; notIncluded: string; who: string;
  faq: string; accessibility: string; formTitle: string; required: string; optional: string;
  fullName: string; firstName: string; lastName: string; email: string; wechat: string;
  country: string; preferredLanguage: string; phone: string; city: string; age: string;
  schoolType: string; question: string; support: string; terms: string; privacy: string;
  community: string; choosePayment: string; paymentPending: string; receipt: string;
  reference: string; submit: string; sending: string; codeTitle: string; codeHelp: string;
  verify: string; success: string; review: string; constructive: string; learnItems: string[];
  includedItems: string[]; excludedItems: string[]; faqItems: [string, string][];
}> = {
  en: {
    language: "English", register: "Register", date: "Saturday, October 17, 2026 · 10:00–11:30 AM China Time", online: "Online parent workshop", family: "388 RMB per family",
    overview: "When a child says, “My teacher doesn’t like me,” parents can feel worried, protective, and unsure what to do next. This calm, practical workshop helps you listen carefully, protect your child’s dignity, gather useful information, and communicate with school constructively.",
    learn: "What you will learn", included: "What your registration includes", notIncluded: "What this workshop does not include", who: "Who this is for", faq: "Frequently asked questions", accessibility: "Accessibility and participation support",
    formTitle: "Reserve your family place", required: "Required", optional: "Optional", fullName: "Parent or caregiver name", firstName: "First name", lastName: "Last name", email: "Email address", wechat: "WeChat ID or display name", country: "Country or region", preferredLanguage: "Preferred workshop language", phone: "Mobile number", city: "City", age: "Child age range or grade band", schoolType: "School type", question: "What would you most like help with?", support: "Accessibility, language, or participation support needed", terms: "I agree to the workshop terms.", privacy: "I agree to the Privacy Notice and processing of my registration and payment information.", community: "I would like to remain connected to the ReMynd parent community and receive future educational information (optional).",
    choosePayment: "Choose payment method", paymentPending: "Pay using the QR code, then continue to email verification. You must upload a payment receipt before final submission. Your place is not confirmed until ReMynd verifies the payment.", receipt: "Payment receipt screenshot", reference: "Payment reference or payer name", submit: "Continue to email verification", sending: "Sending verification code…", codeTitle: "Check your email", codeHelp: "Enter the six-digit verification code we sent. QR payments require a receipt upload below. Payment review happens after submission.", verify: "Verify and submit for payment review", success: "Thank you. Your registration and payment are pending administrator review.", review: "We will email you after your payment has been reviewed.", constructive: "This workshop is not about fighting with the school, blaming anyone, or assuming that a teacher has acted with harmful intent. It helps parents understand what may be happening, support their child, gather useful information, and communicate with the school in a calm and constructive way.",
    learnItems: ["Listen without dismissing the child or confirming an untested conclusion", "Separate observable events from assumptions and interpretations", "Consider frequency, context, intensity, impact, and several possible explanations", "Prepare for a respectful conversation with the school", "Identify practical next steps, review dates, and appropriate escalation thresholds"],
    includedItems: ["One live 90-minute online parent workshop", "Bilingual Parent Action Toolkit", "A Parent-School Meeting Preparation Form and observation template", "Sample language for contacting a teacher or school", "Access to the workshop WeChat group", "Seven days of structured, workshop-related WeChat group support"],
    excludedItems: ["Individual consultation, counselling, or therapy", "Psychological or diagnostic assessment", "Review of school records or individual case documents", "Legal advice, mediation, or representation", "A determination about a teacher’s intentions or conduct", "Unlimited ongoing individual support through WeChat"],
    faqItems: [["Is this counselling or an assessment?", "No. It is parent education and does not provide individual clinical recommendations."], ["What language is used?", "The workshop is delivered in English."], ["What happens after I register?", "Your email is verified first. Payment is then reviewed by ReMynd before your place is confirmed."]],
  },
  "zh-CN": {
    language: "简体中文", register: "报名", date: "2026年10月17日（星期六）· 中国时间上午10:00–11:30", online: "线上家长工作坊", family: "每个家庭388元人民币",
    overview: "当孩子说“老师不喜欢我”时，家长可能会担心、想保护孩子，也不确定下一步该怎么做。本工作坊帮助您认真倾听、保护孩子的尊严、收集有用信息，并以建设性的方式与学校沟通。",
    learn: "您将学到", included: "报名包括", notIncluded: "本工作坊不包括", who: "适合参加者", faq: "常见问题", accessibility: "无障碍及参与支持",
    formTitle: "为您的家庭预留名额", required: "必填", optional: "选填", fullName: "家长或照顾者姓名", firstName: "名字", lastName: "姓氏", email: "电子邮箱", wechat: "微信号或微信昵称", country: "国家或地区", preferredLanguage: "希望使用的工作坊语言", phone: "手机号码", city: "城市", age: "孩子年龄范围或年级段", schoolType: "学校类型", question: "您最希望在本次工作坊中获得哪些帮助？", support: "无障碍、语言或参与方面的支持需要", terms: "我同意工作坊条款。", privacy: "我同意隐私声明，并同意处理我的报名及付款信息。", community: "我愿意继续加入ReMynd家长社区并接收未来教育信息（选填）。",
    choosePayment: "选择付款方式", paymentPending: "请使用二维码付款，然后继续验证电子邮箱。最终提交前必须上传付款凭证。ReMynd核实付款后，名额才会确认。", receipt: "付款凭证截图", reference: "付款参考号或付款人姓名", submit: "继续验证电子邮箱", sending: "正在发送验证码…", codeTitle: "请查收电子邮件", codeHelp: "请输入我们发送的六位验证码。二维码付款必须在下方上传付款凭证。提交后，ReMynd将审核付款。", verify: "验证并提交付款审核", success: "谢谢。您的报名和付款正在等待管理员审核。", review: "付款审核完成后，我们会通过电子邮件通知您。", constructive: "本工作坊不是为了与学校争斗、指责任何人，或假定老师有恶意。它帮助家长理解可能发生的情况、支持孩子、收集有用信息，并以冷静和建设性的方式与学校沟通。",
    learnItems: ["倾听孩子，不轻易否定，也不立即确认未经验证的结论", "区分可观察的事件与假设和解读", "考虑频率、情境、强度、影响及多种可能解释", "为尊重和有效的家校沟通做好准备", "确定实际下一步、复盘日期和适当的升级标准"],
    includedItems: ["一次90分钟线上家长工作坊", "双语家长行动工具包", "家校会谈准备表和观察记录模板", "联系老师或学校的示例用语", "加入工作坊微信群", "七天有结构的工作坊相关微信群支持"],
    excludedItems: ["个别咨询、辅导或治疗", "心理或诊断评估", "查阅学校记录或个案文件", "法律建议、调解或代理", "判断老师的意图或行为", "通过微信提供无限期的个别支持"],
    faqItems: [["这是辅导或评估吗？", "不是。这是家长教育工作坊，不提供个别临床建议。"], ["使用什么语言？", "本工作坊仅使用英语授课。"], ["报名后会怎样？", "您需要先验证电子邮箱，然后由ReMynd审核付款，之后才会确认名额。"]],
  },
  ko: {
    language: "한국어", register: "등록", date: "2026년 10월 17일 토요일 · 중국 시간 오전 10:00–11:30", online: "온라인 부모 워크숍", family: "가족당 388 RMB",
    overview: "아이가 “선생님이 나를 좋아하지 않는 것 같아요”라고 말하면 부모는 걱정되고 무엇을 해야 할지 막막할 수 있습니다. 이 차분하고 실용적인 워크숍은 아이의 이야기를 듣고 존엄성을 지키며 유용한 정보를 모으고 학교와 건설적으로 소통하도록 돕습니다.",
    learn: "배우게 될 내용", included: "등록에 포함된 내용", notIncluded: "포함되지 않는 내용", who: "참여 대상", faq: "자주 묻는 질문", accessibility: "접근성 및 참여 지원",
    formTitle: "가족 자리를 예약하세요", required: "필수", optional: "선택", fullName: "부모 또는 보호자 이름", firstName: "이름", lastName: "성", email: "이메일 주소", wechat: "WeChat ID 또는 표시 이름", country: "국가 또는 지역", preferredLanguage: "선호 워크숍 언어", phone: "휴대전화", city: "도시", age: "자녀 연령대 또는 학년", schoolType: "학교 유형", question: "이 워크숍에서 가장 도움받고 싶은 것은 무엇인가요?", support: "접근성·언어·참여 지원이 필요하다면 알려 주세요", terms: "워크숍 약관에 동의합니다.", privacy: "개인정보 보호정책 및 등록·결제 정보 처리에 동의합니다.", community: "ReMynd 부모 커뮤니티에 계속 연결되어 향후 교육 정보를 받고 싶습니다(선택).",
    choosePayment: "결제 방법 선택", paymentPending: "QR 코드로 결제한 뒤 이메일 인증을 계속해 주세요. 최종 제출 전에 결제 영수증을 반드시 업로드해야 합니다. ReMynd가 결제를 확인한 후 자리가 확정됩니다.", receipt: "결제 영수증 스크린샷", reference: "결제 참조번호 또는 결제자 이름", submit: "이메일 인증으로 계속", sending: "인증 코드를 보내는 중…", codeTitle: "이메일을 확인해 주세요", codeHelp: "받은 6자리 인증 코드를 입력해 주세요. QR 결제는 아래에서 영수증을 업로드해야 합니다. 제출 후 결제를 검토합니다.", verify: "인증하고 결제 검토 요청", success: "감사합니다. 등록과 결제가 관리자 검토를 기다리고 있습니다.", review: "결제 검토가 완료되면 이메일로 안내해 드립니다.", constructive: "이 워크숍은 학교와 싸우거나 누군가를 비난하거나 교사가 해로운 의도로 행동했다고 가정하기 위한 것이 아닙니다. 부모가 상황을 이해하고 아이를 지지하며 정보를 모으고 차분하고 건설적으로 학교와 소통하도록 돕습니다.",
    learnItems: ["아이를 무시하거나 검증되지 않은 결론을 바로 확인하지 않고 경청하기", "관찰 가능한 사건과 가정·해석을 구분하기", "빈도·상황·강도·영향과 여러 가능한 설명 살펴보기", "존중하는 학교와의 대화를 준비하기", "실행 단계와 검토 시점, 적절한 추가 대응 기준 정하기"],
    includedItems: ["90분 온라인 부모 워크숍", "이중언어 부모 행동 툴킷", "학교 면담 준비 양식과 관찰 기록 템플릿", "교사·학교에 연락할 때 사용할 예시 문구", "워크숍 WeChat 그룹 참여", "7일간의 구조화된 워크숍 관련 WeChat 지원"],
    excludedItems: ["개별 상담·치료", "심리 또는 진단 평가", "학교 기록이나 개별 사례 자료 검토", "법률 자문·조정·대리", "교사의 의도나 행동에 대한 판단", "WeChat을 통한 무제한 개별 지원"],
    faqItems: [["상담이나 평가인가요?", "아닙니다. 부모 교육 워크숍이며 개별 임상 권고를 제공하지 않습니다."], ["어떤 언어로 진행되나요?", "워크숍은 영어로만 진행됩니다."], ["등록 후에는 어떻게 되나요?", "먼저 이메일을 인증하고 ReMynd가 결제를 검토한 후 자리를 확정합니다."]],
  },
};

function ParentWorkshopExperience({ workshop, slug, qrOptions }: { workshop: Workshop; slug: string; qrOptions: { wechatPayQr: string | null; alipayQr: string | null } }) {
  const [locale, setLocale] = useState<ParentLocale>("en");
  const [step, setStep] = useState<"form" | "verify" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [code, setCode] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [showCardPaymentNotice, setShowCardPaymentNotice] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", wechat_id: "", country: "", preferred_language: "English", phone: "", city: "", child_age_grade: "", school_type: "", help_question: "", accessibility_support: "", marketing_consent: false, terms_consent: false, privacy_consent: false, payment_method: "", payment_reference: "" });
  const t = parentCopy[locale];
  const base = getBaseUrl();
  const update = (key: string, value: string | boolean) => {
    setForm(f => ({ ...f, [key]: value }));
    if (key === "payment_method" && value === "credit_card" && workshop.hosted_card_payment_url) {
      setShowCardPaymentNotice(true);
    }
  };
  const setErrorMessage = (message: string) => setError(message);
  async function submitForm(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch(`${base}/api/training/workshops/public/${slug}/manual-sales/request-verification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to send verification code");
      setInquiryId(data.inquiryId); setStep("verify");
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : "Unable to submit registration"); } finally { setSubmitting(false); }
  }
  async function submitVerification(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSubmitting(true);
    try {
      let receiptPath: string | undefined;
      if (form.payment_method !== "credit_card") {
        if (!receipt) throw new Error(t.receipt + " is required.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(receipt.type) || receipt.size > 10 * 1024 * 1024) throw new Error("Use a PNG, JPEG, or WebP image under 10 MB.");
        const upload = await fetch(`${base}/api/training/workshops/public/${slug}/manual-sales/${inquiryId}/receipt-upload-url`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: receipt.size, contentType: receipt.type }) });
        const uploadData = await upload.json(); if (!upload.ok) throw new Error(uploadData.error || "Unable to prepare upload");
        const put = await fetch(uploadData.uploadURL, { method: "PUT", headers: { "Content-Type": receipt.type }, body: receipt }); if (!put.ok) throw new Error("Receipt upload failed");
        receiptPath = uploadData.objectPath;
      }
      const response = await fetch(`${base}/api/training/workshops/public/${slug}/manual-sales/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inquiry_id: inquiryId, verification_code: code, receipt_object_path: receiptPath }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to submit");
      setStep("success");
    } catch (err) { setErrorMessage(err instanceof Error ? err.message : "Unable to submit"); } finally { setSubmitting(false); }
  }
  const field = (key: string, label: string, required = false, type = "text") => {
    const isRequired = key === "country" ? false : required;
    return <label className="block text-sm font-semibold text-slate-700">{label}{isRequired && " *"}<input required={isRequired} type={type} value={(form as any)[key]} onChange={e => update(key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal outline-none ring-teal-300 focus:ring-2" /></label>;
  };
  const items = (list: string[]) => <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">{list.map(item => <li key={item} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-teal-600" />{item}</li>)}</ul>;
  return <div className="min-h-screen bg-[#f4f8f8] text-[#172b3a]">
    <style>{`
      label:has(> select[required]) { display: none; }
      .parent-registration-form label:has(img[alt$="QR code"]) {
        grid-column: 1 / -1;
      }
      .parent-registration-form label:has(img[alt$="QR code"])::after {
        content: "Workshop fee: 388 RMB per family";
        display: block;
        margin-top: 1rem;
        border-radius: 0.75rem;
        background: #102d42;
        padding: 0.9rem 1rem;
        color: white;
        text-align: center;
        font-size: clamp(1.25rem, 3vw, 1.75rem);
        font-weight: 800;
        line-height: 1.2;
      }
      .parent-registration-form img[alt$="QR code"] {
        width: 100%;
        height: auto;
        max-height: 42rem;
        object-fit: contain;
      }
    `}</style>
    {showCardPaymentNotice && workshop.hosted_card_payment_url && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="card-payment-title">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          <h2 id="card-payment-title" className="text-2xl font-black text-[#102d42]">Before you continue to Airwallex</h2>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-base font-bold leading-relaxed text-amber-950">
              After payment, return to this ReMynd tab and click “Continue to email verification” to complete your registration.
            </p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Airwallex will open in a new tab. Keep this registration tab open so your entered information is preserved. Your place remains pending until ReMynd reviews the payment.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShowCardPaymentNotice(false)}
              className="min-h-12 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700"
            >
              Go back
            </button>
            <a
              href={workshop.hosted_card_payment_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowCardPaymentNotice(false)}
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#102d42] px-4 py-3 text-center font-bold text-white"
            >
              Continue to Airwallex
            </a>
          </div>
        </div>
      </div>
    )}
    <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-[#102d42]/95 px-4 py-3 text-white shadow-md backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-2"><img src="/images/remynd-logo-new.png" alt="ReMynd" className="h-9 w-9 rounded-full object-cover" /><span className="font-bold">ReMynd Student Services</span></div><div className="flex items-center gap-1 rounded-lg bg-white/10 p-1"><Languages size={15} className="mx-1 text-teal-200" />{(["en", "zh-CN", "ko"] as ParentLocale[]).map(l => <button type="button" key={l} onClick={() => setLocale(l)} className={`rounded px-2 py-1 text-xs ${locale === l ? "bg-white text-[#102d42]" : "text-white/80"}`}>{parentCopy[l].language}</button>)}</div></div></nav>
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 overflow-hidden rounded-3xl bg-[#102d42] p-3 shadow-lg sm:p-5">
        <img
          src="/images/teacher-doesnt-like-me-workshop-flyer.png"
          alt="Workshop flyer for When Your Child Says, My Teacher Doesn't Like Me"
          className="mx-auto max-h-[820px] w-full max-w-2xl rounded-2xl object-contain"
        />
      </div>
      <section className="rounded-3xl bg-gradient-to-br from-[#dceff0] via-[#f8f4eb] to-[#e9f0f8] px-5 py-8 shadow-sm sm:px-10 sm:py-12"><div className="max-w-3xl"><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-teal-700">{t.online} · {t.family}</p><h1 className="text-3xl font-black leading-tight text-[#102d42] sm:text-5xl">{workshop.title || "When Your Child Says, “My Teacher Doesn’t Like Me”"}</h1><p className="mt-5 text-lg leading-relaxed text-slate-700">{t.overview}</p><div className="mt-6 flex flex-wrap gap-3"><span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold">{t.date}</span><span className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold">{workshop.facilitator_name || "Noel Roberts"}</span></div></div></section>
      <div className="my-6 rounded-2xl border border-teal-200 bg-[#eaf7f5] p-5 text-sm font-semibold leading-relaxed text-[#174c4b]"><Heart size={18} className="mb-2 text-teal-600" />{t.constructive}</div>
      <section className="grid gap-5 md:grid-cols-2"><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{t.learn}</h2>{items(t.learnItems)}</div><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{t.included}</h2>{items(t.includedItems)}</div><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{t.notIncluded}</h2>{items(t.excludedItems)}</div><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">{t.faq}</h2><div className="mt-3 space-y-4 text-sm text-slate-600">{t.faqItems.map(([q, a]) => <div key={q}><p className="font-bold text-slate-800">{q}</p><p className="mt-1">{a}</p></div>)}</div></div></section>
      <section className="mt-6 rounded-3xl bg-white p-5 shadow-lg sm:p-8">{step === "success" ? <div className="py-10 text-center"><ShieldCheck size={42} className="mx-auto text-teal-600" /><h2 className="mt-4 text-2xl font-bold">{t.success}</h2><p className="mt-2 text-slate-600">{t.review}</p></div> : step === "verify" ? <form onSubmit={submitVerification} className="mx-auto max-w-xl space-y-5"><h2 className="text-2xl font-bold">{t.codeTitle}</h2><p className="text-sm text-slate-600">{t.codeHelp}</p><input required inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value)} placeholder="000000" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg tracking-[.4em]" />{form.payment_method !== "credit_card" && <label className="block text-sm font-semibold">{t.receipt} *<input required type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setReceipt(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /></label>}<button disabled={submitting} className="w-full rounded-xl bg-[#102d42] px-4 py-3 font-bold text-white disabled:opacity-50">{submitting ? t.sending : t.verify}</button>{error && <p className="text-sm text-red-600">{error}</p>}</form> : <form onSubmit={submitForm} className="mx-auto max-w-3xl space-y-5"><h2 className="text-2xl font-bold">{t.formTitle}</h2><p className="text-sm text-slate-500">{t.required} *</p><div className="grid gap-4 sm:grid-cols-2">{field("first_name", t.firstName, true)}{field("last_name", t.lastName, true)}</div>{field("email", t.email, true, "email")}{field("wechat_id", t.wechat, true)}{field("country", t.country, true)}<label className="block text-sm font-semibold">{t.preferredLanguage} *<select required value={form.preferred_language} onChange={e => update("preferred_language", e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"><option>English</option><option>Simplified Chinese</option><option>Both</option></select></label><div className="grid gap-4 sm:grid-cols-2">{field("phone", t.phone)}{field("city", t.city)}</div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold">{t.age}<select value={form.child_age_grade} onChange={e => update("child_age_grade", e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"><option value="">—</option><option>Early years</option><option>Primary</option><option>Secondary</option><option>Prefer not to say</option></select></label><label className="block text-sm font-semibold">{t.schoolType}<select value={form.school_type} onChange={e => update("school_type", e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm"><option value="">—</option><option>International</option><option>Bilingual</option><option>Local</option><option>Homeschool</option><option>Other</option><option>Prefer not to say</option></select></label></div><label className="block text-sm font-semibold">{t.question}<textarea maxLength={500} value={form.help_question} onChange={e => update("help_question", e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm" /></label><label className="block text-sm font-semibold">{t.accessibility}<textarea maxLength={500} value={form.accessibility_support} onChange={e => update("accessibility_support", e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm" /></label><fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-1 text-sm font-bold">{t.choosePayment}</legend><div className="grid gap-3 sm:grid-cols-3">{[["wechat_pay", "WeChat Pay", qrOptions.wechatPayQr], ["alipay", "Alipay", qrOptions.alipayQr], ["credit_card", "Credit Card", null]].map(([value, label, qr]) => <label key={value as string} className={`rounded-xl border p-3 text-sm font-semibold ${form.payment_method === value ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}><input required type="radio" name="parent-payment" checked={form.payment_method === value} onChange={() => update("payment_method", value as string)} /> <span className="ml-1">{label as string}</span>{qr && form.payment_method === value && <img src={qr as string} alt={`${label} QR code`} className="mt-3 h-40 w-full object-contain" />}</label>)}</div>{(form.payment_method === "wechat_pay" || form.payment_method === "alipay") && <p className="mt-3 text-xs leading-relaxed text-amber-800">{t.paymentPending}</p>}{form.payment_method && <label className="mt-3 block text-sm font-semibold">{t.reference}<input value={form.payment_reference} onChange={e => update("payment_reference", e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm" /></label>}</fieldset><label className="flex gap-3 text-sm text-slate-600"><input type="checkbox" required checked={form.terms_consent} onChange={e => update("terms_consent", e.target.checked)} />{t.terms}</label><label className="flex gap-3 text-sm text-slate-600"><input type="checkbox" required checked={form.privacy_consent} onChange={e => update("privacy_consent", e.target.checked)} />{t.privacy}</label><label className="flex gap-3 text-sm text-slate-600"><input type="checkbox" checked={form.marketing_consent} onChange={e => update("marketing_consent", e.target.checked)} />{t.community}</label><button disabled={submitting} className="w-full rounded-xl bg-[#102d42] px-4 py-3 font-bold text-white disabled:opacity-50">{submitting ? t.sending : t.submit}</button>{error && <p className="text-sm text-red-600">{error}</p>}</form>}</section>
      {step === "verify" && form.payment_method === "credit_card" && workshop.hosted_card_payment_url && (
        <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-teal-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold leading-relaxed text-[#102d42]">
            After payment, return to this tab and continue to email verification to complete your registration.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Credit-card payment is processed securely through Airwallex. ReMynd does not collect or store your card details. Your place remains pending until payment is reviewed.
          </p>
          <a
            href={workshop.hosted_card_payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#102d42] px-6 py-3 font-bold text-white"
          >
            Open Secure Credit Card Payment
          </a>
          <p className="mt-3 break-all text-xs text-slate-500">
            If the WeChat browser does not open the payment page, copy this link: {workshop.hosted_card_payment_url}
          </p>
        </div>
      )}
      <p className="mt-6 text-center text-xs text-slate-500">{t.accessibility} · ReMynd Student Services</p>
    </main>
  </div>;
}

export default function WorkshopPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherWorkshops, setOtherWorkshops] = useState<Workshop[]>([]);

  const [step, setStep] = useState<RegStep>("form");
  const [regId, setRegId] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [regError, setRegError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [manualInquiryId, setManualInquiryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrOptions, setQrOptions] = useState<{ wechatPayQr: string | null; alipayQr: string | null }>({ wechatPayQr: null, alipayQr: null });
  const [usdCnyRate, setUsdCnyRate] = useState<{ rate: number; date: string } | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);

  const paymentContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    professional_role: "", professional_role_other: "",
    school_name: "", city: "", country: "", phone: "",
    school_type: "", school_size: "", areas_of_interest: [] as string[],
    school_support_challenge: "",
    interested_future_learning: false, interested_school_training: false,
    interested_assessment_services: false, interested_partner_school: false,
    training_only: false, marketing_consent: false, privacy_consent: false,
    manual_sales_message: "",
    payment_method: "", other_payment_options: [] as string[], payment_reference: "",
  });

  const toggleInterestArea = (area: string) => {
    setForm(f => ({
      ...f,
      areas_of_interest: f.areas_of_interest.includes(area)
        ? f.areas_of_interest.filter(item => item !== area)
        : [...f.areas_of_interest, area],
    }));
  };

  useEffect(() => {
    const base = getBaseUrl();
    fetch(`${base}/api/training/workshops/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setWorkshop(d.workshop))
      .catch(() => setLoadError("Workshop not found or not available."))
      .finally(() => setLoading(false));
    // Fetch other published workshops for the "More Workshops" section
    fetch(`${base}/api/training/workshops/public/list`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setOtherWorkshops((d.workshops ?? []).filter((w: Workshop) => w.slug !== slug)))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!workshop?.manual_sales_mode) return;
    fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/payment-options`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setQrOptions)
      .catch(() => setRegError("Payment QR codes are temporarily unavailable. Please choose other payment options."));
  }, [slug, workshop?.manual_sales_mode]);

  useEffect(() => {
    if (!workshop || workshop.is_free || workshop.currency !== "USD") return;
    fetch(`${getBaseUrl()}/api/training/exchange-rate/usd-cny`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUsdCnyRate(data))
      .catch(() => setUsdCnyRate(null));
  }, [workshop]);

  // After step becomes "payment", init Airwallex
  const paymentData = useRef<{ intentId: string; clientSecret: string; env: string } | null>(null);

  useEffect(() => {
    if (step !== "payment" || !paymentData.current || !paymentContainerRef.current) return;
    const { intentId, clientSecret, env } = paymentData.current;
    let cancelled = false;

    async function initPayment() {
      try {
        if (!document.querySelector('script[data-airwallex-sdk]')) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://static.airwallex.com/components/sdk/v1/index.js";
            s.dataset.airwallexSdk = "1";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Airwallex SDK"));
            document.head.appendChild(s);
          });
        }

        const end = Date.now() + 15000;
        while (!window.AirwallexComponentsSDK && Date.now() < end) {
          await new Promise(r => setTimeout(r, 150));
        }
        if (!window.AirwallexComponentsSDK) throw new Error("Airwallex SDK timed out");
        if (cancelled) return;

        const AW = window.AirwallexComponentsSDK;
        await AW.init({ env: env === "prod" ? "prod" : "demo", origin: window.location.origin });
        if (cancelled) return;

        const element = await AW.createElement("dropIn", {
          intent_id: intentId,
          client_secret: clientSecret,
        });
        if (cancelled || !paymentContainerRef.current) return;

        element.mount(paymentContainerRef.current);

        paymentContainerRef.current.addEventListener("onSuccess", () => {
          setStep("success");
        });
        paymentContainerRef.current.addEventListener("onError", (e: Event) => {
          const detail = (e as CustomEvent).detail;
          setPaymentError(detail?.message ?? "Payment failed. Please try again.");
        });
      } catch (err) {
        if (!cancelled) setPaymentError(err instanceof Error ? err.message : "Failed to initialize payment.");
      }
    }

    initPayment();
    return () => { cancelled = true; };
  }, [step]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!workshop) return;
    setRegError("");
    setSubmitting(true);
    try {
      const base = getBaseUrl();
      if (!workshop.is_free && workshop.manual_sales_mode) {
        const vr = await fetch(`${base}/api/training/workshops/public/${slug}/manual-sales/request-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, message: form.manual_sales_message }),
        });
        const vdata = await vr.json();
        if (!vr.ok) throw new Error(vdata.error ?? "Unable to send verification code");
        setManualInquiryId(vdata.inquiryId);
        setStep("verify");
        return;
      }
      const res = await fetch(`${base}/api/training/workshops/public/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setStep("duplicate"); return; }
        throw new Error(data.error ?? "Registration failed");
      }
      setRegId(data.id);
      if (!data.requiresPayment) {
        setStep("success");
      } else {
        // Create payment intent
        const pr = await fetch(`${base}/api/training/workshops/public/${slug}/payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_id: data.id }),
        });
        const pdata = await pr.json();
        if (!pr.ok) throw new Error(pdata.error ?? "Payment setup failed");
        if (pdata.alreadyPaid) { setStep("success"); return; }
        paymentData.current = { intentId: pdata.intentId, clientSecret: pdata.clientSecret, env: pdata.env };
        setStep("payment");
      }
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSalesVerification(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setSubmitting(true);
    try {
      let receiptObjectPath: string | undefined;
      if (form.payment_method === "wechat_pay" || form.payment_method === "alipay") {
        if (!paymentReceipt) throw new Error("Upload your payment receipt screenshot before submitting.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(paymentReceipt.type) || paymentReceipt.size > 10 * 1024 * 1024) {
          throw new Error("Use a PNG, JPEG, or WebP receipt under 10 MB.");
        }
        const upload = await fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/${manualInquiryId}/receipt-upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ size: paymentReceipt.size, contentType: paymentReceipt.type }),
        });
        const uploadData = await upload.json();
        if (!upload.ok) throw new Error(uploadData.error ?? "Unable to prepare receipt upload.");
        const put = await fetch(uploadData.uploadURL, { method: "PUT", headers: { "Content-Type": paymentReceipt.type }, body: paymentReceipt });
        if (!put.ok) throw new Error("Receipt upload failed. Please try again.");
        receiptObjectPath = uploadData.objectPath;
      }
      const res = await fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: manualInquiryId, verification_code: verificationCode, receipt_object_path: receiptObjectPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to submit inquiry");
      setStep("inquiry-success");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Unable to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
    </div>
  );

  if (loadError || !workshop) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
      <AlertCircle size={40} className="text-slate-400" />
      <h1 className="text-xl font-bold">Workshop Not Found</h1>
      <p className="text-slate-400 text-sm">{loadError || "This workshop is not available."}</p>
      <a href="/training" className="mt-2 text-teal-400 hover:text-teal-300 text-sm underline">← Back to Training</a>
    </div>
  );

  const sessions = Array.isArray(workshop.session_dates) ? workshop.session_dates : [];
  const dateStr = formatSessions(sessions, workshop.timezone);
  const isClosed = workshop.status === "closed";
  const isFull = workshop.status === "full";
  const regClosed = !!(workshop.registration_closes_at && new Date(workshop.registration_closes_at) < new Date());
  const canRegister = !isClosed && !regClosed && !(isFull && workshop.max_participants && workshop.registration_count >= workshop.max_participants);
  const usesExpandedRegistration = true;

  const imageUrl = workshop.image_object_id
    ? `${getBaseUrl()}/api/training/workshops/public/${slug}/image`
    : slug === "nice-try"
      ? `${getBaseUrl()}/images/nice-try-workshop.png`
      : null;

  const priceStr = workshop.is_free
    ? "Free"
    : `${CURRENCIES[workshop.currency] ?? ""}${workshop.price} ${workshop.currency}`;
  const rmbEstimate = usdCnyRate && workshop.currency === "USD"
    ? Math.round(Number(workshop.price) * usdCnyRate.rate)
    : null;
  const manualSalesMode = !workshop.is_free && !!workshop.manual_sales_mode;

  if (slug === "teacher-doesnt-like-me") {
    return <ParentWorkshopExperience workshop={workshop} slug={slug} qrOptions={qrOptions} />;
  }

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Nav */}
      <nav className="bg-[#0c1a2e] px-4 sm:px-6 py-3.5 flex items-center gap-3">
        <a href="https://remyndassessments.com" className="flex items-center gap-2.5 group" aria-label="ReMynd Student Services home">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm overflow-hidden">
            <img src="/images/remynd-logo-new.png" alt="" className="w-10 h-10 object-cover" />
          </div>
          <span className="flex flex-col leading-tight">
            <span className="font-bold text-white text-base tracking-tight">ReMynd</span>
            <span className="text-teal-400 text-[9px] font-semibold tracking-widest uppercase">Student Services</span>
          </span>
        </a>
      </nav>

      {/* Hero */}
      {/* Flyer image — shown prominently when present */}
      {imageUrl && (
        <div className={`w-full bg-[#0c1a2e] ${slug === "nice-try" ? "px-4 py-6 md:py-10" : ""}`}>
          <img
            src={imageUrl}
            alt={workshop.image_alt ?? workshop.title}
            className={`w-full object-contain object-top ${slug === "nice-try" ? "max-w-3xl max-h-[780px] mx-auto rounded-2xl shadow-2xl shadow-black/30" : "max-h-[520px]"}`}
          />
        </div>
      )}

      {/* Title bar */}
      <div className="bg-[#0c1a2e]">
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {workshop.status === "published" && (
              <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-500 text-white px-2.5 py-1 rounded-full">Open for Registration</span>
            )}
            {isFull && <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-white px-2.5 py-1 rounded-full">Workshop Full</span>}
            {isClosed && <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-500 text-white px-2.5 py-1 rounded-full">Closed</span>}
            {workshop.is_free
              ? <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-600 text-white px-2.5 py-1 rounded-full">Free</span>
              : <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-600 text-white px-2.5 py-1 rounded-full">{priceStr}</span>
            }
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">{workshop.title}</h1>
          {workshop.subtitle && <p className="text-lg md:text-xl text-slate-300 mt-3 max-w-2xl">{workshop.subtitle}</p>}
          {workshop.facilitator_name && (
            <div className="flex items-center gap-1.5 mt-4 text-slate-400 text-sm">
              <User size={13} />
              <span>Facilitated by <span className="text-slate-200 font-semibold">{workshop.facilitator_name}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-6">
        {/* Workshop information */}
        <div className="contents">
          {/* Key details */}
          <div className="order-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2 divide-y divide-slate-100">
            {dateStr && <InfoChip icon={Calendar} label="Date(s)" value={dateStr} />}
            {workshop.timezone && <InfoChip icon={Clock} label="Time Zone" value={workshop.timezone} />}
            <InfoChip icon={workshop.delivery_method === "in_person" ? MapPin : workshop.delivery_method === "hybrid" ? Globe : Monitor} label="Delivery"
              value={workshop.delivery_method === "in_person" ? "In Person" : workshop.delivery_method === "hybrid" ? "Hybrid" : "Online"} />
            {workshop.venue_info && <InfoChip icon={MapPin} label="Location" value={workshop.venue_info} />}
            {workshop.pl_hours != null && <InfoChip icon={Award} label="PL Hours" value={`${workshop.pl_hours} hours`} />}
            <InfoChip icon={DollarSign} label="Cost" value={priceStr} />
            {workshop.max_participants != null && (
              <InfoChip icon={Users} label="Capacity" value={`${workshop.registration_count} registered${workshop.max_participants ? ` / ${workshop.max_participants} max` : ''}`} />
            )}
          </div>

          {/* Description */}
          {workshop.description && (
            <div className="order-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <h2 className="text-base font-bold text-slate-800 mb-3">About This Workshop</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{workshop.description}</p>
            </div>
          )}

          {/* Additional info (markdown) */}
          {workshop.additional_info && (
            <div className="order-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <div
                className="text-sm text-slate-700 leading-relaxed"
                style={{ lineHeight: "1.75" }}
                dangerouslySetInnerHTML={{ __html: `<p style="margin-bottom:.8rem">${renderMarkdown(workshop.additional_info)}</p>` }}
              />
            </div>
          )}

          {/* Contact */}
          {workshop.contact_email && (
            <p className="order-5 text-sm text-slate-500 flex items-center gap-1.5">
              <Mail size={13} />
              Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 hover:text-teal-700 underline">{workshop.contact_email}</a>
            </p>
          )}
        </div>

        {/* Full-width registration section */}
        <div className="order-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            {step === "form" && (
              <>
                <div className="bg-[#0c1a2e] px-5 py-4">
                  <h3 className="text-white font-bold text-base">
                    {canRegister ? "Register for This Workshop" : isFull ? "Workshop Full" : "Registration Closed"}
                  </h3>
                  {canRegister && (
                    <p className="text-slate-400 text-xs mt-1">
                      {workshop.is_free ? "Free admission — reserve your spot" : manualSalesMode ? "Request registration and payment arrangements directly from ReMynd" : `${priceStr} per person`}
                    </p>
                  )}
                </div>

                {!canRegister ? (
                  <div className="p-6 text-center">
                    <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      {isFull ? "This workshop has reached capacity." : "Registration for this workshop is closed."}
                    </p>
                    {workshop.contact_email && (
                      <p className="text-xs text-slate-400 mt-2">
                        Contact <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a> to join the waitlist.
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="max-w-4xl mx-auto px-5 md:px-8 py-6 md:py-8 space-y-5">
                    <div>
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Personal Information</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">First Name *</label>
                        <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Last Name *</label>
                        <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">School / Organisation{usesExpandedRegistration ? " *" : ""}</label>
                      <input required={usesExpandedRegistration} value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {usesExpandedRegistration && <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">City *</label>
                        <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Country / Region{usesExpandedRegistration ? " *" : ""}</label>
                        <input required={usesExpandedRegistration} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5 space-y-3">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Professional Role</p>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Your Primary Role{usesExpandedRegistration ? " *" : ""}</label>
                      <select value={form.professional_role} onChange={e => setForm(f => ({ ...f, professional_role: e.target.value }))}
                        required={usesExpandedRegistration} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="">Select role…</option>
                        {PROFESSIONAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {form.professional_role === "Other" && (
                        <input required aria-label="Specify professional role" placeholder="Please specify your role"
                          value={form.professional_role_other}
                          onChange={e => setForm(f => ({ ...f, professional_role_other: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      )}
                    </div>

                    {usesExpandedRegistration && <div className="border-t border-slate-100 pt-5 space-y-3">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">School Information</p>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">School Type</label>
                        <select value={form.school_type} onChange={e => setForm(f => ({ ...f, school_type: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                          <option value="">Select school type…</option>
                          {SCHOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Approximate Number of Students</label>
                        <select value={form.school_size} onChange={e => setForm(f => ({ ...f, school_size: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                          <option value="">Select…</option>
                          {SCHOOL_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </div>
                    </div>}

                    {usesExpandedRegistration && <fieldset className="border-t border-slate-100 pt-5">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Areas of Interest</legend>
                      <div className="grid grid-cols-1 gap-2">
                        {INTEREST_AREAS.map(area => (
                          <label key={area} className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={form.areas_of_interest.includes(area)}
                              onChange={() => toggleInterestArea(area)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                            <span>{area}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>}

                    {usesExpandedRegistration && <div className="border-t border-slate-100 pt-5">
                      <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">School Needs</label>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">
                        What is one of the biggest challenges your school currently faces in supporting students who require more than ordinary classroom intervention? <span className="text-slate-400">(Optional)</span>
                      </p>
                      <textarea rows={4} value={form.school_support_challenge}
                        onChange={e => setForm(f => ({ ...f, school_support_challenge: e.target.value }))}
                        className="w-full resize-y border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>}

                    {manualSalesMode && <fieldset className="border-t border-slate-100 pt-5 space-y-4">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Payment preference *</legend>
                      <p className="text-xs text-slate-500">Choose how you would like to pay. QR payments require a screenshot of the completed payment. For credit cards, ReMynd will send you a secure payment link separately.</p>
                      {rmbEstimate !== null && usdCnyRate && (
                        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
                          <p className="text-sm font-semibold text-teal-900">
                            {priceStr} is approximately ¥{rmbEstimate.toLocaleString("en-US")} RMB
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-teal-800">
                            Based on the latest daily reference rate of 1 USD = {usdCnyRate.rate.toFixed(4)} RMB ({usdCnyRate.date}). Your payment provider may use a slightly different rate.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          ["wechat_pay", "WeChat Pay", qrOptions.wechatPayQr],
                          ["alipay", "Alipay", qrOptions.alipayQr],
                          ["credit_card", "Credit Card", null],
                        ].map(([value, label, qr]) => (
                          <label key={value} className={`rounded-xl border p-3 cursor-pointer transition-colors ${form.payment_method === value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <input type="radio" name="payment_method" required value={value ?? ""} checked={form.payment_method === value}
                                onChange={() => {
                                  setForm(f => ({ ...f, payment_method: value ?? "", other_payment_options: [] }));
                                  setPaymentReceipt(null);
                                }} />
                              {label}
                            </span>
                            {qr && form.payment_method === value && <img src={qr} alt={`${label} payment QR code`} className="mt-3 mx-auto w-full max-w-48 max-h-48 object-contain rounded-lg bg-white" />}
                          </label>
                        ))}
                      </div>
                      {(form.payment_method === "wechat_pay" || form.payment_method === "alipay") && (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs text-amber-900">Scan the QR code, complete the payment, then upload a screenshot of the confirmation. Your place is confirmed only after administrator verification.</p>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Payment reference <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                            <input maxLength={200} value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Payment confirmation screenshot *</label>
                            <input required type="file" accept="image/png,image/jpeg,image/webp"
                              onChange={e => setPaymentReceipt(e.target.files?.[0] ?? null)}
                              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-teal-700" />
                            <p className="mt-1 text-[10px] text-slate-500">PNG, JPEG, or WebP; maximum 10 MB.</p>
                          </div>
                        </div>
                      )}
                      {form.payment_method === "credit_card" && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs text-slate-600">ReMynd will contact you separately with a secure credit-card payment link. Your place will not be registered until payment is confirmed.</p>
                        </div>
                      )}
                    </fieldset>}

                    {manualSalesMode && <div className="border-t border-slate-100 pt-5">
                      <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">Inquiry details</label>
                      <p className="text-xs text-slate-500 mb-2">Tell us about any registration, invoicing, or workshop requirements. We will confirm arrangements before your place is registered.</p>
                      <textarea rows={3} value={form.manual_sales_message}
                        onChange={e => setForm(f => ({ ...f, manual_sales_message: e.target.value }))}
                        className="w-full resize-y border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>}

                    {usesExpandedRegistration && <fieldset className="border-t border-slate-100 pt-5">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Future Interest</legend>
                      <div className="space-y-2.5">
                        {[
                          ["interested_future_learning", "Future free ReMynd professional learning events"],
                          ["interested_school_training", "Dedicated professional learning for my school"],
                          ["interested_assessment_services", "Information about ReMynd educational assessment services"],
                          ["interested_partner_school", "Information about becoming a ReMynd Partner School"],
                          ["training_only", "I am only registering for this workshop at this time"],
                        ].map(([field, label]) => (
                          <label key={field} className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox"
                              checked={form[field as keyof typeof form] as boolean}
                              onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>}

                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Consent</p>
                      {usesExpandedRegistration && <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <input type="checkbox" checked={form.marketing_consent}
                          onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 leading-relaxed">
                          Yes, I would like to receive occasional emails from ReMynd Student Services about future professional learning opportunities, educational resources, assessment services, and relevant programmes.
                          <span className="block text-[10px] text-slate-400 mt-1">You can unsubscribe at any time.</span>
                        </span>
                      </label>}
                    <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
                      <input type="checkbox" required checked={form.privacy_consent} onChange={e => setForm(f => ({ ...f, privacy_consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 cursor-pointer flex-shrink-0" />
                      <span className="text-xs text-slate-500 leading-relaxed">
                        I agree to the <a href="/privacy" target="_blank" className="text-teal-600 underline">Privacy Policy</a> and consent to my information being used for workshop administration purposes.*
                      </span>
                    </label>
                    </div>
                    {regError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <AlertCircle size={12} /> {regError}
                      </p>
                    )}
                    <button type="submit" disabled={submitting}
                      className="w-full mt-1 bg-[#0c1a2e] hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                      {submitting ? <><Loader2 size={14} className="animate-spin" /> {manualSalesMode ? "Sending code…" : "Registering…"}</> : workshop.is_free ? "Register — Free" : manualSalesMode ? (form.payment_method === "credit_card" ? "Request Registration & Credit Card Link" : "Submit Payment & Registration Request") : `Register & Pay ${priceStr}`}
                    </button>
                  </form>
                )}
              </>
            )}

            {step === "payment" && (
              <>
                <div className="bg-[#0c1a2e] px-5 py-4">
                  <h3 className="text-white font-bold text-base">Complete Payment</h3>
                  <p className="text-slate-400 text-xs mt-1">{priceStr} — {workshop.title}</p>
                </div>
                <div className="px-5 py-4">
                  {paymentError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                      <AlertCircle size={12} /> {paymentError}
                    </p>
                  )}
                  <div ref={paymentContainerRef} className="min-h-[300px]" />
                  <p className="text-[10px] text-slate-400 text-center mt-3">Payments processed securely by Airwallex</p>
                </div>
              </>
            )}

            {step === "verify" && (
              <form onSubmit={handleManualSalesVerification} className="max-w-lg mx-auto px-5 py-8 space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-100 flex items-center justify-center"><Mail size={22} className="text-teal-700" /></div>
                  <h3 className="font-bold text-slate-900 text-lg">Verify your email</h3>
                  <p className="text-sm text-slate-500 mt-2">We sent a six-digit verification code to <strong>{form.email}</strong>. Enter it to submit your ReMynd workshop inquiry.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Verification code *</label>
                  <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-3 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                {regError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={12} /> {regError}</p>}
                <button type="submit" disabled={submitting || verificationCode.length !== 6}
                  className="w-full bg-[#0c1a2e] hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Verify & Submit Inquiry"}
                </button>
                <button type="button" onClick={() => { setStep("form"); setVerificationCode(""); setRegError(""); }} className="w-full text-sm text-teal-600 underline">Use a different email or resend code</button>
              </form>
            )}

            {step === "inquiry-success" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center"><Check size={28} className="text-teal-700" strokeWidth={2.5} /></div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">Your inquiry has been received</p>
                  <p className="text-sm text-slate-500 mt-1">A ReMynd team member will contact <strong>{form.email}</strong> about registration and payment arrangements.</p>
                  <p className="text-xs text-slate-400 mt-3">This is not a registration or payment confirmation. Workshop access is not activated until ReMynd confirms arrangements.</p>
                </div>
                <a href="/training" className="text-sm text-teal-600 hover:text-teal-700 font-medium underline mt-2">← Back to Training</a>
              </div>
            )}

            {step === "success" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">You're registered!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    A confirmation email has been sent to <strong>{form.email}</strong>.
                  </p>
                  {workshop.contact_email && (
                    <p className="text-xs text-slate-400 mt-3">
                      Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a>
                    </p>
                  )}
                </div>
                <a href="/training" className="text-sm text-teal-600 hover:text-teal-700 font-medium underline mt-2">← Back to Training</a>
              </div>
            )}

            {step === "duplicate" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Check size={28} className="text-amber-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Already registered</p>
                  <p className="text-sm text-slate-500 mt-1">Your email is already registered for this workshop.</p>
                  {workshop.contact_email && (
                    <p className="text-xs text-slate-400 mt-3">
                      Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <AlertCircle size={36} className="text-red-400" />
                <p className="font-bold text-slate-900">Something went wrong</p>
                <button onClick={() => setStep("form")} className="text-sm text-teal-600 underline">Try again</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* More Workshops */}
      {otherWorkshops.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-5">More Workshops</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherWorkshops.map(w => {
              const wImageUrl = w.image_object_id
                ? `${getBaseUrl()}/api/training/workshops/public/${w.slug}/image`
                : null;
              const wPrice = w.is_free ? "Free" : `${CURRENCIES[w.currency] ?? ""}${w.price} ${w.currency}`;
              return (
                <a
                  key={w.id}
                  href={`/training/${w.slug}`}
                  className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                >
                  {wImageUrl ? (
                    <img src={wImageUrl} alt={w.title} className="w-full h-36 object-cover object-top group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-[#0c1a2e] to-teal-900 flex items-center justify-center">
                      <Calendar size={32} className="text-white/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">{w.title}</p>
                    {w.subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{w.subtitle}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-semibold text-teal-600">{wPrice}</span>
                      {w.status === "published" && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Open</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0c1a2e] mt-4 px-6 py-8 text-center">
        <p className="text-slate-400 text-xs">
          © {new Date().getFullYear()} ReMynd Student Services · <a href="/privacy" className="hover:text-slate-300 underline">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}

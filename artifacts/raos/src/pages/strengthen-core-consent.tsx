import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";

type ConsentRole = "guardian" | "student";
type ConsentStatus = { role: ConsentRole; language: "en" | "zh" | "ko"; guardianConsentReceived: boolean };
type ConsentReceipt = { submitted: boolean; status: string };
type Lang = "en" | "zh" | "ko";

const copy = {
  en: {
    brand: "REMYND · STRENGTHEN YOUR CORE",
    guardianTitle: "Parent or guardian consent",
    studentTitle: "Student assent",
    guardianIntro: "Please review the educational programme with the student before deciding. Participation is voluntary. This is a non-diagnostic school support pathway, not a clinical assessment.",
    studentIntro: "Your school wants to learn what helps you with learning and what support might be useful. This is not a test you can fail, and it is not a diagnosis. You can say no or ask questions.",
    guardianConfirm: "I am the parent/legal guardian or have authority to provide consent. I understand the purpose of the programme, how educational information will be used, and that participation is voluntary.",
    studentConfirm: "I have read or had this explained to me, understand what the programme is for, and can ask questions or stop taking part.",
    agree: "I agree",
    decline: "I do not agree",
    signature: "Type your full name as an electronic signature",
    confirmGuardian: "Confirm my authority to consent",
    confirmStudent: "I understand and want to take part",
    submit: "Submit response",
    submitting: "Submitting…",
    successGuardian: "Your consent response was recorded. The school will confirm the next step.",
    successStudent: "Your assent response was recorded. The school will confirm the next step.",
    declined: "Your response was recorded. No assessment will be started through this programme.",
    loading: "Checking this secure link…",
    invalid: "This link is invalid, expired, or already used. Contact the school coordinator for a new link.",
    blocked: "The parent or guardian must submit consent before the student can respond.",
    error: "Your response could not be submitted. Check the required fields and try again.",
    signatureMismatch: "Type the name that the school provided for this consent request.",
    privacy: "This response is stored in the RAOS case. Assessment invitations remain blocked until parent/guardian consent is received and an administrator verifies it.",
  },
  zh: {
    brand: "REMYND · 强化学习核心",
    guardianTitle: "家长或监护人同意",
    studentTitle: "学生本人同意",
    guardianIntro: "请先与学生一起了解此教育项目，再作决定。参与完全自愿。这是非诊断性的学校支持项目，不是临床评估。",
    studentIntro: "学校希望了解哪些学习方式对你有帮助，以及哪些支持可能有用。这不是会让你不及格的考试，也不是诊断。你可以拒绝或提问。",
    guardianConfirm: "我是学生的家长／法定监护人，或有权提供同意。我了解项目目的、教育信息的使用方式，以及参与完全自愿。",
    studentConfirm: "我已阅读或听取说明，了解项目目的，并知道可以提问或停止参与。",
    agree: "我同意",
    decline: "我不同意",
    signature: "输入全名作为电子签名",
    confirmGuardian: "确认我有权提供同意",
    confirmStudent: "我了解并愿意参与",
    submit: "提交答复",
    submitting: "正在提交……",
    successGuardian: "已记录您的同意答复。学校会确认下一步。",
    successStudent: "已记录您的本人同意答复。学校会确认下一步。",
    declined: "已记录您的答复。此项目不会启动评估。",
    loading: "正在验证此安全链接……",
    invalid: "此链接无效、已过期或已使用。请联系学校协调员获取新链接。",
    blocked: "学生提交答复前，家长或监护人必须先提供同意。",
    error: "无法提交答复。请检查必填项后重试。",
    signatureMismatch: "请输入学校为此同意申请提供的姓名。",
    privacy: "此答复将保存在 RAOS 个案中。只有收到家长或监护人同意并由管理员核实后，才会开放评估邀请。",
  },
  ko: {
    brand: "REMYND · 학습 핵심 강화",
    guardianTitle: "부모 또는 보호자 동의",
    studentTitle: "학생 본인 동의",
    guardianIntro: "결정하기 전에 학생과 함께 교육 프로그램을 검토해 주세요. 참여는 자발적입니다. 이 프로그램은 비진단적 학교 지원 경로이며 임상 평가가 아닙니다.",
    studentIntro: "학교는 어떤 학습 방식이 도움이 되는지, 어떤 지원이 유용할지 알고 싶어 합니다. 실패할 수 있는 시험이나 진단이 아닙니다. 거절하거나 질문할 수 있습니다.",
    guardianConfirm: "저는 부모/법적 보호자이거나 동의할 권한이 있습니다. 프로그램의 목적, 교육 정보의 사용 방식, 참여가 자발적임을 이해합니다.",
    studentConfirm: "설명을 읽거나 들었고 프로그램의 목적을 이해했으며 질문하거나 참여를 중단할 수 있음을 알고 있습니다.",
    agree: "동의합니다",
    decline: "동의하지 않습니다",
    signature: "전자 서명으로 전체 이름을 입력하세요",
    confirmGuardian: "동의할 권한이 있음을 확인합니다",
    confirmStudent: "이해했으며 참여하고 싶습니다",
    submit: "응답 제출",
    submitting: "제출 중…",
    successGuardian: "동의 응답이 기록되었습니다. 학교에서 다음 단계를 안내합니다.",
    successStudent: "학생 본인 동의 응답이 기록되었습니다. 학교에서 다음 단계를 안내합니다.",
    declined: "응답이 기록되었습니다. 이 프로그램을 통한 평가는 시작되지 않습니다.",
    loading: "보안 링크를 확인하는 중…",
    invalid: "링크가 유효하지 않거나 만료되었거나 이미 사용되었습니다. 학교 담당자에게 새 링크를 요청하세요.",
    blocked: "학생이 응답하기 전에 부모 또는 보호자의 동의가 필요합니다.",
    error: "응답을 제출하지 못했습니다. 필수 항목을 확인하고 다시 시도하세요.",
    signatureMismatch: "학교가 이 동의 요청에 제공한 이름을 입력하세요.",
    privacy: "이 응답은 RAOS 사례에 저장됩니다. 보호자 동의를 받고 관리자가 확인해야 평가 초대가 열립니다.",
  },
} as const;

export default function StrengthenCoreConsentPage() {
  const params = useParams<{ role: string; token: string }>();
  const role = params.role === "student" ? "student" : "guardian";
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [decision, setDecision] = useState<"agree" | "decline">("agree");
  const [signatureName, setSignatureName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<"agree" | "decline" | null>(null);
  const [signatureError, setSignatureError] = useState(false);

  useEffect(() => {
    if (role === "student") {
      setLoading(false);
      return;
    }
    let active = true;
    customFetch<ConsentStatus>(`/api/strengthen-core/consent/${role}/${encodeURIComponent(params.token ?? "")}`, { responseType: "json" })
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setInvalid(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [role, params.token]);

  const lang: Lang = status?.language ?? "en";
  const t = copy[lang];

  async function submit() {
    if (role !== "guardian" || !status || !signatureName.trim() || !confirmed) return;
    setSubmitting(true);
    setSignatureError(false);
    try {
      await customFetch<ConsentReceipt>(`/api/strengthen-core/consent/${role}/${encodeURIComponent(params.token ?? "")}`, {
        method: "POST",
        responseType: "json",
        body: JSON.stringify({
          decision,
          signatureName: signatureName.trim(),
          legalAuthorityConfirmed: confirmed,
        }),
      });
      setSubmitted(decision);
    } catch (error) {
      setSignatureError(error instanceof Error && error.message.includes("signature_mismatch"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f6f2] px-4 py-10 text-[#243f3b]">
      <article className="mx-auto max-w-2xl rounded-3xl border border-[#dce5dc] bg-white p-6 shadow-sm sm:p-10">
        <p className="text-[10px] font-bold tracking-[.18em] text-[#739084]">{t.brand}</p>
        {role === "student" ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            <h1 className="text-xl font-semibold">No student form is needed</h1>
            <p className="mt-3">A separate student assent form is not required for this pathway. Parent/guardian consent is the only consent form needed; no response is required from the student here.</p>
          </div>
        ) : loading ? <p className="mt-8 text-sm text-[#60766d]">{copy.en.loading}</p>
          : invalid ? <div className="mt-8 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><CircleAlert className="shrink-0" size={18} />{copy.en.invalid}</div>
            : submitted ? <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" role="status"><CheckCircle2 size={24} className="text-emerald-700" /><h1 className="mt-3 text-xl font-semibold">{submitted === "decline" ? t.declined : role === "guardian" ? t.successGuardian : t.successStudent}</h1></div>
              : <div className="mt-8">
                <div className="mb-5 flex items-center gap-3 text-[#5f8a72]"><ShieldCheck size={22} /><span className="text-xs font-semibold uppercase tracking-wide">{role === "guardian" ? t.guardianTitle : t.studentTitle}</span></div>
                <h1 className="font-display text-3xl font-semibold text-[#254542]">{role === "guardian" ? t.guardianTitle : t.studentTitle}</h1>
                <p className="mt-3 text-sm leading-7 text-[#61766d]">{role === "guardian" ? t.guardianIntro : t.studentIntro}</p>
                {role === "student" && !status?.guardianConsentReceived ? <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t.blocked}</div> : <>
                  <div className="mt-6 rounded-xl border border-[#dce8dd] bg-[#f6f9f5] p-4 text-sm leading-6 text-[#526c5d]">{role === "guardian" ? t.guardianConfirm : t.studentConfirm}</div>
                  <fieldset className="mt-6 space-y-3">
                    <legend className="sr-only">{role === "guardian" ? t.guardianTitle : t.studentTitle}</legend>
                    <label className="flex items-center gap-3 rounded-xl border border-[#dce5dc] p-4 text-sm"><input type="radio" name="consent" value="agree" checked={decision === "agree"} onChange={() => setDecision("agree")} className="accent-[#2e6b5b]" />{t.agree}</label>
                    <label className="flex items-center gap-3 rounded-xl border border-[#dce5dc] p-4 text-sm"><input type="radio" name="consent" value="decline" checked={decision === "decline"} onChange={() => setDecision("decline")} className="accent-[#2e6b5b]" />{t.decline}</label>
                  </fieldset>
                  <label className="mt-6 block text-sm font-semibold">{t.signature}
                    <input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-[#d3dfd5] px-4 py-3 font-normal outline-none focus:border-[#578570] focus:ring-2 focus:ring-[#dbe9dc]" />
                  </label>
                  {signatureError && <p className="mt-2 text-sm text-rose-700" role="alert">{t.signatureMismatch}</p>}
                  <label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-[#2e6b5b]" />{role === "guardian" ? t.confirmGuardian : t.confirmStudent}</label>
                  <button type="button" disabled={submitting || !signatureName.trim() || !confirmed} onClick={() => void submit()} className="mt-7 w-full rounded-xl bg-[#276455] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#1f5144] disabled:cursor-not-allowed disabled:opacity-50">{submitting ? t.submitting : t.submit}</button>
                </>}
                <p className="mt-6 text-xs leading-5 text-[#829087]">{t.privacy}</p>
              </div>}
      </article>
    </main>
  );
}

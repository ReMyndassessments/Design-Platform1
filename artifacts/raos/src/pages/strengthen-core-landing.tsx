import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Check, ChevronDown, CircleHelp, Compass, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { useGetStrengthenCoreProgram } from "@workspace/api-client-react";

type Lang = "en" | "zh" | "ko";
const copy = {
  en: {
    eyebrow: "REMYND  ·  SCHOOL PARTNERSHIPS", title: "Understand the learner.\nStrengthen what comes next.", intro: "A focused, non-diagnostic Tier 2 pathway that helps school teams make sense of a learner’s strengths and barriers—and move toward practical support.", apply: "Explore an application", availability: "Application availability", open: "Applications currently open", closed: "Applications are not open right now", loading: "Checking programme availability…", error: "Availability could not be checked. Please try again shortly.", complimentary: "Complimentary pilot, subject to ReMynd approval.", default: "One student per approved school by default.", coordinator: "A named school implementation coordinator is required.", nonDiagnostic: "This pathway is not a diagnosis and does not replace clinical care.", titleHow: "A considered path from questions to support", howLead: "Begin with what your team already knows. Build a shared picture, then decide on practical next steps together.", steps: [["01", "Notice", "Describe the learner’s context, strengths and what feels difficult in everyday learning."], ["02", "Review", "ReMynd reviews each application. Any AI-generated suggestions are reviewed by a person."], ["03", "Prepare", "If approved, your school obtains parent or guardian consent before any assessment."], ["04", "Support", "The intention is useful, school-based support—not a label or a predetermined answer."]], guardTitle: "Careful by design", guardIntro: "Sensitive educational information deserves a clear boundary around how it is used.", guard: [["Non-diagnostic", "The pathway helps educators understand learning. It does not diagnose a condition."], ["Consent first", "Parent or guardian consent is required before assessment."], ["Human review", "AI suggestions are assistive only; a reviewer must assess them."], ["Private by default", "Do not include the student’s name, email address or other direct identifiers in referral text."]], faqs: [["Who can apply?", "A school staff member with authority to coordinate the pathway and a named implementation coordinator."], ["Is every school accepted?", "No. The pilot is complimentary and subject to ReMynd approval. One student per approved school is the default."], ["Does an application start an assessment?", "No. This page submits an application for intake and review only. Assessment dispatch is not available here."], ["What happens before any assessment?", "The school must obtain parent or guardian consent before assessment begins."]], faqTitle: "Questions worth asking", close: "A clearer next step starts with a careful application.", closeBody: "Share a de-identified picture of the learner and your school’s capacity to support the work.", footer: "A ReMynd school pathway  ·  For educators and school teams", language: "Language",
  },
  zh: {
    eyebrow: "REMYND  ·  学校合作", title: "理解学习者，\n强化下一步支持。", intro: "这是一项专注、非诊断性的二级支持路径，帮助学校团队理解学生的优势与学习障碍，并制定切实可行的支持方向。", apply: "了解并提交申请", availability: "项目申请状态", open: "目前开放申请", closed: "项目目前暂未开放申请", loading: "正在查询项目状态……", error: "暂时无法查询项目状态，请稍后重试。", complimentary: "试点项目免费，须经 ReMynd 审批。", default: "默认每所获批学校可申请一名学生。", coordinator: "学校须指定一名项目实施协调员。", nonDiagnostic: "本路径不提供诊断，也不替代临床服务。", titleHow: "从疑问走向支持的审慎路径", howLead: "从团队已有的观察开始，建立共同理解，再一起确定切实可行的下一步。", steps: [["01", "观察", "描述学生的学习情境、优势，以及日常学习中遇到的困难。"], ["02", "审核", "ReMynd 会逐一审核申请。任何 AI 建议都须由人工审核。"], ["03", "准备", "如获批准，学校须在评估前取得家长或监护人同意。"], ["04", "支持", "目标是提供有用的校本支持，而不是贴标签或预设结论。"]], guardTitle: "以审慎为先", guardIntro: "敏感的教育信息应有清晰的使用边界。", guard: [["非诊断性", "此路径帮助教育工作者理解学习情况，不用于诊断。"], ["先取得同意", "评估前必须取得家长或监护人同意。"], ["人工审核", "AI 建议仅供辅助，必须由审核人员评估。"], ["默认保护隐私", "请勿在转介文字中填写学生姓名、电子邮箱或其他直接身份识别信息。"]], faqs: [["谁可以申请？", "有权协调项目并指定实施协调员的学校工作人员。"], ["每所学校都会获批吗？", "不会。免费试点须经 ReMynd 审批，默认每所获批学校一名学生。"], ["提交申请是否会启动评估？", "不会。本页面仅用于申请受理与审核，目前不提供评估派发。"], ["评估前需要做什么？", "学校必须在评估开始前取得家长或监护人同意。"]], faqTitle: "常见问题", close: "清晰的下一步，始于审慎的申请。", closeBody: "请以去身份化方式说明学生情况及学校支持能力。", footer: "ReMynd 学校支持路径  ·  面向教育工作者及学校团队", language: "语言",
  },
  ko: {
    eyebrow: "REMYND  ·  학교 파트너십", title: "학습자를 이해하고,\n다음 단계를 함께 강화합니다.", intro: "학생의 강점과 학습 장벽을 이해하고 실질적인 지원으로 이어가도록 돕는 집중형 비진단 Tier 2 학교 지원 경로입니다.", apply: "신청 안내 보기", availability: "프로그램 신청 현황", open: "현재 신청을 받고 있습니다", closed: "현재 신청을 받지 않습니다", loading: "프로그램 현황을 확인하고 있습니다…", error: "현황을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", complimentary: "무료 파일럿이며 ReMynd의 승인이 필요합니다.", default: "승인된 학교당 기본 학생 1명입니다.", coordinator: "학교에서 지정한 실행 코디네이터가 필요합니다.", nonDiagnostic: "이 경로는 진단 목적이 아니며 임상 서비스를 대체하지 않습니다.", titleHow: "질문에서 지원으로 이어지는 신중한 과정", howLead: "팀이 이미 알고 있는 것에서 시작합니다. 함께 이해하고 실질적인 다음 단계를 정합니다.", steps: [["01", "관찰", "학습 맥락과 강점, 일상적인 학습에서 어려운 점을 설명합니다."], ["02", "검토", "ReMynd가 모든 신청을 검토합니다. AI 제안은 반드시 사람이 검토합니다."], ["03", "준비", "승인 후 평가 전에 보호자 동의를 받습니다."], ["04", "지원", "목표는 낙인이나 결론이 아니라 학교에서 실행 가능한 지원입니다."]], guardTitle: "세심한 보호를 기본으로", guardIntro: "민감한 교육 정보에는 명확한 사용 경계가 필요합니다.", guard: [["비진단", "학습에 대한 교육자의 이해를 돕지만 질환을 진단하지 않습니다."], ["동의 우선", "평가 전에 보호자 동의가 필요합니다."], ["사람의 검토", "AI 제안은 보조 자료이며 검토자가 반드시 평가해야 합니다."], ["개인정보 보호", "의뢰 문구에 학생 이름, 이메일 주소 또는 직접 식별 정보를 포함하지 마세요."]], faqs: [["누가 신청할 수 있나요?", "경로를 조정할 권한이 있고 실행 코디네이터를 지정한 학교 직원입니다."], ["모든 학교가 승인되나요?", "아닙니다. 무료 파일럿은 ReMynd 승인 대상이며 승인 학교당 기본 1명입니다."], ["신청하면 평가가 시작되나요?", "아닙니다. 이 페이지는 접수 및 검토만 수행하며 평가 배정 기능은 없습니다."], ["평가 전 무엇이 필요한가요?", "평가를 시작하기 전에 보호자 동의를 받아야 합니다."]], faqTitle: "자주 묻는 질문", close: "신중한 신청이 더 명확한 다음 단계로 이어집니다.", closeBody: "학생을 직접 식별하지 않도록 설명하고 학교의 지원 준비를 알려 주세요.", footer: "ReMynd 학교 지원 경로  ·  교육자 및 학교 팀", language: "언어",
  },
} as const;

export default function StrengthenCoreLanding() {
  const [lang, setLang] = useState<Lang>("en");
  const t = copy[lang];
  const program = useGetStrengthenCoreProgram();
  return (
    <main className="min-h-[100dvh] bg-[#f4f7f4] text-[#203a3d]" lang={lang}>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">
        <Link href="/strengthen-your-core" className="flex items-center gap-3 text-sm font-bold tracking-[.12em] text-[#173f42]" data-testid="link-program-home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#174e50] text-white"><Compass size={19} /></span>
          REMYND <span className="hidden font-medium tracking-normal text-[#668080] sm:inline">/ SCHOOL PATHWAYS</span>
        </Link>
        <div className="flex items-center gap-2">
          <label htmlFor="landing-language" className="sr-only">{t.language}</label>
          <select id="landing-language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-lg border border-[#cbd9d5] bg-[#f4f7f4] px-3 py-2 text-sm font-semibold" data-testid="select-language">
            <option value="en">English</option><option value="zh">简体中文</option><option value="ko">한국어</option>
          </select>
        </div>
      </header>
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 overflow-hidden px-5 pb-20 pt-12 md:grid-cols-[1.12fr_.88fr] md:px-10 md:pb-28 md:pt-20">
        <div className="relative z-10">
          <p className="mb-6 flex items-center gap-2 text-xs font-bold tracking-[.18em] text-[#547b72]"><span className="h-px w-8 bg-[#82a99a]" />{t.eyebrow}</p>
          <h1 className="max-w-3xl whitespace-pre-line font-display text-5xl font-semibold leading-[1.04] tracking-[-.045em] text-[#173b3d] md:text-7xl">{t.title}</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-[#587071]">{t.intro}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/strengthen-your-core/apply" className={`inline-flex items-center gap-3 rounded-xl px-6 py-4 text-sm font-bold text-white shadow-lg shadow-[#245858]/15 transition hover:-translate-y-0.5 ${program.data?.open ? "bg-[#1d5b58] hover:bg-[#154846]" : "pointer-events-none bg-[#829391]"}`} aria-disabled={!program.data?.open} data-testid="link-apply">
              {t.apply}<ArrowRight size={17} />
            </Link>
            <span className="text-xs font-medium text-[#718584]">A ReMynd Tier 2 pathway</span>
          </div>
          <div className="mt-10 flex max-w-xl flex-wrap gap-x-6 gap-y-3 border-t border-[#d9e3de] pt-5 text-sm text-[#506d6b]">
            <span className="flex items-center gap-2"><Check size={15} className="text-[#57866e}" />{t.complimentary}</span>
            <span className="flex items-center gap-2"><Check size={15} className="text-[#57866e]" />{t.default}</span>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -right-8 -top-8 h-52 w-52 rounded-full border border-[#c8dcd1]" />
          <div className="absolute -bottom-9 -left-6 h-40 w-40 rounded-full bg-[#dce9df]" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#d3e0d8] bg-[#e7eee7] p-6 shadow-[0_24px_80px_-32px_rgba(27,66,59,.35)] md:p-8">
            <div className="flex items-start justify-between">
              <div><span className="text-[10px] font-bold tracking-[.2em] text-[#719187]">LEARNING SNAPSHOT</span><p className="mt-2 font-display text-2xl font-semibold text-[#214545]">See the whole learner</p></div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d0e0d4] text-[#336b59]"><Sparkles size={19} /></span>
            </div>
            <div className="mt-7 rounded-2xl bg-[#f8faf7] p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-[#66807a]"><span>Learning picture</span><span>Shared understanding</span></div>
              <div className="relative mt-5 h-32 overflow-hidden rounded-xl bg-[#eff4ee]">
                <div className="absolute inset-x-0 top-1/2 h-px bg-[#d7e2d9]" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-[#d7e2d9]" />
                <div className="absolute left-[18%] top-[24%] h-14 w-14 rounded-full bg-[#d8e7dc]" />
                <div className="absolute left-[22%] top-[32%] h-7 w-7 rounded-full bg-[#8bb49b]" />
                <div className="absolute right-[18%] top-[22%] h-20 w-20 rounded-full bg-[#e3e9cb]" />
                <div className="absolute right-[25%] top-[37%] h-9 w-9 rounded-full bg-[#b3be7d]" />
                <div className="absolute bottom-3 left-4 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#58756a]">strengths</div>
                <div className="absolute bottom-3 right-4 rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-[#78815a]">learning context</div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#eaf2eb] p-3"><span className="text-[10px] uppercase tracking-wider text-[#718e7d]">Notice</span><p className="mt-1 text-sm font-semibold">What works well</p></div>
                <div className="rounded-xl bg-[#f1f1e4] p-3"><span className="text-[10px] uppercase tracking-wider text-[#898d63]">Explore</span><p className="mt-1 text-sm font-semibold">Where it gets hard</p></div>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#6c8179]"><ShieldCheck size={15} />A non-diagnostic, educator-centred pathway</p>
          </div>
        </div>
      </section>
      <section className="border-y border-[#dce5df] bg-[#eaf0e9] px-5 py-7 md:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#648279]">{t.availability}</p><p className="mt-1 text-lg font-semibold text-[#244847]" data-testid="status-program-availability">{program.isLoading ? t.loading : program.isError ? t.error : program.data?.open ? t.open : t.closed}</p>{program.data?.message && <p className="mt-1 text-sm text-[#648079]" data-testid="text-program-message">{program.data.message}</p>}</div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-[#4d6c65]"><span className="rounded-full border border-[#c6d8cc] bg-[#f4f7f2] px-3 py-2">{t.coordinator}</span><span className="rounded-full border border-[#c6d8cc] bg-[#f4f7f2] px-3 py-2">{t.nonDiagnostic}</span></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="max-w-2xl"><p className="text-xs font-bold tracking-[.18em] text-[#6c9281]">A PRACTICAL PATHWAY</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.035em] text-[#203f40] md:text-5xl">{t.titleHow}</h2><p className="mt-4 text-base leading-7 text-[#607574]">{t.howLead}</p></div>
        <div className="mt-12 grid gap-4 md:grid-cols-4">{t.steps.map(([n, title, body]) => <article key={n} className="group border-t-2 border-[#bdd0c4] pt-5 transition hover:border-[#43856c]" data-testid={`card-pathway-step-${n}`}><p className="font-mono text-xs tracking-widest text-[#8aa295]">{n}</p><h3 className="mt-5 font-display text-xl font-semibold text-[#254746]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#667b78]">{body}</p></article>)}</div>
      </section>
      <section className="bg-[#1c4848] px-5 py-16 text-[#edf4ec] md:px-10 md:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[.8fr_1.2fr]">
          <div><p className="text-xs font-bold tracking-[.18em] text-[#9fc5ad]">CLEAR BOUNDARIES</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-tight">{t.guardTitle}</h2><p className="mt-4 max-w-sm text-sm leading-6 text-[#c1d5ca]">{t.guardIntro}</p><div className="mt-8 flex items-center gap-3 text-sm text-[#c1d5ca]"><HeartHandshake size={19} />Designed with school teams in mind</div></div>
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">{t.guard.map(([title, body], i) => <div key={title} className="border-t border-[#527573] pt-4"><span className="text-xs font-mono text-[#9fc5ad]">0{i + 1}</span><h3 className="mt-2 font-semibold text-[#f0f5ee]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#c1d5ca]">{body}</p></div>)}</div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[.7fr_1.3fr] md:px-10 md:py-24">
        <div><p className="text-xs font-bold tracking-[.18em] text-[#6c9281]">BEFORE YOU APPLY</p><h2 className="mt-4 font-display text-4xl font-semibold text-[#203f40]">{t.faqTitle}</h2><BookOpen size={25} className="mt-8 text-[#82a58f]" /></div>
        <div className="divide-y divide-[#dbe4dd]">{t.faqs.map(([q, a]) => <details key={q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-semibold text-[#2e4d4b]">{q}<ChevronDown size={17} className="shrink-0 text-[#739184] transition group-open:rotate-180" /></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-[#657976]">{a}</p></details>)}</div>
      </section>
      <section className="px-5 pb-16 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-[2rem] bg-[#dfeae0] p-7 md:flex-row md:items-center md:justify-between md:p-12"><div><h2 className="font-display text-3xl font-semibold tracking-tight text-[#204544] md:text-4xl">{t.close}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#5e7670]">{t.closeBody}</p></div><Link href="/strengthen-your-core/apply" className="inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-[#1d5b58] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#154846]" data-testid="link-apply-footer">{t.apply}<ArrowRight size={17} /></Link></div>
      </section>
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 pb-8 text-xs text-[#78908a] md:px-10"><span>{t.footer}</span><span className="flex items-center gap-1"><CircleHelp size={13} />ReMynd</span></footer>
    </main>
  );
}

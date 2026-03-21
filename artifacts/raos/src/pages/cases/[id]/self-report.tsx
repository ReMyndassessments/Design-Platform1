import { useState } from "react";
import { useParams, Link } from "wouter";
import { useSubmitSelfReport, useGetCase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

// ── RASR – Student Self-Report Version (Age 10+) ─────────────────────────────
// 40 items · 5 subscales · 0–4 scale

const SCALE = [
  { value: "0", en: "Never",     zh: "从不",     ko: "전혀 없음" },
  { value: "1", en: "Rarely",    zh: "很少",     ko: "거의 없음" },
  { value: "2", en: "Sometimes", zh: "有时",     ko: "때때로" },
  { value: "3", en: "Often",     zh: "经常",     ko: "자주" },
  { value: "4", en: "Very Often",zh: "非常频繁",  ko: "매우 자주" },
];

interface Question {
  id: string;
  en: string;
  zh: string;
  ko: string;
}

interface Domain {
  id: string;
  en: string;
  zh: string;
  ko: string;
  color: string;
  headerBg: string;
  questions: Question[];
}

const DOMAINS: Domain[] = [
  {
    id: "sustained_attention",
    en: "Sustained Attention",
    zh: "持续注意力",
    ko: "지속적 주의집중",
    color: "text-blue-700",
    headerBg: "bg-blue-50 border-blue-200",
    questions: [
      { id: "sa1", en: "I lose focus when tasks take a long time.",                      zh: "当任务需要较长时间时，我会失去专注。",          ko: "과제가 오래 걸리면 집중력을 잃습니다." },
      { id: "sa2", en: "My mind wanders during lessons or conversations.",               zh: "上课或交谈时，我的思绪容易游荡。",              ko: "수업이나 대화 중에 딴생각을 합니다." },
      { id: "sa3", en: "I need reminders to stay focused on work.",                      zh: "我需要提醒才能保持专注工作。",                  ko: "집중력을 유지하려면 상기시켜줘야 합니다." },
      { id: "sa4", en: "I find it hard to pay attention during group instruction.",       zh: "在小组教学时，我很难集中注意力。",              ko: "그룹 수업 중 집중하기가 어렵습니다." },
      { id: "sa5", en: "I get mentally tired when I have to concentrate.",               zh: "需要集中注意力时，我会感到精神疲劳。",          ko: "집중해야 할 때 정신적으로 피로합니다." },
      { id: "sa6", en: "I switch between tasks without finishing them.",                  zh: "我会在未完成任务的情况下切换到其他任务。",      ko: "과제를 끝내지 않고 다른 일로 넘어갑니다." },
      { id: "sa7", en: "My concentration changes throughout the day.",                   zh: "我的注意力在一天中会有所变化。",                ko: "하루 동안 집중력이 달라집니다." },
      { id: "sa8", en: "I struggle to focus when work feels difficult.",                  zh: "当工作感觉困难时，我很难集中注意力。",          ko: "과제가 어렵게 느껴지면 집중하기 힘듭니다." },
    ],
  },
  {
    id: "distractibility",
    en: "Distractibility",
    zh: "注意力分散",
    ko: "산만함",
    color: "text-yellow-700",
    headerBg: "bg-yellow-50 border-yellow-200",
    questions: [
      { id: "di1", en: "Small noises or movements distract me easily.",                  zh: "小的噪音或动作很容易让我分心。",                ko: "작은 소음이나 움직임에 쉽게 산만해집니다." },
      { id: "di2", en: "I notice things around me that pull my attention away.",         zh: "我会注意到周围让我分心的事物。",                ko: "주변의 것들이 제 주의를 끌어당깁니다." },
      { id: "di3", en: "I find it hard to ignore background activity.",                  zh: "我很难忽视周围的背景活动。",                    ko: "주변에서 일어나는 일을 무시하기 어렵습니다." },
      { id: "di4", en: "I get sidetracked by things happening nearby.",                  zh: "附近发生的事情会让我偏离方向。",                ko: "근처에서 일어나는 일에 주의가 분산됩니다." },
      { id: "di5", en: "I look around instead of focusing on my work.",                  zh: "我会四处张望，而不是专注于我的工作。",          ko: "일에 집중하기보다 주위를 둘러봅니다." },
      { id: "di6", en: "I find it hard to get back on task after being distracted.",     zh: "分心后，我很难重新回到任务上。",                ko: "산만해진 후 다시 과제로 돌아오기 어렵습니다." },
      { id: "di7", en: "I get distracted by conversations around me.",                   zh: "周围的对话会让我分心。",                        ko: "주변 대화에 의해 산만해집니다." },
      { id: "di8", en: "I respond quickly to things happening around me, even if I shouldn't.", zh: "即使不应该，我也会迅速对周围发生的事情做出反应。", ko: "그러면 안 될 때도 주변 상황에 즉각 반응합니다." },
    ],
  },
  {
    id: "impulse_regulation",
    en: "Impulse Regulation",
    zh: "冲动控制",
    ko: "충동 조절",
    color: "text-green-700",
    headerBg: "bg-green-50 border-green-200",
    questions: [
      { id: "ir1", en: "I act before thinking things through.",                           zh: "我会在深思熟虑之前就采取行动。",                ko: "충분히 생각하기 전에 행동합니다." },
      { id: "ir2", en: "I interrupt people without meaning to.",                          zh: "我会无意中打断别人。",                          ko: "의도치 않게 다른 사람의 말을 끊습니다." },
      { id: "ir3", en: "I find it hard to wait my turn.",                                 zh: "我很难等待轮到我。",                            ko: "제 차례를 기다리기 어렵습니다." },
      { id: "ir4", en: "I answer before hearing the whole question.",                     zh: "我会在听完整个问题之前就回答。",                ko: "질문을 다 듣기 전에 대답합니다." },
      { id: "ir5", en: "I speak out without raising my hand.",                            zh: "我会不举手就说话。",                            ko: "손을 들지 않고 말합니다." },
      { id: "ir6", en: "I start doing something before checking instructions.",           zh: "我会在查看说明之前就开始做某事。",              ko: "지시사항을 확인하기 전에 시작합니다." },
      { id: "ir7", en: "I react quickly without pausing.",                                zh: "我会不加思索地迅速做出反应。",                  ko: "멈추지 않고 빠르게 반응합니다." },
      { id: "ir8", en: "I find it hard to stop myself once I start something.",           zh: "一旦开始做某事，我很难停下来。",                ko: "시작하면 스스로 멈추기 어렵습니다." },
    ],
  },
  {
    id: "task_initiation",
    en: "Task Initiation & Completion",
    zh: "任务启动与完成",
    ko: "과제 시작 및 완료",
    color: "text-orange-700",
    headerBg: "bg-orange-50 border-orange-200",
    questions: [
      { id: "ti1", en: "I delay starting tasks even when I know what to do.",            zh: "即使知道该怎么做，我也会拖延开始任务。",        ko: "무엇을 해야 할지 알면서도 시작을 미룹니다." },
      { id: "ti2", en: "I need reminders to begin my work.",                             zh: "我需要提醒才能开始工作。",                      ko: "일을 시작하려면 상기시켜줘야 합니다." },
      { id: "ti3", en: "I leave tasks unfinished.",                                       zh: "我会将任务留在未完成的状态。",                  ko: "과제를 완성하지 않고 남겨둡니다." },
      { id: "ti4", en: "I avoid work that feels mentally hard.",                          zh: "我会回避感觉精神上困难的工作。",                ko: "정신적으로 어렵다고 느끼는 일은 피합니다." },
      { id: "ti5", en: "I need help breaking big tasks into smaller steps.",             zh: "我需要帮助将大任务分解成小步骤。",              ko: "큰 과제를 작은 단계로 나누는 데 도움이 필요합니다." },
      { id: "ti6", en: "I struggle to switch from one task to another.",                  zh: "我很难从一项任务切换到另一项任务。",            ko: "한 과제에서 다른 과제로 전환하기 어렵습니다." },
      { id: "ti7", en: "I forget to complete routine responsibilities.",                  zh: "我会忘记完成日常任务。",                        ko: "일상적인 책임을 완수하는 것을 잊습니다." },
      { id: "ti8", en: "I have trouble finishing what I start.",                          zh: "我在完成所开始的事情时遇到困难。",              ko: "시작한 것을 끝내는 데 어려움이 있습니다." },
    ],
  },
  {
    id: "behavioral_modulation",
    en: "Behavioral Modulation",
    zh: "行为调节",
    ko: "행동 조절",
    color: "text-red-700",
    headerBg: "bg-red-50 border-red-200",
    questions: [
      { id: "bm1", en: "I feel restless when I need to sit still.",                      zh: "需要静坐时，我会感到坐立不安。",                ko: "가만히 앉아 있어야 할 때 불안합니다." },
      { id: "bm2", en: "I move more than others during class.",                          zh: "上课期间，我比其他人动得更多。",                ko: "수업 중 다른 사람들보다 더 많이 움직입니다." },
      { id: "bm3", en: "I find it hard to stay seated.",                                  zh: "我很难保持坐着不动。",                          ko: "자리에 앉아 있기 어렵습니다." },
      { id: "bm4", en: "My energy level feels hard to control.",                          zh: "我的精力水平感觉难以控制。",                    ko: "에너지 수준을 조절하기 어렵습니다." },
      { id: "bm5", en: "I struggle to adjust my behavior depending on where I am.",      zh: "我很难根据所处环境调整自己的行为。",            ko: "있는 곳에 따라 행동을 조절하기 어렵습니다." },
      { id: "bm6", en: "My activity level changes a lot during the day.",                zh: "我的活动水平在一天中变化很大。",                ko: "하루 동안 활동 수준이 많이 변합니다." },
      { id: "bm7", en: "I find it hard to match my energy to what is expected.",         zh: "我很难将我的精力与期望相匹配。",                ko: "기대되는 것에 맞게 에너지를 조절하기 어렵습니다." },
      { id: "bm8", en: "I need reminders to stay calm or still.",                         zh: "我需要提醒才能保持冷静或静止。",                ko: "진정하거나 가만히 있으려면 상기시켜줘야 합니다." },
    ],
  },
];

const ALL_QUESTIONS: Question[] = DOMAINS.flatMap(d => d.questions);
const TOTAL = ALL_QUESTIONS.length; // 40

type Lang = "english" | "mandarin" | "korean";

function t(q: Question | { en: string; zh: string; ko: string }, lang: Lang) {
  if (lang === "mandarin") return q.zh;
  if (lang === "korean") return q.ko;
  return q.en;
}

function scaleLabel(s: typeof SCALE[number], lang: Lang) {
  if (lang === "mandarin") return s.zh;
  if (lang === "korean") return s.ko;
  return s.en;
}

export default function GuidedSelfReport() {
  const params = useParams();
  const caseId = params.id as string;
  const { data: caseData } = useGetCase(caseId);
  const submitMut = useSubmitSelfReport();

  const [language, setLanguage] = useState<Lang>("english");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const answered = Object.keys(answers).length;
  const pct = Math.round((answered / TOTAL) * 100);
  const allAnswered = answered === TOTAL;

  const handleSubmit = () => {
    submitMut.mutate(
      { caseId, data: { toolId: "RASR_v1", answers, language, administeredBy: "Psychometrician" } },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl shadow-xl p-10 border border-slate-100">
          <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2 font-display">Assessment Complete</h2>
          <p className="text-slate-500 mb-8">The RASR self-report has been recorded successfully.</p>
          <Link href={`/cases/${caseId}`}>
            <Button className="w-full h-12 text-base">Return to Case</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 pt-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 flex-shrink-0">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display leading-tight">
              {language === "mandarin" ? "学生自评量表（RASR）" : language === "korean" ? "학생 자기보고 척도 (RASR)" : "Student Self-Report (RASR)"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {language === "mandarin" ? `学生：${caseData?.studentName}` : language === "korean" ? `학생: ${caseData?.studentName}` : `Student: ${caseData?.studentName}`}
            </p>
          </div>
        </div>

        {/* Language toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {(["english", "mandarin", "korean"] as Lang[]).map(lang => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                language === lang
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-primary/50"
              }`}
            >
              {lang === "english" ? "En" : lang === "mandarin" ? "中" : "한"}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
          {answered} / {TOTAL}
        </span>
        <span className="text-sm font-bold text-primary whitespace-nowrap">{pct}%</span>
      </div>

      {/* Domains */}
      {DOMAINS.map((domain, di) => (
        <div key={domain.id} className="space-y-3">

          {/* Domain header */}
          <div className={`rounded-xl border px-5 py-3 ${domain.headerBg}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-0.5">
              {language === "mandarin" ? "评估维度" : language === "korean" ? "평가 영역" : "Domain"} {di + 1}
            </p>
            <h2 className={`text-lg font-bold font-display ${domain.color}`}>
              {t(domain, language)}
            </h2>
          </div>

          {/* Questions */}
          {domain.questions.map((q, qi) => {
            const globalIdx = DOMAINS.slice(0, di).reduce((acc, d) => acc + d.questions.length, 0) + qi;
            const selected = answers[q.id];
            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Q{globalIdx + 1}</span>
                  {selected !== undefined && (
                    <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓</span>
                  )}
                </div>
                <div className="px-5 py-5">
                  <p className="text-base font-medium text-slate-800 mb-5 leading-snug">{t(q, language)}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {SCALE.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setAnswers(prev => ({ ...prev, [q.id]: s.value }))}
                        className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border-2 font-semibold text-xs transition-all ${
                          selected === s.value
                            ? "border-primary bg-primary text-white shadow-md shadow-primary/20 scale-105"
                            : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-lg font-bold">{s.value}</span>
                        <span className="leading-tight text-center">{scaleLabel(s, language)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Submit */}
      <div className="pt-4 flex flex-col items-end gap-2">
        {!allAnswered && (
          <p className="text-sm text-slate-500">
            {language === "mandarin"
              ? `还有 ${TOTAL - answered} 道题未作答`
              : language === "korean"
              ? `아직 ${TOTAL - answered}개의 질문에 답하지 않았습니다`
              : `${TOTAL - answered} question${TOTAL - answered === 1 ? "" : "s"} remaining`}
          </p>
        )}
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!allAnswered || submitMut.isPending}
          className="px-12 h-14 text-base shadow-lg"
        >
          {submitMut.isPending
            ? (language === "mandarin" ? "保存中…" : language === "korean" ? "저장 중…" : "Saving…")
            : (language === "mandarin" ? "提交答案" : language === "korean" ? "답변 제출" : "Submit Answers")}
        </Button>
      </div>
    </div>
  );
}

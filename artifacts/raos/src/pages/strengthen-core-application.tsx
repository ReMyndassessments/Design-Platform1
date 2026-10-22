import { useState } from "react";
import type { ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, ClipboardCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { getListStrengthenCoreApplicationsQueryKey, useGetStrengthenCoreProgram, useSubmitStrengthenCoreApplication } from "@workspace/api-client-react";

type Lang = "en" | "zh" | "ko";
type Field = { key: string; label: string; hint?: string; type?: "text" | "email" | "textarea" | "select" | "checkbox"; required?: boolean; options?: Array<string | { value: string; label: string }>; showWhen?: { key: string; value: string } };
type Section = { title: string; intro: string; fields: Field[] };
const availabilityCopy: Record<Lang, { loading: string; closed: string; error: string; retry: string }> = {
  en: { loading: "Checking application availability…", closed: "Applications are currently closed.", error: "We could not check programme availability.", retry: "Try again" },
  zh: { loading: "正在确认是否接受申请……", closed: "目前暂不接受申请。", error: "无法确认项目申请状态。", retry: "重试" },
  ko: { loading: "신청 가능 여부를 확인하는 중…", closed: "현재 신청을 접수하지 않습니다.", error: "프로그램 신청 상태를 확인하지 못했습니다.", retry: "다시 시도" },
};
const questionExamples: Record<Lang, Record<string, string>> = {
  en: {
    schoolName: "Example (adapt to the actual situation): Enter the school's official name.",
    schoolLocation: "Example (adapt to the actual situation): Chengdu, Sichuan.",
    schoolTypeOther: "Example (adapt to the actual situation): Montessori school, special education school, or another school model.",
    coordinatorName: "Example (adapt to the actual situation): Name of the staff member coordinating this application.",
    coordinatorRole: "Example (adapt to the actual situation): Learning support coordinator or class teacher.",
    coordinatorEmail: "Example (adapt to the actual situation): The coordinator's school email address.",
    coordinatorPhone: "Example (adapt to the actual situation): A school contact number, if appropriate.",
    gradeBand: "Example (adapt to the actual situation): Grade 5 or ages 10–11. Do not enter a date of birth.",
    learningLanguage: "Example (adapt to the actual situation): Mandarin is used for most lessons; English is used in some subjects.",
    context: "Example (adapt to the actual situation): Recent changes in school, attendance, or previous learning support. Do not include details that identify the student.",
    primaryConcern: "Example (adapt to the actual situation): The learner often needs repeated prompts to begin independent reading, which leaves less time for written work. Describe what staff observe and how it affects learning.",
    strengths: "Example (adapt to the actual situation): Explains ideas clearly aloud, enjoys science, or completes tasks more confidently with a visual checklist.",
    successContext: "Example (adapt to the actual situation): The learner participates more in a small group or when instructions are shown visually.",
    barriers: "Example (adapt to the actual situation): Copying lengthy instructions or moving between tasks is difficult. Note when this happens.",
    patterns: "Example (adapt to the actual situation): Reading is harder during whole-class work than one-to-one support, or at particular times of day.",
    evidenceSummary: "Example (adapt to the actual situation): Classroom observations, work samples, or progress checks held by the school. Do not paste records or identifying details.",
    supportsTried: "Example (adapt to the actual situation): A visual schedule used daily for four weeks, shorter instructions, or small-group practice.",
    responseToSupport: "Example (adapt to the actual situation): The learner starts sooner with a checklist but still needs reminders. Say what changed and how often you observed it.",
    studentPerspective: "Example (adapt to the actual situation): A de-identified quote or paraphrase of what the student actually said, such as “I like hearing the story, but reading aloud feels hard.”",
    familyPerspective: "Example (adapt to the actual situation): The family says reading homework takes a long time, or the student feels more confident when stories are read aloud.",
    familyEngagement: "Example (adapt to the actual situation): Invite the family to share priorities in a meeting or phone call before goals are set, then agree how updates will be shared.",
    sixWeekOutcome: "Example (adapt to the actual situation): The learner begins the target reading activity independently on 4 of 5 school days using a visual checklist.",
    outcomeMeasure: "Example (adapt to the actual situation): The coordinator records task starts each week and compares them with the starting point at week six.",
    coordinatorCapacity: "Example (adapt to the actual situation): A named coordinator can check progress weekly and meet with staff for 20 minutes.",
  },
  zh: {
    schoolName: "示例（请按实际情况调整）：填写学校正式名称。",
    schoolLocation: "示例（请按实际情况调整）：四川省成都市。",
    schoolTypeOther: "示例（请按实际情况调整）：蒙特梭利学校、特殊教育学校或其他学校类型。",
    coordinatorName: "示例（请按实际情况调整）：填写负责协调本申请的校方工作人员姓名。",
    coordinatorRole: "示例（请按实际情况调整）：学习支持协调员或班主任。",
    coordinatorEmail: "示例（请按实际情况调整）：填写协调员的学校工作邮箱。",
    coordinatorPhone: "示例（请按实际情况调整）：如适用，填写学校联系电话。",
    gradeBand: "示例（请按实际情况调整）：五年级或 10–11 岁。请勿填写出生日期。",
    learningLanguage: "示例（请按实际情况调整）：大部分课程使用普通话，部分科目使用英语。",
    context: "示例（请按实际情况调整）：转学、出勤或以往学习支持等背景。请勿填写可识别学生身份的信息。",
    primaryConcern: "示例（请按实际情况调整）：学生独立阅读时常需重复提醒才开始，因此书面作业时间减少。请描述工作人员观察到的情况及其对学习的影响。",
    strengths: "示例（请按实际情况调整）：能清楚地口头表达想法、喜欢科学，或使用视觉清单时更有信心地完成任务。",
    successContext: "示例（请按实际情况调整）：学生在小组活动中，或看到可视化指令时，参与度更高。",
    barriers: "示例（请按实际情况调整）：抄写较长的指令或转换任务较困难。请说明通常在什么情况下发生。",
    patterns: "示例（请按实际情况调整）：全班阅读时比一对一支持时更困难，或困难集中在一天中的某些时段。",
    evidenceSummary: "示例（请按实际情况调整）：学校已有的课堂观察、作业样本或进度记录。请勿粘贴记录或可识别身份的信息。",
    supportsTried: "示例（请按实际情况调整）：连续四周每天使用视觉日程、缩短指令，或开展小组练习。",
    responseToSupport: "示例（请按实际情况调整）：使用清单后学生能更快开始，但仍需提醒。请说明变化及观察频率。",
    studentPerspective: "示例（请按实际情况调整）：引用或转述学生实际表达的想法，并去除身份信息，例如：“我喜欢听故事，但大声朗读让我觉得困难。”",
    familyPerspective: "示例（请按实际情况调整）：家长表示阅读作业需要很长时间，或学生听故事时更有信心。",
    familyEngagement: "示例（请按实际情况调整）：设定目标前通过会议或电话邀请家庭分享优先事项，并商定后续如何沟通进展。",
    sixWeekOutcome: "示例（请按实际情况调整）：使用视觉清单后，学生每周五个上学日中有四天能独立开始目标阅读活动。",
    outcomeMeasure: "示例（请按实际情况调整）：协调员每周记录学生开始任务的情况，并在第六周与起始情况比较。",
    coordinatorCapacity: "示例（请按实际情况调整）：指定协调员每周查看进展，并能与工作人员安排 20 分钟沟通。",
  },
  ko: {
    schoolName: "예시(실제 상황에 맞게 조정하세요): 학교의 공식 명칭을 입력하세요.",
    schoolLocation: "예시(실제 상황에 맞게 조정하세요): 쓰촨성 청두시.",
    schoolTypeOther: "예시(실제 상황에 맞게 조정하세요): 몬테소리 학교, 특수교육 학교 또는 기타 학교 유형.",
    coordinatorName: "예시(실제 상황에 맞게 조정하세요): 이 신청을 조정할 담당 교직원의 이름.",
    coordinatorRole: "예시(실제 상황에 맞게 조정하세요): 학습 지원 코디네이터 또는 담임교사.",
    coordinatorEmail: "예시(실제 상황에 맞게 조정하세요): 담당자의 학교 업무용 이메일 주소.",
    coordinatorPhone: "예시(실제 상황에 맞게 조정하세요): 필요한 경우 학교 연락처.",
    gradeBand: "예시(실제 상황에 맞게 조정하세요): 5학년 또는 10~11세. 생년월일은 입력하지 마세요.",
    learningLanguage: "예시(실제 상황에 맞게 조정하세요): 대부분의 수업은 중국어로 진행하고 일부 과목은 영어를 사용합니다.",
    context: "예시(실제 상황에 맞게 조정하세요): 전학, 출석 또는 이전 학습 지원과 관련된 맥락을 적되 학생을 식별할 정보는 포함하지 마세요.",
    primaryConcern: "예시(실제 상황에 맞게 조정하세요): 혼자 읽기를 시작하려면 반복적인 안내가 필요해 글쓰기 시간이 줄어듭니다. 교직원이 관찰한 점과 학습에 미치는 영향을 설명하세요.",
    strengths: "예시(실제 상황에 맞게 조정하세요): 말로 생각을 명확히 설명하거나, 과학을 좋아하거나, 시각적 체크리스트를 사용하면 과제를 더 자신 있게 합니다.",
    successContext: "예시(실제 상황에 맞게 조정하세요): 소그룹 활동이나 시각적으로 안내를 볼 수 있을 때 더 적극적으로 참여합니다.",
    barriers: "예시(실제 상황에 맞게 조정하세요): 긴 지시를 옮겨 적거나 과제를 바꾸는 일이 어렵습니다. 주로 언제 나타나는지 적으세요.",
    patterns: "예시(실제 상황에 맞게 조정하세요): 전체 학급 읽기보다 일대일 지원에서 더 잘하거나, 특정 시간대에 어려움이 커집니다.",
    evidenceSummary: "예시(실제 상황에 맞게 조정하세요): 학교가 보유한 수업 관찰, 과제 샘플 또는 진도 점검 내용. 기록이나 식별 정보는 붙여 넣지 마세요.",
    supportsTried: "예시(실제 상황에 맞게 조정하세요): 4주 동안 매일 시각 일정표 사용, 짧은 지시, 소그룹 연습 등을 시도했습니다.",
    responseToSupport: "예시(실제 상황에 맞게 조정하세요): 체크리스트를 사용하면 더 빨리 시작하지만 여전히 안내가 필요합니다. 변화와 관찰 빈도를 적으세요.",
    studentPerspective: "예시(실제 상황에 맞게 조정하세요): 학생이 실제로 말한 내용을 식별 정보 없이 인용하거나 바꾸어 적으세요. 예: “이야기를 듣는 건 좋지만 소리 내어 읽기는 어려워요.”",
    familyPerspective: "예시(실제 상황에 맞게 조정하세요): 가족은 읽기 숙제에 시간이 오래 걸린다고 하거나, 이야기를 들을 때 학생이 더 자신감을 보인다고 말합니다.",
    familyEngagement: "예시(실제 상황에 맞게 조정하세요): 목표를 정하기 전에 회의나 전화로 가족의 우선순위를 듣고, 진행 상황을 공유할 방법을 함께 정합니다.",
    sixWeekOutcome: "예시(실제 상황에 맞게 조정하세요): 시각 체크리스트를 사용해 일주일 중 5일 가운데 4일은 목표 읽기 활동을 스스로 시작합니다.",
    outcomeMeasure: "예시(실제 상황에 맞게 조정하세요): 코디네이터가 매주 과제 시작 여부를 기록하고 6주 차에 시작 시점과 비교합니다.",
    coordinatorCapacity: "예시(실제 상황에 맞게 조정하세요): 지정 코디네이터가 매주 진행을 확인하고 교직원과 20분간 논의할 수 있습니다.",
  },
};

const formCopy: Record<Lang, { brand: string; kicker: string; title: string; intro: string; language: string; required: string; privacy: string; nonDiag: string; noId: string; consent: string; evidence: string; submit: string; submitting: string; receipt: string; receiptCopy: string; ref: string; error: string; validation: string; back: string; section: string; of: string; next: string; previous: string; review: string; received: string; open: string; journey: { eyebrow: string; title: string; intro: string; stages: Array<{ title: string; body: string }>; includedTitle: string; included: string[]; pilotNote: string; start: string }; sections: Section[] }> = {
  en: {
    brand: "REMYND · STRENGTHEN YOUR CORE", kicker: "SCHOOL APPLICATION · INTAKE & REVIEW", title: "Strengthen Your Core school application", intro: "Request consideration for a focused, non-diagnostic Tier 2 educational pathway. Share what your team notices and what support could look like for the learner.", language: "Form language", required: "Required", privacy: "Please do not include student names, email addresses, dates of birth, or other information that directly identifies a student in referral text.", nonDiag: "Strengthen Your Core is a non-diagnostic educational pathway. It does not diagnose or replace clinical care.", noId: "I understand this is a non-diagnostic pathway and will keep student referral text de-identified.", consent: "I understand parent or guardian consent must be obtained before any assessment.", evidence: "I confirm the school can provide supporting educational evidence through appropriate, approved channels if requested; I will not attach identifiable student records here.", submit: "Submit application", submitting: "Submitting…", receipt: "Application received", receiptCopy: "Your application has been submitted for intake and review. This receipt does not approve the application or start an assessment.", ref: "Application reference", error: "We couldn’t submit this application. Please review the form and try again.", validation: "Complete the required fields and acknowledgements to continue.", back: "Programme overview", section: "Section", of: "of", next: "Continue", previous: "Previous section", review: "Review and submit", received: "Submitted securely", open: "Complimentary pilot, subject to ReMynd approval. Normally one learner per approved school. There is no obligation to buy other services.", journey: { eyebrow: "WHAT THE PATHWAY DOES", title: "From a learning concern to practical next steps.", intro: "A structured, non-diagnostic educational review helps your team build a fuller picture and consider achievable support. It does not promise a particular learner outcome.", stages: [{ title: "Understand the concern", body: "Start with what school staff observe and how it affects learning." }, { title: "See the whole learner", body: "Bring strengths, interests, learning context and existing evidence into view." }, { title: "Choose achievable supports", body: "Use the evidence to shape a small number of practical classroom actions." }, { title: "Review the response", body: "Notice how the learner responds and consider what the team may adjust next." }], includedTitle: "What the school experience includes", included: ["Structured referral and intake", "Focused review using RCEP-Core, with a targeted tool when appropriate", "Classroom observation, plus review of work and prior interventions", "Professional learner profile and intervention plan", "Virtual debrief and a 30-day progress review through the existing RAOS case workflow"], pilotNote: "Complimentary pilot participation is subject to approval and is normally limited to one learner per approved school. No purchase of other services is required.", start: "Start the application" }, sections: [
      { title: "School details", intro: "Help us understand the setting making this request.", fields: [{ key: "schoolName", label: "School name", required: true }, { key: "schoolLocation", label: "School location (city / region)" }, { key: "schoolType", label: "School type", type: "select", options: [{ value: "K-12", label: "K-12" }, { value: "International school", label: "International school" }, { value: "Bilingual school", label: "Bilingual school" }, { value: "Other", label: "Other" }] }, { key: "schoolTypeOther", label: "If you selected Other, please specify the school type", type: "text", required: true, showWhen: { key: "schoolType", value: "Other" } }] },
      { title: "Implementation coordinator", intro: "A named school coordinator is required to make the pathway workable.", fields: [{ key: "coordinatorName", label: "Coordinator name", required: true }, { key: "coordinatorRole", label: "Role at school", required: true }, { key: "coordinatorEmail", label: "Work email", type: "email", required: true }, { key: "coordinatorPhone", label: "Work phone (optional)" }] },
      { title: "Learner context", intro: "Use a grade or age band only—never a name or direct identifier.", fields: [{ key: "gradeBand", label: "Grade or age band", required: true }, { key: "learningLanguage", label: "Primary language(s) of learning" }, { key: "context", label: "What context would help us understand this learner?", type: "textarea", hint: "Describe learning context only. Do not include names, dates of birth, contact details or unique identifiers." }] },
      { title: "What prompted this referral?", intro: "Describe the learning concern in observable, school-based terms.", fields: [{ key: "primaryConcern", label: "What has your team noticed, and how does it affect learning?", type: "textarea", required: true, hint: "Share observations rather than a diagnosis or assumption." }, { key: "duration", label: "How long has this concern been present?", type: "select", options: ["Less than one term", "1–2 terms", "More than two terms", "Not sure"] }] },
      { title: "Student strengths", intro: "Start with what the learner can do and what helps them thrive.", fields: [{ key: "strengths", label: "What are this learner’s strengths, interests or successful conditions?", type: "textarea", required: true, hint: "At least one meaningful strength response is required." }, { key: "successContext", label: "When or where do you see these strengths?", type: "textarea" }] },
      { title: "Learning barriers", intro: "Describe situations that make participation or progress harder.", fields: [{ key: "barriers", label: "What learning tasks, settings or transitions are difficult?", type: "textarea" }, { key: "patterns", label: "Are there patterns across subjects, times or settings?", type: "textarea" }] },
      { title: "Evidence and observations", intro: "Summarise evidence already held by the school without sharing records here.", fields: [{ key: "evidenceSummary", label: "What school-based observations or evidence inform this application?", type: "textarea", hint: "Do not paste reports, student records or identifying information." }, { key: "evidenceAvailable", label: "The school can provide relevant supporting evidence through approved channels if requested.", type: "checkbox", required: true }] },
      { title: "Support already tried", intro: "Share what has been attempted and what your team has learned.", fields: [{ key: "supportsTried", label: "What strategies or supports have been tried?", type: "textarea" }, { key: "responseToSupport", label: "How has the learner responded?", type: "textarea" }] },
       { title: "Student perspective", intro: "Share the learner’s perspective in an age-appropriate, de-identified way.", fields: [{ key: "studentPerspective", label: "What has the student shared about learning or support?", type: "textarea" }] },
      { title: "Family and caregiver perspective", intro: "Include relevant context shared by the family, without identifying details.", fields: [{ key: "familyPerspective", label: "What perspective or priorities has the family shared?", type: "textarea" }, { key: "familyEngagement", label: "How does the school plan to involve the family?", type: "textarea" }] },
      { title: "Six-week outcome", intro: "Name a practical, observable change the team hopes to see in six weeks.", fields: [{ key: "sixWeekOutcome", label: "At six weeks, what would be different for the learner at school?", type: "textarea", required: true, hint: "Make the outcome specific and observable—for example, participation, confidence or access to a learning task." }, { key: "outcomeMeasure", label: "How will the team notice or record that change?", type: "textarea" }] },
       { title: "Readiness and acknowledgements", intro: "Confirm the school’s readiness and shared safeguards.", fields: [{ key: "coordinatorCapacity", label: "What time or coordination capacity can the school commit?", type: "textarea", required: true }, { key: "oneStudent", label: "I understand one student per approved school is the default and the complimentary pilot is subject to ReMynd approval.", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "I understand parent or guardian consent is required before any assessment.", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "I understand this is a non-diagnostic educational pathway.", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "I confirm referral text contains no student name, email address or other direct identifier.", type: "checkbox", required: true }] },
    ],
  },
  zh: {
    brand: "REMYND · 强化学习核心", kicker: "学校申请 · 受理与审核", title: "Strengthen Your Core 学校申请", intro: "申请参与重点、非诊断性的 Tier 2 教育支持路径。请介绍团队观察到的情况，以及对这位学习者可考虑的支持方式。", language: "表单语言", required: "必填", privacy: "请勿在转介文字中填写学生姓名、电子邮箱、出生日期或其他可直接识别学生的信息。", nonDiag: "「强化学习核心」是非诊断性的教育支持路径，不用于诊断，也不替代临床服务。", noId: "我了解本路径不提供诊断，并会确保学生转介文字已去身份化。", consent: "我了解任何评估开始前必须取得家长或监护人同意。", evidence: "我确认如有需要，学校可通过适当且获批准的渠道提供教育支持证据；此处不会上传可识别学生身份的记录。", submit: "提交申请", submitting: "正在提交……", receipt: "已收到申请", receiptCopy: "申请已提交，等待受理与审核。此回执不代表申请获批，也不会启动评估。", ref: "申请编号", error: "无法提交申请，请检查表单后重试。", validation: "请完成必填项和确认声明后继续。", back: "返回项目介绍", section: "部分", of: "/", next: "继续", previous: "上一部分", review: "检查并提交", received: "已安全提交", open: "免费试点须经 ReMynd 审批。通常每所获批学校限一名学习者。无需购买其他服务。", journey: { eyebrow: "路径如何开展", title: "从学习关注到切实可行的下一步。", intro: "通过结构化、非诊断性的教育审视，帮助团队建立更完整的理解，并考虑可实现的支持方式。不承诺特定的学习者结果。", stages: [{ title: "了解关注", body: "从校方工作人员的观察及其对学习的影响开始。" }, { title: "看见完整的学习者", body: "一并了解优势、兴趣、学习背景和现有证据。" }, { title: "确定可实现的支持", body: "依据证据制定少量、可在课堂中实践的行动。" }, { title: "回顾学习者的反应", body: "观察学习者如何回应，并讨论团队接下来可作的调整。" }], includedTitle: "学校将经历的环节", included: ["结构化转介与受理", "以 RCEP-Core 为基础的重点审视；适当时使用针对性工具", "课堂观察，并审阅学生作品及以往支持措施", "专业学习者概况与干预计划", "线上回顾会议，以及通过现有 RAOS 个案流程进行的 30 天进展回顾"], pilotNote: "免费试点须经审批，通常每所获批学校限一名学习者。无需购买其他服务。", start: "开始填写申请表" }, sections: [
      { title: "学校资料", intro: "请介绍提出申请的学校环境。", fields: [{ key: "schoolName", label: "学校名称", required: true }, { key: "schoolLocation", label: "学校所在地（城市／地区）" }, { key: "schoolType", label: "学校类型", type: "select", options: [{ value: "K-12", label: "K-12 学校" }, { value: "International school", label: "国际学校" }, { value: "Bilingual school", label: "双语学校" }, { value: "Other", label: "其他" }] }, { key: "schoolTypeOther", label: "如果选择“其他”，请说明学校类型", type: "text", required: true, showWhen: { key: "schoolType", value: "Other" } }] },
      { title: "项目实施协调员", intro: "学校须指定一名协调员，确保项目可行。", fields: [{ key: "coordinatorName", label: "协调员姓名", required: true }, { key: "coordinatorRole", label: "校内职务", required: true }, { key: "coordinatorEmail", label: "工作邮箱", type: "email", required: true }, { key: "coordinatorPhone", label: "工作电话（选填）" }] },
      { title: "学习者背景", intro: "仅填写年级或年龄范围，请勿填写姓名或直接身份信息。", fields: [{ key: "gradeBand", label: "年级或年龄范围", required: true }, { key: "learningLanguage", label: "主要学习语言" }, { key: "context", label: "哪些背景有助于我们理解这位学习者？", type: "textarea", hint: "仅描述学习背景。请勿填写姓名、出生日期、联系方式或独特身份信息。" }] },
      { title: "申请缘由", intro: "请以可观察的校内情况描述学习方面的关注。", fields: [{ key: "primaryConcern", label: "团队观察到什么？这对学习有何影响？", type: "textarea", required: true, hint: "请分享观察，而非诊断或假设。" }, { key: "duration", label: "这一情况持续多久？", type: "select", options: ["少于一学期", "1–2 学期", "超过两学期", "不确定"] }] },
      { title: "学生优势", intro: "从学习者能做到的事以及帮助其发展的条件开始。", fields: [{ key: "strengths", label: "这位学习者有哪些优势、兴趣或成功条件？", type: "textarea", required: true, hint: "至少填写一项有意义的优势。" }, { key: "successContext", label: "在何时或何种情境中能看到这些优势？", type: "textarea" }] },
      { title: "学习障碍", intro: "描述使参与或进步更加困难的情境。", fields: [{ key: "barriers", label: "哪些学习任务、环境或转换较为困难？", type: "textarea" }, { key: "patterns", label: "不同科目、时段或环境之间有何规律？", type: "textarea" }] },
      { title: "证据与观察", intro: "概述学校已有的证据，请勿在此分享记录。", fields: [{ key: "evidenceSummary", label: "哪些校内观察或证据支持本申请？", type: "textarea", hint: "请勿粘贴报告、学生记录或可识别身份的信息。" }, { key: "evidenceAvailable", label: "如有需要，学校可通过获批准的渠道提供相关支持证据。", type: "checkbox", required: true }] },
      { title: "已尝试的支持", intro: "分享已尝试的方法以及团队的观察。", fields: [{ key: "supportsTried", label: "已尝试哪些策略或支持？", type: "textarea" }, { key: "responseToSupport", label: "学习者的反应如何？", type: "textarea" }] },
       { title: "学生视角", intro: "请以适龄且去身份化的方式分享学生的观点。", fields: [{ key: "studentPerspective", label: "学生如何描述学习或支持？", type: "textarea" }] },
      { title: "家庭与照护者视角", intro: "请分享家庭提出的相关背景，不含身份识别信息。", fields: [{ key: "familyPerspective", label: "家庭分享了哪些观点或优先事项？", type: "textarea" }, { key: "familyEngagement", label: "学校计划如何邀请家庭参与？", type: "textarea" }] },
      { title: "六周目标", intro: "请说明团队希望在六周内看到的实际、可观察变化。", fields: [{ key: "sixWeekOutcome", label: "六周后，学生在校内的哪些方面会有所不同？", type: "textarea", required: true, hint: "目标应具体且可观察，例如参与度、信心或完成学习任务的能力。" }, { key: "outcomeMeasure", label: "团队将如何观察或记录这一变化？", type: "textarea" }] },
       { title: "准备情况与确认声明", intro: "请确认学校的准备度及共同遵循的保障原则。", fields: [{ key: "coordinatorCapacity", label: "学校可投入哪些时间或协调资源？", type: "textarea", required: true }, { key: "oneStudent", label: "我了解每所获批学校默认一名学生，免费试点须经 ReMynd 审批。", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "我了解评估前必须取得家长或监护人同意。", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "我了解本路径属于非诊断性教育支持。", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "我确认转介文字不含学生姓名、电子邮箱或其他直接身份信息。", type: "checkbox", required: true }] },
    ],
  },
  ko: {
    brand: "REMYND · 학습 핵심 강화", kicker: "학교 신청 · 접수 및 검토", title: "Strengthen Your Core 학교 신청", intro: "집중적이고 비진단적인 Tier 2 교육 지원 경로의 검토를 신청하세요. 교직원이 관찰한 내용과 학습자를 위해 고려할 수 있는 지원 방식을 알려 주세요.", language: "양식 언어", required: "필수", privacy: "의뢰 문구에 학생 이름, 이메일 주소, 생년월일 또는 학생을 직접 식별하는 정보를 포함하지 마세요.", nonDiag: "학습 핵심 강화는 비진단 교육 지원 경로이며 진단을 제공하거나 임상 서비스를 대체하지 않습니다.", noId: "이 경로가 비진단적임을 이해하며 학생 의뢰 문구를 비식별 처리하겠습니다.", consent: "평가 전에 보호자 동의를 받아야 함을 이해합니다.", evidence: "요청 시 적절히 승인된 경로로 교육 자료를 제공할 수 있음을 확인합니다. 식별 가능한 학생 기록은 여기에 첨부하지 않겠습니다.", submit: "신청 제출", submitting: "제출 중…", receipt: "신청이 접수되었습니다", receiptCopy: "신청이 접수 검토를 위해 제출되었습니다. 접수 확인은 승인이나 평가 시작을 의미하지 않습니다.", ref: "신청 참조 번호", error: "신청을 제출하지 못했습니다. 양식을 확인하고 다시 시도해 주세요.", validation: "필수 항목과 확인 사항을 완료한 후 계속해 주세요.", back: "프로그램 안내", section: "섹션", of: "/", next: "계속", previous: "이전 섹션", review: "검토 후 제출", received: "안전하게 제출됨", open: "무료 파일럿은 ReMynd 승인이 필요합니다. 승인 학교당 일반적으로 학습자 1명이며 다른 서비스를 구매할 의무는 없습니다.", journey: { eyebrow: "진행 방식", title: "학습 우려에서 실행 가능한 다음 단계로.", intro: "구조화된 비진단 교육 검토를 통해 팀이 학습자를 더 폭넓게 이해하고 실현 가능한 지원을 고민하도록 돕습니다. 특정 학습자 결과를 약속하지 않습니다.", stages: [{ title: "우려 이해하기", body: "교직원이 관찰한 내용과 학습에 미치는 영향부터 살펴봅니다." }, { title: "학습자 전체 보기", body: "강점, 관심사, 학습 맥락과 기존 근거를 함께 고려합니다." }, { title: "실행 가능한 지원 선택", body: "근거를 바탕으로 교실에서 실천할 수 있는 소수의 행동을 정합니다." }, { title: "반응 돌아보기", body: "학습자의 반응을 살펴보고 팀이 다음에 조정할 점을 검토합니다." }], includedTitle: "학교가 경험하게 될 내용", included: ["구조화된 의뢰 및 접수", "RCEP-Core를 활용한 집중 검토와 적절한 경우 표적 도구 활용", "교실 관찰과 학생 과제물 및 이전 지원 검토", "전문 학습자 프로필 및 중재 계획", "온라인 디브리핑 및 기존 RAOS 사례 절차를 통한 30일 진행 검토"], pilotNote: "무료 파일럿은 승인 후 진행되며, 일반적으로 승인 학교당 학습자 1명입니다. 다른 서비스를 구매할 의무는 없습니다.", start: "신청서 작성 시작" }, sections: [
      { title: "학교 정보", intro: "신청을 제출하는 학교 환경을 알려 주세요.", fields: [{ key: "schoolName", label: "학교명", required: true }, { key: "schoolLocation", label: "학교 위치(도시 / 지역)" }, { key: "schoolType", label: "학교 유형", type: "select", options: [{ value: "K-12", label: "K-12 학교" }, { value: "International school", label: "국제학교" }, { value: "Bilingual school", label: "이중언어 학교" }, { value: "Other", label: "기타" }] }, { key: "schoolTypeOther", label: "기타를 선택한 경우 학교 유형을 적어 주세요", type: "text", required: true, showWhen: { key: "schoolType", value: "Other" } }] },
      { title: "실행 코디네이터", intro: "경로를 원활히 운영하기 위해 학교 지정 코디네이터가 필요합니다.", fields: [{ key: "coordinatorName", label: "코디네이터 이름", required: true }, { key: "coordinatorRole", label: "학교 내 역할", required: true }, { key: "coordinatorEmail", label: "업무 이메일", type: "email", required: true }, { key: "coordinatorPhone", label: "업무 전화(선택)" }] },
      { title: "학습자 맥락", intro: "학년 또는 연령대만 입력하고 이름이나 직접 식별 정보는 입력하지 마세요.", fields: [{ key: "gradeBand", label: "학년 또는 연령대", required: true }, { key: "learningLanguage", label: "주요 학습 언어" }, { key: "context", label: "학습자를 이해하는 데 도움이 될 맥락은 무엇인가요?", type: "textarea", hint: "학습 맥락만 설명해 주세요. 이름, 생년월일, 연락처 또는 고유 식별 정보는 입력하지 마세요." }] },
      { title: "신청 배경", intro: "관찰 가능한 학교 상황을 중심으로 학습 우려를 설명해 주세요.", fields: [{ key: "primaryConcern", label: "팀이 관찰한 점과 학습에 미치는 영향은 무엇인가요?", type: "textarea", required: true, hint: "진단이나 추정이 아닌 관찰 내용을 공유해 주세요." }, { key: "duration", label: "이 우려가 지속된 기간은 어느 정도인가요?", type: "select", options: ["한 학기 미만", "1~2학기", "두 학기 초과", "잘 모르겠음"] }] },
      { title: "학생의 강점", intro: "학생이 잘하는 점과 성장에 도움이 되는 조건부터 살펴봅니다.", fields: [{ key: "strengths", label: "학생의 강점, 관심사 또는 잘 되는 조건은 무엇인가요?", type: "textarea", required: true, hint: "의미 있는 강점을 최소 한 가지 작성해 주세요." }, { key: "successContext", label: "언제 또는 어떤 상황에서 이 강점이 나타나나요?", type: "textarea" }] },
      { title: "학습 장벽", intro: "참여나 성장을 어렵게 만드는 상황을 설명해 주세요.", fields: [{ key: "barriers", label: "어떤 학습 과제, 환경 또는 전환이 어렵나요?", type: "textarea" }, { key: "patterns", label: "교과, 시간 또는 환경에 따른 패턴이 있나요?", type: "textarea" }] },
      { title: "근거와 관찰", intro: "학교가 보유한 근거를 요약하고 기록 자체는 공유하지 마세요.", fields: [{ key: "evidenceSummary", label: "신청을 뒷받침하는 학교 관찰 또는 근거는 무엇인가요?", type: "textarea", hint: "보고서, 학생 기록 또는 식별 정보를 붙여 넣지 마세요." }, { key: "evidenceAvailable", label: "요청 시 학교는 승인된 경로로 관련 교육 근거를 제공할 수 있습니다.", type: "checkbox", required: true }] },
      { title: "시도한 지원", intro: "시도한 방법과 팀이 알게 된 점을 공유해 주세요.", fields: [{ key: "supportsTried", label: "어떤 전략이나 지원을 시도했나요?", type: "textarea" }, { key: "responseToSupport", label: "학생은 어떻게 반응했나요?", type: "textarea" }] },
       { title: "학생의 관점", intro: "학생의 관점을 연령에 맞고 비식별 방식으로 공유해 주세요.", fields: [{ key: "studentPerspective", label: "학생은 학습이나 지원에 관해 무엇을 이야기했나요?", type: "textarea" }] },
      { title: "가족 및 보호자 관점", intro: "식별 정보 없이 가족이 공유한 관련 맥락을 알려 주세요.", fields: [{ key: "familyPerspective", label: "가족이 공유한 관점이나 우선순위는 무엇인가요?", type: "textarea" }, { key: "familyEngagement", label: "가족을 어떻게 참여시킬 계획인가요?", type: "textarea" }] },
      { title: "6주 목표", intro: "6주 안에 기대하는 실질적이고 관찰 가능한 변화를 정해 주세요.", fields: [{ key: "sixWeekOutcome", label: "6주 후 학교에서 학생에게 어떤 변화가 있기를 바라나요?", type: "textarea", required: true, hint: "참여, 자신감 또는 학습 과제 접근성처럼 구체적이고 관찰 가능한 결과를 작성해 주세요." }, { key: "outcomeMeasure", label: "팀은 그 변화를 어떻게 관찰하거나 기록할까요?", type: "textarea" }] },
       { title: "준비 상태 및 확인", intro: "학교의 준비 상태와 안전 원칙을 확인해 주세요.", fields: [{ key: "coordinatorCapacity", label: "학교가 투입할 수 있는 시간이나 조정 역량은 무엇인가요?", type: "textarea", required: true }, { key: "oneStudent", label: "승인 학교당 기본 1명이며 무료 파일럿은 ReMynd 승인이 필요함을 이해합니다.", type: "checkbox", required: true }, { key: "consentAcknowledgement", label: "평가 전에 보호자 동의가 필요함을 이해합니다.", type: "checkbox", required: true }, { key: "nonDiagnosticAcknowledgement", label: "이 경로가 비진단 교육 지원임을 이해합니다.", type: "checkbox", required: true }, { key: "deidentificationAcknowledgement", label: "의뢰 문구에 학생 이름, 이메일 또는 직접 식별 정보가 없음을 확인합니다.", type: "checkbox", required: true }] },
    ],
  },
};

const pilotOfferCopy: Record<Lang, { badge: string; title: string; body: string; terms: string }> = {
  en: {
    badge: "COMPLIMENTARY PILOT · APPROVAL REQUIRED",
    title: "Why we're offering this pilot",
    body: "We’re offering it at no cost so schools can experience how ReMynd’s Tier 2, non-diagnostic assessments can be a vital part of supporting students throughout their academic journey—helping educators understand the whole learner, choose practical supports, and review progress.",
    terms: "If approved, there is no fee for the pilot. It normally covers one learner per school. Applying or taking part creates no obligation to purchase other services.",
  },
  zh: {
    badge: "免费试点 · 须经审批",
    title: "我们为什么提供这项试点",
    body: "我们提供免费试点，让学校体验 ReMynd 的 Tier 2 非诊断性评估如何成为学生整个学业历程中重要的支持方式：帮助教育工作者全面了解学习者、选择切实可行的支持，并回顾进展。",
    terms: "申请获批后，试点无需付费，通常每所学校限一名学习者。申请或参与本试点均不代表必须购买其他服务。",
  },
  ko: {
    badge: "무료 파일럿 · 승인 필요",
    title: "파일럿을 제공하는 이유",
    body: "학교가 비용 부담 없이 ReMynd의 Tier 2 비진단 평가를 경험할 수 있도록 파일럿을 제공합니다. 이 평가는 학생의 학업 여정 전반에서 중요한 지원의 일부가 될 수 있으며, 교직원이 학생을 폭넓게 이해하고 실천 가능한 지원을 선택하며 진행 상황을 살피도록 돕습니다.",
    terms: "승인된 경우 파일럿 비용은 없습니다. 일반적으로 학교당 학습자 1명이 포함됩니다. 신청하거나 참여해도 다른 서비스를 구매할 의무는 없습니다.",
  },
};

const validationCopy: Record<Lang, string> = {
  en: "Complete all required fields and acknowledgements before submitting.",
  zh: "提交前请填写所有必填项并完成确认声明。",
  ko: "제출하기 전에 모든 필수 항목과 확인 사항을 완료해 주세요.",
};

export default function StrengthenCoreApplication() {
  const [lang, setLang] = useState<Lang>("en");
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [receipt, setReceipt] = useState<{ id: string; status: string } | null>(null);
  const queryClient = useQueryClient();
  const program = useGetStrengthenCoreProgram();
  const submit = useSubmitStrengthenCoreApplication();
  const t = formCopy[lang];
  const sections = t.sections;

  function isFieldVisible(field: Field) {
    return !field.showWhen || values[field.showWhen.key] === field.showWhen.value;
  }

  function handleSubmit() {
    const missing = sections.flatMap((section) => section.fields.filter((f) => isFieldVisible(f) && f.required && (f.type === "checkbox" ? values[f.key] !== true : !String(values[f.key] ?? "").trim() || (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values[f.key] ?? "").trim())))).map((f) => f.key));
    setErrors(missing);
    if (missing.length) {
      const firstInvalidField = document.getElementById(missing[0]);
      firstInvalidField?.focus({ preventScroll: true });
      firstInvalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const example = questionExamples[lang][field.key];
    const describedBy = [field.hint && `hint-${field.key}`, example && `example-${field.key}`].filter(Boolean).join(" ") || undefined;
    const common = { id: field.key, "data-testid": `input-${field.key}`, "aria-describedby": describedBy, required: field.required, "aria-invalid": errors.includes(field.key), onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      setValues((old) => {
        const next = { ...old, [field.key]: target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value };
        if (field.key === "schoolType" && target.value !== "Other") delete next.schoolTypeOther;
        return next;
      });
      setErrors((old) => old.filter((key) => key !== field.key && !(field.key === "schoolType" && target.value !== "Other" && key === "schoolTypeOther")));
    } };
    if (field.type === "checkbox") return <label key={field.key} className={`flex cursor-pointer gap-3 rounded-xl border p-4 text-sm leading-6 ${errors.includes(field.key) ? "border-rose-400 bg-rose-50" : "border-[#d6e1da] bg-[#f7faf6]"}`}><input {...common} type="checkbox" checked={values[field.key] === true} className="mt-1 h-4 w-4 accent-[#1d5b58]" /><span>{field.label}{field.required && <b className="ml-1 text-[#b55243]">*</b>}</span></label>;
    return (
      <div key={field.key} className="space-y-2">
        <label htmlFor={field.key} className="block text-sm font-semibold text-[#304d49]">
          {field.label}{field.required && <b className="ml-1 text-[#b55243]">*</b>}
        </label>
        {field.type === "textarea" ? (
          <textarea
            {...common}
            value={String(values[field.key] ?? "")}
            rows={4}
            className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-[#284542] outline-none transition focus:border-[#528d78] focus:ring-2 focus:ring-[#528d78]/15 ${errors.includes(field.key) ? "border-rose-400" : "border-[#d1ded6]"}`}
          />
        ) : field.type === "select" ? (
          <select
            {...common}
            value={String(values[field.key] ?? "")}
            className="w-full rounded-xl border border-[#d1ded6] bg-white px-4 py-3 text-sm text-[#284542] outline-none focus:border-[#528d78]"
          >
            <option value="">—</option>
            {field.options?.map((option) => {
              const value = typeof option === "string" ? option : option.value;
              const label = typeof option === "string" ? option : option.label;
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        ) : (
          <input
            {...common}
            type={field.type === "email" ? "email" : "text"}
            value={String(values[field.key] ?? "")}
            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#284542] outline-none transition focus:border-[#528d78] focus:ring-2 focus:ring-[#528d78]/15 ${errors.includes(field.key) ? "border-rose-400" : "border-[#d1ded6]"}`}
          />
        )}
        {field.hint && <p id={`hint-${field.key}`} className="text-xs leading-5 text-[#71827c]" data-testid={`hint-${field.key}`}>{field.hint}</p>}
        {example && <p id={`example-${field.key}`} className="text-xs leading-5 text-[#71827c]" data-testid={`example-${field.key}`}>{example}</p>}
        {errors.includes(field.key) && <p className="text-xs font-semibold text-rose-700" data-testid={`error-${field.key}`}>{validationCopy[lang]}</p>}
      </div>
    );
  }

  if (receipt) return <main className="min-h-[100dvh] bg-[#f3f7f3] px-4 py-12 text-[#244442]" lang={lang}><div className="mx-auto max-w-2xl rounded-3xl border border-[#d4e2d8] bg-[#fbfcf9] p-8 shadow-xl shadow-[#284a40]/5 md:p-12"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#e4f0e6] text-[#39765a]"><CheckCircle2 size={27} /></div><p className="mt-7 text-xs font-bold tracking-[.17em] text-[#769183]">{t.received}</p><h1 className="mt-3 font-display text-3xl font-semibold">{t.receipt}</h1><p className="mt-4 leading-7 text-[#5e746f]" data-testid="status-submission-receipt">{t.receiptCopy}</p><div className="mt-7 rounded-xl bg-[#eef4ee] p-4"><span className="text-xs font-semibold uppercase tracking-wider text-[#718781]">{t.ref}</span><p className="mt-1 font-mono text-lg font-semibold" data-testid="text-receipt-id">{receipt.id}</p><p className="mt-1 text-sm text-[#668078]">{receipt.status}</p></div><p className="mt-5 text-sm text-[#627972]">{pilotOfferCopy[lang].terms}</p><Link href="/strengthen-your-core" className="mt-8 inline-flex items-center gap-2 font-semibold text-[#1d5b58]" data-testid="link-receipt-home"><ArrowLeft size={16} />{t.back}</Link></div></main>;

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
        <section className="rounded-2xl border border-[#194d49] bg-[#1d5b58] p-5 text-white shadow-sm shadow-[#214b3f]/10 lg:col-span-2 md:p-7" aria-labelledby="pilot-offer-heading" data-testid="section-pilot-offer">
          <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-[.12em] text-[#e6f4e9]">{pilotOfferCopy[lang].badge}</p>
          <h2 id="pilot-offer-heading" className="mt-3 font-display text-xl font-semibold leading-snug text-white md:text-2xl">{pilotOfferCopy[lang].title}</h2>
          <p className="mt-2 max-w-5xl text-sm leading-6 text-[#eff7f0] md:text-base md:leading-7">{pilotOfferCopy[lang].body}</p>
          <p className="mt-4 border-t border-white/20 pt-3 text-sm font-medium leading-6 text-white" data-testid="text-pilot-offer-terms">{pilotOfferCopy[lang].terms}</p>
        </section>
        <section>
          <div className="mb-7"><p className="text-xs font-bold tracking-[.18em] text-[#739083]">{t.kicker}</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-[-.04em] text-[#203f3d]">{t.title}</h1><p className="mt-3 max-w-2xl leading-7 text-[#5c7470]">{t.intro}</p></div>
          <div className="mb-6 rounded-xl border border-[#e5d8bb] bg-[#fbf6e9] p-4 text-sm leading-6 text-[#75653d]"><div className="flex gap-3"><LockKeyhole size={18} className="mt-0.5 shrink-0" /><p>{t.privacy}</p></div></div>
          <section className="mb-7 rounded-2xl border border-[#d7e3da] bg-[#fbfcf9] p-5 md:p-7" aria-labelledby="pathway-overview-title" data-testid="section-pathway-overview">
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#789183]">{t.journey.eyebrow}</p>
              <h2 id="pathway-overview-title" className="mt-2 font-display text-xl font-semibold leading-snug text-[#264744] md:text-2xl">{t.journey.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#687d76]">{t.journey.intro}</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2" aria-label={t.journey.eyebrow}>
              {t.journey.stages.map((stage, index) => (
                <li key={stage.title} className="flex gap-3 rounded-xl bg-[#f1f6f1] p-4" data-testid={`pathway-stage-${index + 1}`}>
                  <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#d2e1d5] bg-[#fbfcf9] font-mono text-xs font-bold text-[#54816d]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-sm font-bold text-[#365951]">{stage.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#6a7e76]">{stage.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t border-[#e2e9e3] pt-5">
              <h3 className="text-sm font-bold text-[#365951]">{t.journey.includedTitle}</h3>
              <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {t.journey.included.map((item, index) => (
                  <li key={item} className="flex gap-2 text-xs leading-5 text-[#60766e]" data-testid={`pathway-deliverable-${index + 1}`}>
                    <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#6d967a]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex justify-end">
              <a href="#application-form" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1d5b58] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#154846] focus:outline-none focus:ring-2 focus:ring-[#52866f] focus:ring-offset-2" data-testid="link-start-application">{t.journey.start}<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </section>
          <form
            id="application-form"
            className="space-y-5"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
          >
            {errors.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert" data-testid="status-validation-error"><CircleAlert size={17} className="mt-0.5 shrink-0" />{validationCopy[lang]}</div>}
            {sections.map((section, index) => (
              <section
                key={section.title}
                id={`application-section-${index + 1}`}
                className="rounded-2xl border border-[#d8e3db] bg-[#fbfcf9] p-5 shadow-sm shadow-[#2d4d40]/[.03] md:p-8"
                aria-labelledby={`application-section-title-${index + 1}`}
                data-testid={`section-application-${index + 1}`}
              >
                <div className="mb-7 flex gap-4">
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6efe7] font-mono text-sm font-bold text-[#54816d]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h2 id={`application-section-title-${index + 1}`} className="font-display text-2xl font-semibold text-[#264744]">{section.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#71817a]">{section.intro}</p>
                  </div>
                </div>
                <div className="space-y-6">{section.fields.filter(isFieldVisible).map(fieldControl)}</div>
                {index === sections.length - 1 && <div className="mt-7 space-y-3 border-t border-[#e2e9e3] pt-6"><p className="flex gap-2 text-sm leading-6 text-[#506b63]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#638f75]" />{t.nonDiag}</p><p className="flex gap-2 text-sm leading-6 text-[#506b63]"><ClipboardCheck size={17} className="mt-0.5 shrink-0 text-[#638f75]" />{t.consent}</p><p className="text-xs leading-5 text-[#758680]">{t.evidence}</p></div>}
              </section>
            ))}
            {submit.isError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert" data-testid="status-submit-error">{t.error}</div>}
            <div className="flex justify-end pb-4">
              <button type="submit" disabled={submit.isPending} className="inline-flex items-center gap-2 rounded-xl bg-[#1d5b58] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#154846] disabled:opacity-60" data-testid="button-submit-application">{submit.isPending ? t.submitting : t.submit}<ArrowRight size={16} /></button>
            </div>
          </form>
        </section>
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-[#d7e3da] bg-[#fbfcf9] p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-[#365951]"><ShieldCheck size={17} />{t.nonDiag}</h3><p className="mt-3 text-sm leading-6 text-[#687d76]">{t.consent}</p></div>
          <nav aria-label="Application sections" className="hidden rounded-2xl border border-[#d7e3da] bg-[#fbfcf9] p-5 lg:block"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#718b7a]">APPLICATION SECTIONS</p><ol className="mt-3 space-y-2">{sections.map((section, index) => <li key={section.title} className="text-xs"><a href={`#application-section-${index + 1}`} className="text-[#60766e] hover:text-[#285c51] hover:underline focus:outline-none focus:ring-2 focus:ring-[#52866f]" data-testid={`link-application-section-${index + 1}`}><span className="mr-2 font-mono">{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol></nav>
        </aside>
      </div>
    </main>
  );
}

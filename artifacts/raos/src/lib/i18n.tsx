import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "zh" | "ko";

export const translations = {
  en: {
    // Shared
    staffLogin: "Staff Login →",
    back: "← Back",
    step: "Step",

    // Landing
    landing: {
      subtitle: "Assessment Operating System",
      description: "A specialist platform for end-to-end management of psychoeducational assessments — from initial referral through to report delivery and debrief.",
      caps: [
        "Full case lifecycle tracking",
        "Standardised scoring across 60+ instruments",
        "Role-based access for all assessment staff",
        "Secure digital form delivery and administration",
      ],
      welcome: "Welcome",
      selectPath: "Select your access pathway below.",
      schools: "Schools",
      schoolsDesc: "Submit a referral or enquiry for a student",
      parents: "Parents & Families",
      parentsDesc: "Make an enquiry about an assessment for your child",
      adminLogin: "Staff / Admin Access",
      authorised: "Authorised access only. All activity is logged and monitored.",
      copyright: "ReMynd Student Services · Confidential",
    },

    // Login
    login: {
      staffPortal: "Staff Portal",
      signIn: "Sign in",
      signInDesc: "Enter your credentials to access RAOS.",
      email: "Email Address",
      password: "Password",
      signInBtn: "Sign In",
      signingIn: "Signing in...",
      demoAccounts: "Demo Accounts",
    },

    // Portal — header / hero
    portal: {
      badge: "Psychoeducational Assessments",
      hero: "Every student deserves to be understood",
      heroDesc: "ReMynd delivers thorough, compassionate psychoeducational assessments that identify how a student learns, thinks, and experiences the world — and what they need to thrive.",
      tabSchool: "Schools",
      tabParent: "Parents",
      faqTitle: "Frequently asked questions",

      // School content
      school: {
        heading: "Supporting your students through expert assessment",
        intro: "ReMynd partners with schools to provide gold-standard psychoeducational assessments that help identify each student's unique learning profile — and put the right support in place.",
        cards: [
          { label: "Evidence-based", desc: "Assessment tools validated by international research" },
          { label: "Confidential", desc: "Strict data privacy and informed consent throughout" },
          { label: "Efficient", desc: "Clear timelines and progress updates at every stage" },
        ],
        processTitle: "How the process works",
        steps: [
          { title: "Submit a referral", desc: "A teacher, pastoral lead, or SENCO completes a short referral form outlining the student's presenting concerns." },
          { title: "Intake & consent", desc: "Parents are informed and provide written consent. A detailed intake questionnaire gathers developmental and background history." },
          { title: "Assessment session", desc: "Our psychometrician conducts a structured assessment session with the student, supported by standardised rating scales completed by teachers and parents." },
          { title: "Report & debrief", desc: "A comprehensive psychoeducational report is produced with practical recommendations, followed by a debrief session with school staff and parents." },
        ],
        assessTitle: "What we assess",
        assessAreas: ["Executive Function", "Attention & ADHD", "Learning Difficulties", "Social-Emotional Wellbeing", "Autism Spectrum", "Anxiety & Mood", "Behaviour & Regulation", "Sensory Processing"],
        cta: "Refer a Student",
        ctaNote: "Takes around 3 minutes. We'll be in touch within one business day.",
        faqs: [
          { q: "How long does the assessment process take?", a: "From referral to final report typically takes 2–4 weeks, depending on form completion speed and scheduling." },
          { q: "Do parents need to be involved?", a: "Yes. Parental consent is required before any assessment begins. Parents also complete an intake questionnaire and receive a copy of the report." },
          { q: "Can we refer more than one student?", a: "Absolutely. Each student receives their own individual referral and case file." },
          { q: "Is there a cost to the school?", a: "Assessment fees are discussed during the initial consultation and depend on the scope of assessment required." },
        ],
      },

      // Parent content
      parent: {
        heading: "Understanding your child's unique way of thinking and learning",
        intro: "A psychoeducational assessment can provide clarity, answers, and a clear path forward — helping your child get the right support at school and at home.",
        cards: [
          { label: "Child-centred", desc: "We take time to understand your child as a whole person" },
          { label: "Strengths-based", desc: "We highlight strengths alongside any areas of difficulty" },
          { label: "Actionable", desc: "Recommendations your school and family can implement straight away" },
        ],
        reasonsTitle: "Common reasons parents reach out",
        reasons: [
          "My child is struggling at school despite working hard",
          "Teachers have raised concerns about attention or behaviour",
          "My child seems anxious, withdrawn, or emotionally dysregulated",
          "We suspect a learning difficulty such as dyslexia or ADHD",
          "My child has social difficulties or shows autistic traits",
          "We want to understand why school feels so hard for my child",
        ],
        expectTitle: "What to expect",
        steps: [
          { title: "Initial conversation", desc: "We start with a brief call or message exchange to understand your concerns and determine whether an assessment is appropriate." },
          { title: "Intake questionnaire", desc: "You'll complete a detailed background questionnaire covering your child's development, health, and school history." },
          { title: "Assessment session", desc: "Your child meets with our psychometrician in a comfortable, supportive setting. Sessions typically last 2–3 hours with breaks." },
          { title: "Report & debrief", desc: "You receive a comprehensive written report followed by a debrief session where we walk you through the findings and next steps." },
        ],
        privacyTitle: "Your child's privacy is protected",
        privacy: "All information shared is strictly confidential. Reports are released only to authorised individuals with your written consent. Data is handled in accordance with applicable privacy legislation.",
        cta: "Make an Enquiry",
        ctaNote: "No obligation. We'll get back to you within one business day.",
        faqs: [
          { q: "Does my child need to prepare?", a: "No preparation is needed. We encourage your child to come as they are — the assessment is not a test with right or wrong answers." },
          { q: "Can I be present during the session?", a: "We ask that parents wait nearby while the assessment session takes place, as our psychometrician works best one-on-one. You will be fully debriefed afterwards." },
          { q: "How long does a session take?", a: "Most assessment sessions run between 2 and 3 hours, with regular breaks built in." },
          { q: "Will I receive a written report?", a: "Yes. Every assessment results in a comprehensive written report with findings and practical recommendations." },
        ],
      },

      // Form
      form: {
        titleSchool: "Refer a Student",
        titleParent: "Make an Enquiry",
        formDesc: "Fill in the details below and we'll be in touch within one business day.",
        yourName: "Your Name",
        email: "Email Address",
        phone: "Phone Number",
        orgSchool: "School / Organisation",
        orgParent: "Child's School",
        role: "Your Role",
        selectRole: "Select role",
        studentSection: "Student Details",
        parentSection: "Your Child",
        studentName: "Student First Name",
        childName: "Child's First Name",
        age: "Age",
        yearGroup: "Year Group",
        selectYear: "Select year",
        reasonSchool: "Reason for Referral",
        reasonParent: "What are your main concerns?",
        placeholderSchool: "Briefly describe the concerns that have prompted this referral — academic, social, emotional, or behavioural...",
        placeholderParent: "Describe what you've observed — at home, at school, or in social situations. There's no wrong answer.",
        errorMsg: "Something went wrong. Please try again or contact us directly.",
        submit: "Submit Enquiry",
        submitting: "Submitting…",
        consent: "By submitting this form you consent to ReMynd contacting you regarding your enquiry. Your information will not be shared with third parties.",
        namePlaceholder: "Full name",
        agePlaceholder: "e.g. 10",
        orgPlaceholderSchool: "School name",
        orgPlaceholderParent: "School name (if applicable)",
        wechatId: "ID (optional)",
        whatsappId: "ID (optional)",
        wechatPlaceholder: "WeChat ID",
        whatsappPlaceholder: "+1 234 567 8900",
      },

      // Success
      success: {
        title: "Enquiry received",
        school: "Thank you for your referral. A member of our team will be in touch within one business day to discuss next steps.",
        parent: "Thank you for reaching out. We'll be in touch within one business day to have a conversation about how we can help.",
        another: "Submit another enquiry",
      },

      // School roles
      roles: ["Class Teacher", "Subject Teacher", "Pastoral Lead", "Head of Year", "SENCO / Learning Support", "School Counsellor", "School Psychologist", "Principal / Deputy Principal", "School Administrator", "Other"],
    },
  },

  zh: {
    staffLogin: "员工登录 →",
    back: "← 返回",
    step: "步骤",

    landing: {
      subtitle: "评估操作系统",
      description: "专门用于心理教育评估端到端管理的平台——从初始转介到报告交付和汇报。",
      caps: [
        "完整案例生命周期跟踪",
        "60多种工具的标准化评分",
        "所有评估人员的基于角色的访问",
        "安全的数字表格交付和管理",
      ],
      welcome: "欢迎",
      selectPath: "请选择您的访问路径。",
      schools: "学校",
      schoolsDesc: "为学生提交转介或咨询",
      parents: "家长与家庭",
      parentsDesc: "就您孩子的评估提出咨询",
      adminLogin: "员工/管理员访问",
      authorised: "仅限授权访问。所有活动均有记录和监控。",
      copyright: "ReMynd 学生服务 · 保密",
    },

    login: {
      staffPortal: "员工门户",
      signIn: "登录",
      signInDesc: "请输入凭据以访问 RAOS。",
      email: "电子邮件地址",
      password: "密码",
      signInBtn: "登录",
      signingIn: "登录中...",
      demoAccounts: "演示账户",
    },

    portal: {
      badge: "心理教育评估",
      hero: "每位学生都值得被理解",
      heroDesc: "ReMynd 提供全面、专业的心理教育评估，识别学生的学习、思考和体验世界的方式——以及他们需要什么支持才能茁壮成长。",
      tabSchool: "学校",
      tabParent: "家长",
      faqTitle: "常见问题",

      school: {
        heading: "通过专业评估支持您的学生",
        intro: "ReMynd 与学校合作，提供金标准心理教育评估，帮助识别每位学生独特的学习档案——并提供适当的支持。",
        cards: [
          { label: "基于证据", desc: "经国际研究验证的评估工具" },
          { label: "保密", desc: "全程严格的数据隐私和知情同意" },
          { label: "高效", desc: "每个阶段清晰的时间表和进度更新" },
        ],
        processTitle: "流程如何运作",
        steps: [
          { title: "提交转介", desc: "教师、辅导员或特殊教育协调员填写简短的转介表格，说明学生的问题。" },
          { title: "收诊与知情同意", desc: "通知家长并获取书面同意。详细的收诊问卷收集发育和背景历史。" },
          { title: "评估会话", desc: "我们的心理测量师对学生进行结构化评估，由教师和家长完成标准化评级量表。" },
          { title: "报告与汇报", desc: "生成包含实用建议的综合心理教育报告，随后与学校工作人员和家长进行汇报会议。" },
        ],
        assessTitle: "我们的评估内容",
        assessAreas: ["执行功能", "注意力与多动症", "学习障碍", "社会情感健康", "自闭症谱系", "焦虑与情绪", "行为与调节", "感觉处理"],
        cta: "转介学生",
        ctaNote: "大约需要3分钟。我们将在一个工作日内与您联系。",
        faqs: [
          { q: "评估过程需要多长时间？", a: "从转介到最终报告通常需要2-4周，具体取决于表格完成速度和排期。" },
          { q: "家长需要参与吗？", a: "是的。任何评估开始前均需要家长同意。家长也填写收诊问卷并收到报告副本。" },
          { q: "我们可以转介多个学生吗？", a: "当然可以。每位学生都有独立的转介表和案例档案。" },
          { q: "学校需要支付费用吗？", a: "评估费用在初步咨询时讨论，具体取决于评估范围。" },
        ],
      },

      parent: {
        heading: "了解您孩子独特的思维和学习方式",
        intro: "心理教育评估可以提供清晰度、答案和明确的前进方向——帮助您的孩子在学校和家庭中获得适当的支持。",
        cards: [
          { label: "以儿童为中心", desc: "我们花时间全面了解您的孩子" },
          { label: "优势导向", desc: "我们在关注困难的同时突出优势" },
          { label: "可操作", desc: "学校和家庭可以立即实施的建议" },
        ],
        reasonsTitle: "家长联系我们的常见原因",
        reasons: [
          "我的孩子尽管努力学习，但在学校仍然挣扎",
          "教师对注意力或行为问题提出了担忧",
          "我的孩子似乎焦虑、退缩或情绪调节困难",
          "我们怀疑存在阅读障碍或多动症等学习困难",
          "我的孩子有社交困难或表现出自闭症特征",
          "我们想了解为什么学校对我的孩子来说如此困难",
        ],
        expectTitle: "期望什么",
        steps: [
          { title: "初步沟通", desc: "我们从简短的通话或信息交流开始，了解您的担忧并确定评估是否合适。" },
          { title: "收诊问卷", desc: "您将填写详细的背景问卷，涵盖孩子的发育、健康和学校历史。" },
          { title: "评估会话", desc: "您的孩子在舒适、支持的环境中与我们的心理测量师会面。会话通常持续2-3小时，期间有休息。" },
          { title: "报告与汇报", desc: "您将收到一份全面的书面报告，随后进行汇报会议，我们将引导您了解发现和下一步措施。" },
        ],
        privacyTitle: "您孩子的隐私受到保护",
        privacy: "所有共享的信息均严格保密。报告仅在您的书面同意下发布给授权人员。数据按照适用的隐私立法处理。",
        cta: "提出咨询",
        ctaNote: "无需承担义务。我们将在一个工作日内回复您。",
        faqs: [
          { q: "我的孩子需要准备什么吗？", a: "无需准备。我们鼓励您的孩子以自然状态来——评估不是有对错答案的测试。" },
          { q: "我可以在会话期间陪同吗？", a: "我们请家长在附近等候，因为我们的心理测量师在一对一环境中工作效果最好。事后您将得到完整的汇报。" },
          { q: "会话需要多长时间？", a: "大多数评估会话持续2-3小时，期间有定期休息。" },
          { q: "我会收到书面报告吗？", a: "是的。每次评估都会产生包含发现和实用建议的全面书面报告。" },
        ],
      },

      form: {
        titleSchool: "转介学生",
        titleParent: "提出咨询",
        formDesc: "请填写以下详细信息，我们将在一个工作日内与您联系。",
        yourName: "您的姓名",
        email: "电子邮件地址",
        phone: "电话号码",
        orgSchool: "学校/机构",
        orgParent: "孩子的学校",
        role: "您的职位",
        selectRole: "选择职位",
        studentSection: "学生详情",
        parentSection: "您的孩子",
        studentName: "学生名字",
        childName: "孩子的名字",
        age: "年龄",
        yearGroup: "年级",
        selectYear: "选择年级",
        reasonSchool: "转介原因",
        reasonParent: "您的主要担忧是什么？",
        placeholderSchool: "请简要描述促使此次转介的担忧——学业、社交、情感或行为...",
        placeholderParent: "描述您观察到的情况——在家、在学校或在社交场合。没有错误答案。",
        errorMsg: "出现问题。请重试或直接联系我们。",
        submit: "提交咨询",
        submitting: "提交中…",
        consent: "提交此表格即表示您同意 ReMynd 就您的咨询与您联系。您的信息不会与第三方共享。",
        namePlaceholder: "全名",
        agePlaceholder: "例如：10",
        orgPlaceholderSchool: "学校名称",
        orgPlaceholderParent: "学校名称（如适用）",
        wechatId: "微信号（可选）",
        whatsappId: "ID（可选）",
        wechatPlaceholder: "微信号",
        whatsappPlaceholder: "+1 234 567 8900",
      },

      success: {
        title: "咨询已收到",
        school: "感谢您的转介。我们的团队成员将在一个工作日内与您联系，讨论后续步骤。",
        parent: "感谢您的联系。我们将在一个工作日内与您联系，讨论我们如何提供帮助。",
        another: "提交另一个咨询",
      },

      roles: ["班主任", "科目教师", "学生关怀负责人", "年级主任", "特殊教育协调员/学习支持", "学校辅导员", "学校心理学家", "校长/副校长", "学校行政人员", "其他"],
    },
  },

  ko: {
    staffLogin: "직원 로그인 →",
    back: "← 뒤로",
    step: "단계",

    landing: {
      subtitle: "평가 운영 시스템",
      description: "초기 의뢰부터 보고서 전달 및 디브리핑까지 심리교육 평가의 전 과정을 관리하는 전문 플랫폼입니다.",
      caps: [
        "전체 사례 생애주기 추적",
        "60개 이상의 도구에 대한 표준화된 채점",
        "모든 평가 직원을 위한 역할 기반 접근",
        "안전한 디지털 양식 전달 및 관리",
      ],
      welcome: "환영합니다",
      selectPath: "아래에서 접근 경로를 선택하세요.",
      schools: "학교",
      schoolsDesc: "학생을 위한 의뢰서 제출 또는 문의",
      parents: "부모 및 가족",
      parentsDesc: "자녀의 평가에 대해 문의하기",
      adminLogin: "직원/관리자 접근",
      authorised: "승인된 접근만 가능합니다. 모든 활동이 기록되고 모니터링됩니다.",
      copyright: "ReMynd 학생 서비스 · 기밀",
    },

    login: {
      staffPortal: "직원 포털",
      signIn: "로그인",
      signInDesc: "RAOS에 접근하려면 자격 증명을 입력하세요.",
      email: "이메일 주소",
      password: "비밀번호",
      signInBtn: "로그인",
      signingIn: "로그인 중...",
      demoAccounts: "데모 계정",
    },

    portal: {
      badge: "심리교육 평가",
      hero: "모든 학생은 이해받을 자격이 있습니다",
      heroDesc: "ReMynd는 학생이 어떻게 배우고, 생각하고, 세상을 경험하는지 파악하는 철저하고 따뜻한 심리교육 평가를 제공합니다 — 그리고 그들이 성장하기 위해 무엇이 필요한지 알아냅니다.",
      tabSchool: "학교",
      tabParent: "부모",
      faqTitle: "자주 묻는 질문",

      school: {
        heading: "전문 평가를 통해 학생을 지원합니다",
        intro: "ReMynd는 학교와 협력하여 각 학생의 고유한 학습 프로필을 파악하고 적절한 지원을 제공하는 최고 수준의 심리교육 평가를 실시합니다.",
        cards: [
          { label: "근거 기반", desc: "국제 연구로 검증된 평가 도구" },
          { label: "기밀", desc: "전 과정에서 엄격한 데이터 개인 정보 보호 및 사전 동의" },
          { label: "효율적", desc: "모든 단계에서 명확한 일정 및 진행 상황 업데이트" },
        ],
        processTitle: "진행 과정",
        steps: [
          { title: "의뢰서 제출", desc: "교사, 생활지도 담당자 또는 특수교육 코디네이터가 학생의 주요 우려 사항을 담은 간단한 의뢰 양식을 작성합니다." },
          { title: "접수 및 동의", desc: "학부모에게 알리고 서면 동의를 받습니다. 상세한 접수 설문지를 통해 발달 및 배경 이력을 수집합니다." },
          { title: "평가 세션", desc: "심리측정 전문가가 교사와 부모가 완성한 표준화 평가 척도의 지원을 받아 학생과 구조화된 평가 세션을 진행합니다." },
          { title: "보고서 및 디브리핑", desc: "실용적인 권고 사항이 포함된 종합적인 심리교육 보고서가 작성되며, 학교 직원과 학부모를 대상으로 디브리핑 세션이 진행됩니다." },
        ],
        assessTitle: "평가 영역",
        assessAreas: ["실행 기능", "주의력 및 ADHD", "학습 장애", "사회정서적 웰빙", "자폐 스펙트럼", "불안 및 기분", "행동 및 조절", "감각 처리"],
        cta: "학생 의뢰",
        ctaNote: "약 3분이 소요됩니다. 영업일 1일 이내로 연락드리겠습니다.",
        faqs: [
          { q: "평가 과정은 얼마나 걸립니까?", a: "의뢰부터 최종 보고서까지는 양식 작성 속도와 일정에 따라 일반적으로 2-4주가 소요됩니다." },
          { q: "부모가 관여해야 합니까?", a: "네. 평가가 시작되기 전에 부모의 동의가 필요합니다. 또한 부모도 접수 설문지를 작성하고 보고서 사본을 받습니다." },
          { q: "한 명 이상의 학생을 의뢰할 수 있습니까?", a: "물론입니다. 각 학생은 개별 의뢰서와 사례 파일을 받습니다." },
          { q: "학교에 비용이 발생합니까?", a: "평가 비용은 초기 상담 시 논의되며 평가 범위에 따라 다릅니다." },
        ],
      },

      parent: {
        heading: "자녀의 독특한 사고 및 학습 방식 이해하기",
        intro: "심리교육 평가는 명확한 답을 제공하고 자녀가 학교와 가정에서 올바른 지원을 받을 수 있는 방향을 제시합니다.",
        cards: [
          { label: "아동 중심", desc: "자녀를 전인적으로 이해하기 위해 시간을 충분히 씁니다" },
          { label: "강점 기반", desc: "어려움과 함께 강점을 부각합니다" },
          { label: "실행 가능", desc: "학교와 가족이 즉시 실행할 수 있는 권고 사항" },
        ],
        reasonsTitle: "부모들이 연락하는 주요 이유",
        reasons: [
          "열심히 공부하지만 학교에서 어려움을 겪고 있습니다",
          "교사가 주의력이나 행동에 대한 우려를 제기했습니다",
          "아이가 불안해 보이거나 위축되거나 감정 조절이 어려워 보입니다",
          "난독증이나 ADHD 같은 학습 장애를 의심하고 있습니다",
          "아이가 사회적 어려움이 있거나 자폐 특성을 보입니다",
          "왜 학교가 아이에게 이렇게 힘든지 이해하고 싶습니다",
        ],
        expectTitle: "진행 절차",
        steps: [
          { title: "초기 상담", desc: "간단한 전화 통화나 메시지 교환으로 우려 사항을 파악하고 평가가 적합한지 결정합니다." },
          { title: "접수 설문지", desc: "자녀의 발달, 건강 및 학교 이력을 다루는 상세한 배경 설문지를 작성합니다." },
          { title: "평가 세션", desc: "자녀가 편안하고 지지적인 환경에서 심리측정 전문가를 만납니다. 세션은 일반적으로 휴식 시간을 포함하여 2-3시간 진행됩니다." },
          { title: "보고서 및 디브리핑", desc: "포괄적인 서면 보고서를 받게 되며, 이후 디브리핑 세션에서 결과와 다음 단계를 안내받습니다." },
        ],
        privacyTitle: "자녀의 개인 정보가 보호됩니다",
        privacy: "공유된 모든 정보는 엄격히 기밀로 유지됩니다. 보고서는 귀하의 서면 동의를 받은 권한 있는 사람에게만 공개됩니다. 데이터는 관련 개인 정보 보호 법률에 따라 처리됩니다.",
        cta: "문의하기",
        ctaNote: "의무 없음. 영업일 1일 이내로 답변드리겠습니다.",
        faqs: [
          { q: "아이가 준비해야 할 것이 있습니까?", a: "준비가 필요하지 않습니다. 아이가 평소 모습 그대로 오도록 권장합니다 — 평가는 정답이나 오답이 없는 시험입니다." },
          { q: "세션 중에 함께 있을 수 있습니까?", a: "심리측정 전문가가 일대일 환경에서 가장 잘 작동하므로 부모님께 근처에서 대기해 달라고 요청드립니다. 세션 후에 완전한 디브리핑을 받으실 수 있습니다." },
          { q: "세션은 얼마나 걸립니까?", a: "대부분의 평가 세션은 정기적인 휴식을 포함하여 2시간에서 3시간 사이로 진행됩니다." },
          { q: "서면 보고서를 받을 수 있습니까?", a: "네. 모든 평가는 결과와 실용적인 권고 사항이 담긴 포괄적인 서면 보고서를 제공합니다." },
        ],
      },

      form: {
        titleSchool: "학생 의뢰",
        titleParent: "문의하기",
        formDesc: "아래 세부 정보를 입력해 주시면 영업일 1일 이내로 연락드리겠습니다.",
        yourName: "성함",
        email: "이메일 주소",
        phone: "전화번호",
        orgSchool: "학교 / 기관",
        orgParent: "자녀의 학교",
        role: "역할",
        selectRole: "역할 선택",
        studentSection: "학생 정보",
        parentSection: "자녀 정보",
        studentName: "학생 이름",
        childName: "자녀 이름",
        age: "나이",
        yearGroup: "학년",
        selectYear: "학년 선택",
        reasonSchool: "의뢰 이유",
        reasonParent: "주요 우려 사항은 무엇입니까?",
        placeholderSchool: "학업, 사회적, 정서적 또는 행동적 측면에서 의뢰를 촉발한 우려 사항을 간략히 설명해 주세요...",
        placeholderParent: "가정, 학교 또는 사회적 상황에서 관찰한 내용을 설명해 주세요. 틀린 답은 없습니다.",
        errorMsg: "문제가 발생했습니다. 다시 시도하거나 직접 문의해 주세요.",
        submit: "문의 제출",
        submitting: "제출 중…",
        consent: "이 양식을 제출함으로써 귀하는 문의 사항과 관련하여 ReMynd가 연락하는 것에 동의합니다. 귀하의 정보는 제3자와 공유되지 않습니다.",
        namePlaceholder: "전체 이름",
        agePlaceholder: "예: 10",
        orgPlaceholderSchool: "학교 이름",
        orgPlaceholderParent: "학교 이름 (해당되는 경우)",
        wechatId: "ID (선택사항)",
        whatsappId: "ID (선택사항)",
        wechatPlaceholder: "WeChat ID",
        whatsappPlaceholder: "+1 234 567 8900",
      },

      success: {
        title: "문의 접수됨",
        school: "의뢰해 주셔서 감사합니다. 팀 담당자가 영업일 1일 이내에 다음 단계에 대해 연락드리겠습니다.",
        parent: "연락해 주셔서 감사합니다. 어떻게 도울 수 있는지 이야기 나누기 위해 영업일 1일 이내로 연락드리겠습니다.",
        another: "다른 문의 제출",
      },

      roles: ["담임 교사", "교과 교사", "생활지도 담당자", "학년부장", "특수교육 코디네이터/학습 지원", "학교 상담사", "학교 심리사", "교장/교감", "학교 행정원", "기타"],
    },
  },
};

type Translations = typeof translations.en;

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("raos_lang");
    return (stored as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("raos_lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useI18n() {
  return useContext(LangContext);
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const options: { code: Lang; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "zh", label: "中文" },
    { code: "ko", label: "한국어" },
  ];
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {options.map(({ code, label }, i) => (
        <span key={code} className="flex items-center gap-1">
          <button
            onClick={() => setLang(code)}
            className={`text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              lang === code
                ? "text-white bg-white/20"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {label}
          </button>
          {i < options.length - 1 && <span className="text-white/20 text-xs">|</span>}
        </span>
      ))}
    </div>
  );
}

export function LanguageSwitcherLight({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const options: { code: Lang; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "zh", label: "中文" },
    { code: "ko", label: "한국어" },
  ];
  return (
    <div className={`flex items-center gap-1 ${className ?? ""}`}>
      {options.map(({ code, label }, i) => (
        <span key={code} className="flex items-center gap-1">
          <button
            onClick={() => setLang(code)}
            className={`text-xs font-medium transition-colors px-1 py-0.5 rounded ${
              lang === code
                ? "text-slate-800 bg-slate-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {label}
          </button>
          {i < options.length - 1 && <span className="text-slate-200 text-xs">|</span>}
        </span>
      ))}
    </div>
  );
}

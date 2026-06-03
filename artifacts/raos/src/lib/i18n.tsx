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
      description: "A specialist platform for end-to-end management of Tier 2 Non-Diagnostic Comprehensive Psychoeducational Profile and Support Plans — from initial referral through to report delivery and debrief.",
      caps: [
        "Full case lifecycle tracking",
        "Standardised scoring across 60+ instruments",
        "Role-based access for all assessment staff",
        "Secure digital form delivery and administration",
      ],
      welcome: "Welcome",
      selectPath: "Select your access pathway below.",
      schools: "For Schools",
      schoolsDesc: "Submit a referral or enquiry for a student",
      parents: "For Parents & Families",
      parentsDesc: "Make an enquiry about an assessment for your child",
      partners: "For Partner Schools",
      partnersDesc: "License RAOS in-house with a trained School Clinical Coordinator",
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
        studentName: "Student Name",
        childName: "Child's Name",
        studentNameHint: "First name & last initial only",
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

    partnerSchools: {
      pageTitle: "Partner Schools Program",
      heroHeading: "Bring Assessment Excellence In-House",
      heroSub: "License the ReMynd Assessment Operating System for your school — with comprehensive training and ongoing clinical and technical support from ReMynd.",
      programTitle: "What is the Partner Schools Program?",
      programBody: "Schools that sign a partnership agreement with ReMynd gain licensed access to RAOS — the same platform ReMynd uses internally. A designated School Clinical Coordinator operates the system in-house, supported by comprehensive training and ongoing consultation.",
      coordinatorTitle: "The School Clinical Coordinator",
      coordinatorIntro: "A senior member of your student support team — typically a counsellor, learning support coordinator, SEN coordinator, or student support leader — trained and authorised to manage the full assessment and student support cycle within RAOS.",
      responsibilitiesTitle: "Core Responsibilities",
      responsibilities: [
        "Manage referrals, cases, and assessment timelines in RAOS",
        "Coordinate with ReMynd's clinical team and school staff",
        "Receive and safeguard completed assessment reports",
        "Lead debrief conversations with families and school leadership",
        "Govern all decisions about what information classroom teachers receive",
        "Initiate and maintain student support plans in Bobby Agent OS",
        "Monitor student progress through 12-month structured review cycles",
        "Mediate teacher support and differentiation guidance through Concern2Care",
      ],
      howTitle: "How Schools Join the Program",
      joinSteps: [
        { title: "Submit an Inquiry", desc: "Complete our school partnership inquiry form. We will arrange an initial consultation within three business days." },
        { title: "Consultation & Agreement", desc: "ReMynd meets with your leadership team to understand your school's context and goals." },
        { title: "Coordinator Designation", desc: "Your school designates a School Clinical Coordinator. ReMynd activates platform access and configures the system." },
        { title: "Training", desc: "Comprehensive training is delivered for your coordinator and faculty before active case management begins." },
        { title: "Go Live", desc: "Your in-house student support system is operational. ReMynd support begins immediately." },
      ],
      trainingTitle: "Comprehensive Training",
      training: [
        { label: "Faculty Professional Development", desc: "All teaching staff receive foundational professional development covering neurodiversity frameworks, behaviour as communication, regulation strategies, tiered intervention design, and referral protocols." },
        { label: "Coordinator Systems Training", desc: "Hands-on training in RAOS case management, Bobby Agent OS, Concern2Care protocols, confidentiality frameworks, and assessment interpretation." },
        { label: "Implementation Planning", desc: "Training concludes with a documented implementation plan covering procedures, timelines, communication structures, and escalation pathways." },
      ],
      supportTitle: "Ongoing Support",
      support: [
        { label: "Clinical Consultation", desc: "ReMynd's clinical team is available throughout your agreement for case consultation, assessment interpretation, and support plan review." },
        { label: "Technical Support", desc: "Platform access, user management, troubleshooting, and feature guidance throughout your agreement. Your coordinator has a direct point of contact." },
        { label: "Annual Program Review", desc: "At the conclusion of each school year, ReMynd conducts a full implementation review with your coordinator and school leadership." },
      ],
      ecosystemTitle: "The Three-Platform Ecosystem",
      ecosystemSub: "RAOS works alongside two specialist platforms — connected by professional protocols and your coordinator's expertise, not automated data transfer.",
      platforms: [
        { name: "RAOS", role: "Assessment Operating System", desc: "Your coordinator's primary workspace. All referrals, cases, and reports are managed here. Reports remain within the student support department." },
        { name: "Bobby Agent OS", role: "Student Support & IEP Management", desc: "Following assessment and debrief, your coordinator opens a Bobby case for each student. Goals, interventions, and progress monitoring are managed here." },
        { name: "Concern2Care", role: "Teacher Differentiation Support", desc: "Teachers log observations. Your coordinator provides an approved summary of relevant findings — not the full clinical report. Evidence-based strategies are surfaced." },
      ],
      ecosystemNote: "The coordinator is the professional bridge between all three systems. Assessment reports never travel electronically to classroom teachers.",
      ctaTitle: "Enquire About the Partner Schools Program",
      ctaNote: "We will arrange an initial consultation with your leadership team within three business days.",
      ctaBtn: "Submit a Partnership Inquiry",
      back: "← Back",
    },
  },

  zh: {
    staffLogin: "员工登录 →",
    back: "← 返回",
    step: "步骤",

    landing: {
      subtitle: "评估操作系统",
      description: "专门用于第二层次非诊断性综合心理教育档案与支持计划端到端管理的平台——从初始转介到报告交付和汇报。",
      caps: [
        "完整案例生命周期跟踪",
        "60多种工具的标准化评分",
        "所有评估人员的基于角色的访问",
        "安全的数字表格交付和管理",
      ],
      welcome: "欢迎",
      selectPath: "请选择您的访问路径。",
      schools: "致学校",
      schoolsDesc: "为学生提交转介或咨询",
      parents: "致家长与家庭",
      parentsDesc: "就您孩子的评估提出咨询",
      partners: "合作学校项目",
      partnersDesc: "授权贵校在内部运行 RAOS 并配备经培训的学校临床协调员",
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
        studentName: "学生姓名",
        childName: "孩子姓名",
        studentNameHint: "仅填写名字及姓氏首字母",
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

    partnerSchools: {
      pageTitle: "学校合作伙伴计划",
      heroHeading: "将专业评估能力引入校内",
      heroSub: "为您的学校授权使用 ReMynd 评估操作系统——配以全面培训及 ReMynd 持续的临床与技术支持。",
      programTitle: "什么是学校合作伙伴计划？",
      programBody: "与 ReMynd 签署合作协议的学校将获得 RAOS 授权使用权——与 ReMynd 内部使用的平台完全相同。指定的学校临床协调员在校内运营该系统，获得 ReMynd 临床和技术团队的全面培训与持续支持。",
      coordinatorTitle: "学校临床协调员",
      coordinatorIntro: "学生支持团队中的资深成员——通常是辅导员、学习支持协调员、特殊教育协调员或学生支持负责人——经过培训并获得授权，在 RAOS 内管理完整的评估和学生支持周期。",
      responsibilitiesTitle: "核心职责",
      responsibilities: [
        "在 RAOS 中管理转介、案例和评估时间表",
        "与 ReMynd 临床团队及学校教职人员协调",
        "接收并妥善保管完成的评估报告",
        "主导与家庭和学校领导的汇报对话",
        "主导所有关于向课堂教师传递信息的决策",
        "在 Bobby Agent OS 中启动并维护学生支持计划",
        "通过12个月结构化审查周期监测学生进展",
        "通过 Concern2Care 协调教师支持和差异化指导",
      ],
      howTitle: "学校如何加入该计划",
      joinSteps: [
        { title: "提交咨询", desc: "填写学校合作伙伴咨询表。我们将在三个工作日内安排初步咨询。" },
        { title: "咨询与协议", desc: "ReMynd 与您的领导团队会面，了解学校背景和目标。" },
        { title: "协调员指定", desc: "学校指定学校临床协调员，ReMynd 激活平台访问权限并配置系统。" },
        { title: "培训", desc: "在正式开展案例管理之前，为协调员和教职人员提供全面培训。" },
        { title: "正式启动", desc: "您的校内学生支持系统正式运行，ReMynd 的支持立即开始。" },
      ],
      trainingTitle: "全面培训",
      training: [
        { label: "教职人员专业发展", desc: "全体教职人员接受基础专业发展培训，涵盖神经多样性框架、行为即沟通、调节策略、分层干预设计和转介规程。" },
        { label: "协调员系统培训", desc: "RAOS 案例管理、Bobby Agent OS、Concern2Care 规程、保密框架及评估解读的实操培训。" },
        { label: "实施规划", desc: "培训结束时形成书面实施计划，涵盖流程、时间表、沟通结构和升级路径。" },
      ],
      supportTitle: "持续支持",
      support: [
        { label: "临床咨询", desc: "ReMynd 临床团队在整个合作期间提供案例咨询、评估解读指导和支持计划审查。" },
        { label: "技术支持", desc: "整个合作期间提供平台访问、用户管理、故障排除和功能指导，协调员可直接联系专属支持人员。" },
        { label: "年度计划审查", desc: "每个学年结束时，ReMynd 与协调员和学校领导进行全面实施审查。" },
      ],
      ecosystemTitle: "三平台生态系统",
      ecosystemSub: "RAOS 与两个专业平台协同工作——通过专业规程和协调员的专业判断连接，而非自动化数据传输。",
      platforms: [
        { name: "RAOS", role: "评估操作系统", desc: "协调员的主要工作平台。所有转介、案例和评估报告均在此管理，报告始终保存在学生支持部门内。" },
        { name: "Bobby Agent OS", role: "学生支持与IEP管理", desc: "评估和汇报完成后，协调员为每位学生开立 Bobby 案例，目标、干预措施和进展监测均在此管理。" },
        { name: "Concern2Care", role: "教师差异化支持", desc: "教师记录课堂观察，协调员提供经审核的相关发现摘要，而非完整临床报告。" },
      ],
      ecosystemNote: "协调员是三个系统之间的专业桥梁。学生评估报告绝不以电子方式传递给课堂教师。",
      ctaTitle: "咨询学校合作伙伴计划",
      ctaNote: "我们将在三个工作日内安排与您领导团队的初步咨询。",
      ctaBtn: "提交合作伙伴咨询",
      back: "← 返回",
    },
  },

  ko: {
    staffLogin: "직원 로그인 →",
    back: "← 뒤로",
    step: "단계",

    landing: {
      subtitle: "평가 운영 시스템",
      description: "초기 의뢰부터 보고서 전달 및 디브리핑까지 2단계 비진단적 종합 심리교육 프로파일 및 지원 계획의 전 과정을 관리하는 전문 플랫폼입니다.",
      caps: [
        "전체 사례 생애주기 추적",
        "60개 이상의 도구에 대한 표준화된 채점",
        "모든 평가 직원을 위한 역할 기반 접근",
        "안전한 디지털 양식 전달 및 관리",
      ],
      welcome: "환영합니다",
      selectPath: "아래에서 접근 경로를 선택하세요.",
      schools: "학교 신청",
      schoolsDesc: "학생을 위한 의뢰서 제출 또는 문의",
      parents: "학부모 & 가족 신청",
      parentsDesc: "자녀의 평가에 대해 문의하기",
      partners: "파트너 학교 프로그램",
      partnersDesc: "훈련된 학교 임상 코디네이터와 함께 RAOS를 교내에서 라이선스",
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
        studentNameHint: "이름 및 성 첫 글자만 입력",
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

    partnerSchools: {
      pageTitle: "파트너 학교 프로그램",
      heroHeading: "교내에 평가 전문성을 구축하세요",
      heroSub: "귀 학교에 ReMynd 평가 운영 시스템을 라이선스하세요 — 종합적인 교육과 ReMynd의 지속적인 임상 및 기술 지원이 함께 제공됩니다.",
      programTitle: "파트너 학교 프로그램이란?",
      programBody: "ReMynd와 파트너십 계약을 체결한 학교는 RAOS 라이선스 접근권을 획득합니다 — ReMynd가 내부적으로 사용하는 동일한 플랫폼입니다. 지정된 학교 임상 코디네이터가 ReMynd의 교육과 지속적인 지원을 받으며 교내에서 시스템을 운영합니다.",
      coordinatorTitle: "학교 임상 코디네이터",
      coordinatorIntro: "학생 지원팀의 고위 구성원 — 일반적으로 상담사, 학습 지원 코디네이터, 특수교육 코디네이터, 또는 학생 지원 리더 — 이 RAOS 내에서 전체 평가 및 학생 지원 주기를 관리하도록 교육받고 권한을 부여받습니다.",
      responsibilitiesTitle: "핵심 책임",
      responsibilities: [
        "RAOS에서 의뢰, 사례, 평가 일정 관리",
        "ReMynd 임상팀 및 학교 직원과 협력",
        "완성된 평가 보고서 수령 및 보호",
        "가족 및 학교 리더십과의 디브리핑 대화 주도",
        "교실 교사에게 전달하는 정보에 대한 모든 결정 총괄",
        "Bobby Agent OS에서 학생 지원 계획 시작 및 유지",
        "12개월 구조화된 검토 주기를 통한 학생 진행 상황 모니터링",
        "Concern2Care를 통한 교사 지원 및 차별화 지도 조율",
      ],
      howTitle: "학교가 프로그램에 참여하는 방법",
      joinSteps: [
        { title: "문의 제출", desc: "학교 파트너십 문의 양식을 작성하세요. 영업일 3일 이내에 초기 상담을 준비해 드립니다." },
        { title: "상담 및 계약", desc: "ReMynd가 귀 리더십 팀과 만나 학교의 배경과 목표를 파악합니다." },
        { title: "코디네이터 지정", desc: "학교에서 학교 임상 코디네이터를 지정합니다. ReMynd는 플랫폼 접근권을 활성화하고 시스템을 구성합니다." },
        { title: "교육", desc: "활성 사례 관리가 시작되기 전에 코디네이터와 교직원을 위한 종합 교육이 제공됩니다." },
        { title: "서비스 시작", desc: "교내 학생 지원 시스템이 운영됩니다. ReMynd의 지원이 즉시 시작됩니다." },
      ],
      trainingTitle: "종합 교육",
      training: [
        { label: "교직원 전문성 개발", desc: "모든 교직원이 신경다양성 프레임워크, 의사소통으로서의 행동, 조절 전략, 단계별 중재 설계, 의뢰 프로토콜을 다루는 기초 전문성 개발을 받습니다." },
        { label: "코디네이터 시스템 교육", desc: "RAOS, Bobby Agent OS, Concern2Care 프로토콜, 기밀 유지 프레임워크 및 평가 해석에 대한 실습 교육입니다." },
        { label: "실행 계획 수립", desc: "교육은 절차, 일정, 소통 구조, 에스컬레이션 경로를 포함한 문서화된 실행 계획을 수립하는 것으로 마무리됩니다." },
      ],
      supportTitle: "지속적인 지원",
      support: [
        { label: "임상 상담", desc: "ReMynd 임상팀은 계약 기간 내내 사례 상담, 평가 해석 지도, 지원 계획 검토를 제공합니다." },
        { label: "기술 지원", desc: "계약 기간 내내 플랫폼 접근, 사용자 관리, 문제 해결, 기능 안내를 제공합니다. 코디네이터는 직접 연락할 수 있는 담당자가 배정됩니다." },
        { label: "연간 프로그램 검토", desc: "각 학년도 말에 ReMynd는 코디네이터 및 학교 리더십과 함께 전면적인 실행 검토를 진행합니다." },
      ],
      ecosystemTitle: "세 플랫폼 생태계",
      ecosystemSub: "RAOS는 두 전문 플랫폼과 함께 작동합니다 — 자동화된 데이터 전송이 아닌 전문 프로토콜과 코디네이터의 전문 판단으로 연결됩니다.",
      platforms: [
        { name: "RAOS", role: "평가 운영 시스템", desc: "코디네이터의 주요 작업 공간. 모든 의뢰, 사례, 보고서가 여기서 관리됩니다. 보고서는 항상 학생 지원 부서 내에 있습니다." },
        { name: "Bobby Agent OS", role: "학생 지원 및 IEP 관리", desc: "평가 및 디브리핑 후 코디네이터는 각 학생을 위한 Bobby 사례를 엽니다. 목표, 중재, 진행 상황 모니터링이 여기서 관리됩니다." },
        { name: "Concern2Care", role: "교사 차별화 지원", desc: "교사는 교실 관찰을 기록합니다. 코디네이터는 승인된 관련 결과 요약을 제공하며, 전체 임상 보고서가 아닙니다." },
      ],
      ecosystemNote: "코디네이터는 세 시스템 간의 전문적 연결고리입니다. 학생 평가 보고서는 교실 교사에게 전자적으로 전달되지 않습니다.",
      ctaTitle: "파트너 학교 프로그램 문의",
      ctaNote: "영업일 3일 이내에 리더십 팀과의 초기 상담을 준비해 드리겠습니다.",
      ctaBtn: "파트너십 문의 제출",
      back: "← 뒤로",
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

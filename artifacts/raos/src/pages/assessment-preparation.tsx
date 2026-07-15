import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, Info, AlertTriangle, Monitor, Clock, Home } from "lucide-react";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";

type Lang = "en" | "zh" | "ko";

const CONTENT = {
  en: {
    backLabel: "Back to Portal",
    badge: "Assessment Guidance",
    title: "How to Prepare for the Assessment",
    subtitle: "Helping Your Child Feel Comfortable and Ready to Do Their Best",
    intro: [
      "An assessment should provide the clearest possible picture of how a student thinks, learns, responds, and approaches unfamiliar tasks. For this to happen, the student needs an environment that is calm, comfortable, well organised, and as free from interruptions as possible.",
      "Preparation is not about teaching the child what to say or helping them practise answers. It is about removing avoidable barriers — such as tiredness, hunger, anxiety, noise, technical problems, or distraction — so the student can make their best effort.",
      "Assessment results are most useful when activities are completed under consistent conditions and when anything that may have affected the student's performance is carefully observed and recorded.",
    ],
    sections: [
      {
        id: "what-to-tell",
        heading: "What Parents Should Tell Their Child",
        type: "dialogue",
        intro: "Introduce the assessment in a calm, positive, and age-appropriate way.",
        saySuggestion: "You might say:",
        sayExample: "\"You are going to complete some activities that will help us understand how you learn best. Some may feel easy and some may feel challenging. You do not need to get everything right. Just listen carefully, ask when you do not understand what you are being asked to do, and try your best.\"",
        dontHeading: "Please avoid telling your child that:",
        dontItems: [
          "something is wrong with them",
          "they are being tested because they are failing",
          "they must achieve a particular score",
          "they need to prove that they have or do not have a particular condition",
          "the assessment will determine whether they are clever",
          "they must perform well to avoid disappointing anyone",
        ],
        closing: "The assessment is not a pass-or-fail examination. Its purpose is to identify patterns of strength, difficulty, and support need. Children should be encouraged to see the process as an opportunity to understand themselves better, including the strengths they may not yet recognise.",
      },
      {
        id: "preparing-before",
        heading: "Preparing Your Child Before the Session",
        type: "subsections",
        subsections: [
          {
            heading: "Choose the Right Day and Time",
            body: "Where possible, schedule the assessment for a time when the student is usually alert and able to concentrate.",
            avoidHeading: "Avoid scheduling immediately after:",
            avoidItems: [
              "a long school day",
              "strenuous sports or activities",
              "late-night travel",
              "examinations",
              "emotionally difficult events",
              "an unusually early morning",
              "a disrupted night's sleep",
            ],
            consultNote: "Younger students may perform better earlier in the day. Older students should also be consulted about when they tend to feel most focused.",
            tellTeamHeading: "Please tell the assessment team in advance if the student:",
            tellTeamItems: [
              "is unwell",
              "has had very little sleep",
              "is experiencing significant emotional distress",
              "has recently experienced a major family or school event",
              "has begun or changed medication",
              "has vision, hearing, language, or communication needs",
              "is likely to find the scheduled time unusually difficult",
            ],
            closingNote: "Illness, fatigue, anxiety, distress, and unfamiliarity can all affect performance and may cause an assessment to underestimate what a child can ordinarily do.",
          },
          {
            heading: "Sleep, Food, and Medication",
            body: "Before the session, the student should:",
            beforeItems: [
              "have a normal night's sleep",
              "eat a familiar and appropriate meal",
              "drink enough water",
              "take usual prescribed medication unless otherwise advised by the prescribing professional",
              "wear comfortable clothing",
              "use the toilet before the session begins",
            ],
            closingNote: "Do not make unplanned changes to medication for the purpose of the assessment. Parents should inform the assessment team about any medication the student has taken that day and any recent changes that could affect attention, activity level, mood, or stamina.",
          },
          {
            heading: "Bring What the Student Needs",
            body: "Depending on the session arrangements, the student may need:",
            items: [
              "prescription glasses",
              "hearing aids",
              "agreed communication supports",
              "water",
              "a simple snack for breaks",
              "any required assessment materials provided in advance",
            ],
            closingNote: "Comfort objects may be appropriate for younger or anxious students during arrival and breaks, but they should be removed from the immediate workspace during assessment activities if they are distracting.",
          },
        ],
      },
      {
        id: "assessment-space",
        heading: "Preparing the Assessment Space",
        type: "requirements",
        body: "Whether the assessment takes place at school, at home, or in another approved location, the room should support concentration, privacy, and comfort.",
        requirementsHeading: "The space should be:",
        requirements: [
          "quiet",
          "well lit",
          "clean and uncluttered",
          "comfortably ventilated or temperature controlled",
          "large enough for the student, equipment, and invigilator",
          "private enough that other people cannot overhear or interrupt",
          "free from visible materials that might provide answers or distract the student",
        ],
        closing: "A comfortable chair and stable desk or table should be provided. The student should be able to sit naturally, write comfortably, and see the screen and any materials clearly. These basic environmental conditions are central to creating a fair and valid assessment experience.",
      },
      {
        id: "remove-distractions",
        heading: "Remove Distractions",
        type: "checklist",
        beforeHeading: "Before the session begins:",
        items: [
          "silence or remove mobile phones",
          "turn off television, music, and notifications",
          "close unrelated browser tabs and applications",
          "remove toys, gaming devices, and unnecessary materials",
          "place pets in another room where possible",
          "tell family members or school staff not to enter",
          "place a sign on the door if this will prevent interruption",
          "avoid scheduling deliveries, maintenance, or other activity nearby",
        ],
        closing: "The student should not be interrupted by teachers, siblings, parents, classmates, or other adults except in an emergency.",
      },
      {
        id: "virtual-sessions",
        heading: "Additional Preparation for Virtual Sessions",
        type: "virtual",
        intro: "Some parts of the assessment may be completed virtually. Virtual delivery requires the same level of care, supervision, and standardisation as an in-person session.",
        subsections: [
          {
            heading: "Technology Check",
            body: "Before the scheduled session, confirm that the student has access to:",
            items: [
              "a reliable computer or approved device",
              "a stable internet connection",
              "a functioning camera",
              "a functioning microphone and speakers or approved headset",
              "the required video-meeting platform",
              "an accessible power supply or fully charged device",
              "any links, access codes, or files supplied by ReMynd",
            ],
            note: "Complete a technical check before the assessment day whenever possible. The student should not complete formal activities on a mobile phone unless specifically approved.",
          },
          {
            heading: "Positioning the Camera",
            body: "The camera should allow the remote assessment professional to see:",
            items: [
              "the student's face",
              "the student's general working position",
              "the desk or work area when required",
              "the invigilator when requested",
            ],
            note: "The screen should be placed directly in front of the student at a comfortable height. Avoid positioning the student with a bright window behind them, as this may make observation difficult. The invigilator may be asked to briefly show the room or workspace before the session begins.",
          },
          {
            heading: "Protect the Integrity of the Session",
            body: "During virtual assessment:",
            items: [
              "only approved applications and materials should be open",
              "screen-sharing should be available when requested",
              "no recording, photography, screenshots, or copying of materials is permitted",
              "no one should provide hints, answers, explanations, gestures, or reactions",
              "the student should not use search engines, messaging tools, calculators, dictionaries, translation applications, or other assistance unless specifically authorised",
              "assessment materials should not be viewed before or retained after the session",
            ],
            note: "If technical difficulties interrupt the session, the invigilator should pause and contact the assessment professional rather than attempting to continue independently.",
          },
        ],
      },
      {
        id: "parent-role",
        heading: "The Parent's Role During the Assessment",
        type: "dont-list",
        intro: "Parents play an important role in preparing the child and protecting the assessment environment.",
        dontHeading: "During formal student activities, however, parents should not:",
        dontItems: [
          "sit within the child's line of sight unless specifically requested",
          "repeat or simplify instructions",
          "translate instructions unless formally assigned and trained to do so",
          "answer questions on the child's behalf",
          "point to answers",
          "prompt the student to work faster",
          "show approval or disappointment",
          "correct mistakes",
          "encourage a particular response",
          "enter or leave the room unnecessarily",
        ],
        notes: [
          "Even well-intended support can affect how a child responds and reduce confidence in the results.",
          "Parents should remain nearby and available, but outside the room or camera view unless the assessment team has agreed otherwise.",
          "For very young, highly anxious, medically vulnerable, or communication-dependent students, alternative arrangements may be planned in advance.",
        ],
      },
      {
        id: "student-role",
        heading: "The Student's Role",
        type: "student-role",
        body: "The student is not expected to prepare academically or practise assessment questions.",
        encourageHeading: "The student should be encouraged to:",
        items: [
          "listen carefully",
          "ask for instructions to be repeated when permitted",
          "try each activity",
          "say when they do not understand",
          "say when they need a break",
          "work independently",
          "avoid looking for help from adults",
          "give honest answers",
          "make their best effort without worrying about perfection",
        ],
        closing: "Some activities are intentionally designed to become challenging. Reaching a point where the student is unsure does not mean they have failed. It provides useful information about how they approach difficulty, persist, solve problems, and respond to support.",
      },
      {
        id: "invigilator-role",
        heading: "The Invigilator's Role",
        type: "invigilator",
        intro: "The invigilator protects the quality, fairness, and integrity of the assessment. Their role is to create suitable conditions, support the student's comfort, follow the authorised procedure, and record anything that may have affected performance. Invigilators must give their full attention to the session and should not perform unrelated duties while assessment activities are underway.",
        beforeHeading: "Before the session, the invigilator should:",
        beforeItems: [
          "review all instructions provided by the assessment team",
          "confirm the student's identity and scheduled session",
          "prepare the room and required materials",
          "check the technology",
          "ensure phones and notifications are disabled",
          "confirm that the student is well enough to participate",
          "note any relevant information from the parent",
          "have water and approved break arrangements available",
          "join the virtual meeting early where applicable",
        ],
        duringHeading: "During the session, the invigilator should:",
        duringItems: [
          "welcome the student warmly",
          "help the student settle",
          "maintain a calm and neutral manner",
          "follow instructions exactly",
          "avoid changing, shortening, or expanding standardised instructions",
          "avoid teaching, prompting, coaching, or giving clues",
          "supervise all materials",
          "monitor fatigue, distress, disengagement, or distraction",
          "offer breaks when permitted and appropriate",
          "document interruptions, technical issues, unusual behaviour, illness, or other concerns",
          "contact the assessment professional if unsure how to proceed",
        ],
        note: "Standardised instructions must remain consistent. An invigilator should never provide additional information that another student would not receive, even when trying to be helpful.",
      },
      {
        id: "comfort-coaching",
        heading: "Building Comfort Without Coaching",
        type: "two-column",
        intro: "A valid assessment does not require the environment to feel cold or intimidating. The invigilator should help the student feel welcome, explain what will happen, and begin with brief rapport-building conversation. The atmosphere should be encouraging without creating pressure.",
        helpfulHeading: "Helpful statements include:",
        helpful: [
          "\"Just try your best.\"",
          "\"It is okay if some activities feel difficult.\"",
          "\"You can tell me if you need a break.\"",
          "\"Listen carefully and take one activity at a time.\"",
          "\"I cannot help with the answers, but I will make sure you understand what you are being asked to do.\"",
        ],
        unhelpfulHeading: "Unhelpful statements include:",
        unhelpful: [
          "\"That one is easy.\"",
          "\"Think again.\"",
          "\"You know this.\"",
          "\"Your last answer was better.\"",
          "\"Hurry up.\"",
          "\"Are you sure?\"",
          "\"Your teacher said you could do this.\"",
          "\"You need a high score.\"",
        ],
        closing: "Rapport helps reduce anxiety and allows the student to engage, but it must never become coaching. The guidance documents emphasise welcoming the student, using reassuring language, allowing appropriate breaks, and helping the child approach unfamiliar activities without fear.",
      },
      {
        id: "breaks-fatigue",
        heading: "Breaks and Fatigue",
        type: "fatigue",
        body: "Breaks are an important part of many assessment sessions. Students should be able to use the toilet, drink water, move, or have an approved snack between activities. The timing of breaks must be coordinated with the assessment professional, especially when an activity is timed.",
        signsHeading: "The invigilator should watch for:",
        signs: [
          "yawning",
          "rubbing the eyes",
          "slowing significantly",
          "loss of posture",
          "increased fidgeting",
          "repeated requests for instructions",
          "irritability",
          "tearfulness",
          "disengagement",
          "impulsive responding",
          "complaints of headache, hunger, or discomfort",
        ],
        closing: "If fatigue, illness, distress, or disruption is significant, it may be better to pause and reschedule part of the session rather than continue under conditions that could produce misleading results.",
      },
      {
        id: "reschedule",
        heading: "When a Session May Need to Be Rescheduled",
        type: "reschedule",
        introHeading: "Contact the assessment team if:",
        items: [
          "the student is unwell",
          "the student has had very little sleep",
          "the student is highly distressed or unable to settle",
          "the room cannot be made private or quiet",
          "internet or equipment problems prevent clear communication",
          "the required invigilator is unavailable",
          "interruptions cannot be controlled",
          "unauthorised assistance has occurred",
          "the student cannot understand the language of administration",
          "the student is unable to continue despite appropriate breaks",
        ],
        note: "Rescheduling is not a failure. It is sometimes necessary to protect the validity of the assessment and ensure the student is given a fair opportunity to show their abilities.",
      },
      {
        id: "after-session",
        heading: "After the Session",
        type: "after",
        introHeading: "At the end of the assessment:",
        items: [
          "thank the student for their effort",
          "avoid giving scores or making conclusions",
          "collect and secure all papers and materials",
          "close or return any digital materials as instructed",
          "record behavioural observations promptly",
          "document breaks, interruptions, technical problems, fatigue, illness, or unusual circumstances",
          "notify the assessment team of anything that may have influenced performance",
        ],
        note: "Parents may be given a brief factual update about how the student managed the session, but conclusions should not be offered until information has been scored, reviewed, and interpreted.",
      },
    ],
    finalMessage: {
      id: "final-message",
      heading: "A Final Message for Families",
      paras: [
        "The best preparation is not extra studying.",
        "It is a rested child, a calm explanation, a suitable environment, a well-prepared invigilator, and the reassurance that the child is simply being asked to make their best effort.",
        "Our aim is not to create perfect assessment conditions. Our aim is to create fair, supportive, and sufficiently consistent conditions so that the results reflect the student as accurately as possible.",
      ],
    },
  },

  zh: {
    backLabel: "返回门户",
    badge: "评估指导",
    title: "如何为评估做好准备",
    subtitle: "帮助您的孩子感到舒适，并准备好尽力而为",
    intro: [
      "评估的目的是尽可能清晰地呈现学生的思维、学习、反应以及面对陌生任务的方式。为此，学生需要一个平静、舒适、井然有序、尽可能不受干扰的环境。",
      "准备工作不是教孩子该说什么，也不是帮助他们练习答案，而是消除可避免的障碍——如疲劳、饥饿、焦虑、噪音、技术问题或分心——让学生能够尽力发挥。",
      "当活动在一致的条件下完成，并且仔细观察和记录任何可能影响学生表现的情况时，评估结果最为有用。",
    ],
    sections: [
      {
        id: "what-to-tell",
        heading: "家长应告诉孩子什么",
        type: "dialogue",
        intro: "请以平静、积极、适合年龄的方式向孩子介绍评估。",
        saySuggestion: "您可以这样说：",
        sayExample: "「您将完成一些活动，帮助我们了解您学习效果最好的方式。有些可能感觉容易，有些可能感觉有挑战性。您不需要把所有事情都做对。只要仔细听，当您不明白被要求做什么时就提问，尽力而为就可以了。」",
        dontHeading: "请避免告诉您的孩子：",
        dontItems: [
          "他们有什么问题",
          "他们因为成绩不好而接受测试",
          "他们必须达到特定分数",
          "他们需要证明自己有或没有某种情况",
          "评估将决定他们是否聪明",
          "他们必须表现良好，以免让任何人失望",
        ],
        closing: "评估不是通过或不通过的考试。其目的是识别优势、困难和支持需求的模式。应鼓励孩子将此过程视为更好地了解自己的机会，包括他们可能尚未认识到的优势。",
      },
      {
        id: "preparing-before",
        heading: "课程前为孩子做准备",
        type: "subsections",
        subsections: [
          {
            heading: "选择合适的日期和时间",
            body: "在可能的情况下，将评估安排在学生通常精神集中、能够专注的时间。",
            avoidHeading: "避免安排在以下情况之后：",
            avoidItems: [
              "漫长的学校日",
              "剧烈的体育运动或活动",
              "深夜旅行",
              "考试",
              "情绪困难的事件",
              "异常早的早晨",
              "睡眠不足的夜晚",
            ],
            consultNote: "年龄较小的学生在一天较早的时间可能表现更好。年龄较大的学生也应被询问他们何时感觉最为专注。",
            tellTeamHeading: "如果以下情况适用，请提前告知评估团队：",
            tellTeamItems: [
              "学生生病",
              "睡眠严重不足",
              "正在经历重大情绪困扰",
              "最近经历了重大家庭或学校事件",
              "已开始或更改药物",
              "有视力、听力、语言或沟通需求",
              "在预定时间可能会感到异常困难",
            ],
            closingNote: "疾病、疲劳、焦虑、困扰和不熟悉感都可能影响表现，并可能导致评估低估孩子通常能做到的事情。",
          },
          {
            heading: "睡眠、饮食与药物",
            body: "课程前，学生应：",
            beforeItems: [
              "保持正常的夜间睡眠",
              "吃一顿熟悉且适合的餐食",
              "喝足够的水",
              "按处方服用常规药物，除非处方专业人员有其他建议",
              "穿着舒适的衣物",
              "在课程开始前上厕所",
            ],
            closingNote: "不要为了评估而擅自改变药物。家长应告知评估团队当天学生服用的任何药物，以及任何可能影响注意力、活动水平、情绪或耐力的近期变化。",
          },
          {
            heading: "带上学生所需的物品",
            body: "根据课程安排，学生可能需要：",
            items: [
              "处方眼镜",
              "助听器",
              "商定的沟通支持工具",
              "水",
              "休息时的简单零食",
              "提前提供的所需评估材料",
            ],
            closingNote: "舒适物品对于年幼或焦虑的学生在到达和休息时可能是合适的，但如果会分散注意力，在评估活动期间应将其从工作空间中移除。",
          },
        ],
      },
      {
        id: "assessment-space",
        heading: "准备评估空间",
        type: "requirements",
        body: "无论评估在学校、家中还是其他经批准的地点进行，房间应支持专注、隐私和舒适。",
        requirementsHeading: "空间应：",
        requirements: [
          "安静",
          "光线充足",
          "清洁整洁",
          "通风良好或温度适宜",
          "足够大，可容纳学生、设备和监考人员",
          "足够私密，其他人无法窃听或打扰",
          "没有可能提供答案或使学生分心的可见材料",
        ],
        closing: "应提供舒适的椅子和稳固的桌子。学生应能够自然就座、舒适书写，并清晰地看到屏幕和任何材料。这些基本的环境条件是创造公平有效评估体验的核心。",
      },
      {
        id: "remove-distractions",
        heading: "消除干扰",
        type: "checklist",
        beforeHeading: "课程开始前：",
        items: [
          "将手机静音或移走",
          "关闭电视、音乐和通知",
          "关闭无关的浏览器标签和应用程序",
          "移走玩具、游戏设备和不必要的材料",
          "尽可能将宠物放在另一个房间",
          "告知家庭成员或学校工作人员不要进入",
          "如有必要，在门上贴上标识以防止打扰",
          "避免在附近安排送货、维修或其他活动",
        ],
        closing: "除紧急情况外，学生不应被教师、兄弟姐妹、家长、同学或其他成年人打扰。",
      },
      {
        id: "virtual-sessions",
        heading: "虚拟课程的额外准备",
        type: "virtual",
        intro: "部分评估可能以虚拟方式完成。虚拟形式与面对面课程需要同等水平的关注、监督和标准化。",
        subsections: [
          {
            heading: "技术检查",
            body: "在预定课程前，确认学生可以使用以下设备：",
            items: [
              "可靠的电脑或经批准的设备",
              "稳定的互联网连接",
              "功能正常的摄像头",
              "功能正常的麦克风和扬声器或经批准的耳机",
              "所需的视频会议平台",
              "可用的电源或充电完毕的设备",
              "ReMynd提供的任何链接、访问码或文件",
            ],
            note: "尽可能在评估当天之前完成技术检查。除非经过特别批准，学生不应在手机上完成正式活动。",
          },
          {
            heading: "摄像头定位",
            body: "摄像头应让远程评估专业人员能够看到：",
            items: [
              "学生的面部",
              "学生的一般工作姿势",
              "必要时的桌面或工作区",
              "被要求时的监考人员",
            ],
            note: "屏幕应直接放在学生正前方的舒适高度。避免让学生背对明亮的窗户，因为这可能使观察困难。监考人员可能会被要求在课程开始前简短展示房间或工作空间。",
          },
          {
            heading: "保护课程的完整性",
            body: "在虚拟评估期间：",
            items: [
              "只有经批准的应用程序和材料应处于打开状态",
              "被要求时应提供屏幕共享",
              "不允许录制、拍照、截图或复制材料",
              "任何人不得提供提示、答案、解释、手势或反应",
              "除非经过特别授权，学生不应使用搜索引擎、消息工具、计算器、词典、翻译应用程序或其他辅助工具",
              "评估材料不应在课程前查看或在课程后保留",
            ],
            note: "如果技术问题中断了课程，监考人员应暂停并联系评估专业人员，而不是尝试独立继续。",
          },
        ],
      },
      {
        id: "parent-role",
        heading: "评估期间家长的角色",
        type: "dont-list",
        intro: "家长在准备孩子和保护评估环境方面发挥着重要作用。",
        dontHeading: "但是，在正式学生活动期间，家长不应：",
        dontItems: [
          "坐在孩子的视线范围内，除非经过特别要求",
          "重复或简化指导语",
          "翻译指导语，除非正式被指定并经过培训",
          "代替孩子回答问题",
          "指向答案",
          "催促学生更快地工作",
          "表现出认可或失望",
          "纠正错误",
          "鼓励特定的回答",
          "不必要地进入或离开房间",
        ],
        notes: [
          "即使出于好意的支持也可能影响孩子的反应，并降低对结果的信心。",
          "家长应保持在附近且随时可联系，但应在房间外或镜头范围外，除非评估团队另有约定。",
          "对于非常年幼、高度焦虑、有医疗需求或依赖沟通辅助的学生，可以提前计划替代安排。",
        ],
      },
      {
        id: "student-role",
        heading: "学生的角色",
        type: "student-role",
        body: "学生无需在学业上做准备或练习评估问题。",
        encourageHeading: "应鼓励学生：",
        items: [
          "仔细聆听",
          "在被允许时请求重复指导语",
          "尝试每项活动",
          "当不理解时说明",
          "需要休息时说明",
          "独立工作",
          "避免向成年人寻求帮助",
          "给出诚实的答案",
          "尽力而为，不要担心完美",
        ],
        closing: "一些活动有意被设计成越来越具有挑战性。到达不确定的程度并不意味着失败。它提供了关于学生如何面对困难、坚持、解决问题和回应支持的有用信息。",
      },
      {
        id: "invigilator-role",
        heading: "监考人员的角色",
        type: "invigilator",
        intro: "监考人员维护评估的质量、公平性和完整性。他们的职责是创造合适的条件，支持学生的舒适，遵循授权程序，并记录任何可能影响表现的事项。监考人员必须全神贯注于课程，在评估活动进行期间不应执行无关职责。",
        beforeHeading: "课程前，监考人员应：",
        beforeItems: [
          "查阅评估团队提供的所有指示",
          "确认学生的身份和预定课程",
          "准备房间和所需材料",
          "检查技术设备",
          "确保手机和通知已关闭",
          "确认学生健康状况足以参与",
          "记录来自家长的任何相关信息",
          "准备好水和经批准的休息安排",
          "适时提前加入视频会议",
        ],
        duringHeading: "课程中，监考人员应：",
        duringItems: [
          "热情欢迎学生",
          "帮助学生安定下来",
          "保持平静和中立的态度",
          "严格遵循指示",
          "避免更改、缩短或扩展标准化指示",
          "避免教导、提示、辅导或给予提示",
          "监督所有材料",
          "监测疲劳、困扰、脱离参与或分心",
          "在被允许且适当时提供休息",
          "记录中断、技术问题、异常行为、疾病或其他问题",
          "如不确定如何继续，联系评估专业人员",
        ],
        note: "标准化指示必须保持一致。监考人员绝不应提供其他学生不会收到的额外信息，即使出于帮助的意愿。",
      },
      {
        id: "comfort-coaching",
        heading: "建立舒适感而不是辅导",
        type: "two-column",
        intro: "有效的评估不需要营造寒冷或令人生畏的氛围。监考人员应帮助学生感到受欢迎，解释将要发生的事情，并以简短的融洽对话开始。氛围应当鼓励，而不是产生压力。",
        helpfulHeading: "有帮助的表达：",
        helpful: [
          "「尽力而为就好。」",
          "「有些活动感觉困难是没关系的。」",
          "「如果您需要休息，可以告诉我。」",
          "「仔细聆听，一次专注于一项活动。」",
          "「我无法帮助您回答，但我会确保您明白被要求做什么。」",
        ],
        unhelpfulHeading: "无帮助的表达：",
        unhelpful: [
          "「那个很容易。」",
          "「再想想。」",
          "「你知道这个的。」",
          "「你上一个答案更好。」",
          "「快点。」",
          "「你确定吗？」",
          "「你的老师说你能做到这个。」",
          "「你需要一个高分。」",
        ],
        closing: "融洽关系有助于减轻焦虑，让学生能够参与，但绝不能成为辅导。指导文件强调热情欢迎学生，使用安慰性语言，允许适当的休息，并帮助孩子无恐惧地面对陌生活动。",
      },
      {
        id: "breaks-fatigue",
        heading: "休息与疲劳",
        type: "fatigue",
        body: "休息是许多评估课程的重要组成部分。学生应能够在活动之间上厕所、喝水、活动或吃经批准的零食。休息时间必须与评估专业人员协调，尤其是当活动有时间限制时。",
        signsHeading: "监考人员应注意：",
        signs: [
          "打哈欠",
          "揉眼睛",
          "速度明显减慢",
          "姿势丧失",
          "增加坐立不安",
          "反复要求重复指示",
          "烦躁",
          "流泪",
          "脱离参与",
          "冲动反应",
          "抱怨头痛、饥饿或不适",
        ],
        closing: "如果疲劳、疾病、困扰或干扰严重，暂停并重新安排部分课程可能比在可能产生误导结果的条件下继续更为合适。",
      },
      {
        id: "reschedule",
        heading: "何时可能需要重新安排课程",
        type: "reschedule",
        introHeading: "如以下情况，请联系评估团队：",
        items: [
          "学生生病",
          "学生睡眠严重不足",
          "学生极度困扰或无法安定下来",
          "房间无法保持私密或安静",
          "互联网或设备问题妨碍清晰通信",
          "所需监考人员无法出席",
          "中断无法控制",
          "发生了未经授权的协助",
          "学生无法理解管理语言",
          "尽管进行了适当的休息，学生仍无法继续",
        ],
        note: "重新安排不是失败。有时这是必要的，以保护评估的有效性并确保学生获得公平展示能力的机会。",
      },
      {
        id: "after-session",
        heading: "课程结束后",
        type: "after",
        introHeading: "评估结束时：",
        items: [
          "感谢学生的努力",
          "避免给出分数或做出结论",
          "收集并妥善保管所有试卷和材料",
          "按照指示关闭或归还任何数字材料",
          "及时记录行为观察",
          "记录休息、中断、技术问题、疲劳、疾病或异常情况",
          "向评估团队通报任何可能影响表现的事项",
        ],
        note: "家长可以获得关于学生如何应对课程的简短事实性说明，但在信息被评分、审查和解读之前，不应给出结论。",
      },
    ],
    finalMessage: {
      id: "final-message",
      heading: "给家庭的最后寄语",
      paras: [
        "最好的准备不是额外的学习。",
        "而是一个休息充分的孩子、一个平静的解释、一个合适的环境、一个准备充分的监考人员，以及让孩子放心，他们只需尽力而为的保证。",
        "我们的目标不是创造完美的评估条件，而是创造公平、支持性和足够一致的条件，使结果尽可能准确地反映学生的实际情况。",
      ],
    },
  },

  ko: {
    backLabel: "포털로 돌아가기",
    badge: "평가 지침",
    title: "평가 준비 방법",
    subtitle: "자녀가 편안하게 최선을 다할 수 있도록 돕기",
    intro: [
      "평가는 학생이 어떻게 생각하고, 배우고, 반응하며, 익숙하지 않은 과제에 접근하는지를 가능한 한 명확하게 보여주어야 합니다. 이를 위해 학생은 조용하고, 편안하며, 잘 정돈되고, 가능한 한 방해가 없는 환경이 필요합니다.",
      "준비란 아이에게 무엇을 말해야 하는지 가르치거나 답변을 연습시키는 것이 아닙니다. 피로, 배고픔, 불안, 소음, 기술적 문제 또는 산만함과 같은 피할 수 있는 장애물을 제거하여 학생이 최선을 다할 수 있도록 하는 것입니다.",
      "활동이 일관된 조건에서 완료되고 학생의 수행에 영향을 미쳤을 수 있는 모든 것이 신중하게 관찰되고 기록될 때 평가 결과가 가장 유용합니다.",
    ],
    sections: [
      {
        id: "what-to-tell",
        heading: "부모가 자녀에게 말해야 할 것",
        type: "dialogue",
        intro: "평가를 차분하고 긍정적이며 연령에 맞는 방식으로 소개하세요.",
        saySuggestion: "이렇게 말씀하실 수 있습니다:",
        sayExample: "\"어떻게 하면 가장 잘 배울 수 있는지 이해하는 데 도움이 되는 활동들을 할 거야. 어떤 것은 쉽게 느껴지고 어떤 것은 어렵게 느껴질 수 있어. 모든 걸 맞출 필요는 없어. 그냥 잘 듣고, 무엇을 해야 하는지 모를 때는 물어보고, 최선을 다하면 돼.\"",
        dontHeading: "자녀에게 다음과 같은 말은 피해 주세요:",
        dontItems: [
          "무언가 잘못되었다는 말",
          "성적이 좋지 않아서 검사를 받는다는 말",
          "특정 점수를 받아야 한다는 말",
          "특정 상태가 있거나 없다는 것을 증명해야 한다는 말",
          "평가가 지능을 결정할 것이라는 말",
          "누군가를 실망시키지 않으려면 잘 해야 한다는 말",
        ],
        closing: "평가는 합격 또는 불합격 시험이 아닙니다. 그 목적은 강점, 어려움, 지원 필요의 패턴을 파악하는 것입니다. 아이들이 아직 인식하지 못한 강점을 포함하여 자신을 더 잘 이해하는 기회로 이 과정을 바라볼 수 있도록 격려해야 합니다.",
      },
      {
        id: "preparing-before",
        heading: "세션 전 자녀 준비시키기",
        type: "subsections",
        subsections: [
          {
            heading: "적절한 날짜와 시간 선택",
            body: "가능한 경우, 학생이 일반적으로 기민하고 집중할 수 있는 시간에 평가를 예약하세요.",
            avoidHeading: "다음 직후에는 예약을 피하세요:",
            avoidItems: [
              "긴 학교 수업일",
              "격렬한 스포츠나 활동",
              "늦은 밤 여행",
              "시험",
              "감정적으로 어려운 사건",
              "비정상적으로 이른 아침",
              "방해받은 수면",
            ],
            consultNote: "어린 학생들은 하루 중 이른 시간에 더 잘 수행할 수 있습니다. 나이 많은 학생들도 언제 가장 집중이 잘 되는지에 대해 의견을 물어보세요.",
            tellTeamHeading: "다음의 경우 미리 평가팀에 알려주세요:",
            tellTeamItems: [
              "학생이 아프다",
              "수면이 매우 부족하다",
              "심각한 정서적 고통을 겪고 있다",
              "최근 중요한 가족 또는 학교 사건을 경험했다",
              "약물을 시작하거나 변경했다",
              "시력, 청력, 언어 또는 의사소통 필요가 있다",
              "예정된 시간이 비정상적으로 어려울 것 같다",
            ],
            closingNote: "질병, 피로, 불안, 고통 및 낯섦은 모두 수행에 영향을 미칠 수 있으며, 평가가 아이가 평소에 할 수 있는 것을 과소평가하게 만들 수 있습니다.",
          },
          {
            heading: "수면, 식사 및 약물",
            body: "세션 전에 학생은:",
            beforeItems: [
              "정상적인 밤 수면을 취해야 합니다",
              "친숙하고 적절한 식사를 해야 합니다",
              "충분한 물을 마셔야 합니다",
              "처방 전문가가 달리 권고하지 않는 한 일반적인 처방 약물을 복용해야 합니다",
              "편안한 옷을 입어야 합니다",
              "세션 시작 전에 화장실을 사용해야 합니다",
            ],
            closingNote: "평가를 위해 계획하지 않은 약물 변경을 하지 마세요. 부모는 평가팀에게 그날 학생이 복용한 약물과 주의력, 활동 수준, 기분 또는 지구력에 영향을 미칠 수 있는 최근 변화에 대해 알려야 합니다.",
          },
          {
            heading: "학생에게 필요한 것 준비하기",
            body: "세션 준비에 따라 학생에게 필요할 수 있는 것:",
            items: [
              "처방 안경",
              "보청기",
              "합의된 의사소통 지원",
              "물",
              "휴식 시 간단한 간식",
              "미리 제공된 필요한 평가 자료",
            ],
            closingNote: "편안함을 주는 물건은 어린 학생이나 불안한 학생의 도착 및 휴식 시 적절할 수 있지만, 주의를 산만하게 할 경우 평가 활동 중에는 즉각적인 작업 공간에서 제거해야 합니다.",
          },
        ],
      },
      {
        id: "assessment-space",
        heading: "평가 공간 준비",
        type: "requirements",
        body: "평가가 학교, 가정 또는 다른 승인된 장소에서 진행되더라도, 방은 집중력, 개인 정보 보호 및 편안함을 지원해야 합니다.",
        requirementsHeading: "공간은 다음과 같아야 합니다:",
        requirements: [
          "조용할 것",
          "잘 조명될 것",
          "깨끗하고 정돈될 것",
          "편안하게 환기되거나 온도가 조절될 것",
          "학생, 장비 및 감독관을 수용할 만큼 충분히 클 것",
          "다른 사람이 엿듣거나 방해할 수 없을 만큼 충분히 개인적일 것",
          "답을 제공하거나 학생의 주의를 산만하게 할 수 있는 가시적인 자료가 없을 것",
        ],
        closing: "편안한 의자와 안정적인 책상 또는 테이블을 제공해야 합니다. 학생은 자연스럽게 앉고, 편안하게 쓰고, 화면과 자료를 명확하게 볼 수 있어야 합니다. 이러한 기본 환경 조건은 공정하고 유효한 평가 경험을 만드는 데 핵심입니다.",
      },
      {
        id: "remove-distractions",
        heading: "산만함 제거",
        type: "checklist",
        beforeHeading: "세션 시작 전:",
        items: [
          "휴대전화를 무음으로 하거나 제거",
          "텔레비전, 음악 및 알림 끄기",
          "관련 없는 브라우저 탭 및 응용 프로그램 닫기",
          "장난감, 게임 기기 및 불필요한 자료 제거",
          "가능한 경우 애완동물을 다른 방에 두기",
          "가족 구성원이나 학교 직원에게 방에 들어오지 말라고 알리기",
          "방해를 예방하는 데 도움이 된다면 문에 표시 붙이기",
          "근처에 배달, 유지보수 또는 기타 활동 예약 피하기",
        ],
        closing: "긴급 상황을 제외하고, 학생은 교사, 형제자매, 부모, 급우 또는 다른 어른에게 방해받아서는 안 됩니다.",
      },
      {
        id: "virtual-sessions",
        heading: "가상 세션을 위한 추가 준비",
        type: "virtual",
        intro: "평가의 일부는 가상으로 완료될 수 있습니다. 가상 제공은 대면 세션과 동일한 수준의 주의, 감독 및 표준화를 필요로 합니다.",
        subsections: [
          {
            heading: "기술 확인",
            body: "예정된 세션 전에 학생이 다음에 접근할 수 있는지 확인하세요:",
            items: [
              "신뢰할 수 있는 컴퓨터 또는 승인된 기기",
              "안정적인 인터넷 연결",
              "작동하는 카메라",
              "작동하는 마이크와 스피커 또는 승인된 헤드셋",
              "필요한 영상 회의 플랫폼",
              "접근 가능한 전원 공급 또는 완전히 충전된 기기",
              "ReMynd에서 제공한 링크, 접근 코드 또는 파일",
            ],
            note: "가능한 경우 평가 당일 이전에 기술 확인을 완료하세요. 특별히 승인되지 않는 한 학생은 휴대전화로 공식 활동을 완료해서는 안 됩니다.",
          },
          {
            heading: "카메라 위치",
            body: "카메라는 원격 평가 전문가가 다음을 볼 수 있도록 해야 합니다:",
            items: [
              "학생의 얼굴",
              "학생의 일반적인 작업 자세",
              "필요한 경우 책상 또는 작업 영역",
              "요청 시 감독관",
            ],
            note: "화면은 편안한 높이에서 학생 바로 앞에 배치해야 합니다. 이로 인해 관찰이 어려울 수 있으므로 밝은 창문을 등지고 학생을 앉히는 것을 피하세요. 감독관은 세션 시작 전에 방이나 작업 공간을 간략하게 보여달라는 요청을 받을 수 있습니다.",
          },
          {
            heading: "세션 무결성 보호",
            body: "가상 평가 중에:",
            items: [
              "승인된 응용 프로그램과 자료만 열려 있어야 합니다",
              "요청 시 화면 공유가 가능해야 합니다",
              "자료의 녹화, 사진, 스크린샷 또는 복사는 허용되지 않습니다",
              "누구도 힌트, 답변, 설명, 제스처 또는 반응을 제공해서는 안 됩니다",
              "특별히 승인되지 않는 한 학생은 검색 엔진, 메시징 도구, 계산기, 사전, 번역 응용 프로그램 또는 기타 도움을 사용해서는 안 됩니다",
              "평가 자료는 세션 전에 보거나 세션 후에 보관해서는 안 됩니다",
            ],
            note: "기술적인 어려움이 세션을 방해하는 경우, 감독관은 독립적으로 계속하려 하지 말고 중단하고 평가 전문가에게 연락해야 합니다.",
          },
        ],
      },
      {
        id: "parent-role",
        heading: "평가 중 부모의 역할",
        type: "dont-list",
        intro: "부모는 자녀를 준비시키고 평가 환경을 보호하는 데 중요한 역할을 합니다.",
        dontHeading: "그러나 공식적인 학생 활동 중에 부모는 다음을 해서는 안 됩니다:",
        dontItems: [
          "특별히 요청되지 않는 한 아이의 시야 내에 앉기",
          "지시를 반복하거나 단순화하기",
          "공식적으로 지정되고 훈련되지 않는 한 지시를 번역하기",
          "아이를 대신하여 질문에 답하기",
          "답변을 가리키기",
          "학생이 더 빨리 일하도록 촉구하기",
          "승인이나 실망을 표시하기",
          "실수를 수정하기",
          "특정 반응을 장려하기",
          "불필요하게 방에 들어오거나 나가기",
        ],
        notes: [
          "선의의 지원도 아이의 반응에 영향을 미치고 결과에 대한 신뢰도를 낮출 수 있습니다.",
          "부모는 근처에 있고 연락 가능해야 하지만, 평가팀이 달리 합의하지 않는 한 방 밖이나 카메라 시야 밖에 있어야 합니다.",
          "매우 어린, 매우 불안한, 의학적으로 취약한 또는 의사소통 의존적인 학생을 위해 대안적인 준비를 미리 계획할 수 있습니다.",
        ],
      },
      {
        id: "student-role",
        heading: "학생의 역할",
        type: "student-role",
        body: "학생은 학업적으로 준비하거나 평가 질문을 연습할 것으로 기대되지 않습니다.",
        encourageHeading: "학생이 다음을 할 수 있도록 격려하세요:",
        items: [
          "주의 깊게 듣기",
          "허용될 때 지시 반복 요청하기",
          "각 활동 시도하기",
          "이해하지 못할 때 말하기",
          "휴식이 필요할 때 말하기",
          "독립적으로 작업하기",
          "어른에게 도움을 구하는 것 피하기",
          "솔직한 답변 제공하기",
          "완벽을 걱정하지 않고 최선 다하기",
        ],
        closing: "일부 활동은 의도적으로 점점 더 어려워지도록 설계되어 있습니다. 학생이 불확실한 지점에 도달한다고 해서 실패한 것이 아닙니다. 그것은 학생이 어려움에 어떻게 접근하고, 지속하고, 문제를 해결하고, 지원에 어떻게 반응하는지에 대한 유용한 정보를 제공합니다.",
      },
      {
        id: "invigilator-role",
        heading: "감독관의 역할",
        type: "invigilator",
        intro: "감독관은 평가의 질, 공정성 및 무결성을 보호합니다. 그들의 역할은 적절한 조건을 만들고, 학생의 편안함을 지원하고, 승인된 절차를 따르고, 수행에 영향을 미쳤을 수 있는 모든 것을 기록하는 것입니다. 감독관은 세션에 완전한 주의를 기울여야 하며 평가 활동이 진행 중인 동안 관련 없는 업무를 수행해서는 안 됩니다.",
        beforeHeading: "세션 전, 감독관은:",
        beforeItems: [
          "평가팀이 제공한 모든 지시를 검토해야 합니다",
          "학생의 신원과 예정된 세션을 확인해야 합니다",
          "방과 필요한 자료를 준비해야 합니다",
          "기술을 확인해야 합니다",
          "휴대전화와 알림이 비활성화되어 있는지 확인해야 합니다",
          "학생이 참여할 만큼 건강한지 확인해야 합니다",
          "부모로부터 관련 정보를 기록해야 합니다",
          "물과 승인된 휴식 준비를 갖추어야 합니다",
          "해당하는 경우 영상 회의에 일찍 참여해야 합니다",
        ],
        duringHeading: "세션 중, 감독관은:",
        duringItems: [
          "학생을 따뜻하게 환영해야 합니다",
          "학생이 자리를 잡도록 도와야 합니다",
          "차분하고 중립적인 태도를 유지해야 합니다",
          "지시를 정확하게 따라야 합니다",
          "표준화된 지시를 변경, 단축 또는 확장하는 것을 피해야 합니다",
          "가르치거나 촉구하거나 코칭하거나 힌트를 주는 것을 피해야 합니다",
          "모든 자료를 감독해야 합니다",
          "피로, 고통, 불참 또는 산만함을 모니터링해야 합니다",
          "허용되고 적절한 경우 휴식을 제공해야 합니다",
          "중단, 기술 문제, 비정상적인 행동, 질병 또는 기타 우려 사항을 문서화해야 합니다",
          "진행 방법을 모를 경우 평가 전문가에게 연락해야 합니다",
        ],
        note: "표준화된 지시는 일관성을 유지해야 합니다. 도움을 주려는 의도일지라도 감독관은 다른 학생이 받지 않을 추가 정보를 제공해서는 안 됩니다.",
      },
      {
        id: "comfort-coaching",
        heading: "코칭 없이 편안함 만들기",
        type: "two-column",
        intro: "유효한 평가는 환경이 차갑거나 위협적으로 느껴질 필요가 없습니다. 감독관은 학생이 환영받는다고 느끼도록 돕고, 무슨 일이 일어날지 설명하고, 간단한 친해지기 대화로 시작해야 합니다. 분위기는 압박감을 만들지 않으면서도 격려적이어야 합니다.",
        helpfulHeading: "도움이 되는 말:",
        helpful: [
          "\"그냥 최선을 다하세요.\"",
          "\"어떤 활동은 어렵게 느껴져도 괜찮습니다.\"",
          "\"휴식이 필요하면 알려주세요.\"",
          "\"잘 듣고 한 번에 하나씩 활동에 집중하세요.\"",
          "\"답변은 도와드릴 수 없지만, 무엇을 해야 하는지 이해하도록 도와드릴게요.\"",
        ],
        unhelpfulHeading: "도움이 되지 않는 말:",
        unhelpful: [
          "\"그건 쉬워요.\"",
          "\"다시 생각해보세요.\"",
          "\"당신은 이것을 알아요.\"",
          "\"이전 답이 더 좋았어요.\"",
          "\"빨리 하세요.\"",
          "\"확실한가요?\"",
          "\"선생님이 당신이 할 수 있다고 했어요.\"",
          "\"높은 점수가 필요해요.\"",
        ],
        closing: "친근함은 불안을 줄이고 학생이 참여할 수 있도록 하지만, 절대 코칭이 되어서는 안 됩니다. 지침 문서는 학생을 따뜻하게 환영하고, 안심시키는 언어를 사용하고, 적절한 휴식을 허용하고, 아이가 두려움 없이 익숙하지 않은 활동에 접근하도록 돕는 것을 강조합니다.",
      },
      {
        id: "breaks-fatigue",
        heading: "휴식과 피로",
        type: "fatigue",
        body: "휴식은 많은 평가 세션의 중요한 부분입니다. 학생들은 활동 사이에 화장실을 사용하고, 물을 마시고, 움직이거나 승인된 간식을 먹을 수 있어야 합니다. 휴식 시간은 특히 활동이 시간 제한이 있는 경우 평가 전문가와 조율해야 합니다.",
        signsHeading: "감독관은 다음을 주시해야 합니다:",
        signs: [
          "하품하기",
          "눈 비비기",
          "속도가 현저히 느려지기",
          "자세 상실",
          "안절부절못함 증가",
          "지시 반복 요청",
          "과민반응",
          "눈물",
          "참여 해제",
          "충동적 반응",
          "두통, 배고픔 또는 불편함 호소",
        ],
        closing: "피로, 질병, 고통 또는 방해가 심각한 경우, 오해의 소지가 있는 결과를 만들 수 있는 조건에서 계속하는 것보다 세션을 일시 중지하고 일부를 재예약하는 것이 더 나을 수 있습니다.",
      },
      {
        id: "reschedule",
        heading: "세션을 재예약해야 할 수 있는 경우",
        type: "reschedule",
        introHeading: "다음의 경우 평가팀에 연락하세요:",
        items: [
          "학생이 아픈 경우",
          "학생의 수면이 매우 부족한 경우",
          "학생이 매우 고통스럽거나 안정을 찾지 못하는 경우",
          "방을 개인적이거나 조용하게 만들 수 없는 경우",
          "인터넷 또는 장비 문제로 명확한 의사소통이 불가한 경우",
          "필요한 감독관이 없는 경우",
          "방해를 통제할 수 없는 경우",
          "승인되지 않은 도움이 발생한 경우",
          "학생이 관리 언어를 이해할 수 없는 경우",
          "적절한 휴식에도 불구하고 학생이 계속할 수 없는 경우",
        ],
        note: "재예약은 실패가 아닙니다. 때로는 평가의 유효성을 보호하고 학생에게 능력을 보여줄 공정한 기회를 주기 위해 필요합니다.",
      },
      {
        id: "after-session",
        heading: "세션 후",
        type: "after",
        introHeading: "평가가 끝날 때:",
        items: [
          "학생의 노력에 감사하기",
          "점수를 주거나 결론을 내리는 것 피하기",
          "모든 종이와 자료를 수집하고 안전하게 보관하기",
          "지시에 따라 디지털 자료를 닫거나 반환하기",
          "행동 관찰을 신속하게 기록하기",
          "휴식, 중단, 기술 문제, 피로, 질병 또는 비정상적인 상황 문서화하기",
          "수행에 영향을 미쳤을 수 있는 모든 것을 평가팀에 알리기",
        ],
        note: "부모는 학생이 세션을 어떻게 처리했는지에 대한 간단한 사실적인 업데이트를 받을 수 있지만, 정보가 채점, 검토 및 해석될 때까지 결론을 제공해서는 안 됩니다.",
      },
    ],
    finalMessage: {
      id: "final-message",
      heading: "가족에게 드리는 마지막 메시지",
      paras: [
        "최고의 준비는 추가 공부가 아닙니다.",
        "충분히 쉰 아이, 차분한 설명, 적절한 환경, 잘 준비된 감독관, 그리고 아이가 최선을 다하기만 하면 된다는 안심이 최고의 준비입니다.",
        "우리의 목표는 완벽한 평가 조건을 만드는 것이 아닙니다. 결과가 학생을 가능한 한 정확하게 반영할 수 있도록 공정하고, 지지적이며, 충분히 일관된 조건을 만드는 것입니다.",
      ],
    },
  },
} as const;

type Section = (typeof CONTENT.en.sections)[number];

function BulletList({ items, variant = "default" }: { items: readonly string[]; variant?: "check" | "cross" | "default" | "alert" }) {
  const icons: Record<string, React.ReactNode> = {
    check: <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />,
    cross: <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />,
    alert: <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />,
    default: <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0 mt-2" />,
  };
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
          {icons[variant]}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NoteBox({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" | "important" }) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    important: "bg-indigo-50 border-indigo-200 text-indigo-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${styles[variant]}`}>
      {children}
    </div>
  );
}

function SectionCard({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-5">
        {children}
      </div>
    </section>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg md:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">{children}</h2>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide mt-4 mb-2">{children}</h3>;
}

function renderSection(sec: Section) {
  const s = sec as Record<string, unknown>;
  const type = s.type as string;

  if (type === "dialogue") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.intro as string}</p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{s.saySuggestion as string}</p>
          <p className="text-sm text-emerald-900 italic leading-relaxed">{s.sayExample as string}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">{s.dontHeading as string}</p>
          <BulletList items={s.dontItems as string[]} variant="cross" />
        </div>
        <NoteBox variant="info">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "subsections") {
    const subs = s.subsections as Array<Record<string, unknown>>;
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        {subs.map((sub, i) => (
          <div key={i} className="space-y-3 pt-2 first:pt-0 border-t border-slate-100 first:border-0">
            <h3 className="font-bold text-slate-800">{sub.heading as string}</h3>
            {sub.body && <p className="text-sm text-slate-600 leading-relaxed">{sub.body as string}</p>}
            {sub.avoidHeading && (
              <>
                <p className="text-sm font-semibold text-slate-700">{sub.avoidHeading as string}</p>
                <BulletList items={sub.avoidItems as string[]} variant="alert" />
              </>
            )}
            {sub.consultNote && <NoteBox variant="info">{sub.consultNote as string}</NoteBox>}
            {sub.tellTeamHeading && (
              <>
                <p className="text-sm font-semibold text-slate-700 mt-3">{sub.tellTeamHeading as string}</p>
                <BulletList items={sub.tellTeamItems as string[]} variant="check" />
              </>
            )}
            {sub.beforeItems && <BulletList items={sub.beforeItems as string[]} variant="check" />}
            {sub.items && <BulletList items={sub.items as string[]} variant="check" />}
            {sub.closingNote && <NoteBox variant="warn">{sub.closingNote as string}</NoteBox>}
          </div>
        ))}
      </SectionCard>
    );
  }

  if (type === "requirements") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.body as string}</p>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">{s.requirementsHeading as string}</p>
          <BulletList items={s.requirements as string[]} variant="check" />
        </div>
        <NoteBox variant="important">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "checklist") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm font-semibold text-slate-700">{s.beforeHeading as string}</p>
        <BulletList items={s.items as string[]} variant="check" />
        <NoteBox variant="warn">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "virtual") {
    const subs = s.subsections as Array<Record<string, unknown>>;
    return (
      <SectionCard id={s.id as string}>
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={16} className="text-indigo-500" />
          <SectionHeading>{s.heading as string}</SectionHeading>
        </div>
        <NoteBox variant="important">{s.intro as string}</NoteBox>
        {subs.map((sub, i) => (
          <div key={i} className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-800">{sub.heading as string}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{sub.body as string}</p>
            <BulletList items={sub.items as string[]} variant="check" />
            {sub.note && <NoteBox variant="warn">{sub.note as string}</NoteBox>}
          </div>
        ))}
      </SectionCard>
    );
  }

  if (type === "dont-list") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.intro as string}</p>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">{s.dontHeading as string}</p>
          <BulletList items={s.dontItems as string[]} variant="cross" />
        </div>
        <div className="space-y-3">
          {(s.notes as string[]).map((note, i) => (
            <NoteBox key={i} variant={i === 0 ? "warn" : "info"}>{note}</NoteBox>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (type === "student-role") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.body as string}</p>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">{s.encourageHeading as string}</p>
          <BulletList items={s.items as string[]} variant="check" />
        </div>
        <NoteBox variant="important">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "invigilator") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.intro as string}</p>
        <div>
          <SubHeading>{s.beforeHeading as string}</SubHeading>
          <BulletList items={s.beforeItems as string[]} variant="check" />
        </div>
        <div>
          <SubHeading>{s.duringHeading as string}</SubHeading>
          <BulletList items={s.duringItems as string[]} variant="check" />
        </div>
        <NoteBox variant="important">{s.note as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "two-column") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.intro as string}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{s.helpfulHeading as string}</p>
            <ul className="space-y-2">
              {(s.helpful as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span className="italic">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-red-700 uppercase tracking-wide">{s.unhelpfulHeading as string}</p>
            <ul className="space-y-2">
              {(s.unhelpful as string[]).map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                  <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span className="italic">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <NoteBox variant="info">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "fatigue") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm text-slate-600 leading-relaxed">{s.body as string}</p>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">{s.signsHeading as string}</p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {(s.signs as string[]).map((sign, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                {sign}
              </div>
            ))}
          </div>
        </div>
        <NoteBox variant="warn">{s.closing as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "reschedule") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm font-semibold text-slate-700">{s.introHeading as string}</p>
        <BulletList items={s.items as string[]} variant="alert" />
        <NoteBox variant="important">{s.note as string}</NoteBox>
      </SectionCard>
    );
  }

  if (type === "after") {
    return (
      <SectionCard id={s.id as string}>
        <SectionHeading>{s.heading as string}</SectionHeading>
        <p className="text-sm font-semibold text-slate-700">{s.introHeading as string}</p>
        <BulletList items={s.items as string[]} variant="check" />
        <NoteBox variant="info">{s.note as string}</NoteBox>
      </SectionCard>
    );
  }

  return null;
}

export default function AssessmentPreparationPage() {
  const { lang } = useI18n();
  const c = CONTENT[(lang as Lang) in CONTENT ? (lang as Lang) : "en"];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/portal">
            <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft size={15} /> {c.backLabel}
            </button>
          </Link>
          <LanguageSwitcherLight />
        </div>
        <div className="max-w-5xl mx-auto px-6 pb-12 pt-6">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-3.5 py-1.5 mb-5">
            <Info size={12} className="text-indigo-300" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">{c.badge}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">{c.title}</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-2xl">{c.subtitle}</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8 items-start">

          {/* Sticky nav — desktop */}
          <nav className="hidden lg:block sticky top-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">Contents</p>
            {c.sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="block text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-2.5 py-1.5 transition-colors leading-snug"
              >
                {sec.heading}
              </a>
            ))}
            <a
              href={`#${c.finalMessage.id}`}
              className="block text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-2.5 py-1.5 transition-colors leading-snug"
            >
              {c.finalMessage.heading}
            </a>
          </nav>

          {/* Sections */}
          <div className="space-y-6">
            {/* Intro */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-4">
              {c.intro.map((para, i) => (
                <p key={i} className="text-sm md:text-base text-slate-600 leading-relaxed">{para}</p>
              ))}
            </div>

            {/* All sections */}
            {c.sections.map((sec) => (
              <div key={sec.id}>{renderSection(sec as unknown as Section)}</div>
            ))}

            {/* Final message */}
            <section id={c.finalMessage.id} className="scroll-mt-20">
              <div className="bg-indigo-900 text-white rounded-2xl p-6 md:p-8 space-y-4">
                <h2 className="text-xl font-bold">{c.finalMessage.heading}</h2>
                {c.finalMessage.paras.map((para, i) => (
                  <p key={i} className={`leading-relaxed ${i === 0 ? "text-indigo-200 font-semibold text-base" : "text-indigo-100 text-sm"}`}>{para}</p>
                ))}
              </div>
            </section>

            {/* Bottom CTA */}
            <div className="text-center py-4">
              <Link href="/portal">
                <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                  <Home size={15} /> {c.backLabel}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

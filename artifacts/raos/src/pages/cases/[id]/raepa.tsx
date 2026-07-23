import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Upload, Trash2, Loader2, CheckCircle2,
  AlertTriangle, FileText, Sparkles, ChevronRight, BookOpen,
  Layers, Star, BarChart3, RefreshCw, Eye, ClipboardList,
  Share2, Copy, Check, QrCode, X, ChevronDown, Printer,
  Pencil, Globe, Languages,
} from "lucide-react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

// ── Constants ──────────────────────────────────────────────────────────────────

const DOMAINS = [
  "Social Communication English","Academic Listening","Academic Speaking",
  "Academic Reading","Academic Writing","General Academic Vocabulary",
  "Subject-Specific Vocabulary","Understanding of Classroom Directions",
  "Explanation and Elaboration","Sequencing and Organization",
  "Comparison and Classification","Cause-and-Effect Reasoning",
  "Inference and Prediction","Justification and Evidence",
  "Evaluation and Hypothesizing","Mathematics Language",
  "Science Language","Humanities Language",
  "Academic Independence","Response to Scaffolding",
];

const MODULES = [
  { id: "social_communication", name: "Module 1: Social Communication Baseline", domains: ["Social Communication English"], required: true },
  { id: "academic_listening",   name: "Module 2: Academic Listening",  domains: ["Academic Listening","Understanding of Classroom Directions"] },
  { id: "academic_speaking",    name: "Module 3: Academic Speaking",    domains: ["Academic Speaking","Explanation and Elaboration","Sequencing and Organization"] },
  { id: "academic_reading",     name: "Module 4: Academic Reading",     domains: ["Academic Reading","Inference and Prediction","General Academic Vocabulary"] },
  { id: "academic_writing",     name: "Module 5: Academic Writing",     domains: ["Academic Writing","Comparison and Classification","Justification and Evidence"] },
  { id: "mathematics_language", name: "Module 6: Mathematics Language", domains: ["Mathematics Language"] },
  { id: "science_language",     name: "Module 7: Science Language",     domains: ["Science Language","Cause-and-Effect Reasoning"] },
  { id: "humanities_language",  name: "Module 8: Humanities Language",  domains: ["Humanities Language","Evaluation and Hypothesizing"] },
  { id: "literature",           name: "Module 9: Literature and Extended Text", domains: ["Subject-Specific Vocabulary"] },
  { id: "academic_independence",name: "Module 10: Academic Independence", domains: ["Academic Independence","Response to Scaffolding"] },
];

const LANGUAGE_FUNCTIONS = [
  "identify","recall","describe","sequence","classify","compare",
  "summarize","explain","infer","predict","justify","evaluate",
  "hypothesize","argue","support with evidence",
];

const SCORE_LABELS: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "Not Demonstrated", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  1: { label: "Emerging",         color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  2: { label: "Developing",       color: "text-amber-700",  bg: "bg-amber-100 border-amber-300" },
  3: { label: "Functional",       color: "text-blue-700",   bg: "bg-blue-100 border-blue-300" },
  4: { label: "Independent",      color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300" },
};

const FUNCTION_LEVELS: Record<string, { label: string; color: string }> = {
  not_assessed:    { label: "Not Assessed",    color: "text-slate-400" },
  not_demonstrated:{ label: "Not Demonstrated",color: "text-red-600" },
  emerging:        { label: "Emerging",         color: "text-orange-600" },
  developing:      { label: "Developing",       color: "text-amber-600" },
  functional:      { label: "Functional",       color: "text-blue-600" },
  independent:     { label: "Independent",      color: "text-emerald-600" },
};

// Brief description + elicitation cue for each language function
const FUNCTION_GUIDES: Record<string, { desc: string; cue: string }> = {
  "identify":              { desc: "Name, label, or point to a specific concept, person, place, object, or term.", cue: "What is this called? / Can you point to the…?" },
  "recall":                { desc: "Retrieve information from memory — facts, steps, or details from a previous explanation or text.", cue: "What do you remember about…? / What were the steps?" },
  "describe":              { desc: "Give attributes, qualities, features, or characteristics of something.", cue: "Can you describe…? / Tell me about the features of…" },
  "sequence":              { desc: "Order events, steps, or information in correct chronological or procedural order.", cue: "What happened first/next/then? / Walk me through the steps." },
  "classify":              { desc: "Group or sort items, concepts, or information by shared characteristics.", cue: "Which of these belong together? / How would you group these?" },
  "compare":               { desc: "Identify similarities and differences between two or more items or concepts.", cue: "How are these the same? How are they different?" },
  "summarize":             { desc: "Condense the key points of a text, explanation, or event into a concise statement.", cue: "Can you summarise what you just heard/read in a few sentences?" },
  "explain":               { desc: "Give reasons, causes, mechanisms, or make an idea understandable to another person.", cue: "Why does this happen? / Can you explain how…?" },
  "infer":                 { desc: "Draw logical conclusions that are implied but not explicitly stated in the text or stimulus.", cue: "What do you think is happening here? / What can you tell from this?" },
  "predict":               { desc: "Use evidence or patterns to anticipate what will happen next.", cue: "What do you think will happen next? / Why?" },
  "justify":               { desc: "Support a claim, decision, or position with logical reasons.", cue: "Why do you think that? / What makes you say that?" },
  "evaluate":              { desc: "Make a judgement about quality, value, or effectiveness and explain the reasoning.", cue: "Do you think this was a good idea? / How effective was…?" },
  "hypothesize":           { desc: "Propose a possible explanation or outcome based on available evidence.", cue: "What might cause this? / If X happened, what do you think would occur?" },
  "argue":                 { desc: "Present a structured position with supporting points and awareness of counterarguments.", cue: "Do you agree or disagree with…? Build a case for your view." },
  "support with evidence": { desc: "Use specific data, examples, quotations, or references to back claims.", cue: "Can you give me an example? / What evidence supports that?" },
};

// ── Domain observation guides ──────────────────────────────────────────────────
const DOMAIN_GUIDES: Record<string, {
  description: string;
  prompts: string[];
  descriptors: Record<number, string>;
}> = {
  "Social Communication English": {
    description: "Ability to use English for social and interpersonal communication in school contexts.",
    prompts: [
      "Engage the student in a short conversation — ask about their interests, school day, or subjects they are currently studying (2–3 minutes).",
      "Note use of greetings, turn-taking, repair strategies, and social phrases during the session.",
    ],
    descriptors: {
      0: "Does not attempt social English; remains silent or uses only L1.",
      1: "Produces only isolated words or formulaic phrases (e.g. 'yes', 'okay'); relies on gesture.",
      2: "Produces short simple sentences in familiar social contexts; limited repair strategies.",
      3: "Engages in simple conversations; can initiate and respond; errors don't impede meaning.",
      4: "Communicates fluently and naturally; uses varied vocabulary; repairs breakdown independently.",
    },
  },
  "Academic Listening": {
    description: "Ability to understand spoken academic English — explanations, lectures, and instructions.",
    prompts: [
      "Give a brief 3–4 sentence explanation of a simple concept (e.g. the water cycle) without visual support. Ask the student to summarise what they heard.",
      "Give a 2–3 step verbal instruction without gesture or visual support and ask the student to carry it out.",
    ],
    descriptors: {
      0: "No comprehension of academic speech; does not respond to verbal instructions.",
      1: "Understands isolated key words; relies heavily on visual supports, gesture, or watching peers.",
      2: "Follows simple, slow, clear speech; manages basic 2-step instructions; misses complex structures.",
      3: "Understands grade-level academic speech; follows multi-step instructions with occasional clarification.",
      4: "Comprehends academic discourse consistently without scaffolding; self-repairs misunderstandings.",
    },
  },
  "Academic Speaking": {
    description: "Ability to use spoken English for academic purposes — explaining, describing, discussing, presenting.",
    prompts: [
      "Ask the student to explain a process or concept from their subject area in their own words (e.g. a maths procedure, a science process, or a humanities concept).",
      "Ask for their opinion on a topic drawn from their work and prompt elaboration: 'Why do you think that? Can you tell me more?'",
    ],
    descriptors: {
      0: "Does not produce academic English orally; silent or uses only L1.",
      1: "Produces single words or short phrases; heavily reliant on prompting; cannot sustain a turn.",
      2: "Produces short sentences; attempts to explain ideas but vocabulary and grammar are limited; meaning sometimes unclear.",
      3: "Communicates ideas in extended sentences; uses some academic language; errors present but meaning is clear.",
      4: "Uses academic English fluently; can explain, present, and discuss with appropriate vocabulary and structure.",
    },
  },
  "Academic Reading": {
    description: "Ability to comprehend grade-level academic texts including textbooks, worksheets, and articles.",
    prompts: [
      "Present a short grade-level text (3–5 sentences) from a subject area. Ask 2–3 comprehension questions.",
      "Ask the student to read a brief passage aloud, then paraphrase the meaning in their own words.",
    ],
    descriptors: {
      0: "Cannot access grade-level text; does not attempt to read or makes no meaning from it.",
      1: "Decodes individual words but cannot construct meaning from connected academic text.",
      2: "Understands simple texts with familiar topics; struggles with complex syntax and academic vocabulary.",
      3: "Comprehends most grade-level texts using context clues; may need to re-read complex sections.",
      4: "Reads and understands grade-level academic texts independently; can analyse and critically respond.",
    },
  },
  "Academic Writing": {
    description: "Ability to produce written English for academic purposes — explanations, analyses, and extended responses.",
    prompts: [
      "Review the student's work samples for evidence of written academic language.",
      "Optionally, ask the student to write 3–5 sentences explaining a concept from their subject area (allow 5–8 minutes).",
      "Note sentence structure, vocabulary range, use of connectives, and text organisation.",
    ],
    descriptors: {
      0: "Does not produce written academic English; may copy text or write only in L1.",
      1: "Produces isolated words, labels, or lists; cannot construct full sentences independently.",
      2: "Writes simple sentences; limited connectives; ideas are present but undeveloped.",
      3: "Writes in paragraphs; uses some academic language and text structures; errors present but meaning is clear.",
      4: "Writes extended academic texts with appropriate structure, vocabulary, and grammatical accuracy.",
    },
  },
  "General Academic Vocabulary": {
    description: "Knowledge of Tier 2 cross-curricular vocabulary used across subject areas (e.g. analyse, identify, significant, process).",
    prompts: [
      "Ask the student to define or use in a sentence: 'compare', 'significant', 'evidence', 'process', 'identify'.",
      "Present a task instruction using academic verbs (e.g. 'Evaluate the following…') and observe whether the student understands the task type.",
      "Review work samples for use of Tier 2 vocabulary.",
    ],
    descriptors: {
      0: "No evidence of Tier 2 vocabulary; uses only everyday concrete words.",
      1: "Recognises a few high-frequency academic words but cannot define or use them productively.",
      2: "Uses some Tier 2 words inconsistently or imprecisely; receptive understanding exceeds production.",
      3: "Uses a range of Tier 2 words correctly in context; occasional semantic errors.",
      4: "Consistently uses appropriate Tier 2 vocabulary across subjects with accuracy and flexibility.",
    },
  },
  "Subject-Specific Vocabulary": {
    description: "Knowledge of Tier 3 discipline-specific terminology (e.g. ecosystem, denominator, parliament, photosynthesis).",
    prompts: [
      "Ask the student to explain subject-specific terms from their work samples (e.g. 'ecosystem', 'denominator', 'push-pull factor').",
      "Show 4–5 key terms from a subject the student studies and ask them to select and use 2 in a sentence.",
      "Review work samples for correct use of technical vocabulary.",
    ],
    descriptors: {
      0: "No evidence of subject-specific terminology in any curriculum area.",
      1: "Recognises some key terms with prompting; cannot define or use them independently.",
      2: "Uses basic subject-specific terms correctly but limited range; may confuse related terms.",
      3: "Uses subject-specific vocabulary accurately across most subject areas; some gaps remain.",
      4: "Demonstrates accurate, flexible use of subject-specific vocabulary across multiple disciplines.",
    },
  },
  "Understanding of Classroom Directions": {
    description: "Ability to follow verbal and written classroom instructions and procedural language.",
    prompts: [
      "Give multi-step verbal instructions without gesture or visual support (e.g. 'Open your book to page 12, read the first paragraph, then answer questions 1 to 3 in your notebook.').",
      "Provide a written task instruction and observe whether the student reads and follows it independently.",
      "Note whether the student waits to copy peers before beginning tasks.",
    ],
    descriptors: {
      0: "Does not respond to classroom directions; requires full translation or L1 support to begin tasks.",
      1: "Follows single-step instructions with visual support or modelling; misses multi-step directions.",
      2: "Follows familiar 2-step directions; struggles with novel or complex procedural language.",
      3: "Follows most classroom directions independently; occasionally needs clarification for complex instructions.",
      4: "Consistently follows all classroom directions without additional support; self-monitors task completion.",
    },
  },
  "Explanation and Elaboration": {
    description: "Ability to explain ideas, processes, and concepts clearly and with sufficient detail.",
    prompts: [
      "Ask the student to explain why something happens (e.g. 'Why do seasons change?' or 'Why do fractions need the same denominator to add?').",
      "Prompt elaboration: after a brief response, ask 'Can you tell me more about that?'",
      "Review work samples for quality of explanatory language.",
    ],
    descriptors: {
      0: "Cannot produce any explanation; responds with single words or silence.",
      1: "Produces a minimal attempt at explanation but omits key steps or reasoning.",
      2: "Provides a basic explanation with some gaps; limited elaboration beyond the first point.",
      3: "Explains ideas clearly with adequate detail; uses some connectives and cause-effect language.",
      4: "Produces thorough, well-elaborated explanations with precise language and logical structure.",
    },
  },
  "Sequencing and Organization": {
    description: "Ability to organise and sequence information logically in spoken and written language.",
    prompts: [
      "Ask the student to recount a process in order (e.g. 'Describe the steps to complete an experiment you've done in Science.').",
      "Ask the student to describe how to get from school to home, or describe the plot of a story.",
      "Review written work for use of sequence markers (first, then, next, finally).",
    ],
    descriptors: {
      0: "No evidence of sequencing; information presented randomly or not at all.",
      1: "Attempts to sequence but omits most steps; no sequence markers used.",
      2: "Sequences familiar events with some logical order; limited use of connectives.",
      3: "Sequences ideas logically with appropriate markers; minor lapses in organisation.",
      4: "Organises information in a clear, logical sequence using varied connectives and discourse markers.",
    },
  },
  "Comparison and Classification": {
    description: "Ability to identify similarities, differences, and categories using comparative language.",
    prompts: [
      "Show two related items or concepts (e.g. two animals, two historical events) and ask 'How are these similar? How are they different?'",
      "Ask the student to group a set of vocabulary words into categories and explain their reasoning.",
      "Review work samples for use of comparison language (both, similarly, in contrast, whereas).",
    ],
    descriptors: {
      0: "Cannot identify similarities or differences; no comparative language used.",
      1: "Identifies one obvious similarity or difference but cannot use comparative language.",
      2: "Makes basic comparisons using simple language ('X is bigger than Y'); limited range of structures.",
      3: "Uses a range of comparative structures; identifies multiple points of comparison.",
      4: "Produces sophisticated, nuanced comparisons with accurate use of comparative and contrastive language.",
    },
  },
  "Cause-and-Effect Reasoning": {
    description: "Ability to identify and express causal relationships using appropriate language.",
    prompts: [
      "Ask 'What caused [event]?' and 'What happened as a result?' about a topic from class.",
      "Present a scenario: 'If [X] happens, what do you think will happen next? Why?'",
      "Review work samples for use of cause-effect language (because, therefore, as a result, due to).",
    ],
    descriptors: {
      0: "Cannot express cause-effect relationships; no causal language used.",
      1: "Identifies a cause or effect but cannot connect them linguistically.",
      2: "Uses simple causal language ('because') but does not elaborate on the reasoning.",
      3: "Expresses cause-effect relationships with adequate language; uses a range of connectives.",
      4: "Articulates complex causal chains with precise language; uses varied academic causal structures.",
    },
  },
  "Inference and Prediction": {
    description: "Ability to draw conclusions beyond the literal text and make evidence-based predictions.",
    prompts: [
      "Present a short text or image and ask 'What do you think will happen next? Why do you think that?'",
      "Ask inferential questions about a reading text (e.g. 'How do you think the character felt? What makes you think that?').",
      "Ask 'What do you think the author was trying to say?'",
    ],
    descriptors: {
      0: "Cannot make inferences; only states literal information or cannot respond.",
      1: "Makes a simple guess without justification; does not use evidence from the text.",
      2: "Makes basic inferences with prompting; limited ability to justify using text evidence.",
      3: "Makes reasonable inferences and supports them with some text evidence.",
      4: "Makes sophisticated inferences with clear, precise evidence; can discuss implied meaning.",
    },
  },
  "Justification and Evidence": {
    description: "Ability to support opinions and claims with relevant evidence and reasoning.",
    prompts: [
      "Ask the student to share an opinion and then ask 'Why do you think that? What evidence do you have?'",
      "Review written work for use of evidence-based language (for example, this shows, according to, the text states).",
      "Pose a debatable question from a class topic and ask the student to take a position and justify it.",
    ],
    descriptors: {
      0: "States opinions without any attempt at justification or evidence.",
      1: "Provides a simple reason but it is not connected to evidence.",
      2: "Attempts to justify claims; uses some evidence but connection to the argument is unclear.",
      3: "Supports claims with relevant evidence; argument is coherent though not always elaborated.",
      4: "Constructs well-justified arguments with precise evidence and clear logical reasoning.",
    },
  },
  "Evaluation and Hypothesizing": {
    description: "Ability to evaluate information critically and form hypotheses or conditional arguments.",
    prompts: [
      "Ask 'Do you think [event/decision] was a good idea? Why or why not?'",
      "Pose a hypothetical: 'What do you think would happen if [X]? What might be the consequences?'",
      "Ask the student to evaluate the quality of a piece of writing or an argument.",
    ],
    descriptors: {
      0: "Cannot engage with evaluative or hypothetical questions; no response or repeats the question.",
      1: "Gives a simple agree/disagree response without justification.",
      2: "Provides a basic evaluation or hypothesis with a simple reason; limited conditional language.",
      3: "Evaluates or hypothesizes with adequate reasoning; uses conditional language (if… then…).",
      4: "Produces sophisticated evaluations or hypotheses; uses nuanced, hedged academic language.",
    },
  },
  "Mathematics Language": {
    description: "Ability to understand and use mathematical language, including procedural and conceptual vocabulary.",
    prompts: [
      "Read aloud a word problem and ask the student to identify the key mathematical operation required.",
      "Ask the student to explain their thinking while solving a maths problem: 'Tell me what you are doing as you work through this.'",
      "Ask the student to define: numerator, denominator, equivalent, estimate, perimeter.",
    ],
    descriptors: {
      0: "No evidence of mathematical language; cannot identify or use maths-specific terms.",
      1: "Recognises a few basic maths terms (e.g. 'add', 'take away'); struggles with formal vocabulary.",
      2: "Uses basic mathematical language correctly; struggles with procedural or conceptual explanations.",
      3: "Uses mathematical vocabulary accurately; can explain procedures though explanations may be brief.",
      4: "Uses precise mathematical language fluently; articulates both procedural and conceptual understanding.",
    },
  },
  "Science Language": {
    description: "Ability to understand and use scientific language including processes, concepts, and reporting vocabulary.",
    prompts: [
      "Ask the student to describe a science experiment they did: 'What was the aim? What did you observe? What did you conclude?'",
      "Ask the student to explain a scientific process (e.g. photosynthesis, the water cycle) in their own words.",
      "Ask the student to define or use: hypothesis, organism, variable, result, conclusion.",
    ],
    descriptors: {
      0: "No evidence of scientific language; cannot use or identify science-specific terms.",
      1: "Uses a few familiar science words (e.g. 'plant', 'water') but not scientific register.",
      2: "Uses some scientific vocabulary correctly; struggles with procedural science discourse.",
      3: "Uses scientific language appropriately including reporting and procedural genres; some gaps.",
      4: "Uses scientific register fluently and accurately across multiple science discourse types.",
    },
  },
  "Humanities Language": {
    description: "Ability to understand and use the language of Humanities — historical, geographical, and social studies discourse.",
    prompts: [
      "Ask the student to explain a historical event or geographic concept in their own words.",
      "Ask the student to describe cause-effect relationships in a historical event (e.g. 'Why did migration happen? What were the effects?').",
      "Ask the student to define or use: source, evidence, significant, impact, perspective, era.",
    ],
    descriptors: {
      0: "No evidence of humanities language; cannot use discipline-specific terms.",
      1: "Uses everyday language to describe historical or geographical concepts; no technical register.",
      2: "Uses some humanities vocabulary correctly; limited range of discourse structures.",
      3: "Uses humanities-specific language appropriately; can discuss events with some analytical language.",
      4: "Uses humanities discourse fluently including analytical, evaluative, and interpretive language.",
    },
  },
  "Academic Independence": {
    description: "Degree to which the student initiates, sustains, and self-monitors academic tasks without prompting.",
    prompts: [
      "Observe the student beginning a task — do they start independently or wait for guidance?",
      "Give the student a task and step back; observe how long they work independently before seeking help.",
      "Ask the student: 'When you don't understand something in class, what do you do?'",
    ],
    descriptors: {
      0: "Cannot begin or sustain any academic task without constant adult direction.",
      1: "Begins tasks only with direct prompting; stops immediately when unsure.",
      2: "Attempts tasks independently but frequently seeks reassurance; limited self-monitoring.",
      3: "Works independently for extended periods; self-corrects and seeks help appropriately.",
      4: "Highly self-directed; monitors own progress, applies strategies independently, and persists through difficulty.",
    },
  },
  "Response to Scaffolding": {
    description: "How effectively the student benefits from and builds on scaffolds, prompts, and support.",
    prompts: [
      "Provide a scaffold (sentence starter, word bank, or visual organiser) and observe whether the student uses it effectively.",
      "During a task, offer a hint or model; observe whether the student applies the support to continue.",
      "After providing support, gradually withdraw it and note whether the student maintains performance.",
    ],
    descriptors: {
      0: "Does not respond to scaffolding; support makes no difference to performance.",
      1: "Uses scaffolds passively (e.g. copies a sentence starter) without building on them.",
      2: "Uses scaffolds to complete immediate tasks but does not transfer learning beyond the scaffold.",
      3: "Uses scaffolds effectively; shows evidence of transfer when scaffold is gradually reduced.",
      4: "Responds rapidly to scaffolding and independently internalises the support; strong potential for growth.",
    },
  },
};

// Which prompt indices have a "Generate" button.
// Includes items generatable from uploaded work sample analysis (vocabulary, topics, genre).
const GENERATABLE_PROMPTS: Record<string, number[]> = {
  "Social Communication English":          [0],      // personalised conversation starter
  "Academic Listening":                    [0, 1],   // explanation passage + multi-step instruction
  "Academic Speaking":                     [0, 1],   // explanation topic + opinion question
  "Academic Reading":                      [0, 1],   // reading passage + comprehension/paraphrase
  "Academic Writing":                      [1],      // writing prompt from work sample topics
  "General Academic Vocabulary":           [0, 1],   // Tier 2 probe using work sample vocab + task instruction
  "Subject-Specific Vocabulary":           [0, 1],   // Tier 3 probe from work sample subject_vocabulary
  "Understanding of Classroom Directions": [0],      // multi-step instructions
  "Explanation and Elaboration":           [0],      // explanation topic from subject area
  "Sequencing and Organization":           [0],      // sequencing task from work sample topic
  "Comparison and Classification":         [0],      // comparison items from work sample subjects
  "Cause-and-Effect Reasoning":            [0],      // scenario from work sample subject
  "Inference and Prediction":              [0],      // short inference passage
  "Justification and Evidence":            [1],      // debatable question from work sample topic
  "Evaluation and Hypothesizing":          [1],      // hypothetical from work sample context
  "Mathematics Language":                  [0, 2],   // word problem + vocab probe from maths samples
  "Science Language":                      [1, 2],   // process explanation + vocab probe from science samples
  "Humanities Language":                   [0, 2],   // event explanation + vocab probe from humanities samples
  "Academic Independence":                 [0],      // independence task from work sample subject
  "Response to Scaffolding":               [0],      // scaffold from work sample genre/content
};

// Classroom observation notes — separate optional section (requires in-class access)
const DOMAIN_OBSERVATIONS: Record<string, string[]> = {
  "Social Communication English": [
    "Observe whether the student initiates peer interaction in English or waits to be spoken to.",
    "Note whether the student uses English with classmates or defaults to L1 during unstructured time.",
  ],
  "Academic Listening": [
    "Note whether the student follows verbal teacher instructions independently or waits to copy peers before starting tasks.",
    "Observe response to novel verbal instructions — does the student need them repeated or simplified?",
  ],
  "Academic Speaking": [
    "Note spontaneous academic contributions in class discussion — does the student volunteer explanations or only give minimal answers when called upon?",
    "Observe whether the student uses academic register or only social/informal language when contributing to class.",
  ],
  "Academic Reading": [
    "Note whether the student reads written task instructions independently before starting, or waits for teacher guidance.",
    "Observe reading behaviour during independent work — does the student re-read, look up words, or give up quickly?",
  ],
  "Academic Writing": [
    "In class, note whether the student drafts independently or requires frequent prompting and reassurance.",
    "Observe how the student responds to written feedback — does revision show understanding of the correction?",
  ],
  "General Academic Vocabulary": [
    "Note spontaneous use of Tier 2 vocabulary in classroom discussions — does the student use academic language naturally?",
    "Observe whether the student understands task instructions containing academic verbs without needing clarification.",
  ],
  "Subject-Specific Vocabulary": [
    "Observe accuracy of technical vocabulary in independent written subject-area work.",
    "Note whether the student uses subject-specific terms correctly in verbal responses during lessons.",
  ],
  "Understanding of Classroom Directions": [
    "Note whether the student reads written worksheet instructions independently, or copies peers.",
    "Observe how quickly the student begins tasks after verbal instructions — without needing teacher repetition.",
  ],
  "Explanation and Elaboration": [
    "Note the depth and clarity of explanations offered spontaneously during class discussions.",
    "Observe whether the student elaborates on initial responses or consistently gives minimal answers.",
  ],
  "Sequencing and Organization": [
    "Observe how the student organises multi-step tasks in class without adult direction.",
    "Note whether written work shows logical sequencing when produced independently.",
  ],
  "Comparison and Classification": [
    "Note use of comparative language (both, similarly, whereas, in contrast) in classroom speech.",
    "Observe written work for structured comparison — does the student use formal comparison frameworks independently?",
  ],
  "Cause-and-Effect Reasoning": [
    "Note use of causal connectives (because, therefore, as a result, due to) in spontaneous speech and independent writing.",
    "Observe whether the student makes causal connections in class discussions without explicit prompting.",
  ],
  "Inference and Prediction": [
    "Note whether the student responds to implied meaning or subtext in classroom reading and discussion.",
    "Observe comprehension behaviour during independent reading — does the student attempt to infer beyond the literal text?",
  ],
  "Justification and Evidence": [
    "Note use of evidence-based language in independently written work (e.g. for example, this shows, according to).",
    "Observe whether the student supports opinions with evidence during class discussions unprompted.",
  ],
  "Evaluation and Hypothesizing": [
    "Note whether the student volunteers evaluative or speculative comments during class discussion.",
    "Observe written work for evaluative language — does the student give opinions with justification independently?",
  ],
  "Mathematics Language": [
    "In maths class, note whether the student understands word problems independently or requires language support.",
    "Observe whether the student uses precise mathematical language when explaining to peers.",
  ],
  "Science Language": [
    "Note accuracy and register of scientific reporting language in independently written science work.",
    "Observe whether the student uses correct procedural and conceptual language during science activities.",
  ],
  "Humanities Language": [
    "Note use of analytical and evaluative language (significant, perspective, contributed to, impact) in humanities discussions.",
    "Observe written responses — does the student use discipline-specific discourse structures independently?",
  ],
  "Academic Independence": [
    "In class, observe whether the student begins tasks independently or waits for adult direction.",
    "Note persistence through challenging work — does the student apply strategies before seeking help?",
    "Observe self-monitoring — does the student check their work and self-correct errors?",
  ],
  "Response to Scaffolding": [
    "Note how quickly the student independently internalises scaffolds over repeated exposures in class.",
    "Observe whether scaffolded strategies transfer to new tasks or are used only for the immediate activity.",
  ],
};

const SUBJECTS = ["English / Language Arts","Mathematics","Science","Humanities / Social Studies","History","Geography","Literature","General / Homeroom","Other"];
const GRADE_LEVELS = ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8","Year 9","Year 10","Year 11","Year 12","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const LANGUAGES = ["Mandarin Chinese","Cantonese","Korean","Japanese","Thai","Vietnamese","Malay","Tamil","Hindi","Tagalog","Indonesian","Arabic","Spanish","French","German","English","Other"];
const PATHWAYS = [
  { value: "standalone", label: "Standalone RAEPA", desc: "Full 90–120 min independent assessment" },
  { value: "comprehensive", label: "Add-on (Comprehensive Assessment)", desc: "Supplement to a broader assessment package" },
];

const TABS = [
  { id: "setup",     label: "Setup",         icon: ClipboardList },
  { id: "samples",   label: "Work Samples",  icon: FileText },
  { id: "scoring",   label: "Domain Scoring",icon: BarChart3 },
  { id: "functions", label: "Language Functions", icon: Layers },
  { id: "report",    label: "Report",        icon: BookOpen },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem("raos_token")}` });

function api(path: string, options?: RequestInit) {
  return fetch(`${BASE_URL}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeader(), ...(options?.headers ?? {}) },
    ...options,
  });
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function avgScore(ratings: DomainRating[]): number {
  if (!ratings.length) return 0;
  return ratings.reduce((a, r) => a + r.score, 0) / ratings.length;
}

function profileCategory(avg: number): string {
  if (avg >= 3.5) return "Independent";
  if (avg >= 2.5) return "Functional";
  if (avg >= 1.5) return "Developing";
  if (avg >= 0.5) return "Emerging";
  return "Not Demonstrated";
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Session {
  id: string; case_id: string; status: string; pathway: string;
  language_background: Record<string, string>;
  modules_selected: string[];
  overall_summary?: string; confidence_level?: string; general_notes?: string;
}
interface WorkSample {
  id: string; case_id: string; file_name?: string; file_url?: string; file_type?: string;
  title?: string; subject?: string; task_type?: string; date_completed?: string;
  teacher?: string; grade_level?: string; independent_completion: boolean;
  support_provided?: string; student_selected: boolean;
  ai_analysis_status: string; ai_analysis?: any;
  assessor_approved: boolean; teacher_comments?: string;
  created_at: string;
}
interface DomainRating {
  id: string; session_id: string; domain: string; score: number;
  confidence?: string; evidence?: string; support_level_required?: string;
}
interface LangFunction {
  id: string; session_id: string; function_name: string; level: string;
  evidence?: string; subject_context?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function RaepaPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("setup");
  const [saving, setSaving] = useState(false);

  // Setup state
  const [pathway, setPathway] = useState("standalone");
  const [selectedModules, setSelectedModules] = useState<string[]>(["social_communication"]);
  const [langBg, setLangBg] = useState<Record<string, string>>({ l1: "", l2: "", years_in_english: "", schooling_language: "", bilingual_home: "" });
  const [generalNotes, setGeneralNotes] = useState("");

  // Domain scoring state
  const [ratings, setRatings] = useState<Record<string, { score: number; confidence: string; evidence: string }>>({});
  const [openGuides, setOpenGuides] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DOMAINS.map(d => [d, true]))
  );
  type GeneratedElicitation = { text: string; images?: { label: string; dataUrl: string }[] };
  const [generatedContent, setGeneratedContent] = useState<Record<string, GeneratedElicitation>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [activeStudentKey, setActiveStudentKey] = useState<string | null>(null);
  const [pushingStimulus, setPushingStimulus] = useState(false);
  const [studentShareOpen, setStudentShareOpen] = useState(false);
  const [studentLinkCopied, setStudentLinkCopied] = useState(false);
  const [openObs, setOpenObs] = useState<Record<string, boolean>>({});
  const [generatedReport, setGeneratedReport] = useState<string>("");
  const [generatingReport, setGeneratingReport] = useState(false);
  const [editableReport, setEditableReport] = useState<string>("");
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [translatingReport, setTranslatingReport] = useState(false);

  // Language functions state
  const [functions, setFunctions] = useState<Record<string, { level: string; evidence: string; subject_context: string }>>({});

  // Teacher share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [teacherTokenLoading, setTeacherTokenLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const qrDownloadRef = useRef<HTMLCanvasElement>(null);
  const studentQrDownloadRef = useRef<HTMLCanvasElement>(null);

  async function openShareModal() {
    setShareModalOpen(true);
    if (teacherToken) return;
    setTeacherTokenLoading(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/teacher-token`, { headers: authHeader() });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json() as { token: string };
      setTeacherToken(data.token);
    } catch {
      toast({ title: "Error", description: "Could not generate teacher link. Make sure you have saved setup first.", variant: "destructive" });
      setShareModalOpen(false);
    } finally {
      setTeacherTokenLoading(false);
    }
  }

  function downloadQrCard() {
    const qrCanvas = qrDownloadRef.current;
    if (!qrCanvas || !teacherToken) return;
    const name = (caseData as Record<string, unknown>)?.student_name as string ?? null;
    const W = 800, H = 960;
    const card = document.createElement("canvas");
    card.width = W; card.height = H;
    const ctx = card.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#6d28d9");
    grad.addColorStop(1, "#7c3aed");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 148);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ReMynd", W / 2, 68);
    ctx.font = "22px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText("Work Sample Upload Request", W / 2, 110);
    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(60, 136, W - 120, 3);
    const label = name ?? "Student";
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, 216);
    ctx.fillStyle = "#7c3aed";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText("ACADEMIC ENGLISH PERFORMANCE ASSESSMENT", W / 2, 252);
    const qrSize = 360, qrX = (W - qrSize) / 2, qrY = 286, pad = 24;
    ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 20);
    ctx.fill(); ctx.stroke();
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scan to submit a work sample", W / 2, qrY + qrSize + pad * 2 + 20);
    ctx.fillStyle = "#64748b";
    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillText("Point your camera at the QR code above.", W / 2, qrY + qrSize + pad * 2 + 56);
    ctx.fillText("The upload form will open directly in your browser.", W / 2, qrY + qrSize + pad * 2 + 84);
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 64, W, 64);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px system-ui, -apple-system, sans-serif";
    ctx.fillText("remyndassessments.com", W / 2, H - 22);
    card.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name ?? "student").replace(/\s+/g, "-")}-raepa-qr-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function downloadStudentQrCard() {
    const qrCanvas = studentQrDownloadRef.current;
    if (!qrCanvas) return;
    const name = (caseData as Record<string, unknown>)?.student_name as string ?? null;
    const W = 800, H = 920;
    const card = document.createElement("canvas");
    card.width = W; card.height = H;
    const ctx = card.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, "#0f766e");
    grad.addColorStop(1, "#0d9488");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 148);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ReMynd", W / 2, 68);
    ctx.font = "22px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText("Assessment Student View", W / 2, 110);
    ctx.fillStyle = "#5eead4";
    ctx.fillRect(60, 136, W - 120, 3);
    const label = name ?? "Student";
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, 216);
    ctx.fillStyle = "#0f766e";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText("ACADEMIC ENGLISH PERFORMANCE ASSESSMENT", W / 2, 252);
    const qrSize = 360, qrX = (W - qrSize) / 2, qrY = 280, pad = 24;
    ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 20);
    ctx.fill(); ctx.stroke();
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scan to open the student stimulus screen", W / 2, qrY + qrSize + pad * 2 + 20);
    ctx.fillStyle = "#64748b";
    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillText("Point your camera at the QR code above.", W / 2, qrY + qrSize + pad * 2 + 56);
    ctx.fillText("The student view will open in your browser.", W / 2, qrY + qrSize + pad * 2 + 84);
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - 64, W, 64);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "16px system-ui, -apple-system, sans-serif";
    ctx.fillText("remyndassessments.com", W / 2, H - 22);
    card.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(name ?? "student").replace(/\s+/g, "-")}-raepa-student-view-qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  function copyTeacherLink() {
    if (!teacherToken) return;
    const url = `${window.location.origin}${BASE_URL}/raepa-teacher/${teacherToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "", subject: "", grade_level: "", teacher: "",
    task_type: "", date_completed: "", independent_completion: true,
    support_provided: "", student_selected: false, teacher_comments: "",
  });

  function copyStudentLink() {
    const url = `${window.location.origin}${BASE_URL}/student-view/raepa/${caseId}`;
    navigator.clipboard.writeText(url).then(() => {
      setStudentLinkCopied(true);
      setTimeout(() => setStudentLinkCopied(false), 2000);
    });
  }

  async function pushToStudent(key: string, content: GeneratedElicitation) {
    setPushingStimulus(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/push-stimulus`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: content.text, images: content.images }),
      });
      if (!r.ok) throw new Error("Failed");
      setActiveStudentKey(key);
    } catch {
      toast({ title: "Could not push to student view", variant: "destructive" });
    } finally {
      setPushingStimulus(false);
    }
  }

  async function clearStudentStimulus() {
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/push-stimulus`, {
        method: "DELETE",
        headers: authHeader(),
      });
      setActiveStudentKey(null);
    } catch { /* silent */ }
  }

  async function generateElicitation(domain: string, promptIndex: number, promptText: string) {
    const key = `${domain}:${promptIndex}`;
    setGenerating(prev => ({ ...prev, [key]: true }));
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/generate-elicitation`, {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ domain, promptIndex, promptText }),
      });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json() as { content: string; images?: { label: string; dataUrl: string }[] };
      setGeneratedContent(prev => ({ ...prev, [key]: { text: data.content, images: data.images } }));
    } catch {
      toast({ title: "Generation failed", description: "Could not generate content. Try again.", variant: "destructive" });
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  }

  // ── Data queries ─────────────────────────────────────────────────────────────

  const { data: caseData } = useQuery({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}`);
      return r.ok ? r.json() : null;
    },
  });

  const { data: session, isLoading: sessionLoading } = useQuery<Session | null>({
    queryKey: ["raepa-session", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/session`);
      return r.ok ? r.json() : null;
    },
  });

  const { data: workSamples = [], isLoading: samplesLoading } = useQuery<WorkSample[]>({
    queryKey: ["raepa-samples", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/work-samples`);
      return r.ok ? r.json() : [];
    },
  });

  const { data: domainRatings = [], isLoading: ratingsLoading } = useQuery<DomainRating[]>({
    queryKey: ["raepa-ratings", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/domain-ratings`);
      return r.ok ? r.json() : [];
    },
  });

  const { data: langFunctions = [], isLoading: functionsLoading } = useQuery<LangFunction[]>({
    queryKey: ["raepa-functions", caseId],
    queryFn: async () => {
      const r = await api(`/cases/${caseId}/raepa/language-functions`);
      return r.ok ? r.json() : [];
    },
  });

  // ── Sync state from server ───────────────────────────────────────────────────

  useEffect(() => {
    if (session) {
      setPathway(session.pathway ?? "standalone");
      setSelectedModules(Array.isArray(session.modules_selected) ? session.modules_selected : ["social_communication"]);
      setLangBg(typeof session.language_background === "object" ? session.language_background : {});
      setGeneralNotes(session.general_notes ?? "");
    }
  }, [session]);

  useEffect(() => {
    const init: Record<string, { score: number; confidence: string; evidence: string }> = {};
    for (const r of domainRatings) {
      init[r.domain] = { score: r.score, confidence: r.confidence ?? "", evidence: r.evidence ?? "" };
    }
    setRatings(init);
  }, [domainRatings]);

  useEffect(() => {
    const init: Record<string, { level: string; evidence: string; subject_context: string }> = {};
    for (const f of langFunctions) {
      init[f.function_name] = { level: f.level, evidence: f.evidence ?? "", subject_context: f.subject_context ?? "" };
    }
    setFunctions(init);
  }, [langFunctions]);

  // ── Save session ─────────────────────────────────────────────────────────────

  const saveSession = useCallback(async () => {
    setSaving(true);
    try {
      const r = await api(`/cases/${caseId}/raepa/session`, {
        method: "POST",
        body: JSON.stringify({
          pathway, modules_selected: selectedModules,
          language_background: langBg, general_notes: generalNotes,
          status: session?.status ?? "setup",
        }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-session", caseId] });
      toast({ title: "Session saved" });
      setActiveTab("samples");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, pathway, selectedModules, langBg, generalNotes, session, qc, toast]);

  // ── Save domain ratings ───────────────────────────────────────────────────────

  const saveRatings = useCallback(async () => {
    setSaving(true);
    try {
      const ratingsList = DOMAINS.map(d => ({
        domain: d,
        score: ratings[d]?.score ?? 0,
        confidence: ratings[d]?.confidence ?? "",
        evidence: ratings[d]?.evidence ?? "",
      }));
      const r = await api(`/cases/${caseId}/raepa/domain-ratings`, {
        method: "POST",
        body: JSON.stringify({ ratings: ratingsList }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-ratings", caseId] });
      toast({ title: "Domain ratings saved" });
      setActiveTab("functions");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, ratings, qc, toast, setActiveTab]);

  // ── Save language functions ───────────────────────────────────────────────────

  const saveFunctions = useCallback(async () => {
    setSaving(true);
    try {
      const fnList = LANGUAGE_FUNCTIONS.map(fn => ({
        function_name: fn,
        level: functions[fn]?.level ?? "not_assessed",
        evidence: functions[fn]?.evidence ?? "",
        subject_context: functions[fn]?.subject_context ?? "",
      }));
      const r = await api(`/cases/${caseId}/raepa/language-functions`, {
        method: "POST",
        body: JSON.stringify({ functions: fnList }),
      });
      if (!r.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["raepa-functions", caseId] });
      toast({ title: "Language function profile saved" });
      setActiveTab("report");
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [caseId, functions, qc, toast, setActiveTab]);

  // ── Generate RAEPA narrative report ───────────────────────────────────────────

  const generateReport = useCallback(async () => {
    setGeneratingReport(true);
    try {
      const r = await api(`/cases/${caseId}/raepa/generate-report`, { method: "POST" });
      if (!r.ok) throw new Error("Generation failed");
      const data = await r.json();
      setGeneratedReport(data.report);
    } catch {
      toast({ title: "Report generation failed", variant: "destructive" });
    } finally {
      setGeneratingReport(false);
    }
  }, [caseId, toast]);

  // Sync editable copy whenever a fresh report is generated
  useEffect(() => {
    if (generatedReport) {
      setEditableReport(generatedReport);
      setIsEditingReport(false);
    }
  }, [generatedReport]);

  // Render inline markdown: **bold**, *italic*
  const renderInline = (text: string): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i} className="font-semibold text-slate-100">{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{part.slice(1, -1)}</em>;
      return part;
    });
  };

  const printReport = useCallback(async (lang: "en" | "zh" | "ko" = "en") => {
    const reportText = editableReport || generatedReport;
    if (!reportText) return;

    // Static UI label translations
    const labels = {
      en: {
        title: "Academic English Performance Assessment",
        subtitle: "ReMynd Narrative Assessment Report",
        name: "NAME:", dob: "DATE OF BIRTH:", grade: "GRADE:", school: "SCHOOL:", age: "AGE AT ASSESSMENT:",
        assessmentDate: "ASSESSMENT DATE:", reportDate: "REPORT DATE:", type: "ASSESSMENT TYPE:",
        l1: "FIRST LANGUAGE (L1):", yrs: "YEARS IN ENGLISH SCHOOLING:",
        confLabel: "Confidentiality:", confText: "This assessment report contains sensitive information intended solely for the named student, their parents/carers, and authorised school staff. Non-consensual redisclosure to unauthorised individuals is prohibited. This report should be stored securely and handled in accordance with applicable privacy legislation.",
        domainTitle: "DOMAIN PERFORMANCE OVERVIEW",
        footer: `Confidential — ReMynd Assessment Operating System · Academic English Performance Assessment · © ${new Date().getFullYear()} ReMynd`,
      },
      zh: {
        title: "学术英语能力评估",
        subtitle: "ReMynd 叙述性评估报告",
        name: "姓名：", dob: "出生日期：", grade: "年级：", school: "学校：", age: "测评时年龄：",
        assessmentDate: "测评日期：", reportDate: "报告日期：", type: "测评类型：",
        l1: "第一语言（L1）：", yrs: "英语学校教育年数：",
        confLabel: "保密声明：", confText: "本评估报告含有敏感信息，仅供被评估学生、其父母／监护人及经授权的学校工作人员使用。未经同意，不得向未授权人员披露本报告内容。本报告应妥善保管，并依据相关隐私法律法规进行处理。",
        domainTitle: "领域表现概览",
        footer: `保密文件 — ReMynd 测评操作系统 · 学术英语能力评估 · © ${new Date().getFullYear()} ReMynd`,
      },
      ko: {
        title: "학업 영어 능력 평가",
        subtitle: "ReMynd 서술형 평가 보고서",
        name: "이름:", dob: "생년월일:", grade: "학년:", school: "학교:", age: "평가 시 연령:",
        assessmentDate: "평가 날짜:", reportDate: "보고서 날짜:", type: "평가 유형:",
        l1: "제1언어 (L1):", yrs: "영어 교육 연수:",
        confLabel: "기밀 유지:", confText: "본 평가 보고서에는 해당 학생, 학부모/보호자 및 권한을 부여받은 학교 직원만을 위한 민감한 정보가 포함되어 있습니다. 무단 공개는 금지되어 있으며, 관련 개인정보 보호 법령에 따라 안전하게 보관·처리되어야 합니다.",
        domainTitle: "영역별 수행 개요",
        footer: `기밀 — ReMynd 평가 운영 시스템 · 학업 영어 능력 평가 · © ${new Date().getFullYear()} ReMynd`,
      },
    };
    const L = labels[lang];

    // Translate narrative if not English
    let narrativeText = reportText;
    if (lang !== "en") {
      setTranslatingReport(true);
      try {
        const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/translate-report`, {
          method: "POST",
          headers: { ...authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({ text: reportText, targetLang: lang }),
        });
        if (!r.ok) throw new Error("Translation failed");
        const d = await r.json();
        narrativeText = d.translatedText ?? reportText;
      } catch {
        toast({ title: "Translation failed", description: "Printing in English instead.", variant: "destructive" });
        narrativeText = reportText;
      } finally {
        setTranslatingReport(false);
      }
    }

    // Build demographics
    const cd = caseData as any;
    const studentName = cd?.student_name ?? "—";
    const school = cd?.school ?? "—";
    const grade = cd?.grade ?? "—";
    const dobRaw = cd?.dob ?? null;
    const dobFormatted = dobRaw
      ? new Date(dobRaw).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
      : "—";
    let ageAtAssessment = "—";
    if (dobRaw) {
      const d = new Date(dobRaw); const t = new Date();
      let a = t.getFullYear() - d.getFullYear();
      if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
      ageAtAssessment = `${a} years`;
    }
    const l1 = langBg.l1 || "—";
    const yrsEnglish = langBg.years_in_english || "—";
    const assessmentDate = session?.created_at
      ? new Date(session.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
      : "—";
    const reportDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const pathwayLabel = session?.pathway === "standalone" ? "Standalone Assessment" :
      session?.pathway === "school_referred" ? "School-Referred" :
      session?.pathway === "parent_referred" ? "Parent-Referred" :
      session?.pathway ?? "—";

    const scoreColor = (s: number) =>
      s >= 4 ? "#10b981" : s === 3 ? "#3b82f6" : s === 2 ? "#f59e0b" : s === 1 ? "#f97316" : "#b91c1c";

    const chartRows = domainRatings.map(r => {
      const pct = Math.round((r.score / 4) * 100);
      const color = scoreColor(r.score);
      return `<div class="bar-row">
        <span class="bar-label">${r.domain}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
        <span class="bar-score" style="color:${color}">${r.score}/4</span>
      </div>`;
    }).join("");

    const blocks = narrativeText.split("\n\n").filter(Boolean);
    let bodyHtml = "";
    for (const block of blocks) {
      const hm = block.match(/^\*\*(.+)\*\*$/);
      if (hm) {
        bodyHtml += `<div class="section-heading">${hm[1]}</div>`;
        continue;
      }
      const hasBullets = block.includes("\n- ") || block.startsWith("- ");
      if (hasBullets) {
        const lines = block.split("\n");
        const intros: string[] = [];
        const bullets: string[] = [];
        for (const line of lines) {
          if (line.startsWith("- ")) bullets.push(line.slice(2).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>"));
          else if (bullets.length === 0 && line.trim()) intros.push(line.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>"));
        }
        if (intros.length) bodyHtml += `<p>${intros.join(" ")}</p>`;
        if (bullets.length) bodyHtml += `<ul>${bullets.map(b => `<li>${b}</li>`).join("")}</ul>`;
        continue;
      }
      const safe = block.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
      bodyHtml += `<p>${safe}</p>`;
    }

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;

    const leftColHtml = [
      [L.name, studentName], [L.dob, dobFormatted], [L.grade, grade],
      [L.school, school], [L.age, ageAtAssessment],
    ].map(([lbl,v]) => `<div class="demo-row"><span class="demo-label">${lbl}</span><span class="demo-value">${v}</span></div>`).join("");
    const rightColHtml = [
      [L.assessmentDate, assessmentDate], [L.reportDate, reportDate], [L.type, pathwayLabel],
      [L.l1, l1], [L.yrs, yrsEnglish ? `${yrsEnglish}` : "—"],
    ].map(([lbl,v]) => `<div class="demo-row"><span class="demo-label">${lbl}</span><span class="demo-value">${v}</span></div>`).join("");

    win.document.write(`<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="utf-8">
<title>RAEPA Report — ${studentName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Georgia", "Times New Roman", serif; font-size: 11pt; color: #1e293b; background: #fff; padding: 32px 44px; max-width: 900px; margin: 0 auto; }
  .report-title { text-align: center; margin-bottom: 22px; }
  .report-title h1 { font-size: 18pt; font-weight: 700; color: #1e40af; margin-bottom: 4px; }
  .report-title p { font-size: 11pt; font-style: italic; color: #475569; }
  .demo-table { border: 1.5px solid #1e40af; border-radius: 4px; overflow: hidden; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; }
  .demo-col { padding: 12px 16px; }
  .demo-col:first-child { border-right: 1.5px solid #1e40af; }
  .demo-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: baseline; }
  .demo-label { font-size: 9pt; font-weight: 700; color: #1e40af; white-space: nowrap; min-width: 130px; }
  .demo-value { font-size: 10pt; font-weight: 600; color: #1e293b; }
  .confidentiality { font-size: 9.5pt; line-height: 1.6; color: #334155; margin-bottom: 20px; text-align: justify; }
  .confidentiality strong { color: #1e40af; }
  .chart-section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; break-inside: avoid; }
  .chart-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #1e40af; margin-bottom: 10px; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
  .bar-row { display: flex; align-items: center; gap: 8px; height: 22px; }
  .bar-label { width: 155px; font-size: 8.5pt; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .bar-track { flex: 1; height: 9px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; }
  .bar-score { width: 80px; font-size: 8pt; font-weight: 600; flex-shrink: 0; }
  .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .legend-item { display: flex; align-items: center; gap: 5px; font-size: 8pt; color: #64748b; }
  .legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .section-heading { font-size: 11pt; font-weight: 700; color: #1e40af; text-transform: uppercase; border-bottom: 2px solid #1e40af; padding-bottom: 3px; margin: 22px 0 8px; letter-spacing: 0.03em; }
  p { font-size: 10.5pt; line-height: 1.7; color: #1e293b; margin-bottom: 9px; text-align: justify; }
  ul { padding-left: 0; margin: 0 0 10px; list-style: none; }
  li { font-size: 10.5pt; line-height: 1.65; color: #1e293b; padding: 3px 0 3px 18px; position: relative; }
  li::before { content: "•"; position: absolute; left: 4px; color: #1e40af; font-weight: 700; }
  strong { font-weight: 700; }
  .footer { margin-top: 36px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 8pt; color: #94a3b8; text-align: center; font-style: italic; }
  @media print { body { padding: 18px 28px; } .demo-table,.chart-section { break-inside: avoid; } }
</style>
</head><body>
<div class="report-title">
  <h1>${L.title}</h1>
  <p>${L.subtitle}</p>
</div>
<div class="demo-table">
  <div class="demo-col">${leftColHtml}</div>
  <div class="demo-col">${rightColHtml}</div>
</div>
<p class="confidentiality"><strong>${L.confLabel}</strong> ${L.confText}</p>
<div class="chart-section">
  <div class="chart-title">${L.domainTitle}</div>
  <div class="chart-grid">${chartRows}</div>
  <div class="legend">
    ${[["#10b981","4"],["#3b82f6","3"],["#f59e0b","2"],["#f97316","1"],["#b91c1c","0"]].map(([c,s]) => `<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${s}</div>`).join("")}
  </div>
</div>
${bodyHtml}
<div class="footer">${L.footer}</div>
<script>window.onload=()=>{window.print();}<\/script>
</body></html>`);
    win.document.close();
  }, [editableReport, generatedReport, domainRatings, caseData, langBg, session, caseId, toast]);

  // ── Upload work sample ─────────────────────────────────────────────────────────

  const uploadSample = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", uploadForm.title || file.name);
      formData.append("subject", uploadForm.subject);
      formData.append("grade_level", uploadForm.grade_level);
      formData.append("teacher", uploadForm.teacher);
      formData.append("task_type", uploadForm.task_type);
      formData.append("date_completed", uploadForm.date_completed);
      formData.append("independent_completion", String(uploadForm.independent_completion));
      formData.append("support_provided", uploadForm.support_provided);
      formData.append("student_selected", String(uploadForm.student_selected));
      formData.append("teacher_comments", uploadForm.teacher_comments);
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/raepa/work-samples`, {
        method: "POST",
        credentials: "include",
        headers: authHeader(),
        body: formData,
      });
      if (!r.ok) throw new Error("Upload failed");
      qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] });
      setUploadForm({ title: "", subject: "", grade_level: "", teacher: "", task_type: "", date_completed: "", independent_completion: true, support_provided: "", student_selected: false, teacher_comments: "" });
      toast({ title: "Work sample uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [caseId, uploadForm, qc, toast]);

  // ── Delete work sample ────────────────────────────────────────────────────────

  const deleteSample = useCallback(async (sampleId: string) => {
    if (!confirm("Delete this work sample?")) return;
    const r = await api(`/cases/${caseId}/raepa/work-samples/${sampleId}`, { method: "DELETE" });
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] });
      toast({ title: "Work sample deleted" });
    }
  }, [caseId, qc, toast]);

  // ── AI analysis ───────────────────────────────────────────────────────────────

  const analyzeWithAI = useCallback(async (sampleId: string) => {
    const r = await api(`/cases/${caseId}/raepa/work-samples/${sampleId}/analyze`, { method: "POST" });
    if (r.ok) {
      toast({ title: "AI analysis started — refreshing shortly" });
      setTimeout(() => qc.invalidateQueries({ queryKey: ["raepa-samples", caseId] }), 4000);
    } else {
      toast({ title: "AI analysis failed", variant: "destructive" });
    }
  }, [caseId, qc, toast]);

  // ── Computed values ───────────────────────────────────────────────────────────

  const client = caseData?.client ?? caseData;
  const clientName = client ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() : "Client";
  const clientAge = client?.dateOfBirth ? calcAge(client.dateOfBirth) : null;

  const savedRatings = domainRatings.map(r => ({ ...r, score: ratings[r.domain]?.score ?? r.score }));
  const profileAvg = DOMAINS.length ? DOMAINS.reduce((sum, d) => sum + (ratings[d]?.score ?? 0), 0) / DOMAINS.length : 0;

  const progressCounts = {
    total: DOMAINS.length,
    rated: DOMAINS.filter(d => d in ratings && ratings[d].score > 0).length,
  };

  const fnProgressCounts = {
    total: LANGUAGE_FUNCTIONS.length,
    assessed: LANGUAGE_FUNCTIONS.filter(fn => functions[fn]?.level && functions[fn].level !== "not_assessed").length,
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Case
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                AE
              </div>
              <div>
                <h1 className="text-lg font-semibold">RAEPA — Academic English Performance Assessment</h1>
                <p className="text-sm text-slate-400">
                  {clientName}{clientAge ? `, ${clientAge} years old` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {session?.status && (
              <Badge className={`capitalize ${session.status === "report" ? "bg-emerald-900 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                {session.status}
              </Badge>
            )}
            <Badge className="bg-indigo-900 text-indigo-300 font-mono text-xs">
              {pathway === "comprehensive" ? "Add-on" : "Standalone"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setStudentShareOpen(true)} className="border-teal-700 text-teal-400 hover:bg-teal-900/30 gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              Student view
            </Button>
            {activeStudentKey && (
              <Button size="sm" variant="ghost" onClick={clearStudentStimulus} className="text-slate-500 hover:text-red-400 gap-1">
                <X className="w-3 h-3" /> Clear stimulus
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 pb-0">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === "scoring" && progressCounts.rated > 0 && (
                    <span className="ml-1 text-xs bg-indigo-900 text-indigo-300 rounded px-1.5 py-0.5">
                      {progressCounts.rated}/{progressCounts.total}
                    </span>
                  )}
                  {tab.id === "functions" && fnProgressCounts.assessed > 0 && (
                    <span className="ml-1 text-xs bg-purple-900 text-purple-300 rounded px-1.5 py-0.5">
                      {fnProgressCounts.assessed}/{fnProgressCounts.total}
                    </span>
                  )}
                  {tab.id === "samples" && workSamples.length > 0 && (
                    <span className="ml-1 text-xs bg-slate-700 text-slate-300 rounded px-1.5 py-0.5">
                      {workSamples.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* ── SETUP TAB ─────────────────────────────────────────────── */}
        {activeTab === "setup" && (
          <div className="space-y-6">
            {/* Pathway */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Assessment Pathway</h2>
              <div className="grid grid-cols-2 gap-3">
                {PATHWAYS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPathway(p.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${
                      pathway === p.value
                        ? "border-indigo-500 bg-indigo-950"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{p.label}</div>
                    <div className="text-xs text-slate-400">{p.desc}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* Language Background */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Language Background</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">First Language (L1)</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.l1 ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, l1: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Second Language (L2)</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.l2 ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, l2: e.target.value }))}
                  >
                    <option value="">— Select or N/A —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Years of English-medium schooling</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. 3 years"
                    value={langBg.years_in_english ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, years_in_english: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Primary language of schooling</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={langBg.schooling_language ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, schooling_language: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Bilingual / multilingual home environment</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Describe language use at home"
                    value={langBg.bilingual_home ?? ""}
                    onChange={e => setLangBg(prev => ({ ...prev, bilingual_home: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            {/* Module Selection */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-1">Module Selection</h2>
              <p className="text-xs text-slate-400 mb-4">Module 1 is always administered. Select additional modules based on referral reason and time available.</p>
              <div className="space-y-2">
                {MODULES.map(mod => {
                  const selected = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selected
                          ? "border-indigo-600 bg-indigo-950"
                          : mod.required
                          ? "border-slate-600 bg-slate-800 cursor-not-allowed opacity-70"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => {
                        if (mod.required) return;
                        setSelectedModules(prev =>
                          prev.includes(mod.id) ? prev.filter(m => m !== mod.id) : [...prev, mod.id]
                        );
                      }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selected ? "bg-indigo-500 border-indigo-500" : "border-slate-500"
                      }`}>
                        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{mod.name}</span>
                          {mod.required && <Badge className="bg-indigo-900 text-indigo-300 text-xs">Required</Badge>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Domains: {mod.domains.join(" · ")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* General Notes */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-3">Session Notes</h2>
              <Textarea
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 min-h-[100px]"
                placeholder="General assessment notes, referral reason, relevant background…"
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
              />
            </section>

            <div className="flex justify-end">
              <Button onClick={saveSession} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Setup
              </Button>
            </div>
          </div>
        )}

        {/* ── WORK SAMPLES TAB ──────────────────────────────────────── */}
        {activeTab === "samples" && (
          <div className="space-y-6">

            {/* Teacher share banner */}
            <section className="bg-indigo-950/40 border border-indigo-700/40 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-200">Collect samples from subject teachers</p>
                <p className="text-xs text-indigo-400 mt-0.5">Share a link or QR code — teachers can upload directly, no login required.</p>
              </div>
              <Button onClick={openShareModal} className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Share2 size={15} /> Share with Teachers
              </Button>
            </section>

            {/* Upload area */}
            <section className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-4">Upload Work Sample</h2>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title / Description</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. Science lab report"
                    value={uploadForm.title}
                    onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Subject</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.subject}
                    onChange={e => setUploadForm(p => ({ ...p, subject: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Grade Level</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.grade_level}
                    onChange={e => setUploadForm(p => ({ ...p, grade_level: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Teacher</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Teacher name"
                    value={uploadForm.teacher}
                    onChange={e => setUploadForm(p => ({ ...p, teacher: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Task Type</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="e.g. written explanation"
                    value={uploadForm.task_type}
                    onChange={e => setUploadForm(p => ({ ...p, task_type: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date Completed</label>
                  <input
                    type="date"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    value={uploadForm.date_completed}
                    onChange={e => setUploadForm(p => ({ ...p, date_completed: e.target.value }))}
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-slate-400 mb-1">Teacher Comments / Marking Notes</label>
                  <input
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                    placeholder="Optional — any teacher marking or notes on this work"
                    value={uploadForm.teacher_comments}
                    onChange={e => setUploadForm(p => ({ ...p, teacher_comments: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-4 col-span-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600"
                      checked={uploadForm.independent_completion}
                      onChange={e => setUploadForm(p => ({ ...p, independent_completion: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-300">Completed independently</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-600"
                      checked={uploadForm.student_selected}
                      onChange={e => setUploadForm(p => ({ ...p, student_selected: e.target.checked }))}
                    />
                    <span className="text-sm text-slate-300">Student self-selected</span>
                  </label>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                onChange={e => { if (e.target.files?.[0]) uploadSample(e.target.files[0]); }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading…" : "Choose File & Upload"}
              </Button>
              <p className="text-xs text-slate-500 mt-2">Accepts PDF, JPEG, PNG, DOCX — max 30 MB</p>
            </section>

            {/* Work samples list */}
            {samplesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
            ) : workSamples.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No work samples uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {workSamples.map(sample => (
                  <div key={sample.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{sample.title || sample.file_name || "Untitled"}</span>
                          {sample.subject && <Badge className="bg-slate-700 text-slate-300 text-xs">{sample.subject}</Badge>}
                          {sample.grade_level && <Badge className="bg-slate-700 text-slate-300 text-xs">{sample.grade_level}</Badge>}
                          {sample.student_selected && <Badge className="bg-blue-900 text-blue-300 text-xs">Student-selected</Badge>}
                          {sample.assessor_approved && <Badge className="bg-emerald-900 text-emerald-300 text-xs">Approved</Badge>}
                        </div>
                        <div className="text-xs text-slate-400 space-x-3">
                          {sample.teacher && <span>Teacher: {sample.teacher}</span>}
                          {sample.date_completed && <span>Date: {sample.date_completed.split("T")[0]}</span>}
                          {sample.task_type && <span>Type: {sample.task_type}</span>}
                          <span>{sample.independent_completion ? "✓ Independent" : "⚠ Supported"}</span>
                        </div>

                        {/* AI Analysis */}
                        {sample.ai_analysis_status === "complete" && sample.ai_analysis && (
                          <div className="mt-3 bg-slate-800 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 font-medium text-indigo-400 mb-2">
                              <Sparkles className="w-3.5 h-3.5" /> AI Analysis
                            </div>
                            {sample.ai_analysis.task_type && (
                              <div><span className="text-slate-400">Task type:</span> {sample.ai_analysis.task_type}</div>
                            )}
                            {sample.ai_analysis.reading_demand && (
                              <div><span className="text-slate-400">Reading demand:</span> {sample.ai_analysis.reading_demand} &nbsp;|&nbsp; <span className="text-slate-400">Writing demand:</span> {sample.ai_analysis.writing_demand}</div>
                            )}
                            {sample.ai_analysis.academic_vocabulary?.length > 0 && (
                              <div><span className="text-slate-400">Academic vocab:</span> {sample.ai_analysis.academic_vocabulary.slice(0,8).join(", ")}</div>
                            )}
                            {sample.ai_analysis.command_words?.length > 0 && (
                              <div><span className="text-slate-400">Command words:</span> {sample.ai_analysis.command_words.join(", ")}</div>
                            )}
                            {sample.ai_analysis.language_functions_required?.length > 0 && (
                              <div><span className="text-slate-400">Language functions:</span> {sample.ai_analysis.language_functions_required.join(", ")}</div>
                            )}
                            {sample.ai_analysis.potential_barriers?.length > 0 && (
                              <div className="text-orange-400">
                                <span className="text-slate-400">Potential barriers:</span> {sample.ai_analysis.potential_barriers.join(" · ")}
                              </div>
                            )}
                          </div>
                        )}
                        {sample.ai_analysis_status === "processing" && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Analysing…
                          </div>
                        )}
                        {sample.ai_analysis_status === "error" && (
                          <div className="mt-2 text-xs text-red-400">AI analysis failed — try again</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {sample.file_url && (
                          <a href={sample.file_url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                        {sample.ai_analysis_status !== "processing" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-indigo-400 hover:text-indigo-200"
                            onClick={() => analyzeWithAI(sample.id)}
                          >
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="text-red-400 hover:text-red-200"
                          onClick={() => deleteSample(sample.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Next step guidance ───────────────────────────────── */}
            {workSamples.length > 0 && (
              <section className="bg-slate-900 border border-slate-700 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100 mb-1">Ready to score? Proceed to Domain Scoring</p>
                    <p className="text-xs text-slate-400 mb-3">
                      Review the work samples above — use teacher comments and AI analysis to inform your ratings. Then move to <span className="text-slate-300 font-medium">Domain Scoring</span> to rate the student across all 8 academic English domains.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setActiveTab("scoring")}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-sm"
                      >
                        Domain Scoring <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("functions")}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800 gap-2 text-sm"
                      >
                        Language Functions <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ── DOMAIN SCORING TAB ────────────────────────────────────── */}
        {activeTab === "scoring" && (
          <div className="space-y-4">
            {/* Profile overview */}
            {progressCounts.rated > 0 && (
              <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-indigo-300">Overall Academic English Profile</div>
                  <div className="text-lg font-bold text-white">{profileCategory(profileAvg)} <span className="text-sm font-normal text-indigo-400">({profileAvg.toFixed(1)}/4.0)</span></div>
                </div>
                <div className="text-xs text-indigo-400">{progressCounts.rated}/{progressCounts.total} domains rated</div>
              </div>
            )}

            <p className="text-xs text-slate-400 mb-2">
              Rate each domain using the 5-point academic English performance scale: <span className="font-medium">0</span> Not Demonstrated · <span className="font-medium">1</span> Emerging · <span className="font-medium">2</span> Developing · <span className="font-medium">3</span> Functional · <span className="font-medium">4</span> Independent
            </p>

            <div className="space-y-3">
              {DOMAINS.map((domain, idx) => {
                const current = ratings[domain] ?? { score: 0, confidence: "", evidence: "" };
                const scoreInfo = SCORE_LABELS[current.score];
                return (
                  <div key={domain} className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Domain header with guide toggle */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{domain}</div>
                          {DOMAIN_GUIDES[domain] && (
                            <button
                              onClick={() => setOpenGuides(prev => ({ ...prev, [domain]: !prev[domain] }))}
                              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                openGuides[domain]
                                  ? "bg-indigo-900/50 border-indigo-600/40 text-indigo-300"
                                  : "border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500"
                              }`}
                            >
                              <BookOpen size={11} />
                              Scoring Guide
                              <ChevronDown size={11} className={`transition-transform ${openGuides[domain] ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>

                        {/* Expandable guide */}
                        {openGuides[domain] && DOMAIN_GUIDES[domain] && (() => {
                          const guide = DOMAIN_GUIDES[domain];
                          return (
                            <div className="mb-4 bg-slate-800/60 border border-indigo-800/30 rounded-xl p-4 space-y-4">
                              <p className="text-xs text-slate-300">{guide.description}</p>

                              {/* Observation prompts */}
                              <div>
                                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">What to observe / elicit</p>
                                <ul className="space-y-1.5">
                                  {guide.prompts.map((p, i) => {
                                    const genKey = `${domain}:${i}`;
                                    const canGenerate = (GENERATABLE_PROMPTS[domain] ?? []).includes(i);
                                    const isGenerating = generating[genKey];
                                    const generated = generatedContent[genKey];
                                    return (
                                      <li key={i} className="space-y-2">
                                        <div className="flex items-start gap-2 text-xs text-slate-300">
                                          <span className="text-indigo-500 font-bold shrink-0 mt-0.5">›</span>
                                          <span className="flex-1">{p}</span>
                                          {canGenerate && (
                                            <button
                                              onClick={() => generateElicitation(domain, i, p)}
                                              disabled={isGenerating}
                                              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border border-violet-600/50 bg-violet-900/30 text-violet-300 hover:bg-violet-800/40 transition-colors shrink-0 disabled:opacity-50"
                                            >
                                              {isGenerating
                                                ? <><Loader2 size={10} className="animate-spin" /> Generating…</>
                                                : <><Sparkles size={10} /> Generate</>
                                              }
                                            </button>
                                          )}
                                        </div>
                                        {generated && (
                                          <div className="ml-4 bg-slate-900 border border-violet-700/40 rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="text-xs font-semibold text-violet-400 flex items-center gap-1">
                                                <Sparkles size={10} /> Generated content
                                                {activeStudentKey === genKey && (
                                                  <span className="ml-1 text-[9px] bg-teal-900 text-teal-300 rounded px-1.5 py-0.5 font-medium">Showing to student</span>
                                                )}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => activeStudentKey === genKey ? clearStudentStimulus() : pushToStudent(genKey, generated!)}
                                                  disabled={pushingStimulus}
                                                  className={`text-xs flex items-center gap-1 transition-colors ${
                                                    activeStudentKey === genKey
                                                      ? "text-teal-400 hover:text-red-400"
                                                      : "text-slate-500 hover:text-teal-400"
                                                  }`}
                                                >
                                                  <Eye size={10} />
                                                  {activeStudentKey === genKey ? "Hide" : "Show to student"}
                                                </button>
                                                <button
                                                  onClick={() => generateElicitation(domain, i, p)}
                                                  disabled={isGenerating}
                                                  className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                                                >
                                                  <RefreshCw size={10} className={isGenerating ? "animate-spin" : ""} />
                                                  Regenerate
                                                </button>
                                              </div>
                                            </div>
                                            {generated.images && generated.images.length > 0 && (
                                              <div className="flex flex-wrap gap-3 mb-3">
                                                {generated.images.map(img => (
                                                  <div key={img.label} className="flex flex-col items-center gap-1">
                                                    <img
                                                      src={img.dataUrl}
                                                      alt={img.label}
                                                      className="rounded border border-slate-700 max-h-40 object-contain bg-white"
                                                    />
                                                    <span className="text-[10px] text-slate-400">{img.label}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">{generated.text}</p>
                                          </div>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>

                              {/* Score descriptors */}
                              <div>
                                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">Score level descriptors</p>
                                <div className="space-y-1.5">
                                  {[0, 1, 2, 3, 4].map(s => {
                                    const info = SCORE_LABELS[s];
                                    const isActive = current.score === s;
                                    return (
                                      <div key={s} className={`flex gap-2.5 rounded-lg px-3 py-2 text-xs border transition-colors cursor-pointer ${
                                        isActive
                                          ? `${info.bg} ${info.color} border-current/40`
                                          : "border-slate-700/50 text-slate-400 hover:border-slate-600"
                                      }`}
                                        onClick={() => setRatings(prev => ({
                                          ...prev,
                                          [domain]: { ...prev[domain] ?? { confidence: "", evidence: "" }, score: s },
                                        }))}
                                      >
                                        <span className="font-bold shrink-0 w-4">{s}</span>
                                        <span className="font-semibold shrink-0">{info.label} —</span>
                                        <span>{guide.descriptors[s]}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Classroom observation notes — optional collapsible */}
                              {(DOMAIN_OBSERVATIONS[domain] ?? []).length > 0 && (
                                <div className="border-t border-slate-700/50 pt-3">
                                  <button
                                    onClick={() => setOpenObs(prev => ({ ...prev, [domain]: !prev[domain] }))}
                                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-400 transition-colors"
                                  >
                                    <Eye size={11} />
                                    <span>Classroom observation notes</span>
                                    <span className="text-slate-600 ml-0.5">(optional — requires in-class access)</span>
                                    <ChevronDown size={11} className={`ml-auto transition-transform ${openObs[domain] ? "rotate-180" : ""}`} />
                                  </button>
                                  {openObs[domain] && (
                                    <ul className="mt-2 pl-3 space-y-1.5 border-l border-slate-700">
                                      {(DOMAIN_OBSERVATIONS[domain] ?? []).map((obs, oi) => (
                                        <li key={oi} className="text-xs text-slate-500 italic leading-relaxed">{obs}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Score buttons */}
                        <div className="flex gap-2 flex-wrap mb-3">
                          {[0, 1, 2, 3, 4].map(s => {
                            const info = SCORE_LABELS[s];
                            const active = current.score === s;
                            return (
                              <button
                                key={s}
                                onClick={() => setRatings(prev => ({
                                  ...prev,
                                  [domain]: { ...prev[domain] ?? { confidence: "", evidence: "" }, score: s },
                                }))}
                                className={`flex flex-col items-center px-3 py-2 rounded-lg border-2 text-xs transition-all ${
                                  active
                                    ? `${info.bg} ${info.color} border-current font-semibold`
                                    : "border-slate-700 text-slate-500 hover:border-slate-500"
                                }`}
                              >
                                <span className="text-base font-bold">{s}</span>
                                <span className="text-xs leading-tight">{info.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Evidence & confidence */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Evidence / Observation</label>
                            <input
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                              placeholder="Brief evidence note…"
                              value={current.evidence}
                              onChange={e => setRatings(prev => ({
                                ...prev,
                                [domain]: { ...prev[domain] ?? { score: 0, confidence: "" }, evidence: e.target.value },
                              }))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Confidence</label>
                            <select
                              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none"
                              value={current.confidence}
                              onChange={e => setRatings(prev => ({
                                ...prev,
                                [domain]: { ...prev[domain] ?? { score: 0, evidence: "" }, confidence: e.target.value },
                              }))}
                            >
                              <option value="">— Select —</option>
                              <option value="high">High — clear and consistent evidence</option>
                              <option value="moderate">Moderate — adequate evidence</option>
                              <option value="preliminary">Preliminary — limited evidence</option>
                              <option value="insufficient">Insufficient — not enough evidence</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveRatings} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Domain Ratings
              </Button>
            </div>
          </div>
        )}

        {/* ── LANGUAGE FUNCTIONS TAB ──────────────────────────────────── */}
        {activeTab === "functions" && (
          <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h2 className="text-base font-semibold mb-1">Language Function Profile</h2>
              <p className="text-xs text-slate-400 mb-3">
                Rate each of the 15 academic language functions based on evidence observed during the assessment session and from work sample analysis.
              </p>
              {/* Rating level reference */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-5 pb-4 border-b border-slate-800">
                {Object.entries(FUNCTION_LEVELS).filter(([k]) => k !== "not_assessed").map(([, info]) => (
                  <span key={info.label} className={`${info.color} font-medium`}>{info.label}</span>
                ))}
                <span className="text-slate-600 ml-auto">Not Assessed = not elicited in session</span>
              </div>
              <div className="space-y-4">
                {LANGUAGE_FUNCTIONS.map((fn, idx) => {
                  const current = functions[fn] ?? { level: "not_assessed", evidence: "", subject_context: "" };
                  const levelInfo = FUNCTION_LEVELS[current.level] ?? FUNCTION_LEVELS.not_assessed;
                  const guide = FUNCTION_GUIDES[fn];
                  return (
                    <div key={fn} className="border border-slate-800 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-2">
                        <span className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center text-purple-300 text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm capitalize">{fn}</span>
                            <span className={`ml-auto text-xs font-medium shrink-0 ${levelInfo.color}`}>{levelInfo.label}</span>
                          </div>
                          {guide && (
                            <p className="text-xs text-slate-500 mt-0.5">{guide.desc}</p>
                          )}
                          {guide && (
                            <p className="text-xs text-slate-600 mt-0.5 italic">Elicit: "{guide.cue}"</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Level</label>
                          <select
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            value={current.level}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { evidence: "", subject_context: "" }, level: e.target.value },
                            }))}
                          >
                            {Object.entries(FUNCTION_LEVELS).map(([val, info]) => (
                              <option key={val} value={val}>{info.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Subject Context</label>
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            placeholder="Subject area…"
                            value={current.subject_context}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { level: "not_assessed", evidence: "" }, subject_context: e.target.value },
                            }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Evidence</label>
                          <input
                            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:border-purple-500 outline-none"
                            placeholder="Evidence note…"
                            value={current.evidence}
                            onChange={e => setFunctions(prev => ({
                              ...prev,
                              [fn]: { ...prev[fn] ?? { level: "not_assessed", subject_context: "" }, evidence: e.target.value },
                            }))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={saveFunctions} disabled={saving} className="bg-purple-700 hover:bg-purple-600">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Language Function Profile
              </Button>
            </div>
          </div>
        )}

        {/* ── REPORT TAB ────────────────────────────────────────────── */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Readiness check */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h2 className="text-base font-semibold mb-4">Assessment Readiness</h2>
              <div className="space-y-3">
                {[
                  { label: "Session setup complete", done: !!session, tip: "Complete the Setup tab" },
                  { label: "Work samples uploaded", done: workSamples.length > 0, tip: "Upload at least one work sample" },
                  { label: "Domain ratings complete", done: progressCounts.rated === progressCounts.total, tip: `${progressCounts.rated}/${progressCounts.total} domains rated` },
                  { label: "Language function profile", done: fnProgressCounts.assessed > 0, tip: `${fnProgressCounts.assessed}/${fnProgressCounts.total} functions assessed` },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    {item.done
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    }
                    <div>
                      <div className={`text-sm ${item.done ? "text-emerald-300" : "text-slate-300"}`}>{item.label}</div>
                      {!item.done && <div className="text-xs text-slate-500">{item.tip}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain score summary */}
            {progressCounts.rated > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-base font-semibold mb-4">Domain Score Summary</h2>
                <div className="grid grid-cols-2 gap-2">
                  {DOMAINS.map(domain => {
                    const score = ratings[domain]?.score ?? 0;
                    const info = SCORE_LABELS[score];
                    const pct = (score / 4) * 100;
                    return (
                      <div key={domain} className="flex items-center gap-2">
                        <div className="text-xs text-slate-400 w-44 truncate">{domain}</div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              score >= 4 ? "bg-emerald-500" :
                              score >= 3 ? "bg-blue-500" :
                              score >= 2 ? "bg-amber-500" :
                              score >= 1 ? "bg-orange-500" : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className={`text-xs font-bold w-4 ${info.color}`}>{score}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Language function summary */}
            {fnProgressCounts.assessed > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-base font-semibold mb-4">Language Function Profile Summary</h2>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_FUNCTIONS.map(fn => {
                    const level = functions[fn]?.level ?? "not_assessed";
                    const info = FUNCTION_LEVELS[level];
                    return (
                      <div key={fn} className="flex items-center gap-1.5 bg-slate-800 rounded-full px-3 py-1">
                        <span className="text-xs text-slate-300 capitalize">{fn}</span>
                        <span className={`text-xs font-medium ${info.color}`}>— {info.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Narrative Report */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              {generatedReport ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" /> RAEPA Narrative Report
                    </h2>
                    <div className="flex gap-2 flex-wrap">
                      {/* Edit toggle */}
                      <Button
                        variant={isEditingReport ? "default" : "outline"}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          if (isEditingReport) {
                            setIsEditingReport(false);
                          } else {
                            setEditableReport(editableReport || generatedReport);
                            setIsEditingReport(true);
                          }
                        }}
                      >
                        <Pencil className="w-3 h-3 mr-1.5" />
                        {isEditingReport ? "Done Editing" : "Edit"}
                      </Button>
                      {/* Print in each language */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => printReport("en")}
                        disabled={translatingReport}
                      >
                        <Printer className="w-3 h-3 mr-1.5" /> EN
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => printReport("zh")}
                        disabled={translatingReport}
                      >
                        {translatingReport ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Languages className="w-3 h-3 mr-1.5" />}
                        中文
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => printReport("ko")}
                        disabled={translatingReport}
                      >
                        {translatingReport ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <Languages className="w-3 h-3 mr-1.5" />}
                        한국어
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => { navigator.clipboard.writeText(editableReport || generatedReport); toast({ title: "Copied to clipboard" }); }}
                      >
                        <Copy className="w-3 h-3 mr-1.5" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={generateReport}
                        disabled={generatingReport}
                      >
                        <RefreshCw className={`w-3 h-3 mr-1.5 ${generatingReport ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>
                    </div>
                  </div>

                  {/* Professional demographic header — matching reference report style */}
                  {(() => {
                    const cd = caseData as any;
                    const studentName = cd?.student_name ?? "—";
                    const dob = cd?.dob ?? null;
                    const school = cd?.school ?? "—";
                    const grade = cd?.grade ?? "—";
                    let age = "—";
                    if (dob) {
                      const d = new Date(dob); const t = new Date();
                      let a = t.getFullYear() - d.getFullYear();
                      if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--;
                      const m = t.getMonth() - d.getMonth() < 0 ? 12 + t.getMonth() - d.getMonth() : t.getMonth() - d.getMonth();
                      age = `${a} years, ${m} months`;
                    }
                    const l1 = langBg.l1 || "—";
                    const yrs = langBg.years_in_english ? `${langBg.years_in_english} year(s)` : "—";
                    const assessmentDate = session?.created_at
                      ? new Date(session.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
                      : "—";
                    const reportDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
                    const pathway = session?.pathway === "standalone" ? "Standalone" :
                      session?.pathway === "school_referred" ? "School-Referred" :
                      session?.pathway === "parent_referred" ? "Parent-Referred" :
                      session?.pathway ?? "—";
                    const leftFields: [string, string][] = [
                      ["NAME:", studentName],
                      ["DATE OF BIRTH:", dob ? new Date(dob).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                      ["GRADE:", grade],
                      ["SCHOOL:", school],
                      ["AGE AT ASSESSMENT:", age],
                    ];
                    const rightFields: [string, string][] = [
                      ["ASSESSMENT DATE:", assessmentDate],
                      ["REPORT DATE:", reportDate],
                      ["PATHWAY:", pathway],
                      ["FIRST LANGUAGE (L1):", l1],
                      ["YEARS IN ENGLISH SCHOOLING:", yrs],
                    ];
                    return (
                      <div className="mb-6">
                        {/* Title block */}
                        <div className="text-center mb-4">
                          <h1 className="text-xl font-bold text-indigo-300 leading-tight">Academic English Performance Assessment</h1>
                          <p className="text-sm text-slate-400 italic mt-1">ReMynd Narrative Assessment Report</p>
                        </div>
                        {/* Demographics table */}
                        <div className="border border-slate-600 rounded-lg overflow-hidden">
                          <div className="grid grid-cols-2 divide-x divide-slate-600">
                            <div className="p-4 space-y-1.5">
                              {leftFields.map(([label, value]) => (
                                <div key={label} className="flex gap-2">
                                  <span className="text-xs font-bold text-indigo-400 w-40 shrink-0">{label}</span>
                                  <span className="text-sm text-slate-200">{value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="p-4 space-y-1.5">
                              {rightFields.map(([label, value]) => (
                                <div key={label} className="flex gap-2">
                                  <span className="text-xs font-bold text-indigo-400 w-44 shrink-0">{label}</span>
                                  <span className="text-sm text-slate-200">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Confidentiality notice */}
                        <div className="mt-3 px-1">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="font-bold text-indigo-400">Confidentiality: </span>
                            This assessment report contains sensitive information intended solely for the named student, their parents/carers, and authorised school staff. Non-consensual disclosure to unauthorised individuals is prohibited. This report should be stored securely and handled in accordance with applicable privacy legislation.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Domain Performance Chart — embedded as part of the report */}
                  {domainRatings.length > 0 && (
                    <div className="mb-6 rounded-xl bg-slate-900 border border-slate-700 p-4">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Domain Performance Overview</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {domainRatings.map((r) => {
                          const pct = (r.score / 4) * 100;
                          const barColor =
                            r.score >= 4 ? "bg-emerald-500" :
                            r.score === 3 ? "bg-blue-500" :
                            r.score === 2 ? "bg-amber-500" :
                            r.score === 1 ? "bg-orange-500" :
                            "bg-red-700";
                          return (
                            <div key={r.domain} className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-slate-400 w-36 shrink-0 truncate">{r.domain}</span>
                              <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden min-w-0">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-300 w-4 shrink-0 text-right">{r.score}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800">
                        {[
                          { c: "bg-emerald-500", l: "Independent (4)" },
                          { c: "bg-blue-500", l: "Functional (3)" },
                          { c: "bg-amber-500", l: "Developing (2)" },
                          { c: "bg-orange-500", l: "Emerging (1)" },
                          { c: "bg-red-700", l: "Not Demonstrated (0)" },
                        ].map(({ c, l }) => (
                          <div key={l} className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${c}`} />
                            <span className="text-xs text-slate-500">{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit mode textarea vs. rendered blocks */}
                  {isEditingReport ? (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                        <Pencil className="w-3 h-3" /> Editing — use <code className="bg-slate-700 px-1 rounded text-indigo-300">**Heading**</code> for sections, <code className="bg-slate-700 px-1 rounded text-indigo-300">- bullet</code> for lists. Click <strong className="text-slate-300">Done Editing</strong> when finished.
                      </p>
                      <Textarea
                        value={editableReport}
                        onChange={e => setEditableReport(e.target.value)}
                        className="w-full font-mono text-xs bg-slate-900 border-slate-600 text-slate-200 min-h-[600px] resize-y"
                        spellCheck={false}
                      />
                    </div>
                  ) : (
                  <div className="space-y-1">
                    {(() => {
                      const displayText = editableReport || generatedReport;
                      const sectionColors: Record<string, string> = {
                        "Academic Language Profile Summary": "text-indigo-300 border-indigo-500/40 bg-indigo-500/5",
                        "Key Findings from Work Sample Analysis": "text-violet-300 border-violet-500/40 bg-violet-500/5",
                        "Domain Performance Profile": "text-blue-300 border-blue-500/40 bg-blue-500/5",
                        "Language Function Profile": "text-cyan-300 border-cyan-500/40 bg-cyan-500/5",
                        "Subject-Specific Strategies": "text-teal-300 border-teal-500/40 bg-teal-500/5",
                        "Classroom Teacher Recommendations": "text-emerald-300 border-emerald-500/40 bg-emerald-500/5",
                        "Home Support Strategies": "text-amber-300 border-amber-500/40 bg-amber-500/5",
                        "Tutor Support Strategies": "text-orange-300 border-orange-500/40 bg-orange-500/5",
                        "Department and School Recommendations": "text-rose-300 border-rose-500/40 bg-rose-500/5",
                        "Priority Learning Goals": "text-purple-300 border-purple-500/40 bg-purple-500/5",
                      };
                      // Normalise: split any block that starts with **Heading** followed by text on same line
                      const rawBlocks = displayText.split("\n\n").filter(Boolean);
                      const blocks: string[] = [];
                      for (const b of rawBlocks) {
                        const inlineHeading = b.match(/^(\*\*[^*\n]+\*\*)[ \t]+(.+)/s);
                        if (inlineHeading) {
                          blocks.push(inlineHeading[1]);          // heading block alone
                          blocks.push(inlineHeading[2].trimStart()); // rest as separate block
                        } else {
                          blocks.push(b);
                        }
                      }

                      let currentSection = "";
                      return blocks.map((block, i) => {
                        const headingMatch = block.match(/^\*\*(.+)\*\*$/);
                        if (headingMatch) {
                          currentSection = headingMatch[1];
                          const cls = sectionColors[currentSection] ?? "text-indigo-300 border-indigo-500/40 bg-indigo-500/5";
                          const [textCls, borderCls, bgCls] = cls.split(" ");
                          return (
                            <div key={i} className={`flex items-center gap-2 mt-6 mb-2 px-3 py-2 rounded-lg border ${borderCls} ${bgCls}`}>
                              <span className={`text-sm font-bold ${textCls}`}>{currentSection}</span>
                            </div>
                          );
                        }
                        const hasBullets = block.includes("\n- ") || block.startsWith("- ");
                        if (hasBullets) {
                          const lines = block.split("\n");
                          const introLines: string[] = [];
                          const bulletLines: string[] = [];
                          for (const line of lines) {
                            if (line.startsWith("- ")) bulletLines.push(line.slice(2));
                            else if (bulletLines.length === 0) introLines.push(line);
                          }
                          return (
                            <div key={i} className="mt-1">
                              {introLines.filter(Boolean).map((l, j) => (
                                <p key={j} className="text-sm text-slate-300 leading-relaxed mb-1">{renderInline(l)}</p>
                              ))}
                              <ul className="space-y-1.5 mt-1">
                                {bulletLines.map((item, j) => (
                                  <li key={j} className="flex items-start gap-2 text-sm text-slate-300 leading-relaxed">
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                    <span>{renderInline(item)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        }
                        return <p key={i} className="text-sm text-slate-300 leading-relaxed mt-1">{renderInline(block)}</p>;
                      });
                    })()}
                  </div>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-70" />
                  <p className="text-sm text-slate-400 mb-1">AI-generated narrative report</p>
                  <p className="text-xs text-slate-500 mb-4">
                    {progressCounts.rated > 0 || fnProgressCounts.assessed > 0
                      ? "Ready — uses your domain ratings, language function profile, work samples, and student background."
                      : "Complete domain scoring and language function profile first."}
                  </p>
                  <Button
                    onClick={generateReport}
                    disabled={generatingReport || (progressCounts.rated === 0 && fnProgressCounts.assessed === 0)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {generatingReport
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
                      : <><Sparkles className="w-4 h-4 mr-2" /> Generate RAEPA Report</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── Student view share modal ─────────────────────────────────────── */}
      {studentShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-teal-400" />
                <h2 className="text-base font-semibold text-slate-100">Student View</h2>
              </div>
              <button onClick={() => setStudentShareOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-5">
                Open this page on the student's device (tablet or second screen). It shows a waiting screen until you push content from the assessment.
              </p>
              <div className="flex justify-center mb-5">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG
                    value={`${window.location.origin}${BASE_URL}/student-view/raepa/${caseId}`}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              <div className="bg-slate-800 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-4 min-w-0">
                <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                  {`${window.location.origin}${BASE_URL}/student-view/raepa/${caseId}`}
                </span>
                <button onClick={copyStudentLink} className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-600 text-white transition-colors">
                  {studentLinkCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
              <a href={`${BASE_URL}/student-view/raepa/${caseId}`} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors mb-3">
                <Eye size={14} /> Open in new tab
              </a>
              <button
                onClick={downloadStudentQrCard}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors mb-5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download QR Card (PNG)
              </button>
              <div className="hidden">
                <QRCodeCanvas
                  ref={studentQrDownloadRef}
                  value={`${window.location.origin}${BASE_URL}/student-view/raepa/${caseId}`}
                  size={720}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-semibold text-teal-400 uppercase tracking-wider">How it works</p>
                {([
                  ["1", "Open the student view on a tablet or second screen using the QR code or link above."],
                  ["2", "The student sees a waiting screen — nothing from the assessment is visible yet."],
                  ["3", "In the assessment, use the Generate button to create content for a domain."],
                  ["4", 'Click "Show to student" on any generated content to push it to their screen instantly.'],
                  ["5", 'Click "Hide" or "Clear stimulus" to return the student screen to the waiting state.'],
                ] as [string, string][]).map(([n, text]) => (
                  <div key={n} className="flex gap-2.5 items-start">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-teal-900 text-teal-300 text-[10px] font-bold flex items-center justify-center">{n}</span>
                    <p className="text-xs text-slate-400 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Teacher share modal ───────────────────────────────────────────── */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                <h2 className="text-base font-semibold text-slate-100">Share with Subject Teachers</h2>
              </div>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {teacherTokenLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-sm text-slate-400">Generating secure link…</p>
                </div>
              ) : teacherToken ? (
                <>
                  <p className="text-sm text-slate-400 mb-5">
                    Send this link or show the QR code to any subject teacher. They can upload a work sample directly — no login required.
                  </p>

                  {/* QR code */}
                  <div className="flex justify-center mb-5">
                    <div className="bg-white p-4 rounded-xl">
                      <QRCodeSVG
                        value={`${window.location.origin}${BASE_URL}/raepa-teacher/${teacherToken}`}
                        size={200}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  </div>

                  {/* Link + copy */}
                  <div className="bg-slate-800 rounded-lg px-3 py-2.5 flex items-center gap-2 mb-3 min-w-0">
                    <span className="text-xs text-slate-300 truncate flex-1 font-mono">
                      {`${window.location.origin}${BASE_URL}/raepa-teacher/${teacherToken}`}
                    </span>
                    <button
                      onClick={copyTeacherLink}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                    >
                      {linkCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>

                  {/* Download card button */}
                  <button
                    onClick={downloadQrCard}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 transition-colors mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download QR Card (PNG)
                  </button>

                  <p className="text-xs text-slate-500 text-center">
                    This link is unique to this student's assessment. Each teacher submission will appear in the Work Samples list above.
                  </p>

                  {/* Hidden high-res canvas for card generation */}
                  <div className="hidden">
                    <QRCodeCanvas
                      ref={qrDownloadRef}
                      value={`${window.location.origin}${BASE_URL}/raepa-teacher/${teacherToken}`}
                      size={720}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

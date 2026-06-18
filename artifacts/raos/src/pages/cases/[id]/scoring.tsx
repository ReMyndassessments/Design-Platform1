import { useParams, Link } from "wouter";
import { useGetCaseScores, useCalculateScores, useGetCase, useGetCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertTriangle, FileText, TrendingUp, Users, ClipboardList, Download } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// ── Tools that score higher = better (strengths-based) ───────────────────────
const HIGHER_IS_BETTER_TOOLS = new Set(["EFA"]);

// ── Non-clinical domains to exclude from all charts ───────────────────────────
const NON_CLINICAL_DOMAINS = new Set(["admin", "referral", "demographic", "admin_info", "instructions", "general_info", "identifying_info"]);

// ── Label formatter: DOMAIN_LABELS first, then snake_case → Title Case ────────
function formatDomainLabel(key: string): string {
  if (DOMAIN_LABELS[key]) return DOMAIN_LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Domain display labels ─────────────────────────────────────────────────────
const DOMAIN_LABELS: Record<string, string> = {
  // Deficit-model tools
  attention: "Attention & Self-Regulation",
  working_memory: "Working Memory & Processing",
  executive_function: "Executive Planning & Organization",
  emotional_regulation: "Emotional Regulation",
  social_communication: "Social Reciprocity & Communication",
  academic_persistence: "Academic Persistence",
  functional_impact: "Functional Impact",
  general: "General",
  // EFA (strengths-based)
  planning: "Planning",
  time_management: "Time Management",
  task_initiation: "Task Initiation",
  organization: "Organization",
  problem_solving: "Problem-Solving",
  flexibility: "Flexibility",
  emotional_control: "Emotional Control",
  impulse_control: "Impulse Control",
  attentional_control: "Attentional Control",
  self_monitoring: "Self-Monitoring",
  // SPP subscales
  a1_tactile_hyper: "A1. Tactile Hypersensitivity",
  a2_tactile_hypo: "A2. Tactile Hyposensitivity",
  a3_tactile_discrimination: "A3. Tactile Discrimination",
  b1_vestibular_hyper: "B1. Movement Hypersensitivity",
  b2_vestibular_seeking: "B2. Movement Seeking",
  b3_coordination: "B3. Coordination & Muscle Tone",
  c1_proprioceptive_seeking: "C1. Proprioceptive Seeking",
  c2_force_regulation: "C2. Force Regulation",
  d1_auditory_hyper: "D1. Auditory Hypersensitivity",
  d2_auditory_hypo: "D2. Auditory Hyposensitivity",
  e1_oral_hyper: "E1. Oral Hypersensitivity",
  e2_oral_hypo: "E2. Oral Hyposensitivity",
  f1_olfactory_hyper: "F1. Smell Hypersensitivity",
  f2_olfactory_hypo: "F2. Smell Hyposensitivity",
  g1_visual_hyper: "G1. Visual Hypersensitivity",
  g2_visual_processing: "G2. Visual Processing",
  h1_social_functioning: "H1. Social Functioning",
  h2_emotional_regulation: "H2. Emotional Regulation",
  h3_self_regulation: "H3. Self-Regulation",
  h4_interoception: "H4. Internal Regulation (Interoception)",
};

// ── Deficit-model domain descriptions (higher % = more concern) ───────────────
const DOMAIN_DESCRIPTIONS: Record<string, { low: string; mild: string; moderate: string; elevated: string }> = {
  attention: {
    low: "Attention and self-regulation appear to be functioning within typical limits. The respondent did not endorse significant concerns in this area.",
    mild: "Mild difficulties with sustained attention or self-regulation were noted. These may manifest as occasional off-task behavior or difficulty refocusing after disruptions, but are generally manageable in structured environments.",
    moderate: "Moderate concerns were identified in the area of attention and self-regulation. The student may experience consistent difficulty maintaining focus during extended tasks, may be easily distracted, and may require frequent redirection or environmental supports.",
    elevated: "Significant challenges with attention and self-regulation were reported. This level of concern suggests the student may have substantial difficulty maintaining focus, filtering distractions, and regulating their behavior across settings, which likely interferes with daily functioning.",
  },
  working_memory: {
    low: "Working memory and processing capacity appear adequate. The respondent did not indicate significant difficulty holding and manipulating information in mind during tasks.",
    mild: "Mild working memory challenges were noted. The student may occasionally lose track of multi-step instructions or need prompts to recall recently presented information, but can generally compensate with supports.",
    moderate: "Moderate working memory difficulties were identified. The student may have consistent trouble following multi-step directions, retaining information while completing tasks, or demonstrating knowledge under timed or high-demand conditions.",
    elevated: "Marked working memory and processing challenges were reported. This suggests the student may frequently struggle to hold information in mind long enough to use it, significantly impacting their ability to follow directions, complete tasks, and retain new learning.",
  },
  executive_function: {
    low: "Executive planning and organizational skills appear to be developing appropriately. The respondent did not identify meaningful concerns in this domain.",
    mild: "Some mild difficulties with planning, organization, or task initiation were noted. The student may need occasional prompting to start tasks or organize their materials, but generally benefits from structured routines.",
    moderate: "Moderate executive function challenges were reported. The student may have persistent difficulty with planning ahead, organizing their work, managing time, and initiating tasks independently. These challenges may be impacting academic productivity and daily routines.",
    elevated: "Significant executive function difficulties were identified. The student may experience substantial challenges with all aspects of planning, organization, and self-directed action. This level of concern suggests that executive functioning deficits are pervasive and likely impacting multiple areas of school and home life.",
  },
  emotional_regulation: {
    low: "Emotional regulation appears to be within a typical range. The respondent did not report significant concerns regarding the student's ability to manage emotional responses.",
    mild: "Mild emotional regulation challenges were noted. The student may occasionally have difficulty managing frustration, transitions, or unexpected changes, but can generally recover with support.",
    moderate: "Moderate concerns were identified in emotional regulation. The student may exhibit more frequent emotional reactions that are difficult to de-escalate, sensitivity to perceived criticism or failure, or difficulty coping with transitions and changes in routine.",
    elevated: "Significant emotional regulation difficulties were reported. This suggests the student may experience intense emotional responses that are disproportionate to the situation, difficulty returning to a regulated state, and that emotional dysregulation may be substantially disrupting their learning and relationships.",
  },
  social_communication: {
    low: "Social reciprocity and communication skills appear to be functioning within expected parameters. The respondent did not report notable concerns in this area.",
    mild: "Mild social communication challenges were noted. The student may occasionally have difficulty with turn-taking in conversation, reading social cues, or adjusting communication style across contexts, but generally engages in positive peer interactions.",
    moderate: "Moderate concerns were identified in social reciprocity and communication. The student may consistently have difficulty initiating or sustaining peer interactions, understanding nonverbal communication, or navigating the social demands of group settings.",
    elevated: "Significant social communication challenges were reported. This level of concern suggests the student may experience considerable difficulty with the pragmatics of communication, interpreting social situations, and engaging in reciprocal peer relationships, which may be leading to social isolation or conflict.",
  },
  academic_persistence: {
    low: "Academic persistence and motivation appear adequate. The respondent did not identify significant challenges with the student's ability to sustain effort on academic tasks.",
    mild: "Mild challenges with academic persistence were noted. The student may avoid or procrastinate on challenging tasks, give up more easily than peers, or express negative feelings about their academic abilities, but can generally be encouraged to persist.",
    moderate: "Moderate concerns were identified regarding academic persistence. The student may consistently avoid difficult work, demonstrate low academic self-efficacy, or show signs of learned helplessness in challenging situations, requiring significant adult encouragement and task modification.",
    elevated: "Significant difficulties with academic persistence were reported. This suggests the student may show marked avoidance of academic challenge, strong negative beliefs about their ability to succeed, and may disengage from learning tasks to a degree that is substantially limiting their academic progress.",
  },
  functional_impact: {
    low: "Overall functional impact appears minimal. The reported challenges do not seem to be significantly impairing the student's ability to meet daily expectations across settings.",
    mild: "Mild functional impact was noted. While some challenges were identified, their overall effect on the student's day-to-day functioning appears to be limited and may be manageable with targeted, low-intensity supports.",
    moderate: "Moderate functional impact was identified. The combination of challenges noted across domains appears to be meaningfully affecting the student's ability to meet daily academic and behavioral expectations, and may warrant more structured intervention or evaluation.",
    elevated: "Significant functional impairment was reported. The challenges identified appear to be substantially limiting the student's ability to function effectively in academic, social, and/or daily living contexts, and likely warrant comprehensive evaluation and multi-tiered intervention planning.",
  },
  general: {
    low: "Overall functioning in this area appears to be within typical limits based on the information provided.",
    mild: "Mild concerns were noted in this area. Targeted monitoring and low-intensity supports may be beneficial.",
    moderate: "Moderate concerns were identified. This level of difficulty may warrant additional evaluation and structured support.",
    elevated: "Significant concerns were reported in this area. Comprehensive evaluation and intervention planning are recommended.",
  },
  // SPP subscales
  a1_tactile_hyper: {
    low: "Tactile hypersensitivity is not a significant concern at this time. The respondent did not report meaningful distress related to light touch, clothing textures, or grooming routines.",
    mild: "Mild tactile defensiveness was noted. The student may occasionally show sensitivity to unexpected touch, certain clothing textures, or grooming activities, but these reactions are generally manageable.",
    moderate: "Moderate tactile hypersensitivity was identified. The student may regularly show distress with light or unexpected touch, be selective about clothing, and react strongly to grooming tasks. Sensory-informed strategies and environmental accommodations are recommended.",
    elevated: "Significant tactile hypersensitivity was reported. The student appears highly defensive to touch across multiple contexts, which may interfere with participation in daily activities, peer interactions, and self-care routines. Occupational therapy assessment is strongly recommended.",
  },
  a2_tactile_hypo: {
    low: "Tactile hyposensitivity is not a concern. The student appears appropriately responsive to tactile input and does not seek out excessive sensory stimulation.",
    mild: "Mild tactile under-responsivity was noted. The student may occasionally seek additional tactile input or appear less aware of mess or minor discomforts, but these patterns do not appear to significantly impair functioning.",
    moderate: "Moderate tactile hyposensitivity was identified. The student may frequently seek intense tactile experiences, mouth objects, or be unaware of pain or mess. Sensory diet strategies and structured tactile activities may be beneficial.",
    elevated: "Marked tactile under-responsivity was reported. The student appears to require significantly elevated levels of tactile input, which may manifest as persistent mouthing, seeking intense physical contact, and poor awareness of physical discomfort. Occupational therapy referral is recommended.",
  },
  a3_tactile_discrimination: {
    low: "Tactile discrimination appears adequate. The student does not show meaningful difficulty using tools, manipulating small objects, or identifying items by touch.",
    mild: "Mild tactile discrimination difficulties were noted. The student may occasionally struggle with fine motor tasks or identifying objects by touch, but can generally manage with minor supports.",
    moderate: "Moderate tactile discrimination difficulties were identified. The student may show consistent challenges with fine motor skills, tool use, and awareness of clothing or personal appearance. Occupational therapy input to address motor and sensory discrimination skills is recommended.",
    elevated: "Significant tactile discrimination difficulties were reported. The student appears to have marked difficulty processing tactile information accurately, affecting fine motor skills, self-care, and the use of classroom tools. Comprehensive occupational therapy assessment is strongly recommended.",
  },
  b1_vestibular_hyper: {
    low: "Movement hypersensitivity is not a current concern. The student appears comfortable with movement, heights, and changes in body position.",
    mild: "Mild movement hypersensitivity was noted. The student may occasionally show hesitancy around playground equipment, stairs, or changes in position, but this does not appear to significantly limit daily participation.",
    moderate: "Moderate vestibular hypersensitivity was identified. The student may regularly avoid movement-based activities, show fear of heights or uneven surfaces, and lose balance more easily than peers. Sensory-informed physical education accommodations and occupational therapy consultation are recommended.",
    elevated: "Significant movement hypersensitivity was reported. The student appears highly sensitive to vestibular input, showing marked fear of movement, heights, and postural changes that may substantially restrict physical participation and daily activities.",
  },
  b2_vestibular_seeking: {
    low: "Movement-seeking behavior is within typical limits. The student does not appear to require elevated levels of vestibular input to maintain regulation.",
    mild: "Mild movement-seeking behavior was noted. The student may occasionally have difficulty sitting still or seek additional movement opportunities, but these behaviors do not significantly disrupt participation.",
    moderate: "Moderate vestibular-seeking behavior was identified. The student may frequently move, spin, jump, or seek physically risky activities, suggesting an elevated need for vestibular input. A sensory diet that incorporates regular, structured movement breaks is recommended.",
    elevated: "Marked vestibular-seeking behavior was reported. The student appears to require a significantly elevated level of movement and vestibular input to maintain regulation, which may be highly disruptive in classroom settings. Occupational therapy consultation is strongly recommended to develop an individualized sensory regulation plan.",
  },
  b3_coordination: {
    low: "Coordination and muscle tone appear within typical developmental expectations. The student does not show meaningful challenges with posture, balance, or motor skill execution.",
    mild: "Mild coordination or muscle tone concerns were noted. The student may occasionally appear clumsy, tire more easily than peers, or show slightly reduced postural control, but these challenges do not significantly limit daily participation.",
    moderate: "Moderate coordination and muscle tone difficulties were identified. The student may show consistent clumsiness, frequent falls, difficulty with both gross and fine motor tasks, and fatigue more quickly than peers. Physiotherapy and/or occupational therapy evaluation is recommended.",
    elevated: "Significant coordination and muscle tone concerns were reported. The student appears to experience marked motor difficulties that affect posture, balance, and the execution of both gross and fine motor skills. Comprehensive motor assessment and therapeutic support are strongly recommended.",
  },
  c1_proprioceptive_seeking: {
    low: "Proprioceptive-seeking behavior is not a current concern. The student does not appear to require elevated levels of deep pressure or intense physical input for regulation.",
    mild: "Mild proprioceptive-seeking behavior was noted. The student may occasionally crave deep pressure, jump excessively, or chew objects, but these behaviors do not significantly interfere with daily functioning.",
    moderate: "Moderate proprioceptive-seeking behavior was identified. The student may regularly crash into objects, seek tight hugs, chew clothing, or jump excessively. Incorporating heavy work and deep pressure activities into the daily schedule may support self-regulation.",
    elevated: "Marked proprioceptive-seeking behavior was reported. The student appears to have a significantly elevated need for deep pressure and intense proprioceptive input, which may result in unsafe or disruptive behavior. Occupational therapy assessment to develop a comprehensive sensory regulation plan is strongly recommended.",
  },
  c2_force_regulation: {
    low: "Force regulation appears adequate. The student demonstrates appropriate grading of movement and does not show meaningful difficulty modulating the force applied during daily tasks.",
    mild: "Mild force regulation difficulties were noted. The student may occasionally use too much or too little force, resulting in broken objects or poor handwriting pressure, but these incidents are infrequent.",
    moderate: "Moderate force regulation difficulties were identified. The student may regularly misjudge the force needed for tasks, frequently damaging objects or showing inconsistent handwriting pressure. Occupational therapy strategies for grading motor output are recommended.",
    elevated: "Significant force regulation difficulties were reported. The student appears to have marked difficulty modulating the force applied across tasks, affecting handwriting, object handling, and safety. Occupational therapy referral is strongly recommended.",
  },
  d1_auditory_hyper: {
    low: "Auditory hypersensitivity is not a current concern. The student does not appear to show significant distress in response to environmental sounds.",
    mild: "Mild auditory hypersensitivity was noted. The student may occasionally be startled by loud sounds or find noisy environments distracting, but can generally manage with minor environmental modifications.",
    moderate: "Moderate auditory hypersensitivity was identified. The student may regularly show distress in noisy environments, cover their ears, or experience significant difficulty concentrating when background noise is present. Noise-reducing accommodations and sensory strategies are recommended.",
    elevated: "Significant auditory hypersensitivity was reported. The student appears highly reactive to sound, which may substantially interfere with participation in classroom activities, social settings, and daily routines. Acoustic accommodations and occupational therapy consultation are strongly recommended.",
  },
  d2_auditory_hypo: {
    low: "Auditory hyposensitivity is not a current concern. The student appears appropriately responsive to auditory input in their environment.",
    mild: "Mild auditory under-responsivity was noted. The student may occasionally appear not to hear instructions or seek louder input, but these patterns are not consistently disruptive.",
    moderate: "Moderate auditory hyposensitivity was identified. The student may frequently miss verbal instructions, need significant repetition, or actively seek loud sounds. Classroom accommodations to optimize auditory access and attention are recommended.",
    elevated: "Marked auditory under-responsivity was reported. The student appears to require substantially elevated auditory input to register and respond to environmental sounds, which may affect language comprehension and responsiveness. Audiology and occupational therapy evaluation are recommended.",
  },
  e1_oral_hyper: {
    low: "Oral hypersensitivity is not a current concern. The student does not appear to show significant avoidance related to food textures, tastes, or oral care.",
    mild: "Mild oral hypersensitivity was noted. The student may be somewhat picky about food textures or temperatures, but this does not appear to be significantly affecting nutrition or participation in daily routines.",
    moderate: "Moderate oral hypersensitivity was identified. The student may show consistent avoidance of certain food textures, gag in response to foods, or be resistant to dental care. Occupational therapy or speech-language pathology input to address oral sensory processing is recommended.",
    elevated: "Significant oral hypersensitivity was reported. The student appears highly sensitive to oral input across multiple contexts, potentially affecting nutrition, dental health, and social participation in mealtimes. Comprehensive oral sensory assessment and therapeutic intervention are strongly recommended.",
  },
  e2_oral_hypo: {
    low: "Oral hyposensitivity is not a current concern. The student does not appear to seek unusual levels of oral input.",
    mild: "Mild oral under-responsivity was noted. The student may occasionally chew non-food items or seek strong flavors, but these behaviors are infrequent and do not present significant safety concerns.",
    moderate: "Moderate oral hyposensitivity was identified. The student may regularly chew clothing or objects, seek very strong flavors, or show excess drooling. Oral sensory strategies and safe chew alternatives are recommended.",
    elevated: "Marked oral under-responsivity was reported. The student appears to require significantly elevated oral input, which may manifest as persistent mouthing of non-food items and safety concerns. Occupational therapy and/or speech-language pathology assessment is strongly recommended.",
  },
  f1_olfactory_hyper: {
    low: "Olfactory hypersensitivity is not a current concern. The student does not appear to show meaningful distress in response to environmental smells.",
    mild: "Mild smell hypersensitivity was noted. The student may occasionally react strongly to certain scents or avoid foods due to smell, but these reactions are generally manageable.",
    moderate: "Moderate olfactory hypersensitivity was identified. The student may regularly show strong aversive reactions to smells, avoid certain foods, and be distressed by perfumes or environmental odors. Scent-free environmental accommodations are recommended.",
    elevated: "Significant olfactory hypersensitivity was reported. The student appears highly reactive to smells, which may interfere with participation in school, social settings, and mealtimes. Environmental modifications and sensory-informed strategies are strongly recommended.",
  },
  f2_olfactory_hypo: {
    low: "Olfactory hyposensitivity is not a current concern. The student shows appropriate responsiveness to environmental odors.",
    mild: "Mild smell under-responsivity was noted. The student may occasionally fail to notice unpleasant odors or seek out smells, but these patterns are infrequent.",
    moderate: "Moderate olfactory hyposensitivity was identified. The student may frequently be unaware of unpleasant odors, seek out smells, or show poor discrimination between odors. Safety awareness and self-care routines may be affected.",
    elevated: "Marked olfactory under-responsivity was reported. The student appears to require significantly elevated olfactory input and may be unaware of odors that signal safety concerns. Environmental monitoring and safety strategies are recommended.",
  },
  g1_visual_hyper: {
    low: "Visual hypersensitivity is not a current concern. The student does not appear to show meaningful sensitivity to light or visual stimulation.",
    mild: "Mild visual hypersensitivity was noted. The student may occasionally be sensitive to bright lights or visually busy environments but can generally compensate with minor modifications.",
    moderate: "Moderate visual hypersensitivity was identified. The student may regularly show sensitivity to lighting, avoid eye contact, or become easily distracted in visually complex environments. Environmental lighting adjustments and visual supports are recommended.",
    elevated: "Significant visual hypersensitivity was reported. The student appears highly reactive to visual input, which may substantially interfere with learning, social engagement, and daily participation. Environmental modifications and occupational therapy consultation are strongly recommended.",
  },
  g2_visual_processing: {
    low: "Visual processing appears adequate. The student does not show meaningful difficulties with visual tracking, organization, or the discrimination of similar visual stimuli.",
    mild: "Mild visual processing difficulties were noted. The student may occasionally reverse letters or lose their place when reading, but these challenges are not significantly impacting academic performance.",
    moderate: "Moderate visual processing difficulties were identified. The student may show consistent difficulties with letter discrimination, reading tracking, and visual organization that are affecting academic tasks. Vision therapy and/or occupational therapy evaluation is recommended.",
    elevated: "Significant visual processing difficulties were reported. The student appears to experience marked challenges with visual discrimination, tracking, and spatial organization that substantially affect reading and written output. Comprehensive visual and occupational therapy assessment is strongly recommended.",
  },
  h1_social_functioning: {
    low: "Social functioning appears within typical limits. The student does not show meaningful difficulty engaging with peers or demonstrating social reciprocity.",
    mild: "Mild social functioning concerns were noted. The student may occasionally struggle with peer interactions or social reciprocity, but generally manages to engage in age-appropriate social relationships.",
    moderate: "Moderate social functioning difficulties were identified. Sensory processing differences appear to be contributing to challenges with peer relationships and social engagement. Social skills support and sensory-informed strategies for navigating group settings are recommended.",
    elevated: "Significant social functioning difficulties were reported. Sensory processing challenges appear to be substantially contributing to social isolation, limited peer interaction, and poor social reciprocity. Comprehensive assessment and individualized social-emotional support are strongly recommended.",
  },
  h2_emotional_regulation: {
    low: "Emotional regulation appears adequate in the context of sensory processing. The student does not show meaningful patterns of sensory-driven emotional dysregulation.",
    mild: "Mild emotional regulation challenges were noted. The student may occasionally become frustrated or show mood variability in response to sensory demands, but these reactions are generally manageable.",
    moderate: "Moderate emotional regulation difficulties were identified. Sensory overload or under-stimulation appears to be contributing to frustration, mood swings, and difficulty coping with change. A sensory regulation plan and emotional support strategies are recommended.",
    elevated: "Significant emotional regulation difficulties were reported. Sensory processing differences appear to be substantially driving emotional dysregulation, including frequent frustration, pronounced mood swings, and marked difficulty adapting to change. Comprehensive sensory-informed therapeutic support is strongly recommended.",
  },
  h3_self_regulation: {
    low: "Self-regulation in the context of sensory processing appears adequate. The student does not show meaningful difficulty calming, managing sleep, or functioning independently.",
    mild: "Mild self-regulation concerns were noted. The student may occasionally have difficulty settling or show some caregiver dependency in high-demand sensory situations.",
    moderate: "Moderate self-regulation difficulties were identified. Sensory dysregulation appears to be contributing to challenges with calming, sleep, and independence. A sensory diet, bedtime routines, and co-regulation strategies are recommended.",
    elevated: "Significant self-regulation difficulties were reported. Sensory processing challenges appear to be substantially impairing the student's ability to self-calm, regulate sleep, and function with appropriate independence. Comprehensive occupational therapy assessment and family support are strongly recommended.",
  },
  h4_interoception: {
    low: "Interoceptive awareness appears adequate. The student shows appropriate recognition of internal body signals such as hunger, thirst, and temperature.",
    mild: "Mild interoceptive difficulties were noted. The student may occasionally have difficulty identifying hunger or thirst cues or show some temperature regulation challenges, but these do not appear to significantly impact daily functioning.",
    moderate: "Moderate interoceptive difficulties were identified. The student may regularly struggle to recognize hunger, thirst, or temperature signals, and may show rapid mood or arousal shifts suggesting poor awareness of internal states. Interoception-focused activities and environmental monitoring are recommended.",
    elevated: "Significant interoceptive difficulties were reported. The student appears to have marked difficulty recognizing and responding to internal body signals, which may affect nutrition, safety, toileting, and self-regulation. Occupational therapy assessment with a focus on interoception is strongly recommended.",
  },
};

// ── EFA domain descriptions (higher % = stronger skills) ─────────────────────
// Keys reuse low/mild/moderate/elevated but meanings are inverted:
//   "low" key → used for lowest scores (0–39%) = most need for development
//   "elevated" key → used for highest scores (80–100%) = greatest strength
const EFA_DOMAIN_DESCRIPTIONS: Record<string, { low: string; mild: string; moderate: string; elevated: string }> = {
  planning: {
    low: "Planning skills are currently underdeveloped. The student may struggle to create structured plans, sequence steps for projects, and maintain daily routines. This is a priority area for EF coaching.",
    mild: "Some planning skills are beginning to emerge, though consistency is variable. The student may benefit from coaching to strengthen routine-building, step sequencing, and proactive preparation.",
    moderate: "Planning skills are developing well. The student generally demonstrates the ability to organize steps and follow routines, with some room for growth in more complex or novel planning situations.",
    elevated: "Strong planning skills are evident. The student consistently demonstrates the ability to set priorities, follow routines, and sequence steps effectively across projects of varying complexity.",
  },
  time_management: {
    low: "Significant time management challenges are indicated. The student may frequently misjudge task duration, procrastinate, and struggle to prioritize under time pressure. Focused coaching on time management strategies is strongly recommended.",
    mild: "Time management skills are emerging. Some difficulty with estimating time, avoiding procrastination, or following daily schedules may still be present. Structured coaching can support continued growth in this area.",
    moderate: "Time management skills are developing well. The student generally manages time reasonably effectively, though some inconsistency may occur under higher demands or with novel tasks.",
    elevated: "Excellent time management skills are reported. The student consistently manages time effectively, meets commitments, and prioritizes tasks with minimal prompting.",
  },
  task_initiation: {
    low: "Task initiation presents as a significant area of need. The student may frequently delay starting tasks, struggle to transition from preferred activities, and require ongoing prompting to begin work independently.",
    mild: "Task initiation skills are emerging. While the student shows some ability to begin tasks, procrastination or dependence on external prompting may still interfere with consistent independent work habits.",
    moderate: "Task initiation skills are developing. The student generally begins tasks with reasonable consistency, though occasional prompting or difficulty transitioning away from preferred activities may still occur.",
    elevated: "Strong task initiation skills are demonstrated. The student consistently begins tasks independently, manages transitions effectively, and applies self-directed strategies to get started without significant prompting.",
  },
  organization: {
    low: "Organizational skills are an area of significant need. The student may have difficulty maintaining orderly spaces, tracking materials and deadlines, and applying consistent systems to manage their work and belongings.",
    mild: "Organizational skills are beginning to develop. The student may show some ability to organize their environment and work, but inconsistency in applying organizational strategies across settings remains a coaching focus.",
    moderate: "Organizational skills are developing positively. The student generally maintains reasonable order and uses organizational strategies with some success, though greater consistency across all settings is a continued goal.",
    elevated: "Strong organizational skills are evident. The student consistently applies effective systems to manage their materials, time, and workload, and others recognize them as an organized and prepared individual.",
  },
  problem_solving: {
    low: "Problem-solving skills are an area requiring significant development. The student may have difficulty identifying problems, gathering relevant information, generating alternative solutions, and following through on a chosen approach.",
    mild: "Problem-solving skills are emerging. The student is beginning to identify and address problems but may still benefit from coaching on evaluating options, weighing pros and cons, and implementing solutions with confidence.",
    moderate: "Problem-solving skills are developing well. The student generally demonstrates an ability to identify problems, explore multiple solutions, and carry out a plan, with some room for growth in creative or higher-stakes situations.",
    elevated: "Strong problem-solving skills are reported. The student consistently demonstrates the ability to identify and analyze problems, generate creative solutions, evaluate options effectively, and implement plans successfully.",
  },
  flexibility: {
    low: "Cognitive flexibility is a significant area of need. The student may experience considerable difficulty adapting to unexpected changes, switching between tasks, and accepting different approaches or perspectives.",
    mild: "Cognitive flexibility skills are emerging. The student may still find unexpected changes, task-switching, or differing perspectives challenging, but is beginning to develop some adaptive strategies.",
    moderate: "Cognitive flexibility is developing positively. The student generally manages transitions and adapts to changing circumstances with reasonable success, though some situations — particularly those involving loss of control — may remain challenging.",
    elevated: "Strong cognitive flexibility is demonstrated. The student consistently adapts to change, accepts different viewpoints, switches between tasks with ease, and manages unexpected situations with composure.",
  },
  emotional_control: {
    low: "Emotional control is a significant area of need. The student may have difficulty managing frustration and strong emotions, which may affect their ability to persist through challenges, regulate their responses, and maintain positive relationships.",
    mild: "Emotional control skills are emerging. The student shows some capacity to manage emotions but may still benefit from coaching on calming strategies, frustration tolerance, and recovering from emotional difficulties.",
    moderate: "Emotional control is developing well. The student generally manages emotions effectively and can usually return to regulated states after becoming upset, with continued coaching opportunities in high-demand situations.",
    elevated: "Strong emotional control is reported. The student consistently demonstrates patience, frustration tolerance, and the ability to return to a calm and productive state after setbacks.",
  },
  impulse_control: {
    low: "Impulse control is a significant area of need. The student may act or speak before thinking, have difficulty waiting, and make hasty decisions without fully considering the consequences.",
    mild: "Impulse control skills are emerging. The student is beginning to think before acting and speaking, though coaching to reinforce consistent self-checking strategies and reflective decision-making will be beneficial.",
    moderate: "Impulse control is developing positively. The student generally thinks before acting and demonstrates reasonable self-regulation, with some remaining growth opportunities in high-stakes or time-pressured situations.",
    elevated: "Strong impulse control is demonstrated. The student consistently reads instructions carefully, thinks before speaking and acting, resists immediate impulses, and is regarded by others as reliable and considered in their behavior.",
  },
  attentional_control: {
    low: "Attentional control is a significant area of need. The student may have difficulty sustaining focus on multi-step tasks, avoiding distractions, and returning to work after interruptions. This area is a priority for targeted coaching support.",
    mild: "Attentional control skills are emerging. The student shows some ability to focus and persist, but distractions, low-interest tasks, or interruptions may still meaningfully impact task completion.",
    moderate: "Attentional control is developing well. The student generally maintains focus on tasks and can return to work after interruptions, though particularly boring or noisy environments may still present some challenges.",
    elevated: "Strong attentional control is evident. The student consistently sustains focus, completes multi-step tasks, resists distractions, and recovers quickly from interruptions.",
  },
  self_monitoring: {
    low: "Self-monitoring skills are an area of significant need. The student may have limited awareness of their own performance, difficulty accepting feedback, and limited engagement in reflective self-assessment or adjustment.",
    mild: "Self-monitoring skills are beginning to develop. The student is showing some awareness of their performance and openness to feedback, but consistent self-reflection and proactive adjustment remain coaching goals.",
    moderate: "Self-monitoring is developing positively. The student demonstrates reasonable self-awareness and is generally open to feedback and reflection, with continued growth opportunities in consistently reviewing and updating their approach.",
    elevated: "Strong self-monitoring skills are evident. The student consistently reflects on their own performance, seeks and incorporates feedback, considers others' perspectives, and proactively adjusts their strategies to improve.",
  },
};

// ── Band functions ────────────────────────────────────────────────────────────
type BandKey = "low" | "mild" | "moderate" | "elevated";
type Band = { label: string; color: string; bgColor: string; borderColor: string; barColor: string; key: BandKey };

function getDeficitBand(score: number): Band {
  if (score <= 25) return { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", barColor: "bg-emerald-500", key: "low" };
  if (score <= 50) return { label: "Mild", color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200", barColor: "bg-sky-500", key: "mild" };
  if (score <= 65) return { label: "Moderate", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", barColor: "bg-amber-500", key: "moderate" };
  return { label: "Elevated", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", barColor: "bg-red-500", key: "elevated" };
}

// For EFA: high score = strength = green; low score = needs development = red
// We reuse the same BandKey so descriptions map correctly, but flip colors/labels
function getEFABand(score: number): Band {
  if (score >= 80) return { label: "Strength", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", barColor: "bg-emerald-500", key: "elevated" };
  if (score >= 60) return { label: "Developing", color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200", barColor: "bg-sky-500", key: "moderate" };
  if (score >= 40) return { label: "Emerging", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", barColor: "bg-amber-500", key: "mild" };
  return { label: "High Risk", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", barColor: "bg-red-500", key: "low" };
}

function getBand(score: number, higherIsBetter: boolean): Band {
  return higherIsBetter ? getEFABand(score) : getDeficitBand(score);
}

// ── Narratives ────────────────────────────────────────────────────────────────
function getOverallNarrative(avgScore: number, studentName: string, higherIsBetter: boolean): string {
  if (higherIsBetter) {
    if (avgScore >= 80) return `Overall, ${studentName}'s self-reported executive functioning profile reflects strong skills across most domains. The pattern of responses indicates that the student has well-developed executive functioning strategies that they apply consistently in daily life. These strengths provide an excellent foundation for continued growth and academic success.`;
    if (avgScore >= 60) return `Overall, ${studentName}'s self-reported executive functioning profile reflects developing skills across most domains. The student demonstrates a reasonable foundation in executive functioning, with clear areas of strength and some domains that would benefit from continued coaching and strategy development.`;
    if (avgScore >= 40) return `Overall, ${studentName}'s self-reported executive functioning profile reflects emerging skills. While some strategies are beginning to develop, there are meaningful areas where coaching support could help the student build more consistent and effective executive functioning habits.`;
    return `Overall, ${studentName}'s self-reported executive functioning profile reflects significant areas of need across multiple domains. The pattern of responses suggests that the student may be experiencing notable challenges with self-regulation, planning, and organization. A structured executive functioning coaching program is strongly recommended to address these areas.`;
  }
  if (avgScore <= 25) return `Overall, the assessment profile for ${studentName} reflects scores in the Low range across most domains. The pattern of responses does not indicate widespread areas of concern at this time. While continued monitoring is always appropriate, these results suggest the student is generally meeting developmental and behavioral expectations as rated by the responding informant(s).`;
  if (avgScore <= 50) return `Overall, the assessment profile for ${studentName} reflects scores primarily in the Mild range. The pattern suggests some areas of emerging concern that may benefit from additional attention, targeted skill-building, or classroom accommodations. A follow-up conversation with the educational team is recommended to determine whether a more formal evaluation or tiered support plan is warranted.`;
  if (avgScore <= 65) return `Overall, the assessment profile for ${studentName} reflects scores in the Moderate range across multiple domains. This pattern of results suggests that the student is experiencing meaningful challenges that are likely impacting their daily functioning in school. A comprehensive evaluation and the development of a structured support plan are strongly recommended.`;
  return `Overall, the assessment profile for ${studentName} reflects scores in the Elevated range, indicating significant concerns across multiple functional domains. This pattern suggests the student may be experiencing substantial difficulties that require immediate attention, comprehensive evaluation, and the implementation of intensive, individualized supports.`;
}

function getCrossInformantNarrative(scores: any[], studentName: string): string {
  const types = Array.from(new Set(scores.map(s => s.respondentType)));
  if (types.length <= 1) {
    return `This assessment was completed by a single informant. While the results provide valuable information, cross-setting comparisons are not available. To gain a more complete picture of ${studentName}'s functioning, additional ratings from other informants (e.g., parents, other teachers) are recommended.`;
  }
  const hasDiscrepancy = scores.some(s => s.hasHighDiscrepancy);
  if (hasDiscrepancy) {
    return `Scores were collected from multiple informants, and a high degree of discrepancy was detected between raters. This pattern may reflect genuine behavioral differences across settings, differences in respondent thresholds, or variation in the student's presentation depending on environmental demands, relationship dynamics, or task structure. These discrepancies should be explored directly with each informant during the debriefing process.`;
  }
  return `Scores were collected from multiple informants, and there is reasonable agreement across raters. This consistency suggests that the patterns identified in this profile are likely to be observed across settings, increasing confidence in the results.`;
}

function getRecommendationsNarrative(domains: string[], scores: any[], higherIsBetter: boolean): string {
  const allNormalizedByDomain: Record<string, number[]> = {};
  for (const s of scores) {
    for (const [domain, val] of Object.entries(s.normalizedScores as Record<string, number>)) {
      if (!allNormalizedByDomain[domain]) allNormalizedByDomain[domain] = [];
      allNormalizedByDomain[domain].push(val);
    }
  }
  const avgByDomain: Record<string, number> = {};
  for (const [domain, vals] of Object.entries(allNormalizedByDomain)) {
    avgByDomain[domain] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const lines: string[] = [];
  if (higherIsBetter) {
    const highRisk = Object.entries(avgByDomain).filter(([, v]) => v < 40).map(([k]) => DOMAIN_LABELS[k] ?? k);
    const emerging = Object.entries(avgByDomain).filter(([, v]) => v >= 40 && v < 60).map(([k]) => DOMAIN_LABELS[k] ?? k);
    const strengths = Object.entries(avgByDomain).filter(([, v]) => v >= 80).map(([k]) => DOMAIN_LABELS[k] ?? k);
    if (highRisk.length > 0) lines.push(`Priority areas for coaching include: ${highRisk.join(", ")}. These domains show the greatest need and should be addressed first in the coaching plan.`);
    if (emerging.length > 0) lines.push(`Emerging domains — including ${emerging.join(", ")} — show developing skills and would benefit from structured strategy practice and reinforcement.`);
    if (strengths.length > 0) lines.push(`Areas of strength include: ${strengths.join(", ")}. These can serve as a foundation for building skills in areas of greater need.`);
    lines.push("Executive functioning coaching is most effective when it is personalized, consistent, and embedded in the student's daily routines. Results from this self-report measure should be discussed collaboratively with the student to build self-awareness and motivation.");
    lines.push("Follow-up administration of this measure post-coaching will allow for meaningful comparison of pre- and post-intervention scores across all 11 domains.");
  } else {
    const elevated = Object.entries(avgByDomain).filter(([, v]) => v > 65).map(([k]) => DOMAIN_LABELS[k] ?? k);
    const moderate = Object.entries(avgByDomain).filter(([, v]) => v > 50 && v <= 65).map(([k]) => DOMAIN_LABELS[k] ?? k);
    if (elevated.length > 0) lines.push(`Priority areas for evaluation and intervention include: ${elevated.join(", ")}. These domains show Elevated scores and may require the most immediate attention in planning.`);
    if (moderate.length > 0) lines.push(`Areas showing Moderate concern — including ${moderate.join(", ")} — should also be addressed through targeted monitoring and structured supports.`);
    lines.push("All findings should be interpreted within the broader context of the student's educational history, developmental background, and existing supports. This screening profile is not a diagnostic instrument and should be used as one component of a comprehensive evaluation process.");
    lines.push("Next steps may include sharing these results with the student's educational team, obtaining consent for additional formal evaluation if warranted, and scheduling a collaborative debriefing with parents or guardians.");
  }
  return lines.join(" ");
}

// ── Score section component (rendered once per tool) ─────────────────────────
function ToolScoreSection({ toolScores, studentName, today }: {
  toolScores: any[];
  studentName: string;
  today: string;
}) {
  const toolId = toolScores[0]?.toolId ?? "";
  const toolName = toolScores[0]?.toolName ?? toolId;
  const higherIsBetter = HIGHER_IS_BETTER_TOOLS.has(toolId);

  const domains = new Set<string>();
  toolScores.forEach(s =>
    Object.keys(s.normalizedScores)
      .filter(d => !NON_CLINICAL_DOMAINS.has(d))
      .forEach(d => domains.add(d))
  );

  const radarData = Array.from(domains).map(domain => {
    const pt: any = { subject: formatDomainLabel(domain) };
    toolScores.forEach(s => { pt[s.respondentType] = (s.normalizedScores as Record<string, number>)[domain] || 0; });
    return pt;
  });

  const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

  const allValues = toolScores.flatMap(s =>
    Object.entries(s.normalizedScores as Record<string, number>)
      .filter(([d]) => !NON_CLINICAL_DOMAINS.has(d))
      .map(([, v]) => v)
  );
  const overallAvg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;

  const avgByDomain: Record<string, number> = {};
  const allByDomain: Record<string, number[]> = {};
  for (const s of toolScores) {
    for (const [domain, val] of Object.entries(s.normalizedScores as Record<string, number>)) {
      if (NON_CLINICAL_DOMAINS.has(domain)) continue;
      if (!allByDomain[domain]) allByDomain[domain] = [];
      allByDomain[domain].push(val);
    }
  }
  for (const [domain, vals] of Object.entries(allByDomain)) {
    avgByDomain[domain] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  const overallBand = getBand(overallAvg, higherIsBetter);
  const respondentTypes = Array.from(new Set(toolScores.map(s => s.respondentType)));

  return (
    <div className="space-y-6">
      {/* Tool heading */}
      <div className="border-b-2 border-primary pb-4">
        <div className="flex items-center gap-3 mb-1">
          <FileText size={22} className="text-primary" />
          <h2 className="text-2xl font-bold font-display text-slate-900">
            {toolName}
            <span className="ml-3 text-sm font-normal text-slate-500">Interpretive Report</span>
          </h2>
        </div>
        <p className="text-slate-500 text-sm ml-9">
          Generated {today} · {toolScores.length} informant{toolScores.length !== 1 ? "s" : ""}
          {higherIsBetter && " · Higher scores indicate stronger skills"}
          {!higherIsBetter && " · Higher scores indicate greater frequency of reported challenges"}
        </p>
      </div>

      {/* Legend */}
      <Card className="shadow-sm border-none bg-slate-50">
        <CardContent className="py-4 px-6">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              {higherIsBetter ? "Skill Level:" : "Severity:"}
            </span>
            {higherIsBetter ? [
              { label: "High Risk (0–39)", color: "bg-red-500" },
              { label: "Emerging (40–59)", color: "bg-amber-500" },
              { label: "Developing (60–79)", color: "bg-sky-500" },
              { label: "Strength (80–100)", color: "bg-emerald-500" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${b.color}`} />
                <span className="text-sm text-slate-600">{b.label}</span>
              </div>
            )) : [
              { label: "Low (0–25)", color: "bg-emerald-500" },
              { label: "Mild (26–50)", color: "bg-sky-500" },
              { label: "Moderate (51–65)", color: "bg-amber-500" },
              { label: "Elevated (66+)", color: "bg-red-500" },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${b.color}`} />
                <span className="text-sm text-slate-600">{b.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-none">
          <CardHeader><CardTitle>Profile Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  {respondentTypes.map((type, i) => (
                    <Radar key={type} name={type.toUpperCase()} dataKey={type} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.3} />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-none">
          <CardHeader><CardTitle>Domain Scores</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={radarData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="subject"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    height={90}
                    tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + "…" : v}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: '#475569' }} />
                  <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number, name: string) => [value, name.toUpperCase()]}
                  />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '8px' }} />
                  {respondentTypes.map((type, i) => (
                    <Bar key={type} dataKey={type} name={type.toUpperCase()} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {toolScores.filter(s => s.hasHighDiscrepancy).length > 0 && (
          <Card className="lg:col-span-2 border-orange-200 bg-orange-50 shadow-sm">
            <CardContent className="p-6 flex items-start space-x-4">
              <AlertTriangle className="text-orange-500 shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-orange-900">High Discrepancy Detected</h3>
                <p className="text-orange-800 text-sm mt-1">There is significant variance in scores between informants. Consider exploring these differences in the debriefing session.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overall Summary */}
      <Card className={`shadow-sm border ${overallBand.borderColor} ${overallBand.bgColor}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <TrendingUp size={18} />
              Overall Profile Summary
            </CardTitle>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${overallBand.bgColor} ${overallBand.color} border ${overallBand.borderColor}`}>
              {overallBand.label} · {Math.round(overallAvg)}/100
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed text-sm">
            {getOverallNarrative(overallAvg, studentName, higherIsBetter)}
          </p>
        </CardContent>
      </Card>

      {/* Domain-by-Domain */}
      <Card className="shadow-sm border-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <ClipboardList size={18} />
            Domain-by-Domain Interpretation
          </CardTitle>
          <p className="text-slate-500 text-sm font-normal mt-1">
            {higherIsBetter
              ? "Scores are normalized to a 0–100 scale. Higher scores indicate stronger, more consistently applied executive functioning skills."
              : "Scores represent averages across all informants, normalized to a 0–100 scale. Higher scores indicate greater frequency or severity of reported challenges."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(avgByDomain).map(([domain, avg]) => {
            const band = getBand(avg, higherIsBetter);
            const label = DOMAIN_LABELS[domain] ?? domain;
            const descriptions = higherIsBetter
              ? (EFA_DOMAIN_DESCRIPTIONS[domain] ?? EFA_DOMAIN_DESCRIPTIONS.self_monitoring)
              : (DOMAIN_DESCRIPTIONS[domain] ?? DOMAIN_DESCRIPTIONS.general);
            return (
              <div key={domain} className={`rounded-lg border ${band.borderColor} ${band.bgColor} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-800 text-sm">{label}</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full ${band.barColor}`} style={{ width: `${avg}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${band.color}`}>{avg}/100 · {band.label}</span>
                  </div>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{descriptions[band.key]}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Cross-Informant */}
      {toolScores.length > 1 && (
        <Card className="shadow-sm border-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Users size={18} />
              Cross-Informant Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed text-sm">
              {getCrossInformantNarrative(toolScores, studentName)}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 text-slate-600 font-semibold">Domain</th>
                    {respondentTypes.map(type => (
                      <th key={type} className="text-center py-2 px-3 text-slate-600 font-semibold capitalize">{type}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(domains).map(domain => (
                    <tr key={domain} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-4 text-slate-700">{formatDomainLabel(domain)}</td>
                      {respondentTypes.map(type => {
                        const score = toolScores.find(s => s.respondentType === type);
                        const val = score ? (score.normalizedScores as Record<string, number>)[domain] ?? "—" : "—";
                        const band = typeof val === "number" ? getBand(val, higherIsBetter) : null;
                        return (
                          <td key={type} className="text-center py-2 px-3">
                            {band ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${band.color} ${band.bgColor}`}>
                                {val}
                              </span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="shadow-sm border-none bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-800">
            {higherIsBetter ? "Coaching Recommendations & Next Steps" : "Clinical Considerations & Recommended Next Steps"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed text-sm">
            {getRecommendationsNarrative(Array.from(domains), toolScores, higherIsBetter)}
          </p>
          <p className="text-xs text-slate-400 mt-4 italic">
            This interpretive report was generated automatically based on scored assessment data and is intended to support — not replace — clinical judgment. All findings should be interpreted by a qualified professional in the context of a comprehensive evaluation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ScoringView() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scores, isLoading } = useGetCaseScores(caseId);
  const { data: caseData } = useGetCase(caseId);
  const { data: currentUser } = useGetCurrentUser();
  const calcMut = useCalculateScores();
  const isInvigilator = currentUser?.role === "assessment_invigilator";

  const handleRecalculate = () => {
    calcMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Scores updated" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'scores'] });
      }
    });
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  const studentName = caseData?.studentName ?? "the student";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Group scores by toolId, keeping only the latest per respondentType
  const byTool: Record<string, Record<string, any>> = {};
  for (const s of (scores ?? [])) {
    const tid = s.toolId ?? "unknown";
    const rtype = s.respondentType ?? "unknown";
    if (!byTool[tid]) byTool[tid] = {};
    const existing = byTool[tid][rtype];
    if (!existing || new Date(s.generatedAt) > new Date(existing.generatedAt)) {
      byTool[tid][rtype] = s;
    }
  }
  const toolGroups = Object.values(byTool).map(byRespondent => Object.values(byRespondent));

  const handleDownloadPDF = () => window.print();

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Print-only header */}
      <div className="print-only mb-6 pb-4 border-b-2 border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">ReMynd Assessment Operating System</p>
            <h1 className="text-2xl font-bold text-slate-900">Scoring &amp; Analysis Report</h1>
            <p className="text-slate-500 text-sm mt-0.5">Case: {studentName} · Generated {today}</p>
          </div>
          <img src="/images/remynd-logo.png" alt="ReMynd" className="h-10 w-10 object-contain" />
        </div>
      </div>

      {/* Screen-only page header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div className="flex items-center space-x-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900">Scoring &amp; Analysis</h1>
            <p className="text-slate-500 text-sm">Case: {studentName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isInvigilator && (
            <Button onClick={handleRecalculate} disabled={calcMut.isPending} variant="outline" className="bg-white">
              <RefreshCw size={16} className={`mr-2 ${calcMut.isPending ? 'animate-spin' : ''}`} /> Recalculate
            </Button>
          )}
          <Button onClick={handleDownloadPDF} variant="outline" className="bg-white">
            <Download size={16} className="mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      {toolGroups.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No scores generated yet. Ensure forms are completed and click Recalculate.
        </Card>
      ) : (
        <div className="space-y-16">
          {toolGroups.map((group, idx) => (
            <div key={group[0].toolId} className={idx > 0 ? "print-tool-section" : ""}>
              <ToolScoreSection
                toolScores={group}
                studentName={studentName}
                today={today}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

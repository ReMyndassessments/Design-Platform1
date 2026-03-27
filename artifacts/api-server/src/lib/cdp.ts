import type { FormQuestion } from "./questions.js";

const CDP_SCALE = ["Always", "Often", "Rarely", "Never"];
const S = CDP_SCALE;

const q = (id: string, text: string, domain: string, reversed = false): FormQuestion => ({
  id, text, type: "likert", options: S, optionsChinese: [], optionsKorean: [], domain, required: true, ...(reversed ? { reversed: true } : {}),
});

const hdr = (id: string, text: string, domain: string): FormQuestion => ({
  id, text, type: "section_header", domain, options: [], optionsChinese: [], optionsKorean: [],
});

const sub = (id: string, text: string, domain: string): FormQuestion => ({
  id, text, type: "section_header", domain, options: [], optionsChinese: [], optionsKorean: [], note: "subsection",
});

const ta = (id: string, text: string, domain: string): FormQuestion => ({
  id, text, type: "textarea", domain, options: [], optionsChinese: [], optionsKorean: [],
});

// ─── CDP-SR: Self-Regulation and Executive Function Profile ──────────────────

export const CDP_SR_FORM: FormQuestion[] = [
  hdr("cdp_sr_s1_hdr", "Section 1: Managing Emotions", "managing_emotions"),
  sub("cdp_sr_s1a_hdr", "Recognizing Emotions", "managing_emotions"),
  q("cdp_sr_s1_1", "Can the learner recognize and name their feelings and emotions?", "managing_emotions"),
  q("cdp_sr_s1_2", "Can the learner identify basic emotions (happiness, sadness, anger, fear, loneliness) in others?", "managing_emotions"),
  q("cdp_sr_s1_3", "Can the learner express how they are feeling in given situations?", "managing_emotions"),
  sub("cdp_sr_s1b_hdr", "Emotional Appropriateness", "managing_emotions"),
  q("cdp_sr_s1_4", "Can the learner adjust their emotional responses to different environments (e.g., classroom vs playground)?", "managing_emotions"),
  q("cdp_sr_s1_5", "Can the learner recognize excessive emotional reactions in others?", "managing_emotions"),
  q("cdp_sr_s1_6", "Can the learner identify how they should respond appropriately in a given scenario?", "managing_emotions"),
  sub("cdp_sr_s1r_hdr", "Strength Items", "managing_emotions"),
  q("cdp_sr_s1_r1", "The learner generally remains calm even in challenging situations.", "managing_emotions", true),
  q("cdp_sr_s1_r2", "The learner can independently calm themselves when upset.", "managing_emotions", true),

  hdr("cdp_sr_s2_hdr", "Section 2: Adaptive Behavior", "adaptive_behavior"),
  sub("cdp_sr_s2a_hdr", "Recognizing Good and Bad Behavior", "adaptive_behavior"),
  q("cdp_sr_s2_1", "Does the learner respond appropriately to praise?", "adaptive_behavior"),
  q("cdp_sr_s2_2", "Does the learner respond appropriately to guidance from familiar adults?", "adaptive_behavior"),
  q("cdp_sr_s2_3", "Can the learner recognize good or bad behavior in peers?", "adaptive_behavior"),
  sub("cdp_sr_s2b_hdr", "Thinking About Own Behavior", "adaptive_behavior"),
  q("cdp_sr_s2_4", "Can the learner follow appropriate classroom behavior (listening, following instructions, remaining seated)?", "adaptive_behavior"),
  q("cdp_sr_s2_5", "Can the learner self-monitor and reflect on their own behavior?", "adaptive_behavior"),
  sub("cdp_sr_s2r_hdr", "Strength Items", "adaptive_behavior"),
  q("cdp_sr_s2_r1", "The learner demonstrates consistent self-control across different settings.", "adaptive_behavior", true),
  q("cdp_sr_s2_r2", "The learner proactively corrects inappropriate behavior without adult prompting.", "adaptive_behavior", true),

  hdr("cdp_sr_s3_hdr", "Section 3: Managing Stress", "managing_stress"),
  sub("cdp_sr_s3a_hdr", "Recognizing Stress Triggers", "managing_stress"),
  q("cdp_sr_s3_1", "Can the learner identify situations that make them anxious or stressed?", "managing_stress"),
  q("cdp_sr_s3_2", "Can the learner articulate feelings of anxiety or worry to a familiar adult?", "managing_stress"),
  sub("cdp_sr_s3b_hdr", "Coping Strategies", "managing_stress"),
  q("cdp_sr_s3_3", "Can the learner use learned coping strategies when stressed (e.g., deep breaths, happy thoughts)?", "managing_stress"),
  q("cdp_sr_s3_4", "Can the learner seek comfort from a familiar adult when feeling anxious?", "managing_stress"),
  q("cdp_sr_s3_5", "Can the learner use visual prompts or reminders to manage stress?", "managing_stress"),
  sub("cdp_sr_s3r_hdr", "Strength Items", "managing_stress"),
  q("cdp_sr_s3_r1", "The learner can independently manage mild stressors without adult intervention.", "managing_stress", true),
  q("cdp_sr_s3_r2", "The learner maintains focus on tasks even when slightly anxious.", "managing_stress", true),

  hdr("cdp_sr_s4_hdr", "Section 4: Coping with Change", "coping_with_change"),
  sub("cdp_sr_s4a_hdr", "Home to School Transitions", "coping_with_change"),
  q("cdp_sr_s4_1", "Can the learner manage transport independently without excessive anxiety?", "coping_with_change"),
  q("cdp_sr_s4_2", "Can the learner transition between home and school routines smoothly?", "coping_with_change"),
  sub("cdp_sr_s4b_hdr", "Lesson or Activity Changes", "coping_with_change"),
  q("cdp_sr_s4_3", "Can the learner transition between lessons or activities without distress?", "coping_with_change"),
  q("cdp_sr_s4_4", "Can the learner anticipate upcoming changes with visual or verbal prompts?", "coping_with_change"),
  sub("cdp_sr_s4c_hdr", "Understanding Worries", "coping_with_change"),
  q("cdp_sr_s4_5", "Can the learner understand the concepts of \"worried\" and \"scared\" for themselves?", "coping_with_change"),
  q("cdp_sr_s4_6", "Can the learner identify \"worried\" or \"scared\" feelings in others?", "coping_with_change"),
  q("cdp_sr_s4_7", "Can the learner recognize these feelings in fictional or cartoon characters?", "coping_with_change"),
  sub("cdp_sr_s4r_hdr", "Strength Items", "coping_with_change"),
  q("cdp_sr_s4_r1", "The learner adjusts quickly to unexpected changes in routine.", "coping_with_change", true),
  q("cdp_sr_s4_r2", "The learner remains calm and focused when transitions are sudden.", "coping_with_change", true),

  hdr("cdp_sr_s5_hdr", "Section 5: Physical and Mental Wellness", "physical_wellness"),
  sub("cdp_sr_s5a_hdr", "Self-Care and Health Awareness", "physical_wellness"),
  q("cdp_sr_s5_1", "Does the learner seek attention for basic needs (food, drink, toilet)?", "physical_wellness"),
  q("cdp_sr_s5_2", "Can the learner indicate the source of discomfort or pain?", "physical_wellness"),
  sub("cdp_sr_s5b_hdr", "Nutrition and Food Acceptance", "physical_wellness"),
  q("cdp_sr_s5_3", "Can the learner eat preferred foods in unfamiliar settings?", "physical_wellness"),
  q("cdp_sr_s5_4", "Can the learner try familiar foods prepared differently (boiled, fried, steamed)?", "physical_wellness"),
  q("cdp_sr_s5_5", "Is the learner willing to try new foods?", "physical_wellness"),
  q("cdp_sr_s5_6", "Does the learner recognize when they are full and have eaten enough?", "physical_wellness"),
  sub("cdp_sr_s5c_hdr", "Physical Activity", "physical_wellness"),
  q("cdp_sr_s5_7", "Does the learner engage in physical activity at least 3 times a week?", "physical_wellness"),
  q("cdp_sr_s5_8", "Can the learner participate in noisy play or group physical activities?", "physical_wellness"),
  q("cdp_sr_s5_9", "Can the learner replicate a sequence of movements (throw, catch, jump)?", "physical_wellness"),
  sub("cdp_sr_s5r_hdr", "Strength Items", "physical_wellness"),
  q("cdp_sr_s5_r1", "The learner independently maintains personal hygiene and self-care routines.", "physical_wellness", true),
  q("cdp_sr_s5_r2", "The learner demonstrates awareness of physical wellness needs without prompts.", "physical_wellness", true),

  hdr("cdp_sr_s6_hdr", "Section 6: Social Interaction and Social Awareness", "social_interaction"),
  sub("cdp_sr_s6a_hdr", "Peer Interaction", "social_interaction"),
  q("cdp_sr_s6_1", "Does the learner initiate interaction with peers appropriately?", "social_interaction"),
  q("cdp_sr_s6_2", "Can the learner respond to peers' social cues?", "social_interaction"),
  q("cdp_sr_s6_3", "Can the learner resolve minor peer conflicts with minimal adult support?", "social_interaction"),
  sub("cdp_sr_s6b_hdr", "Social Presence", "social_interaction"),
  q("cdp_sr_s6_4", "Does the learner maintain appropriate eye contact in social situations?", "social_interaction"),
  q("cdp_sr_s6_5", "Can the learner adapt communication style depending on the social context?", "social_interaction"),
  sub("cdp_sr_s6r_hdr", "Strength Items", "social_interaction"),
  q("cdp_sr_s6_r1", "The learner shows empathy and consideration for peers without adult prompting.", "social_interaction", true),
  q("cdp_sr_s6_r2", "The learner participates positively in group activities consistently.", "social_interaction", true),

  hdr("cdp_sr_s7_hdr", "Section 7: Executive Functioning", "executive_functioning"),
  sub("cdp_sr_s7a_hdr", "Planning and Organization", "executive_functioning"),
  q("cdp_sr_s7_1", "Can the learner organize tasks and materials independently?", "executive_functioning"),
  q("cdp_sr_s7_2", "Can the learner follow multi-step instructions accurately?", "executive_functioning"),
  q("cdp_sr_s7_3", "Can the learner anticipate challenges and plan ahead?", "executive_functioning"),
  sub("cdp_sr_s7b_hdr", "Working Memory", "executive_functioning"),
  q("cdp_sr_s7_4", "Can the learner remember information necessary for tasks or instructions?", "executive_functioning"),
  q("cdp_sr_s7_5", "Can the learner recall previously learned strategies to complete new tasks?", "executive_functioning"),
  sub("cdp_sr_s7c_hdr", "Flexibility", "executive_functioning"),
  q("cdp_sr_s7_6", "Can the learner shift strategies if the initial approach is unsuccessful?", "executive_functioning"),
  q("cdp_sr_s7_7", "Can the learner adapt to new rules or routines without frustration?", "executive_functioning"),
  sub("cdp_sr_s7r_hdr", "Strength Items", "executive_functioning"),
  q("cdp_sr_s7_r1", "The learner independently sets achievable goals and monitors progress.", "executive_functioning", true),
  q("cdp_sr_s7_r2", "The learner completes tasks efficiently without external prompts.", "executive_functioning", true),

  hdr("cdp_sr_s8_hdr", "Section 8: Metacognition and Self-Monitoring", "metacognition"),
  q("cdp_sr_s8_1", "Can the learner evaluate the success of their own work?", "metacognition"),
  q("cdp_sr_s8_2", "Can the learner recognize errors and self-correct?", "metacognition"),
  q("cdp_sr_s8_3", "Can the learner set personal goals for behavior or learning?", "metacognition"),
  q("cdp_sr_s8_4", "Can the learner reflect on strengths and weaknesses?", "metacognition"),
  sub("cdp_sr_s8r_hdr", "Strength Items", "metacognition"),
  q("cdp_sr_s8_r1", "The learner independently reflects on personal progress and adjusts strategies.", "metacognition", true),
  q("cdp_sr_s8_r2", "The learner demonstrates awareness of their own learning style and preferences.", "metacognition", true),

  hdr("cdp_sr_s9_hdr", "Section 9: Open-Ended Observations", "observations"),
  ta("cdp_sr_s9_notes", "Teacher/Assessor Notes: Please provide brief notes on strengths, areas of concern, and strategies that work well with the learner.", "observations"),
];

// ─── CDP-CL: Cognition & Learning Domain ────────────────────────────────────

export const CDP_CL_FORM: FormQuestion[] = [
  hdr("cdp_cl_d1_hdr", "Domain 1: Organization, Planning & Task Initiation", "organization_planning"),
  q("cdp_cl_d1_1", "Can the learner prepare appropriately by collecting required items for an activity?", "organization_planning"),
  q("cdp_cl_d1_2", "Does the learner respond appropriately to a warning call to transition to a new activity?", "organization_planning"),
  q("cdp_cl_d1_3", "Can the learner sequence their activities according to the timetable (e.g., Math, then Science, then lunch)?", "organization_planning"),
  q("cdp_cl_d1_4", "Is the learner able to carry out an activity in the correct sequence without prompting (e.g., turn on tap, wet hands, add soap)?", "organization_planning"),
  q("cdp_cl_d1_5", "Can the learner entertain themselves whilst waiting?", "organization_planning"),
  q("cdp_cl_d1_6", "Does the learner understand that they can independently make simple choices relevant to activities of daily living (e.g., what to wear today)?", "organization_planning"),
  q("cdp_cl_d1_7", "Does the learner understand the concept of making 'a choice' (e.g., choosing which flavor ice cream)?", "organization_planning"),
  q("cdp_cl_d1_8", "If the learner makes a choice, can they give one reason?", "organization_planning"),
  q("cdp_cl_d1_9", "Can the learner identify steps to solve a simple problem with adult support?", "organization_planning"),
  q("cdp_cl_d1_10", "Can the learner explain the problem to an adult (e.g., 'I need to move a box and it is too heavy')?", "organization_planning"),
  q("cdp_cl_d1_11", "Can the learner use time wisely and plan important tasks (e.g., homework before TV)?", "organization_planning"),
  q("cdp_cl_d1_12", "Does the learner use break time appropriately (e.g., going to the toilet or getting a drink during break, not after the bell)?", "organization_planning"),
  q("cdp_cl_d1_13", "Can the learner make a decision in a reasonable length of time (e.g., what to have for lunch or what they want for their birthday)?", "organization_planning"),
  q("cdp_cl_d1_14", "Will the learner independently start a task and decide independently what they want to do?", "organization_planning"),
  q("cdp_cl_d1_15", "Can the learner sequence information in order of importance?", "organization_planning"),
  q("cdp_cl_d1_16", "Does the learner recognize that it is their responsibility to manage homework and seek support where necessary?", "organization_planning"),
  q("cdp_cl_d1_17", "Can the learner prioritize which homework to do in order to meet deadlines?", "organization_planning"),
  q("cdp_cl_d1_18", "Does the learner have a framework for setting short-term goals (e.g., finishing a homework task)?", "organization_planning"),
  q("cdp_cl_d1_19", "Does the learner have a framework for setting long-term goals (e.g., choosing a career)?", "organization_planning"),
  q("cdp_cl_d1_20", "Can the learner plan an activity and carry it out to completion?", "organization_planning"),
  q("cdp_cl_d1_21", "Can the learner create and complete a plan effectively without procrastinating?", "organization_planning"),
  q("cdp_cl_d1_22", "Can the learner identify what resources they need to reach their goal (e.g., people, money, and time)?", "organization_planning"),

  hdr("cdp_cl_d2_hdr", "Domain 2: Working Memory, Attention & Processing", "working_memory"),
  q("cdp_cl_d2_1", "Can the learner recall details from a short story in at least 5 sentences?", "working_memory"),
  q("cdp_cl_d2_2", "Does the learner understand what they have been asked to do without prompting?", "working_memory"),
  q("cdp_cl_d2_3", "Can the learner predict what might happen next in a story or activity?", "working_memory"),
  q("cdp_cl_d2_4", "Does the learner attempt to fill in missing information from a known task (e.g., flour is missing from a pancake recipe)?", "working_memory"),
  q("cdp_cl_d2_5", "Does the learner understand terms such as 'later', 'before', 'after', 'next' and 'then'?", "working_memory"),
  q("cdp_cl_d2_6", "Does the learner understand that some events take longer than others (e.g., making dinner takes longer than getting a snack)?", "working_memory"),
  q("cdp_cl_d2_7", "Can the learner recognize that there is a problem?", "working_memory"),
  q("cdp_cl_d2_8", "Does the learner recognize when they can't do something?", "working_memory"),
  q("cdp_cl_d2_9", "Can the learner use new information to adjust their understanding of a concept or story?", "working_memory"),
  q("cdp_cl_d2_10", "Does the learner use strategies for memorizing (e.g., repeating, chunking, associating)?", "working_memory"),
  q("cdp_cl_d2_11", "Can the learner use visualization as a strategy (e.g., mentally build a picture of a story and then describe it)?", "working_memory"),
  q("cdp_cl_d2_12", "Can the learner ignore unimportant or irrelevant information in written and spoken narratives?", "working_memory"),
  q("cdp_cl_d2_13", "Can the learner inform an adult or peer if they do not understand instructions and ask for clarification?", "working_memory"),

  hdr("cdp_cl_d3_hdr", "Domain 3: Reasoning, Problem Solving & Cognitive Flexibility", "reasoning"),
  q("cdp_cl_d3_1", "Can the learner sequence numbers up to 100?", "reasoning"),
  q("cdp_cl_d3_2", "Can the learner order items by size and quantities?", "reasoning"),
  q("cdp_cl_d3_3", "Can the learner compare two numbers and work out which number is larger?", "reasoning"),
  q("cdp_cl_d3_4", "Can the learner divide things in groups, in half, or a quarter in order to share (e.g., pizza)?", "reasoning"),
  q("cdp_cl_d3_5", "Can the learner complete addition and subtraction?", "reasoning"),
  q("cdp_cl_d3_6", "Can the learner recognize coins by face value?", "reasoning"),
  q("cdp_cl_d3_7", "Can the learner apply their knowledge and test it (e.g., watering one plant and not another, or testing torches to find the brightest)?", "reasoning"),
  q("cdp_cl_d3_8", "Does the learner make choices based on their previous experience?", "reasoning"),
  q("cdp_cl_d3_9", "If the learner makes a poor decision, can they accept guidance to rectify the situation?", "reasoning"),
  q("cdp_cl_d3_10", "Can the learner adapt their intention in response to ideas offered by others?", "reasoning"),
  q("cdp_cl_d3_11", "Does the learner understand when to use a skill in a new situation?", "reasoning"),
  q("cdp_cl_d3_12", "Can the learner use alternative strategies when they face difficulties (e.g., asking for clarification or trying a different approach)?", "reasoning"),
  q("cdp_cl_d3_13", "Can the learner persist at solving a problem when it gets more difficult?", "reasoning"),
  q("cdp_cl_d3_14", "Can the learner identify the main idea or problem?", "reasoning"),
  q("cdp_cl_d3_15", "Can the learner consider a number of possibilities to solve a problem?", "reasoning"),
  q("cdp_cl_d3_16", "Can the learner break down the information about the problem?", "reasoning"),
  q("cdp_cl_d3_17", "Can the learner critically evaluate their approach to solving a problem and identify what they could have done better?", "reasoning"),
  q("cdp_cl_d3_18", "Is the learner able to anticipate the pitfalls of their decisions?", "reasoning"),
  q("cdp_cl_d3_19", "Can the learner explain the overall implications of something they heard or read?", "reasoning"),

  hdr("cdp_cl_d4_hdr", "Domain 4: Applied Academic & Functional Skills", "applied_academic"),
  q("cdp_cl_d4_1", "Does the learner understand that a written number represents a number of objects?", "applied_academic"),
  q("cdp_cl_d4_2", "Can the learner use a ruler to measure the length of a shape?", "applied_academic"),
  q("cdp_cl_d4_3", "Can the learner use a container to measure volume (e.g., measure 250ml of water)?", "applied_academic"),
  q("cdp_cl_d4_4", "Can the learner use a scale to measure weight?", "applied_academic"),
  q("cdp_cl_d4_5", "Can the learner add coins up to a value of one Yuan?", "applied_academic"),
  q("cdp_cl_d4_6", "Can the learner add coins up to 5 Yuan, 10 Yuan, and 20 Yuan?", "applied_academic"),
  q("cdp_cl_d4_7", "Does the learner understand when they need change in a transaction?", "applied_academic"),
  q("cdp_cl_d4_8", "Does the learner understand when they don't have enough money to buy something?", "applied_academic"),
  q("cdp_cl_d4_9", "Can the learner use money vocabulary in real-life situations?", "applied_academic"),
  q("cdp_cl_d4_10", "Does the learner understand what 'reasonable price' means?", "applied_academic"),
  q("cdp_cl_d4_11", "Is the learner able to work out how they could save money?", "applied_academic"),
  q("cdp_cl_d4_12", "Does the learner understand that people get paid for working?", "applied_academic"),
  q("cdp_cl_d4_13", "Can the learner apply a general rule to a specific situation?", "applied_academic"),

  hdr("cdp_cl_d5_hdr", "Domain 5: Time, Measurement & Quantitative Concepts", "time_measurement"),
  q("cdp_cl_d5_1", "Does the learner know the vocabulary and sequence for months of the year, seasons, and special times?", "time_measurement"),
  q("cdp_cl_d5_2", "Can the learner recognize the age of a child, teenager, adult, and senior?", "time_measurement"),
  q("cdp_cl_d5_3", "Does the learner know how many hours are in a day, minutes in an hour, and days in a year?", "time_measurement"),
  q("cdp_cl_d5_4", "Can the learner read an analogue clock and understand the time?", "time_measurement"),
  q("cdp_cl_d5_5", "Can the learner read a digital clock and understand time?", "time_measurement"),
  q("cdp_cl_d5_6", "Can the learner round numbers up to the nearest 10 and 100?", "time_measurement"),
  q("cdp_cl_d5_7", "Does the learner understand percentages as fractions?", "time_measurement"),
  q("cdp_cl_d5_8", "Can the learner recognize proportions of a whole number using fractions?", "time_measurement"),
  q("cdp_cl_d5_9", "Can the learner accurately measure items using the correct tool?", "time_measurement"),
  q("cdp_cl_d5_10", "Can the learner estimate a measurement (length, time, weight, or volume)?", "time_measurement"),

  hdr("cdp_cl_d6_hdr", "Domain 6: Social-Cognitive Reasoning & Decision Making", "social_cognitive"),
  q("cdp_cl_d6_1", "Can the learner recognize when a peer has greater knowledge in a particular subject?", "social_cognitive"),
  q("cdp_cl_d6_2", "Can the learner explain what they may do differently next time?", "social_cognitive"),
  q("cdp_cl_d6_3", "Can the learner recognize that their choices affect others?", "social_cognitive"),
  q("cdp_cl_d6_4", "Can the learner take other people's opinions and knowledge into account when making a group decision?", "social_cognitive"),
  q("cdp_cl_d6_5", "Is the learner able to give a rationale and justification for the group's decision?", "social_cognitive"),
  q("cdp_cl_d6_6", "If the learner does not find the items they need, will they accept a similar item?", "social_cognitive"),
  q("cdp_cl_d6_7", "Can the learner prioritize spending (needs vs wants)?", "social_cognitive"),
  q("cdp_cl_d6_8", "Does the learner recognize that an item may be offered at a variety of prices?", "social_cognitive"),
  q("cdp_cl_d6_9", "Can the learner understand the far-reaching consequences of their actions on others?", "social_cognitive"),
  q("cdp_cl_d6_10", "Is the learner able to recognize whether a decision is being made based on emotions or logic?", "social_cognitive"),

  hdr("cdp_cl_d7_hdr", "Domain 7: Independence, Responsibility & Life Skills", "independence"),
  q("cdp_cl_d7_1", "Does the learner manage their own responsibilities in a school, home, or work setting at an age-appropriate level?", "independence"),
  q("cdp_cl_d7_2", "Is the learner able to look after their own belongings in a school, home, or workplace?", "independence"),
  q("cdp_cl_d7_3", "Can the learner identify different words or phrases to type in a search engine related to their research?", "independence"),
  q("cdp_cl_d7_4", "Can the learner use at least three different tools to find information?", "independence"),
  q("cdp_cl_d7_5", "Can the learner work out how much disposable income they have?", "independence"),
  q("cdp_cl_d7_6", "Can the learner estimate how much they need for shopping?", "independence"),
  q("cdp_cl_d7_7", "Does the learner know the advantages of saving money?", "independence"),
  q("cdp_cl_d7_8", "Does the learner understand that they need to pay bills and taxes?", "independence"),
  q("cdp_cl_d7_9", "Does the learner understand the concept of credit and interest?", "independence"),
  q("cdp_cl_d7_10", "Does the learner know that there are different types of bank accounts or building societies?", "independence"),
  q("cdp_cl_d7_11", "Does the learner understand what they need to learn in order to work on a problem?", "independence"),
];

// ─── CDP-CI: Communication and Interaction ───────────────────────────────────

export const CDP_CI_FORM: FormQuestion[] = [
  hdr("cdp_ci_s1_hdr", "Attention and Listening", "attention_listening"),
  q("cdp_ci_s1_1", "Does the learner respond to prompts to listen?", "attention_listening"),
  q("cdp_ci_s1_2", "Can the learner concentrate in small groups?", "attention_listening"),
  q("cdp_ci_s1_3", "Can the learner concentrate in noisy or busy environments?", "attention_listening"),
  q("cdp_ci_s1_4", "Can the learner concentrate during a one-to-one interaction?", "attention_listening"),

  hdr("cdp_ci_s2_hdr", "Contextual and Gestural Cues", "gestural_cues"),
  q("cdp_ci_s2_1", "Can the learner imitate simple signs or gestures fairly accurately?", "gestural_cues"),
  q("cdp_ci_s2_2", "Does the learner understand gestural communication such as pointing or head shaking?", "gestural_cues"),

  hdr("cdp_ci_s3_hdr", "Attention and Listening (Continued)", "attention_listening"),
  q("cdp_ci_s3_1", "Can the learner remain on task in order to finish a piece of work?", "attention_listening"),
  q("cdp_ci_s3_2", "Will the learner join in activities in order to get a reward?", "attention_listening"),
  q("cdp_ci_s3_3", "If engaged in an activity, will the learner stop if prompted?", "attention_listening"),
  q("cdp_ci_s3_4", "Can the learner transition from a preferred activity with support (e.g., leaving a Lego construction to go to lunch)?", "attention_listening"),

  hdr("cdp_ci_s4_hdr", "Comprehension — Understanding Words, Symbols, and Signs", "comprehension"),
  q("cdp_ci_s4_1", "Does the learner understand position concepts (e.g., over, under, next to)?", "comprehension"),
  q("cdp_ci_s4_2", "Does the learner understand comparatives and superlatives (e.g., bigger, biggest)?", "comprehension"),
  q("cdp_ci_s4_3", "Does the learner understand the size concept (e.g., little, tall)?", "comprehension"),
  q("cdp_ci_s4_4", "Does the learner understand a basic vocabulary including everyday nouns, verbs, adjectives, and adverbs?", "comprehension"),

  hdr("cdp_ci_s5_hdr", "Contextual Cues — Environmental", "gestural_cues"),
  q("cdp_ci_s5_1", "Does the learner understand the activity based on location (e.g., a PE lesson in the gym, packing a suitcase to go on holiday)?", "gestural_cues"),

  hdr("cdp_ci_s6_hdr", "Expressive Communication — Basic Vocabulary", "expressive_communication"),
  q("cdp_ci_s6_1", "Does the learner use vocabulary to express their immediate needs (e.g., 'I need a pencil sharpener!')?", "expressive_communication"),
  q("cdp_ci_s6_2", "Does the learner have an expressive vocabulary that includes all relevant parts of speech?", "expressive_communication"),
  q("cdp_ci_s6_3", "Does the learner comment on activities, objects, or events as they are happening?", "expressive_communication"),

  hdr("cdp_ci_s7_hdr", "Comprehension — Understanding Sentences and Instructions", "comprehension"),
  q("cdp_ci_s7_1", "Can the learner follow instructions that involve negatives (e.g., 'Don't put the cup in the sink')?", "comprehension"),
  q("cdp_ci_s7_2", "Does the learner understand sentences with at least 3 information-carrying words out of context (e.g., 'put the cup in the cupboard')?", "comprehension"),
  q("cdp_ci_s7_3", "Does the learner understand sentences using the simple past and future tense (e.g., 'We went swimming last week'; 'We're going to the park tomorrow')?", "comprehension"),
  q("cdp_ci_s7_4", "Can the learner recognize errors in English grammar (e.g., 'The singer were awful')?", "comprehension"),

  hdr("cdp_ci_s8_hdr", "Comprehension — Complex Instructions", "comprehension"),
  q("cdp_ci_s8_1", "Can the learner respond to instructions that have no natural connection (e.g., 'Put the spoons in the drawer and then get me a pen')?", "comprehension"),

  hdr("cdp_ci_s9_hdr", "Social Skills — Recognizing and Using Non-Verbal Communication", "social_skills"),
  q("cdp_ci_s9_1", "Does the learner initiate interactions spontaneously with others during an activity (e.g., use an adult's name to get their attention)?", "social_skills"),
  q("cdp_ci_s9_2", "Does the learner use facial expression and body language?", "social_skills"),
  q("cdp_ci_s9_3", "Does the learner recognize and respond to facial expressions and body language?", "social_skills"),

  hdr("cdp_ci_s10_hdr", "Comprehension — Understanding Questions", "comprehension"),
  q("cdp_ci_s10_1", "Does the learner answer questions such as why, how, and what if?", "comprehension"),
  q("cdp_ci_s10_2", "Does the learner understand and answer questions such as what, where, when, and who?", "comprehension"),

  hdr("cdp_ci_s11_hdr", "Expressive Communication — Expressing Sentences", "expressive_communication"),
  q("cdp_ci_s11_1", "Does the learner communicate with peers using sentences (using words, signs, or pictures)?", "expressive_communication"),
  q("cdp_ci_s11_2", "Does the learner communicate using sentences with 5 or more words and engage with familiar adults?", "expressive_communication"),
  q("cdp_ci_s11_3", "Does the learner combine words, pictures, or signs as relevant to communicating meaning?", "expressive_communication"),

  hdr("cdp_ci_s12_hdr", "Social Skills — Social Greetings", "social_skills"),
  q("cdp_ci_s12_1", "Does the learner recognize and use appropriate social greeting protocols (e.g., when and how to say hello, goodbye, or introduce themselves)?", "social_skills"),
  q("cdp_ci_s12_2", "Does the learner greet unfamiliar people appropriately?", "social_skills"),

  hdr("cdp_ci_s13_hdr", "Social Skills — Social Interactions", "social_skills"),
  q("cdp_ci_s13_1", "Does the learner take turns during an activity or conversation?", "social_skills"),
  q("cdp_ci_s13_2", "Does the learner join group activities appropriately?", "social_skills"),
  q("cdp_ci_s13_3", "Does the learner respond appropriately to peers' questions or requests?", "social_skills"),
  q("cdp_ci_s13_4", "Can the learner initiate social interactions with peers without adult prompting?", "social_skills"),
  q("cdp_ci_s13_5", "Does the learner maintain eye contact during social interactions?", "social_skills"),
  q("cdp_ci_s13_6", "Does the learner use appropriate gestures or facial expressions during interaction?", "social_skills"),
  q("cdp_ci_s13_7", "Can the learner recognize when a peer is upset or needs help?", "social_skills"),
  q("cdp_ci_s13_8", "Can the learner respond to others' emotions appropriately?", "social_skills"),
  q("cdp_ci_s13_9", "Does the learner show empathy towards peers?", "social_skills"),
  q("cdp_ci_s13_10", "Can the learner engage in cooperative play or collaborative tasks with peers?", "social_skills"),
  q("cdp_ci_s13_11", "Does the learner understand group rules and follow them during activities?", "social_skills"),
  q("cdp_ci_s13_12", "Can the learner negotiate or compromise in social situations?", "social_skills"),
  q("cdp_ci_s13_13", "Can the learner express personal opinions or preferences appropriately within a group?", "social_skills"),
  q("cdp_ci_s13_14", "Can the learner manage conflict with peers appropriately?", "social_skills"),
  q("cdp_ci_s13_15", "Does the learner accept guidance or correction from adults appropriately in social situations?", "social_skills"),

  hdr("cdp_ci_s14_hdr", "Social Awareness", "social_awareness"),
  q("cdp_ci_s14_1", "Does the learner notice when others are talking to them?", "social_awareness"),
  q("cdp_ci_s14_2", "Does the learner understand social cues such as tone of voice or facial expression?", "social_awareness"),
  q("cdp_ci_s14_3", "Can the learner recognize personal space boundaries in social situations?", "social_awareness"),
  q("cdp_ci_s14_4", "Can the learner adjust behavior according to the social context?", "social_awareness"),
  q("cdp_ci_s14_5", "Does the learner show awareness of others' perspectives or feelings?", "social_awareness"),
  q("cdp_ci_s14_6", "Does the learner respond appropriately to peers' social signals?", "social_awareness"),
  q("cdp_ci_s14_7", "Can the learner detect when a social interaction is over or needs to end?", "social_awareness"),

  hdr("cdp_ci_s15_hdr", "Social Initiation", "social_initiation"),
  q("cdp_ci_s15_1", "Does the learner start conversations or activities with peers spontaneously?", "social_initiation"),
  q("cdp_ci_s15_2", "Can the learner introduce new topics into a conversation?", "social_initiation"),
  q("cdp_ci_s15_3", "Does the learner ask for help when needed in social or learning contexts?", "social_initiation"),
  q("cdp_ci_s15_4", "Does the learner invite peers to join in activities appropriately?", "social_initiation"),
  q("cdp_ci_s15_5", "Can the learner initiate a game or structured activity independently?", "social_initiation"),

  hdr("cdp_ci_str_hdr", "Strength Items", "strengths"),
  q("cdp_ci_str_1", "The learner can make friends easily.", "strengths", true),
  q("cdp_ci_str_2", "The learner is comfortable participating in group activities.", "strengths", true),
  q("cdp_ci_str_3", "The learner can express emotions appropriately.", "strengths", true),
  q("cdp_ci_str_4", "The learner can adapt to changes in social situations.", "strengths", true),
  q("cdp_ci_str_5", "The learner shows confidence when interacting with peers.", "strengths", true),
  q("cdp_ci_str_6", "The learner can resolve conflicts independently.", "strengths", true),
  q("cdp_ci_str_7", "The learner demonstrates leadership during group activities.", "strengths", true),
  q("cdp_ci_str_8", "The learner can maintain friendships over time.", "strengths", true),

  hdr("cdp_ci_oe_hdr", "Open-Ended Reflection", "open_ended"),
  ta("cdp_ci_oe_1", "Describe situations where the learner interacts positively with peers.", "open_ended"),
  ta("cdp_ci_oe_2", "Describe situations where the learner struggles to engage socially.", "open_ended"),
  ta("cdp_ci_oe_3", "Are there particular environments or activities where the learner shows stronger social skills?", "open_ended"),
  ta("cdp_ci_oe_4", "Are there any supports or strategies that help the learner succeed socially?", "open_ended"),
];

// ─── CDP-SI: Social Interaction and Social Awareness ─────────────────────────

export const CDP_SI_FORM: FormQuestion[] = [
  hdr("cdp_si_s1_hdr", "Peer Interaction", "peer_interaction"),
  q("cdp_si_s1_1", "Does the learner interact with a peer during an activity (e.g., playing football)?", "peer_interaction"),

  hdr("cdp_si_s2_hdr", "Approval and Rejection of Others", "peer_interaction"),
  q("cdp_si_s2_1", "Can the learner perceive a positive or negative reaction (approval, disapproval, acceptance, or rejection) towards their own behavior?", "peer_interaction"),
  q("cdp_si_s2_2", "Does the learner show like and dislike of other people?", "peer_interaction"),

  hdr("cdp_si_s3_hdr", "Privacy", "safety_awareness"),
  q("cdp_si_s3_1", "Does the learner follow rules when using technology (e.g., asking permission to use a computer or tablet before downloading)?", "safety_awareness"),
  q("cdp_si_s3_2", "Does the learner understand basic rules for safe behavior?", "safety_awareness"),
  q("cdp_si_s3_3", "Does the learner understand social conventions of privacy (e.g., closing the toilet door, changing inside a cubicle)?", "safety_awareness"),

  hdr("cdp_si_s4_hdr", "Gender Awareness", "social_norms"),
  q("cdp_si_s4_1", "Does the learner recognize other genders amongst their peer group?", "social_norms"),
  q("cdp_si_s4_2", "Does the learner understand social norms for males and females (e.g., clothing)?", "social_norms"),
  q("cdp_si_s4_3", "Is the learner able to identify their own gender?", "social_norms"),

  hdr("cdp_si_s5_hdr", "Bullying Awareness", "safety_awareness"),
  q("cdp_si_s5_1", "Does the learner engage with direction and correct their own bullying behavior? (If not applicable — learner does not exhibit bullying — give full score.)", "safety_awareness"),
  q("cdp_si_s5_2", "Can the learner identify bullying scenarios with supportive visual materials?", "safety_awareness"),
  q("cdp_si_s5_3", "Does the learner show signs of distress when mistreated by peers?", "safety_awareness"),

  hdr("cdp_si_s6_hdr", "Empathy — Identifying Others' Emotions", "empathy_emotions"),
  q("cdp_si_s6_1", "Can the learner understand how to help others in need (e.g., when a friend falls, I help them; when a friend is crying, I call a teacher)?", "empathy_emotions"),
  q("cdp_si_s6_2", "Does the learner identify emotions in others (e.g., seeing a friend crying)?", "empathy_emotions"),

  hdr("cdp_si_s7_hdr", "Important People", "social_norms"),
  q("cdp_si_s7_1", "Can the learner name special people in their life (e.g., parents, carer, teacher, social worker)?", "social_norms"),
  q("cdp_si_s7_2", "Can the learner recognize hierarchy (e.g., head teacher, teacher, teaching assistant)?", "social_norms"),

  hdr("cdp_si_s8_hdr", "Recognizing How Others Are Feeling", "empathy_emotions"),
  q("cdp_si_s8_1", "Can the learner recognize how people are feeling through their tone of voice?", "empathy_emotions"),

  hdr("cdp_si_s9_hdr", "Recognize My Needs", "self_advocacy"),
  q("cdp_si_s9_1", "Is the learner aware of the difference between urgent and non-urgent needs (e.g., asking for a toilet pass in good time)?", "self_advocacy"),
  q("cdp_si_s9_2", "Does the learner recognize when it is ok to refuse an adult (e.g., 'no thanks')?", "self_advocacy"),
  q("cdp_si_s9_3", "Does the learner recognize when it is ok to refuse a peer (e.g., when asked to join a game)?", "self_advocacy"),

  hdr("cdp_si_s10_hdr", "Sincerity", "social_norms"),
  q("cdp_si_s10_1", "Is the learner able to show their appreciation for something (e.g., thanking somebody for offering help)?", "social_norms"),
  q("cdp_si_s10_2", "Does the learner show sincerity when apologizing?", "social_norms"),

  hdr("cdp_si_s11_hdr", "Being Assertive", "self_advocacy"),
  q("cdp_si_s11_1", "Can the learner recognize the difference between being assertive and aggressive?", "self_advocacy"),
  q("cdp_si_s11_2", "Is the learner able to demonstrate assertive body language in a role-play activity or drama class?", "self_advocacy"),

  hdr("cdp_si_s12_hdr", "Meaning \"No\"", "self_advocacy"),
  q("cdp_si_s12_1", "Does the learner understand that saying 'no' means 'no'?", "self_advocacy"),
  q("cdp_si_s12_2", "Is the learner able to demonstrate body language associated with saying no (e.g., walking away, telling others to stop, refusing to join in)?", "self_advocacy"),

  hdr("cdp_si_s13_hdr", "Managing Personal Success", "social_norms"),
  q("cdp_si_s13_1", "Does the learner celebrate their own success in making progress at school (e.g., enjoying visual rewards or special interest time)?", "social_norms"),

  hdr("cdp_si_s14_hdr", "Guessing What Another Person Will Do", "empathy_emotions"),
  q("cdp_si_s14_1", "Can the learner predict what someone is going to do by watching their actions?", "empathy_emotions"),

  hdr("cdp_si_s15_hdr", "Friendship", "friendship"),
  q("cdp_si_s15_1", "Does the learner form friendships (e.g., gravitate towards known friends, or participate in a group activity)?", "friendship"),
  q("cdp_si_s15_2", "Is the learner able to engage with more than one friend at the same time?", "friendship"),
  q("cdp_si_s15_3", "Can the learner receive compliments appropriately?", "friendship"),

  hdr("cdp_si_s16_hdr", "Trusting Me", "friendship"),
  q("cdp_si_s16_1", "Is the learner able to discuss a problem with a familiar adult or peer in order to get help to repair a situation or solve a problem?", "friendship"),
  q("cdp_si_s16_2", "Does the learner know when to share information or when it is ok to keep it secret (e.g., Peter bought a surprise gift for John's birthday)?", "friendship"),

  hdr("cdp_si_s17_hdr", "My Personal Safety Rules", "safety_awareness"),
  q("cdp_si_s17_1", "Does the learner recognize that generic safety rules apply across different environments (e.g., don't touch a hot oven, wear safety goggles in science, use a bicycle helmet)?", "safety_awareness"),
  q("cdp_si_s17_2", "Will the learner seek help using known strategies when they feel unsafe or threatened (e.g., 'I'm scared of dogs — can you help me?')?", "safety_awareness"),

  hdr("cdp_si_s18_hdr", "Dealing with Conflict", "conflict_resolution"),
  q("cdp_si_s18_1", "Is the learner able to engage in a compromise?", "conflict_resolution"),
  q("cdp_si_s18_2", "Can the learner identify reasons for a breakdown with another person (e.g., 'He has been nasty to me')?", "conflict_resolution"),

  hdr("cdp_si_s19_hdr", "Safety in My Community", "safety_awareness"),
  q("cdp_si_s19_1", "Is the learner able to convey an emergency message?", "safety_awareness"),
  q("cdp_si_s19_2", "Does the learner understand why they have to follow instructions from an unfamiliar adult in a community support role (e.g., a police officer, social worker)?", "safety_awareness"),

  hdr("cdp_si_s20_hdr", "Emotional Understanding", "empathy_emotions"),
  q("cdp_si_s20_1", "Can the learner recognize that different people have different emotional responses to the same stimulus or activity (e.g., one person likes Harry Potter, the other shows no interest)?", "empathy_emotions"),

  hdr("cdp_si_s21_hdr", "Intent", "conflict_resolution"),
  q("cdp_si_s21_1", "Does the learner understand why they need to explain their actions so that others understand their intent (e.g., 'I didn't mean to ignore you, I was running for the bus')?", "conflict_resolution"),
  q("cdp_si_s21_2", "Is the learner able to repair the situation by explaining their actions?", "conflict_resolution"),
  q("cdp_si_s21_3", "Does the learner understand the need to sometimes explain their actions or behaviors (e.g., in the case of an accident or wrongdoing)?", "conflict_resolution"),

  hdr("cdp_si_s22_hdr", "Coping with Negative Behaviors", "conflict_resolution"),
  q("cdp_si_s22_1", "Does the learner cope appropriately with their emotional state when faced with negative situations?", "conflict_resolution"),
  q("cdp_si_s22_2", "Does the learner accept help from an adult in resolving issues?", "conflict_resolution"),

  hdr("cdp_si_s23_hdr", "Social Behaviors", "social_norms"),
  q("cdp_si_s23_1", "Is the learner able to express when a situation or decision is fair or unfair?", "social_norms"),
  q("cdp_si_s23_2", "Is the learner able to apologize for inappropriate behavior (e.g., 'I am sorry I called you names, I did not mean to hurt you')?", "social_norms"),
  q("cdp_si_s23_3", "Does the learner use appropriate communication style to express disagreement in different settings (e.g., the difference between disagreeing with a sibling and disagreeing with an authority figure)?", "social_norms"),

  hdr("cdp_si_s24_hdr", "Influence", "self_advocacy"),
  q("cdp_si_s24_1", "Can the learner identify people who can help them to make choices (e.g., teacher, parent, doctor, friend)?", "self_advocacy"),

  hdr("cdp_si_s25_hdr", "Disagreeing", "self_advocacy"),
  q("cdp_si_s25_1", "Is the learner able to calmly speak to strengthen their argument?", "self_advocacy"),
  q("cdp_si_s25_2", "Does the learner understand that they shouldn't always say what they are thinking (e.g., 'You are fat')?", "self_advocacy"),

  hdr("cdp_si_s26_hdr", "Company of Others", "social_norms"),
  q("cdp_si_s26_1", "Can the learner describe ways of showing respect?", "social_norms"),
  q("cdp_si_s26_2", "Can the learner explain why they make people happy?", "social_norms"),

  hdr("cdp_si_s27_hdr", "Honesty", "social_norms"),
  q("cdp_si_s27_1", "Can the learner recognize a lie?", "social_norms"),
  q("cdp_si_s27_2", "Is the learner able to recognize there are times when it is acceptable not to tell the truth (e.g., a white lie)?", "social_norms"),

  hdr("cdp_si_s28_hdr", "Sustaining a Consistent Peer Relationship", "friendship"),
  q("cdp_si_s28_1", "Will the learner defend their friend in a confrontation?", "friendship"),
  q("cdp_si_s28_2", "Does the learner spend time with friends (e.g., break times, lunch time)?", "friendship"),
  q("cdp_si_s28_3", "Will the learner respond appropriately to a friend's request for support?", "friendship"),
  q("cdp_si_s28_4", "Can the learner remain focused on a friend's conversation without diverting focus back to themselves?", "friendship"),

  hdr("cdp_si_s29_hdr", "Approaching Social Relationships", "friendship"),
  q("cdp_si_s29_1", "Can the learner use appropriate communication (verbal, signs, pictures) to ask another person out on a date?", "friendship"),
  q("cdp_si_s29_2", "Does the learner show appropriate complimentary behavior towards a potential companion (e.g., 'Your hair looks nice today')?", "friendship"),
  q("cdp_si_s29_3", "Does the learner understand the appropriate choice of companion (e.g., of the same generation, has some interests in common)?", "friendship"),

  hdr("cdp_si_s30_hdr", "Drugs, Alcohol, and Sex", "safety_awareness"),
  q("cdp_si_s30_1", "Does the learner understand the meaning of consent and associated age limits?", "safety_awareness"),
  q("cdp_si_s30_2", "Can the learner identify signs of an abusive or exploitative relationship (e.g., a social media friend request asking for a photo)?", "safety_awareness"),
  q("cdp_si_s30_3", "Does the learner know that alcohol and drugs may affect sexual choices and behavior?", "safety_awareness"),

  hdr("cdp_si_s31_hdr", "Reflective", "self_advocacy"),
  q("cdp_si_s31_1", "Is the learner able to independently analyze a situation on media clips?", "self_advocacy"),
  q("cdp_si_s31_2", "Does the learner reflect on their social conversations (e.g., what went well, what would you do differently next time)?", "self_advocacy"),
  q("cdp_si_s31_3", "After independently analyzing a situation on media, is the learner able to discuss it within a group?", "self_advocacy"),

  hdr("cdp_si_s32_hdr", "Morals", "social_norms"),
  q("cdp_si_s32_1", "Can the learner understand why people break rules (e.g., stealing, trespassing, property destruction)?", "social_norms"),
  q("cdp_si_s32_2", "Does the learner recognize the difference between legality and morality?", "social_norms"),

  hdr("cdp_si_s33_hdr", "Complaining Effectively", "self_advocacy"),
  q("cdp_si_s33_1", "Can the learner make a complaint supported by appropriate facial expression and body language?", "self_advocacy"),
  q("cdp_si_s33_2", "Is the learner able to associate complaints with different scenarios (e.g., speaking to the manager or writing an email)?", "self_advocacy"),

  hdr("cdp_si_s34_hdr", "Dealing with Peer Pressure", "conflict_resolution"),
  q("cdp_si_s34_1", "Can the learner identify two ways in which peer pressure can positively affect someone?", "conflict_resolution"),
  q("cdp_si_s34_2", "Can the learner identify two ways in which peer pressure can negatively affect someone?", "conflict_resolution"),

  hdr("cdp_si_s35_hdr", "My Independence", "self_advocacy"),
  q("cdp_si_s35_1", "Can the learner suggest ways to help at home (e.g., chores, sorting laundry, shopping)?", "self_advocacy"),
  q("cdp_si_s35_2", "Does the learner know how to use household appliances (e.g., microwave, vacuum cleaner, lawn mower)?", "self_advocacy"),

  hdr("cdp_si_s36_hdr", "Using Assertiveness", "self_advocacy"),
  q("cdp_si_s36_1", "Is the learner able to assert themselves by asking appropriate questions in a confrontational situation?", "self_advocacy"),

  hdr("cdp_si_s37_hdr", "My Plans", "self_advocacy"),
  q("cdp_si_s37_1", "Can the learner understand why they need to inform relevant adults of their plans?", "self_advocacy"),

  hdr("cdp_si_s38_hdr", "Consequences of What I Say", "social_norms"),
  q("cdp_si_s38_1", "Does the learner follow group rules in order to work cooperatively (e.g., listen to others, wait for a gap to speak, don't interrupt)?", "social_norms"),
  q("cdp_si_s38_2", "Is the learner able to explain what behaviors give a good impression (e.g., good manners, appropriate behavior, complimenting others, being helpful)?", "social_norms"),
];

export type ExaminerAssessment = "rrfa" | "rda" | "rppi" | "rrca";

export interface InstructionSection {
  title: string;
  script?: string;
  steps: string[];
  caution?: string;
}

interface ExaminerGuide {
  name: string;
  description: string;
  sections: InstructionSection[];
}

export const examinerGuides: Record<ExaminerAssessment, ExaminerGuide> = {
  rrfa: {
    name: "RRFA",
    description: "Oral reading preparation, student scripts, timing, error recording, scoring, and submission.",
    sections: [
      {
        title: "1. Prepare the oral reading session",
        steps: [
          "Confirm the student and assignment. Select In-Person or Virtual, then 60-Second Reading or Full Passage Reading. Record the examiner, language, and relevant reading history in General Examiner Notes.",
          "Choose the passage language and topic, generate the passage, and review its suitability and formatting before presenting it. Do not regenerate after the student begins.",
          "Provide a clean student copy or the student passage view; keep scoring controls private. For virtual sessions, check text size, audio, and connection stability before timing.",
          "Agree on the reading-unit and error-counting conventions before administration. For Chinese-language material, distinguish words from characters; characters per minute must not be reported as words per minute.",
        ],
      },
      {
        title: "2. Explain the task",
        script: "Please read this passage aloud. Read as accurately and smoothly as you can. If you make a mistake, you may correct yourself. I will listen and keep track of your reading.",
        steps: [
          "For 60-second reading, add: “Keep reading until I ask you to stop.” For full-passage reading, add: “Continue until you reach the end of the passage.”",
          "Confirm where to begin. Do not ask the student to sacrifice accuracy for speed or preview difficult words from the scored passage.",
        ],
      },
      {
        title: "3. Time the selected reading condition",
        steps: [
          "Use the same approved starting convention consistently. Start the timer and track the reading on the examiner copy.",
          "For 60-second reading, monitor the timer yourself. At 60 seconds, say “Stop there. Thank you,” stop timing, and mark the endpoint. Do not assume an automatic cutoff.",
          "If the student finishes before 60 seconds, record the actual elapsed time and passage completion; do not invent extra reading to fill the interval.",
          "For full-passage reading, stop timing at the final word and record actual elapsed seconds. If unfinished, record the stopping point and reason rather than calling it a completed full-passage trial.",
          "Click the last word read to populate Words Read, then verify the count. The interface counts whitespace-separated tokens; this may not be a suitable linguistic word count for every language.",
        ],
      },
      {
        title: "4. Record reading behavior",
        steps: [
          "Record substitutions, omissions, insertions, mispronunciations, repetitions, loss of place, and any examiner-supplied words according to the clinic’s approved error convention.",
          "Enter Errors, Self-Corrections, and Hesitations separately. Document the original response and correction where relevant; avoid accidentally counting the same event twice.",
          "Consider accepted accent and dialect variations. Apply an approved hesitation definition consistently; this form does not establish a universal word-wait or rescue rule.",
          "During scored reading, do not teach or indicate correctness. Record assistance, interruptions, anxiety, fatigue, attention, and language familiarity in General Examiner Notes.",
        ],
      },
      {
        title: "5. Check calculations and select the rating",
        steps: [
          "WPM = Words Read ÷ Reading Time in Seconds × 60. This is not automatically correct words per minute; errors are reflected separately in Accuracy.",
          "Accuracy = (Words Read − Errors) ÷ Words Read × 100. Check that time is positive, the word count matches the endpoint, and error counts are plausible.",
          "Select Fluent and Expressive, Mildly Slow, Moderately Slow, or Significantly Slow based on pace, continuity, phrasing, expression, and effort in the observed sample.",
          "The concern category follows the selected examiner rating. It is not an established age-specific WPM classification; the rating alone does not demonstrate age-appropriate performance.",
        ],
      },
      {
        title: "6. Pause, save, and finalize",
        steps: [
          "Pause or discontinue for student distress, withdrawal, illness, access problems, or technical failure. Record the reason, endpoint, and impact on validity; do not silently remove interrupted time.",
          "Save Draft if the session needs completion or review. Before submitting, check the passage, condition, language, counts, time, rating, and notes.",
          "Select Submit when ready, wait for the success message, and return to the case to confirm Completed and available results. A displayed score or “Auto-saving” label is not confirmation of final submission. Submitted sessions are read-only.",
        ],
      },
    ],
  },
  rda: {
    name: "RDA",
    description: "Nonword presentation, student script, response recording, item scoring, and submission.",
    sections: [
      {
        title: "1. Prepare the decoding session",
        steps: [
          "Confirm the student and assignment, select the administration mode, and record the examiner, language background, phonics exposure, and relevant access needs in General Examiner Notes.",
          "Present the 20 printed nonwords in the displayed order. Use a clean student view or printed copy; keep expected responses and scoring controls private.",
          "Review an approved pronunciation and partial-credit guide before testing. The written nonwords are not a complete phonetic key; agree on acceptable vowel interpretations and accent variants.",
          "For virtual sessions, check that the nonwords are legible and spoken responses are audible before beginning.",
        ],
      },
      {
        title: "2. Explain the task",
        script: "These are made-up words. They do not have meanings. Please read each one aloud as you think it would sound. Try to use the letters and sounds you know.",
        steps: [
          "If clarification is needed, say: “You do not need to know what the word means. Just try to read it.”",
          "Do not pronounce a scored nonword for the student or provide decoding instruction during the test.",
        ],
      },
      {
        title: "3. Present and record each item",
        steps: [
          "Direct attention to the printed nonword, allow an independent attempt, and type the student’s spoken response as closely as possible.",
          "Score and annotate the item before moving on. Use neutral acknowledgments without confirming correctness.",
          "Record vowel errors, omitted or substituted consonants, cluster difficulties, added sounds, syllable errors, real-word substitutions, sounding-out attempts, and independent corrections.",
          "This form does not have a timed decoding score or an official consecutive-error stopping rule. Do not introduce those as ReMynd requirements.",
        ],
      },
      {
        title: "4. Score the response",
        steps: [
          "1 = correct; ½ = partially correct or independently self-corrected; 0 = incorrect or no response to a validly presented item.",
          "Leave the score blank (–) only for an unadministered item. Distinguish technical inaudibility or inability to access the material from an incorrect decoding response.",
          "Use the approved partial-credit criteria consistently. A response corrected after examiner teaching is not an independent self-correction.",
          "The maximum for a complete administration is 20 points. Percentage = total item points ÷ number of scored items × 100; blank items are omitted from the denominator.",
          "The app’s bands are Low at ≥85%, Mild at ≥70%, Moderate at ≥50%, and Significant below 50%. They are descriptive application bands, not age norms, percentiles, or diagnoses. Identify any incomplete administration explicitly.",
        ],
      },
      {
        title: "5. Pause, save, and finalize",
        steps: [
          "Pause or stop for distress, withdrawal, fatigue, or access/technical problems. Document the stopping point, assistance, and omitted items; do not enter zero for items never administered.",
          "Save Draft if the record needs completion or review. Check every administered item’s response, score, notes, and the administered count before finalizing.",
          "Select Submit, wait for the successful submission message, and confirm Completed and available results on the case. A visible percentage or “Auto-saving” label is not final submission confirmation. Submitted sessions are read-only.",
        ],
      },
    ],
  },
  rppi: {
    name: "RPPI",
    description: "Oral phonological tasks, domain-specific scripts, rapid naming, exclusions, scoring, and submission.",
    sections: [
      {
        title: "1. Prepare the phonological processing session",
        script: "We are going to do some activities with words and sounds. Listen carefully and tell me your answer. Later, you will name some letters and numbers. I will explain each activity before we begin.",
        steps: [
          "Confirm the student and assignment, select the administration mode, and record the examiner, language background, hearing/access needs, and contextual factors in General Examiner Notes.",
          "There are six oral domains with 10 items each, followed by rapid letter and digit naming. Keep examiner prompts, expected answers, response fields, and scores private.",
          "Review pronunciation before testing. Use speech sounds rather than letter names for sound-level tasks; some displayed sound notation is informal and requires a clinical-lead-reviewed pronunciation key.",
          "Use approved, unscored practice to establish understanding. During scored items, do not teach, correct, or indicate correctness. Record the verbal response and score before proceeding.",
        ],
        caution: "Current deletion, substitution, and nonword-repetition practice examples overlap scored items. Obtain distinct, approved practice examples before routine use, or document any exposure to a scored item. Do not silently treat a rehearsed item as an independent first attempt.",
      },
      {
        title: "2. Rhyming awareness — 10 items",
        script: "I am going to say some words. Tell me which word rhymes with the first word.",
        steps: [
          "The displayed practice is CAT with HAT / DOG / SUN; the expected choice is HAT.",
          "Read each target and its options exactly as presented, with a neutral tone and without emphasizing the correct option.",
          "Record an unambiguous selection and score against the expected answer. Do not show the examiner answer key.",
        ],
      },
      {
        title: "3. Phoneme blending — 10 items",
        script: "Listen carefully. Put the sounds together and tell me the word.",
        steps: [
          "Present separate speech sounds at consistent pacing, not letter names. Avoid adding an unnecessary “uh” to consonants.",
          "Use the reviewed pronunciation key, rather than mechanically reading slash-delimited spellings. Record the blended word and any omissions, additions, or substitutions.",
        ],
      },
      {
        title: "4. Phoneme segmentation — 10 items",
        script: "Tell me all the sounds you hear in the word.",
        steps: [
          "Say the whole target naturally and ask for its individual sounds, not its spelling.",
          "Score against the approved phoneme sequence. A digraph is not automatically two sounds because it has two letters. Record sound order, omissions, and additions.",
        ],
      },
      {
        title: "5. Phoneme deletion / elision — 10 items",
        script: "I will ask you to say a word, then say it again without one sound.",
        steps: [
          "Present the word and specified sound-removal instruction as displayed, without supplying the resulting answer.",
          "Record the resulting spoken form. Keep the task at sound level; do not replace it with a letter-removal exercise.",
        ],
      },
      {
        title: "6. Phoneme substitution — 10 items",
        script: "I will ask you to change one sound in a word to make a new word.",
        steps: [
          "State the original word and requested sound change without modeling the answer during scored trials.",
          "Record whether the correct sound changed and whether the remaining sounds were preserved.",
        ],
      },
      {
        title: "7. Nonword repetition — 10 items",
        script: "Listen carefully and repeat exactly what I say. These are made-up words.",
        steps: [
          "Present each nonword orally with consistent pronunciation; do not show its spelling or divide it into smaller units unless the approved protocol permits this.",
          "Record the repetition, including sound substitutions, omissions, additions, and sequencing changes.",
          "If the stimulus was inaudible, document the technical problem. A repeat after audio failure is different from an extra presentation following an incorrect answer.",
        ],
      },
      {
        title: "8. Score and exclude oral items correctly",
        steps: [
          "1 = correct; 0.5 = partial or independently self-corrected; 0 = incorrect/no response to a validly administered item. Apply approved partial-credit criteria consistently.",
          "Select N/A — Not administered for every omitted item. An included item with a blank score can count as zero in the current calculation.",
          "The first five domains form the phonological-awareness composite, with a full maximum of 50 points. Its denominator remains 50 even when items are excluded; identify an incomplete composite and do not compare it as a complete result.",
          "Review domain responses and the nonword-repetition result separately; the overall concern label must not obscure specific strengths, weaknesses, or incomplete coverage.",
        ],
      },
      {
        title: "9. Rapid letter and digit naming",
        script: "Name each letter as quickly and accurately as you can. Start here and go across each row.",
        steps: [
          "For the digit task, say: “Name each number as quickly and accurately as you can. Start here and go across each row.” Each task has a five-row, ten-column grid: 50 items.",
          "Confirm the direction of reading and symbol familiarity using approved familiarization. Show only the relevant grid, not the examiner controls or answers.",
          "Use a consistent timing convention. Track across the rows, stop timing at the final item, and record actual seconds, errors, self-corrections, and notes for each task separately.",
          "Avoid inadvertently counting one corrected response as both an uncorrected error and a correction. Document interruptions; do not silently subtract time.",
          "Adjusted time = raw seconds + (errors × 3) + self-corrections. The interface labels ≤50 seconds Typical, >50–75 Mild Concern, >75–110 Moderate Concern, and >110 Significant Concern. These are fixed application thresholds, not demonstrated age-adjusted norms.",
          "Review both tasks independently. The current summary uses the first populated naming rating, not automatically the poorer of the two tasks.",
        ],
      },
      {
        title: "10. Pause, save, and finalize",
        steps: [
          "Pause or stop for distress, withdrawal, fatigue, hearing/access difficulties, or technical failure. Record the reason and any extra presentations or assistance. Do not invent a consecutive-error or response-timeout rule.",
          "Save Draft when incomplete. Before submitting, review all six oral domains, explicit N/A exclusions, both naming records, and notes about practice exposure or deviations.",
          "Select Submit RPPI and complete the confirmation. Wait for the success message, then confirm Completed and available results on the case. Draft saving is not final submission. Submitted sessions are read-only.",
        ],
      },
    ],
  },
  rrca: {
    name: "RRCA",
    description: "Passage review, reading conditions, student script, question scoring, and submission.",
    sections: [
      {
        title: "1. Prepare the passage and answer key",
        steps: [
          "Confirm the student and assignment, select the administration mode, language, difficulty, and topic, and generate the passage before testing.",
          "Review passage suitability and all 10 questions: five Literal, three Inferential, and two Vocabulary. Confirm each question is clear and supported by the passage.",
          "Prepare an examiner answer key with required answer elements, acceptable paraphrases, partial-credit examples, text-supported inferences, and vocabulary meanings in context. Generated questions are not a validated answer key.",
          "Keep the answer key and scoring controls private. Do not regenerate after administration starts: regeneration changes the task and resets scores.",
        ],
      },
      {
        title: "2. Establish and document the reading condition",
        steps: [
          "Before testing, decide whether reading is silent or oral, whether the passage remains available during questions, whether rereading is permitted, and whether answers are oral or written.",
          "Record the examiner, language, chosen conditions, and relevant access needs in General Examiner Notes. Apply the conditions consistently when comparing sessions.",
          "If the examiner reads the passage aloud to the student, document listening-supported comprehension rather than describing it as independent reading comprehension.",
          "For virtual sessions, check passage legibility and audio. RRCA has no formal timed comprehension score.",
        ],
      },
      {
        title: "3. Explain the task",
        script: "Please read this passage carefully. When you have finished, I will ask you some questions about it. Answer in your own words.",
        steps: [
          "Explain the chosen access rule: “You may look back at the passage while answering,” or “After you finish reading, I will put the passage aside before asking the questions.”",
          "Do not change the access or rereading rule midway through testing without documenting the deviation.",
        ],
      },
      {
        title: "4. Ask and record the questions",
        steps: [
          "Ask questions in displayed order and use a neutral tone. Allow an independent response, record it, score against the prepared key, and continue without indicating correctness.",
          "If the approved protocol permits clarification, use a neutral prompt such as “Tell me what you mean.” Do not supply clues, identify the answer-bearing sentence, or turn the question into a leading question.",
          "Use each question’s Notes field to preserve the student’s answer and explain the score; there is no separate verbatim-response field on this form.",
        ],
      },
      {
        title: "5. Apply the question rubric",
        steps: [
          "1 = correct, with essential information or a justified inference; ½ = relevant but incomplete according to the prepared partial-credit criteria; 0 = incorrect, unsupported, irrelevant, or no response to an administered question.",
          "Leave unadministered questions unscored and document why. Clicking a selected score again clears it.",
          "For Literal questions, accept accurate paraphrases containing the required facts. For Inferential questions, require a reasonable conclusion supported by the passage. For Vocabulary questions, accept the meaning appropriate to that passage.",
          "Do not reduce comprehension credit for accent, grammar, or spelling unless these prevent the answer from being understood or are separately being assessed.",
        ],
      },
      {
        title: "6. Review the score and its limits",
        steps: [
          "A complete assessment has maxima of 5 Literal, 3 Inferential, and 2 Vocabulary points: 10 overall.",
          "Percentage = total points ÷ number of scored questions × 100. Blank questions are omitted from the denominator; clearly identify incomplete administration even if the percentage is high.",
          "The app’s bands are Low at ≥85%, Mild at ≥70%, Moderate at ≥50%, and Significant below 50%. These are application-defined bands, not validated age classifications.",
          "Review the actual responses, passage difficulty, vocabulary demands, language familiarity, reading condition, and decoding difficulty that may have affected comprehension.",
        ],
      },
      {
        title: "7. Pause, save, and finalize",
        steps: [
          "Pause or stop for distress, withdrawal, fatigue, or access/technical problems. Record the stopping point, assistance, interruptions, and incomplete questions rather than scoring unseen questions zero.",
          "Save Draft if incomplete or awaiting review. Check the passage, conditions, responses in Notes, item scores, domain totals, and contextual notes before final submission.",
          "Select Submit, wait for the success message, and confirm Completed and available results on the case. A calculated percentage or “Auto-saving” label is not confirmation of final submission. Submitted sessions are read-only.",
        ],
      },
    ],
  },
};
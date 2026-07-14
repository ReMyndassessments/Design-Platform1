# ReMynd — Student View Pages: Invigilator Reference

**Purpose:** Backup reference for invigilators showing the student-facing URL for each Examiner-Administered Battery assessment.

---

## How URLs are structured

All student view URLs follow this base pattern:

```
https://[your-domain]/student-view/[assessment]/[token]
```

The token is generated per-assignment and is visible (with a copy button and QR code) inside each assessment's examiner panel.

---

## Assessment-by-Assessment Reference

---

### 1. ReMynd Decoding Assessment (RDA)

| | |
|---|---|
| **Student URL** | `https://[your-domain]/student-view/rda` |
| **Token required?** | No — the URL is the same for every session |
| **What the student sees** | 20 pseudowords displayed as numbered tiles in a grid (large font, clean white background) |
| **Student instruction** | *"Read each word aloud. Take your time."* |
| **How to open** | Type or bookmark the URL directly — no token needed |

**Invigilator note:** This page is fully static. The student reads each pseudoword aloud; the examiner marks responses in their admin panel.

---

### 2. ReMynd Reading Fluency Assessment (RRFA)

| | |
|---|---|
| **Student URL** | `https://[your-domain]/student-view/rrfa/[TOKEN]` |
| **Token required?** | Yes — unique per assignment |
| **Where to find token** | RRFA examiner panel → copy link button or QR code |
| **What the student sees** | An AI-generated reading passage (full text, serif font, large size) |
| **Passage modes** | **Full passage** — passage appears immediately; **60-second** — student sees a waiting screen until the examiner presses Start, then passage appears with a live countdown timer |
| **Student instruction** | *"Read the passage aloud. Take your time."* (or waits for examiner signal in 60-second mode) |

**Invigilator note:** In 60-second mode the student screen shows *"Waiting for your examiner to start…"* until you press the start button. The countdown turns red below 10 seconds. The student can tap *"I've finished reading"* if they finish early.

---

### 3. ReMynd Reading Comprehension Assessment (RRCA)

| | |
|---|---|
| **Student URL** | `https://[your-domain]/student-view/rrca/[TOKEN]` |
| **Token required?** | Yes — unique per assignment |
| **Where to find token** | RRCA examiner panel → copy link button (also shareable via email, WhatsApp, SMS) |
| **What the student sees** | Reading comprehension passage (serif font, full text, white background) |
| **Student instruction** | *"Read the passage aloud. When you have finished reading, let your examiner know."* |

**Invigilator note:** The passage is displayed in full from the moment the URL is opened. There is no timer. The student reads independently; the examiner asks comprehension questions verbally and records responses in their panel.

---

### 4. RMRA — ReMynd Mathematical Reasoning Assessment

| | |
|---|---|
| **Student URL** | `https://[your-domain]/student-view/rmra/[TOKEN]` |
| **Token required?** | Yes — unique per assignment |
| **Alternate URL format** | `https://[your-domain]/rmra/student/[TOKEN]` *(same page, both work)* |
| **Where to find token** | RMRA examiner panel → copy link button or **Show QR** button |
| **What the student sees** | Visual stimuli for each math task (dot arrays, number lines, fraction bars, base-ten blocks, etc.) that sync in real time to the examiner's current item |
| **Themes** | Space Mission 🚀 · City Builder 🏙️ · Bakery Math 🧁 · Robot Factory 🤖 · Treasure Builder 🏴‍☠️ |
| **Student instruction** | *"Look at the picture on your screen and tell me your answer."* |

**Invigilator note:** The student screen updates automatically as the examiner advances items — no action needed from the student between tasks. The screen shows a themed waiting animation between items.

---

### 5. ReMynd Phonological Processing Index (RPPI)

| | |
|---|---|
| **Student URL** | **None — no student screen** |
| **How it works** | Fully oral/verbal. The examiner reads each item aloud to the student. The student responds verbally. The examiner types and scores responses in their own panel. |

**Invigilator note:** No device is needed for the student during RPPI. All interaction happens through the examiner's screen only.

---

## Quick-reference table

| Assessment | Token needed? | Student URL pattern |
|---|---|---|
| RDA — Decoding | No | `/student-view/rda` |
| RRFA — Reading Fluency | Yes | `/student-view/rrfa/[token]` |
| RRCA — Reading Comprehension | Yes | `/student-view/rrca/[token]` |
| RMRA — Math Reasoning | Yes | `/student-view/rmra/[token]` |
| RPPI — Phonological Processing | N/A | No student view |

---

## Backup: if copy-link fails

1. Open the examiner panel for the assessment
2. Look for the **QR code** button (RMRA and case-level assignments) — scan it with the student's device camera
3. Alternatively, use the **email / WhatsApp / SMS** share buttons available on RRCA and RRFA panels to send the link directly to the student's device

---

*Generated: July 14, 2026*

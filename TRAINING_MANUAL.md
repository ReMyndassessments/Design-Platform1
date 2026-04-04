# ReMynd Assessment Operating System (RAOS)
## Staff Training Manual — All Roles

**Version:** Current as of April 2026
**Applies to:** Admin · Assessment Invigilator · Psychometrician

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [System Overview — The Case Lifecycle](#2-system-overview--the-case-lifecycle)
3. [Role: Admin](#3-role-admin)
4. [Role: Assessment Invigilator](#4-role-assessment-invigilator)
5. [Role: Psychometrician](#5-role-psychometrician)
6. [The Parent & School Portal](#6-the-parent--school-portal)
7. [The External Respondent Portal](#7-the-external-respondent-portal)
8. [Report Delivery — Full End-to-End Flow](#8-report-delivery--full-end-to-end-flow)
9. [Meeting Rooms — Invigilation & Debrief](#9-meeting-rooms--invigilation--debrief)
10. [Assessment Tools Library](#10-assessment-tools-library)

---

## 1. Getting Started

### Accessing RAOS
Navigate to the RAOS URL in any modern browser. The login page presents an email/password form.

### Staff Accounts

| Name | Email | Role |
|------|-------|------|
| Noel | noelroberts43@gmail.com | Admin |
| Hayley | hayleyxu13@gmail.com | Assessment Invigilator |
| Abegail | cioconabegail@gmail.com | Psychometrician |

All accounts use the password **password** unless individually changed via the Team page.

### Navigation
Once logged in, the left sidebar provides access to all sections permitted by your role:
- **Cases** — the central case list
- **Tools** — assessment tool library (Admin only)
- **Team** — staff management (Admin only)
- **Inquiries** — parent/school referrals (Admin + Invigilator)

---

## 2. System Overview — The Case Lifecycle

Every student assessment moves through a fixed sequence of phases shown as a stepper at the top of each case page. The phases are:

```
Pre-Commitment → Setup → Assessment → Scoring → Report → Final Review → Debrief → Complete
```

Each phase gates what actions are available. Staff cannot send a report before it is uploaded; the system enforces every handoff automatically.

### Phase Summary

| Phase | Who acts | What happens |
|-------|----------|--------------|
| **Pre-Commitment** | Admin | Reviews inquiry, creates case, assigns staff |
| **Setup** | Admin | Assigns assessment battery, sends forms to parent & teachers |
| **Assessment** | Invigilator | Runs virtual assessment session via Jitsi |
| **Scoring** | Psychometrician | Calculates and reviews scores, completes observation entries |
| **Report** | Admin + Psychometrician | Collaborative Google Doc drafting, both parties approve |
| **Final Review** | Admin | Imports Google Doc as PDF, saves debrief meeting link, test-sends report |
| **Debrief** | Admin | Sends live report tokens to parent and teacher; parent consent gate active |
| **Complete** | Admin | Marks case closed after debrief meeting |

---

## 3. Role: Admin

The Admin has full read/write access across the entire system. All phase transitions are admin-initiated.

### 3.1 Managing Inquiries

Families and schools submit inquiries through the public portal. Admins review these in **Inquiries** (sidebar).

Each inquiry shows: inquiry type (parent / school), contact details, student information, and the submitted message. From the inquiry panel, an Admin can **create a new case** directly from the inquiry, which pre-fills available student details.

### 3.2 Creating a Case

From the Cases list, click **+ New Case**. Fill in:
- Student name, date of birth, year group, and school
- Presenting concerns and referral reason
- Assign an **Invigilator** and **Psychometrician** from the team

Once created, the case begins in the **Pre-Commitment** phase. Click **Advance Phase** to move forward when ready.

### 3.3 AI Intake Analysis

On the **Overview** tab of any case, paste or type the intake notes into the Intake field, then click **Analyse with AI**. The system returns:
- A recommended list of assessment domains
- A risk level (Low / Moderate / High)
- A clinical summary of presenting concerns
- Flags (e.g. "Possible ADHD presentation")
- Suggested assessment tools

This analysis is advisory only and does not automatically assign anything.

### 3.4 Assigning an Assessment Battery

On the **Setup** tab, select a product (battery):
- **Tier 1 — Core Screener (RCS-80):** Short screener
- **Tier 2 — Comprehensive Educational Profile (RCEP):** Full multi-informant battery
- **Tier 3 — Integrated Clinical Assessment (RICA):** Comprehensive clinical battery

After selecting a product, RAOS displays the respondent slots (Parent, Teacher 1, Teacher 2, Student Self-Report, Invigilator). Enter the email address and name for each respondent.

Click **Send Forms** to generate unique secure links for each respondent and dispatch the emails.

The Setup tab tracks each respondent's status:
- **Pending** — link sent, form not started
- **In Progress** — form partially completed
- **Completed** — form submitted

Admins can resend an individual link at any time by clicking the resend icon next to that respondent.

### 3.5 Managing the Report Phase

The **Report** tab is the collaborative workspace:

1. **Link the Working Doc:** Paste the Google Doc URL into the Working Doc field and save. Both the Admin and Psychometrician can then open the doc directly from RAOS.

2. **Approvals:** Both Admin and Psychometrician must click **Mark as Final** on their respective approval panels. Changing the Google Doc URL after approval automatically resets both approvals.

3. **Admin Override of Psychometrician:** If Abegail is unavailable, Admin can click **Override** to approve on her behalf. This is logged and bypasses her signature.

4. **Attaching the Report:** Once both approvals are confirmed, click **Attach Report** to import the Google Doc as a PDF. Alternatively, upload a PDF directly. This PDF becomes the file sent to the family.

### 3.6 Final Review — Before Sending

The **Final Review** phase requires two things before the Send button is enabled:

1. **Debrief Meeting Link saved** — enter the Jitsi meeting URL in the Debrief Meeting field (see Section 9 for how to generate this). Optionally set a scheduled date.
2. **Report PDF attached**

Once both are present, two options appear:

- **Test Send** — Sends a preview to your own email, generating a real temporary parent token. Use this to walk through the exact parent experience (portal view, consent flow, teacher email) before going live.
- **Send Report** — Sends the live parent email and creates the permanent parent and teacher tokens.

> **Important:** The Test Preview token is automatically deleted the next time you run Test Send for the same case, preventing accumulation.

### 3.7 Admin Overrides in Debrief Phase

Once a live report is sent, the **Debrief** tab shows token status. Key override actions:

- **Override Consent** — Appears only after the parent has downloaded the report at least once. Use this if the parent gives verbal consent to share the report with the school but does not click the "Grant Access" button in their portal. This immediately unlocks the teacher's download and triggers the teacher notification email.
- **Resend Parent Email** — Resends the parent's access email if they report not receiving it.
- **Resend Teacher Email** — Only available if teacher consent has already been granted.

### 3.8 Team Management

Navigate to **Team** in the sidebar. This page is visible to Admins only.

- **Invite staff** — enter name, email, role, and password to create an account
- **Edit role or name** for existing staff
- **Delete accounts** — removes access immediately

Staff added here automatically receive admin notification emails for report downloads and consent events (no configuration required).

### 3.9 Phase Navigation

Admins can move cases **forward or backward** through phases using the **Advance** and **Step Back** buttons at the top of the case. Use Step Back if data needs to be corrected in a prior phase.

---

## 4. Role: Assessment Invigilator

The Invigilator's primary responsibility is facilitating the live virtual assessment session with the student.

### 4.1 Your Case List

Log in and navigate to **Cases**. You will see only the cases you have been assigned to as Invigilator.

### 4.2 Before the Session — Setup Phase

While the case is in Setup, your role is to:
- Confirm the respondent list is correct (contact Admin if anything needs changing — only Admins can modify respondents)
- Review the assigned assessment battery and familiarise yourself with the tools being used

### 4.3 Running the Assessment — Assessment Phase

When the case moves to the **Assessment** phase, the **Invigilation Meeting Room** card becomes active (see Section 9 for the full Jitsi flow).

**Step-by-step:**

1. Go to the **Assessment** tab of the case.
2. In the Invigilation Meeting Room card, click **Open Jitsi Moderated Meetings**.
3. A new tab opens. Create a room — Jitsi will give you two links: a **moderator link** and a **guest link**. Copy the guest link.
4. Return to RAOS and paste the guest link into the Guest Link field. Click **Save & Open Room**.
5. Your browser opens the meeting as moderator. Share the guest link separately with the student/family (via email or WhatsApp).

> **Always join first** before sharing the guest link. The moderator must be present before guests enter.

### 4.4 Completing the Observation Form

While in the session, complete the **Invigilator Observation Form** within the Assessment tab. This form captures behavioural observations during the session (attention, effort, rapport, etc.).

The form must be submitted before scoring can begin.

### 4.5 Viewing Scores

After the Psychometrician calculates scores (Scoring phase), you can view the **Scoring** tab for context. You do not have permission to edit scores.

---

## 5. Role: Psychometrician

The Psychometrician is responsible for scoring the assessment and formally approving the clinical report.

### 5.1 Your Case List

Log in and navigate to **Cases**. You will see only the cases you have been assigned to as Psychometrician.

### 5.2 Scoring Phase

Once all respondents have submitted their forms and the case has moved to **Scoring**, navigate to the **Scoring** tab.

#### Calculating Scores

Click **Recalculate Scores** to run the automated scoring engine. The system:
- Maps each question response to its domain (e.g. Attention, Executive Function, Social-Emotional)
- Computes the mean score per domain per respondent
- Normalises to a 0–100 scale

#### Reading the Results

The scoring tab displays:
- **Radar charts** — multi-domain profile per respondent
- **Bar charts** — cross-informant comparison (e.g. Parent vs Teacher 1 vs Teacher 2 for the same domain)
- **Clinical narratives** — auto-generated descriptors based on score ranges (Low / Mild / Moderate / Elevated)

**Strengths-based vs deficit-based:** Most domains use a deficit model (higher score = greater concern). Some tools (e.g. EFA — Emotional Functioning) are strengths-based (higher score = stronger functioning). The UI labels each domain accordingly so you can interpret correctly.

#### High Discrepancy Flag

A red **High Discrepancy** flag appears on any domain where two informants' scores differ by more than 1.5 points (raw). This commonly appears between Teacher 1 and Teacher 2. When flagged:
- Note the discrepancy in the clinical narrative
- Consider whether one context (home vs school) may explain the difference
- Do not average or dismiss without clinical reasoning

#### Manual Score Override

If a form response appears clinically suspect or was completed incorrectly, you can manually enter scores for any domain by clicking the edit icon on that domain row. Manual scores are flagged as overrides in the record.

### 5.3 Report Phase — Collaboration

Navigate to the **Report** tab.

1. Open the linked Google Doc (Admin must have linked it first — see Section 3.5)
2. Draft or review the report collaboratively with Admin in the shared doc
3. When the clinical content is complete and accurate, click **Mark as Final**

Your "Mark as Final" constitutes your clinical sign-off. If the Admin subsequently changes the Google Doc URL, your approval is automatically cleared and you will need to re-approve.

> If you have an urgent scheduling conflict and cannot sign off, notify the Admin so they can use the Override function — this is documented in the system.

---

## 6. The Parent & School Portal

The public-facing landing page at `/portal` is accessible to anyone without login. It serves two purposes:

### 6.1 Information

The portal explains:
- What a psychoeducational assessment covers (Cognition, Executive Function, Social-Emotional, Sensory, Academic)
- How the process works
- ReMynd's approach and team

### 6.2 Submitting an Inquiry

Families and schools can submit a **referral inquiry** by clicking **Get Started** or **Make a Referral**. The form collects:
- Inquiry type (parent / school)
- Contact name, email, phone
- Organisation and role
- Student name, age, year group
- Reason for referral / message
- Optional: WeChat ID or WhatsApp number

On submission, the inquiry is saved to the RAOS database and an email notification is sent to all Admin staff. Inquiries appear in the **Inquiries** dashboard within RAOS immediately.

---

## 7. The External Respondent Portal

The portal at `/external/[token]` is the secure interface for everyone who is **not** a RAOS staff member: parents, teachers, and students completing forms.

This portal is multilingual: respondents can switch between **English**, **中文 (Chinese)**, and **한국어 (Korean)** using the language toggle at the top right.

### 7.1 Form Completion (Setup Phase)

When a respondent opens their unique link:
1. They see a welcome screen with their name and the student's name
2. They proceed through the questionnaire — Likert scale questions, text fields, and where applicable, a signature field
3. Progress is saved automatically; they can return later using the same link
4. On final submission, the form is locked and cannot be edited

Respondents do **not** need to create an account or remember a password. The link itself is their credential.

### 7.2 Parent Report Access (Debrief Phase)

Once a report has been sent, the parent's portal link changes to the **report access view**. The parent sees:
- Student name and current phase
- Report file(s) available for download
- Debrief Meeting card — Jitsi link to join the results meeting, plus scheduled date (if set)

**Entering the portal:** The parent must enter their **6-digit access code** (included in the email) before they can see any report content.

**Downloading the report:** Click the download button next to the report file. A download notification is sent automatically to all Admin staff.

**After downloading — the consent step:** A prompt appears asking whether to share the report with the school:
- **"Yes, share with school"** — the teacher's download is immediately unlocked; the teacher receives an automated email with their access link
- **"Not yet"** — the teacher's link remains blocked; Admin staff are notified that consent was withheld

The parent can revisit their portal as many times as needed but will only see the consent prompt once (on first download).

### 7.3 Teacher Report Access (Debrief Phase)

The teacher's portal link works the same way, with one key difference: **teachers do not need an access code**. However, the download button remains disabled until parent consent is granted.

Once the parent grants access (or Admin overrides):
- The teacher sees the report files and can download immediately
- The Debrief Meeting card is also shown with the Jitsi link and date

If a teacher opens their portal before consent is granted, they see a friendly holding message explaining the report will be available once the parent has authorised sharing.

---

## 8. Report Delivery — Full End-to-End Flow

This section walks through the complete delivery sequence from Admin's perspective.

### Step 1 — Prepare the Report (Final Review phase)
- Report PDF is attached (via Google Doc import or manual upload)
- Both Admin and Psychometrician have clicked Mark as Final (or Admin has used Override)
- Debrief Meeting URL is saved in the case (and optionally a date)

### Step 2 — Test Send (recommended before live send)
Click **Test Send** on the Final Review tab. This:
- Sends a real email to your own address simulating the parent email
- Creates a temporary parent token (deleted on next test send)
- Lets you walk through the full parent experience including the consent-to-teacher flow

### Step 3 — Send Report (live)
Click **Send Report**. RAOS:
- Creates a permanent parent token with a 6-digit access code
- Creates a locked teacher token
- Sends the parent their email with the portal link and access code
- Does **not** send the teacher anything yet — they wait for consent

### Step 4 — Parent Downloads and Responds to Consent
- Parent opens email → clicks link → enters 6-digit code → downloads report
- Parent chooses: **Share with school** or **Not yet**

### Step 5a — Consent Granted
- Teacher token is unlocked automatically
- Teacher receives email with their portal link (no access code required)
- Admin receives a "Report Downloaded" notification confirming the parent acted

### Step 5b — Consent Withheld
- Admin receives notification that the parent withheld consent
- Teacher link remains locked
- If appropriate, Admin uses **Override Consent** (only available after parent has downloaded at least once)

### Step 6 — Debrief Meeting
Both parent and teacher (if consented) can see the Jitsi meeting link and date in their portal. Staff join via the Debrief Meeting Room in RAOS (see Section 9).

### Step 7 — Mark Complete
After the debrief meeting concludes, Admin clicks **Advance Phase** to mark the case as **Complete**.

---

## 9. Meeting Rooms — Invigilation & Debrief

RAOS uses Jitsi for two distinct meeting types, both requiring a 2-step setup to ensure staff always enter as **moderator**.

### 9.1 Invigilation Meeting Room (Assessment Phase)

Used for the live student assessment session.

**Step 1 — Generate the meeting:**
1. In the Invigilation Meeting Room card, click **Open Jitsi Moderated Meetings**
2. A new tab opens on the Jitsi server. Create a new room
3. Jitsi provides two links: your **moderator link** and a **guest link**. Copy the guest link

**Step 2 — Set up in RAOS:**
1. Return to RAOS. Paste the guest link into the Guest Link field
2. Click **Save & Open Room**
3. Your browser opens the meeting with you as moderator
4. Send the guest link to the student/family separately (email, WhatsApp, etc.)

> Do not share your moderator link. Only the guest link goes to the student.

### 9.2 Debrief Meeting Room (Final Review / Debrief Phase)

Used for the results conversation with the family (and school if consented).

The setup process is identical to the Invigilation room:

**Step 1:** Click **Open Jitsi Moderated Meetings** in the Debrief Meeting Room card → create a room → copy the guest link.

**Step 2:** Paste the guest link into the Debrief Meeting URL field → click **Save**. Optionally set a **scheduled date** using the date picker.

The guest link (and date if set) will automatically appear in:
- The parent's portal
- The teacher's portal (once consent is granted)
- The parent and teacher emails

---

## 10. Assessment Tools Library

Accessible via **Tools** in the sidebar (Admin only).

### 10.1 Viewing the Library

The tools library lists all available assessment instruments. Each tool shows:
- Tool name and code (e.g. BASC-3 PRS, BRIEF-2)
- Respondent type (parent / teacher / self / invigilator)
- Number of questions and domains
- Which product (battery) it belongs to

### 10.2 Product Tiers

| Product | Code | Description |
|---------|------|-------------|
| Tier 1 | RCS-80 | Core Screener — short, targeted |
| Tier 2 | RCEP | Comprehensive Educational Profile — multi-informant |
| Tier 3 | RICA | Integrated Clinical Assessment — full clinical battery |

### 10.3 Adding a New Tool (Admin)

Two methods are available:

**Manual entry:**
Click **+ Add Tool** and fill in all fields — name, respondent type, product, questions, answer options, and domain mappings.

**Quick Add from PDF (AI-assisted):**
Upload a photograph or PDF scan of a paper assessment form. The AI analyses the document and extracts questions, answer scales, and suggested domain groupings. Review the extracted data, correct any errors, and confirm to add the tool to the library.

### 10.4 Editing Tools

Click any tool to open its detail view. Admins can edit questions, reorder domains, and adjust scoring logic. Changes apply to future cases only — existing response data is not affected.

---

*For technical issues, contact your system administrator.*
*This manual reflects the system as of April 2026.*

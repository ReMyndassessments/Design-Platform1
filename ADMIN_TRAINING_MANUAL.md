# ReMynd Assessment Operating System (RAOS)
## Administrator Training Manual

---

## 1. Your Role

As an **Administrator**, you have full access to every part of RAOS. You oversee the entire assessment lifecycle from the moment a referral comes in to the final completion of the case. You are responsible for:

- Receiving and converting new referrals into cases
- Assigning staff and managing the team
- Advancing cases through each phase
- Uploading and sending assessment reports to families
- Managing the library of assessment instruments
- Overseeing access and parental consent

This manual walks through each area in order of the workflow.

---

## 2. Logging In

1. Go to the RAOS system URL.
2. Enter your email address and password.
3. You will land on the **Dashboard**.

> If you have forgotten your password, contact your system administrator or use the password reset process.

---

## 3. Your Navigation Menu

As an administrator, you have access to every section of the system:

| Menu Item | What it does |
|-----------|-------------|
| **Dashboard** | Overview of all active cases, recent activity, and pending actions |
| **Cases** | Full list of every case in the system — click any row to open it |
| **Assessment Tools** | Library of all assessment instruments — view, create, edit, and delete |
| **Inquiries** | New referrals submitted through the parent portal |
| **Team** | Add, edit, and remove staff accounts |

---

## 4. Handling New Inquiries

When a family submits a referral through the ReMynd parent portal, it appears in the **Inquiries** section with a badge showing the number of unread items.

1. Click **Inquiries** in the sidebar.
2. Review the referral details — family name, student details, reason for referral, contact information.
3. Contact the family to discuss next steps.
4. When you are ready to proceed, create a new case (see Section 5).

---

## 5. Creating a New Case

Only administrators can create new cases.

1. Click **Cases** in the sidebar.
2. Click the **New Case** button (top right).
3. Fill in the form:
   - **Student Name** — full legal name
   - **Date of Birth**
   - **School** and **Grade**
   - **Language Preference** — English or Chinese (determines which language the parent portal and emails will be displayed in)
   - **Referral Reason** — brief description of the referral basis
   - **Parent Name**, **Parent Email**, and **Parent Phone**
   - **Assigned Invigilator** — select from available invigilators
   - **Assigned Psychometrician** — select from available psychometricians
4. Click **Create Case**.

The case is created in **Pre-Commitment** phase. The assigned invigilator and psychometrician receive an email with a direct link to open the case in RAOS.

> **Note:** All invigilator assessment tools are automatically assigned to the selected invigilator when the case is created.

---

## 6. The Case Lifecycle

Cases move through the following phases in order. As an administrator, you can advance from **any** phase and are the only role that can **step back** a phase.

```
Pre-Commitment → Intake → Setup → Forms → Assessment → Scoring → Report → Final Review → Debrief → Complete
```

### Phase Progress Indicator

The stepper at the top of each case page shows the current phase as a highlighted circle with a percentage. Completed phases show a checkmark.

### Advancing a Phase

1. Open the case.
2. When the current phase's work is complete, click the **Advance** button at the top of the case page (visible only to you and the psychometrician, depending on phase).
3. The case moves to the next phase and the progress percentage updates automatically.

### Stepping Back a Phase

If a mistake was made or a phase needs to be revisited:

1. Open the case.
2. Click the **Step Back** button (visible only to administrators).
3. The case moves to the previous phase.

> Step back is disabled if the case is already in **Pre-Commitment** (the first phase).

---

## 7. Phase-by-Phase Guide

### Pre-Commitment
The family has been referred but not yet formally committed to the assessment. Use this phase to have initial conversations with the family and confirm they want to proceed.

**Your actions:**
- Confirm parental consent and commitment
- Advance to **Intake** when ready to proceed

---

### Intake
Collect all required intake information and formalise the assessment agreement.

**Your actions:**
- Verify all student and parent details are accurate
- Set the working Google Doc URL (this becomes the shared report-drafting document)
- Advance to **Setup** when intake is complete

---

### Setup
The case is being configured. Assign tools and respondents.

**Your actions:**
- Deploy any additional assessment instruments not automatically assigned
- Confirm invigilator and psychometrician assignments are correct
- Advance to **Forms** when setup is complete

---

### Forms
Parents, teachers, and other respondents are completing their rating scales through the parent portal.

**Your actions:**
- Monitor form completion status in the assignments section
- Follow up with respondents who have not completed their forms
- Advance to **Assessment** when all critical forms are submitted

---

### Assessment
The invigilator conducts the live virtual assessment session with the student.

**Your actions:**
- Confirm the invigilator has set up and shared the meeting room link
- Monitor session completion
- Advance to **Scoring** once the session is complete and invigilator forms are submitted

**Invigilation Meeting Room (visible to you during this phase):**
- You can view the saved guest link and join as a moderator if needed
- The invigilator is responsible for setting up this room

---

### Scoring
The psychometrician reviews and calculates domain scores.

**Your actions:**
- Monitor score calculation progress
- Review any high discrepancy flags (where two respondents scored a domain very differently)
- Advance to **Report** once scoring is verified

---

### Report
You and the psychometrician collaborate on the written report, and both must formally approve it before it can be released.

**Your actions:**

1. **Link the Google Doc** — Click **Link Working Doc** and paste the Google Doc URL. Both you and the psychometrician can now edit it simultaneously in real time.

   > If you change the Google Doc URL after both approvals have been given, both approvals are automatically cleared and must be re-confirmed.

2. **Write and review the report** — Collaborate with the psychometrician in the shared document.

3. **Mark as Final** — Once you are satisfied, click **Mark as Final** on the Report tab. The psychometrician must also click theirs.

4. **Both approvals required** — The report cannot be attached or sent until **both** the admin and psychometrician have marked it as final.

5. **Admin override** — If needed, you can approve on the psychometrician's behalf using the override option (use sparingly).

6. Advance to **Final Review** once both approvals are recorded.

---

### Final Review
You prepare the report for delivery. No further document changes should be made at this point.

**Your actions:**

#### Step 1 — Set the Debrief Meeting Link
Before any email can be sent, you must save a debrief meeting link for the family.

1. In the **Debrief Meeting Room** section of the Report Access panel, paste the virtual meeting URL.
2. Click **Save**.

> Neither the test email nor the report delivery email can be sent without a meeting link saved.

#### Step 2 — Preview the Parent Email (Test Send)
1. Click **Preview Email** (or **Send Test**).
2. The system sends a preview email to your own address.
3. The email will have an amber test banner at the top so it is clearly marked as a test.
4. Review the layout, links, access code, and meeting button before sending to the family.

#### Step 3 — Send Report to All Recipients
When everything looks correct:

1. Click **Send Links**.
2. The system:
   - Creates a unique access token for the parent (with a 6-digit access code)
   - Creates tokens for assigned teachers (gated behind parental consent)
   - Sends the parent the report link, access code, and the debrief meeting button
   - Automatically advances the case to **Debrief** at 100% progress

#### Adding Additional Recipients
If other people need direct access to the report (e.g., a specialist or school coordinator):

1. In the **Additional Recipients** section, enter their name and email.
2. Click **Add Recipient** — they receive a direct link with no access code required.

---

### Debrief
The report has been delivered. You are meeting with the family to walk them through the findings.

**Your actions:**
- Conduct the debrief session via the saved meeting link
- Track whether the parent has downloaded the report (shown in the Link Status section)
- Grant teacher access once parental consent is confirmed (see below)
- Advance to **Complete** after the debrief session is finished

#### Granting Teacher Access (Parental Consent Override)
Teachers are sent a link but it is blocked until the parent gives consent. The parent does this through their portal. If needed, you can override manually:

1. Confirm the parent has already downloaded the report (this is a system requirement — the override button appears only after the parent download is recorded).
2. Click **Override Consent** next to the teacher's token.
3. The teacher receives an email immediately with their download link.

#### Re-uploading the Report
If the report needs to be corrected after delivery:

1. Upload a new PDF in the Report Access section.
2. You will be prompted to notify existing recipients of the update — choose whether to resend.

#### Resending Links
If a recipient did not receive their email or needs a new link:

1. Find their entry in the **Link Status** section.
2. Click **Resend**.

---

### Complete
The case is fully closed. All deliverables have been provided and the debrief has taken place.

**Your actions:**
- Confirm all parties have received and downloaded their reports
- Archive any remaining notes
- No further phase advancement is available

---

## 8. Managing the Team

The **Team** section is accessible only to administrators.

### Adding a New Staff Member

1. Click **Team** in the sidebar.
2. Click **Add Staff**.
3. Enter their name, email, and select their role:
   - **Invigilator** — Assessment, scoring, and report phases
   - **Psychometrician** — Scoring and report phases
4. Click **Save** — the staff member receives an invitation to set their password.

### Editing a Staff Member

1. Find the staff member in the Team list.
2. Click their row to open their profile.
3. Update their name, email, or role.
4. Click **Save**.

### Removing a Staff Member

1. Find the staff member in the Team list.
2. Open their profile.
3. Click **Remove** — this deactivates their access immediately.

> You cannot remove or demote other admin accounts, and you cannot change your own role.

---

## 9. Assessment Tools Library

The **Assessment Tools** section allows you to manage the full library of instruments used across all cases.

### Viewing Tools

Click **Assessment Tools** to see the full list. Each tool shows:
- Name and description
- Which respondent types it is assigned to
- Which domains it covers

### Creating a New Tool

1. Click **Add Tool**.
2. Enter the tool name, description, and respondent type(s).
3. Add domains and the questions that belong to each domain.
4. Set the scale maximum (e.g. 1–4, 1–5) for normalisation.
5. Click **Save**.

### Editing a Tool

1. Click on any tool to open it.
2. Make your changes.
3. Click **Save**.

> Changes to a tool do not retroactively affect responses already submitted on cases.

### Deleting a Tool

1. Open the tool.
2. Click **Delete**.
3. Confirm the deletion.

> Deletion is permanent. Only delete tools that are no longer in use across any active cases.

### Deploying Tools to a Case

You can deploy tools directly from the case detail page (not from the Tools library). See Phase Guide — Setup above.

---

## 10. Key System Rules to Know

| Rule | Detail |
|------|--------|
| **Debrief meeting link required** | You cannot send any email (test or live) until a debrief meeting link is saved for the case |
| **Dual approval for reports** | Both admin and psychometrician must approve before the report can be attached and sent |
| **Google Doc change resets approval** | Linking a new Google Doc clears both approvals — both parties must re-approve |
| **Teacher access gated** | Teachers receive a link but cannot download until the parent gives consent or you override |
| **Admin override requires parent download** | You cannot override parental consent for a teacher until the system confirms the parent has downloaded |
| **Step back is admin-only** | Only you can move a case backward to a previous phase |
| **Re-upload resets send gate** | A new PDF upload does not automatically resend — you choose whether to notify recipients |

---

## 11. Getting Help

- **Login problems** → Use the password reset process or contact Replit support.
- **A staff member cannot see a case** → Check that the case is in a phase their role can access; also confirm they are assigned to the case.
- **Parent reports not receiving their email** → Check the Link Status panel to confirm sentAt is recorded; use Resend if needed.
- **Report cannot be attached** → Confirm both admin and psychometrician have clicked Mark as Final.
- **Any system or technical issue** → Contact your ReMynd technical support contact.

---

*ReMynd Assessment Operating System — Confidential Internal Document*

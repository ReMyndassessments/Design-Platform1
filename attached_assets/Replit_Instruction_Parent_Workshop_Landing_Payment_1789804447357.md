# Replit Instruction for Parent Workshop Landing Page Registration and Payment

Implement a production-ready landing page, registration process, email-verification process, payment-selection process, and administrator review workflow for the following ReMynd parent workshop.

## Core instruction

First inspect the existing application before changing anything. Identify the current framework, routes, authentication, database schema, email service, file storage, administrator roles, payment logic, workshop catalogue, registration forms, and deployment configuration.

This must be an additive implementation. Reuse existing components and conventions where appropriate. Do not remove, rename, disable, or break existing workshop pages, registrations, free offerings, payment integrations, administrator functions, or unrelated user data.

Do not publish or deploy until the implementation and verification requirements in this instruction have been completed. If an existing architectural requirement conflicts with this instruction, stop and explain the conflict before making a destructive change.

## Workshop configuration

Create a workshop offering with the following server-controlled information:

- Title: **When Your Child Says, “My Teacher Doesn’t Like Me”**
- Description: **Recognising patterns, protecting your child, and advocating without escalating conflict.**
- Format: Online parent workshop
- Date: Saturday, October 17, 2026
- Time: 10:00 AM to 11:30 AM
- Display timezone: China Standard Time, UTC+8
- Duration: 90 minutes
- Presenter: Noel Roberts
- Organisation: ReMynd Student Services
- Price: 388 RMB per family
- Capacity: Administrator configurable
- Registration opening and closing dates: Administrator configurable
- Status: Draft, Published, Registration Closed, Completed, or Cancelled

The date, price, currency, capacity, availability, payment links, QR images, meeting information, and access status must come from server-controlled workshop configuration. Never trust values submitted by the browser.

## Offer included in the registration

The landing page should explain that the 388 RMB family registration includes:

- One live 90-minute online parent workshop
- English presentation supported by prepared Chinese-language subtitles or translated materials
- A bilingual Parent Action Toolkit
- Access to the workshop WeChat group
- Seven days of structured, workshop-related WeChat group support

Clearly state that this is a parent-education workshop and does not include individual consultation, counselling, psychological assessment, review of school records, or case-specific clinical recommendations.

After the seven-day supported period, parents may be invited to remain connected to the existing ReMynd parent community if they separately consent to receive future educational information and workshop announcements. This optional promotional consent must not be preselected and must not be required to register.

## Landing page design

Create a polished, mobile-first landing page suitable for opening inside the WeChat browser as well as standard mobile and desktop browsers.

Use the visual direction of the approved workshop flyer:

- Warm ivory and pale blue background
- Elegant dark navy typography
- Calm, reassuring, professional tone
- Light painterly landscape influence without reducing readability
- Generous spacing and large mobile-friendly controls
- Clear hierarchy, with the workshop title, date, price, and registration action visible near the top

Noel will supply the final workshop flyer. Add an administrator-configurable workshop flyer upload or media-selection field and display the supplied flyer prominently near the top of the landing page. The flyer is a visual promotional asset, not a substitute for the accessible landing-page content. Do not attempt to recreate, rewrite, or generate a new flyer inside the application.

Support PNG, JPEG, and WebP flyer files. Optimise delivery for mobile without replacing the original stored file, preserve the correct aspect ratio, provide useful administrator-editable alternative text in all supported languages, and avoid cropping essential flyer information. The administrator must be able to preview or replace the flyer before publishing.

Do not use the flyer itself as a text image in place of accessible HTML. All important information must be real HTML text and remain readable by screen readers, search engines, translation tools, and small screens.

The page should include:

1. Workshop title and description
2. Date, time, timezone, duration, and online format
3. Price of 388 RMB per family
4. What parents will learn
5. What is included
6. Who the workshop is for
7. Presenter information
8. Language and translation information
9. Clear boundaries explaining what is not included
10. Registration button
11. Brief frequently asked questions
12. Privacy, terms, cancellation, and contact links

## Central message and tone

Make the purpose of the workshop unmistakable throughout the landing page. This workshop is **not about fighting, blaming, accusing, or trying to prove that the teacher or school is wrong**. It is designed to help parents respond thoughtfully when a child says or appears to believe that a teacher does not like them.

The landing page should explain that parents will be supported to:

- Listen carefully to the child's experience without dismissing it or immediately accepting an untested conclusion
- Protect the child's dignity, emotional safety, and continuing relationship with learning
- Distinguish observable events from assumptions or interpretations
- Consider several possible explanations for what is happening
- Decide what information should be gathered before approaching the school
- Communicate concerns calmly, specifically, and constructively
- Work toward shared understanding and practical support rather than escalating conflict
- Recognise when concerns require further action, additional support, or an appropriate formal process

Use calm, balanced, non-accusatory language. Avoid adversarial language such as “fight the school,” “prove the teacher is biased,” “win the dispute,” or “force the school to act.” Do not minimise genuine parent or child concerns. The tone should validate the family's experience while remaining fair, evidence-informed, and focused on collaboration.

Include a clearly visible statement similar to the following in all three supported languages:

“This workshop is not about fighting with the school or assuming that a teacher has acted with harmful intent. It helps parents understand what may be happening, support their child, gather useful information, and communicate with the school in a calm and constructive way.”

## Three language requirement

The complete workshop landing page and registration journey must be available in the same three languages supported by RAOS:

1. English
2. Simplified Chinese
3. Korean

This is a required feature, not a future enhancement. Reuse the existing RAOS internationalisation architecture, locale conventions, language selector, translation-file structure, and fallback behaviour where they are available. Do not create a separate incompatible localisation system.

Translate all new user-facing content, including:

- Navigation and language controls
- Workshop title, description, purpose, and learning outcomes
- Date, time, timezone, duration, price, and availability
- What the workshop includes and does not include
- The constructive parent-school partnership message
- Presenter information
- Registration labels, choices, instructions, validation errors, and success messages
- Email-verification instructions and email templates
- Payment-method names and payment instructions
- QR-code instructions and upload requirements
- Airwallex credit-card instructions
- Pending, verified, rejected, confirmed, cancelled, and full-capacity statuses
- Consent wording, privacy information, terms, frequently asked questions, and contact information
- Confirmation, reminder, cancellation, and payment-review emails
- Workshop-access and WeChat-group instructions

Language switching must preserve the parent's entered form values, selected payment method, registration state, and verified session. It must not restart registration or erase an uploaded file.

Use locale-aware formatting while preserving the authoritative event details:

- English locale: `Saturday, October 17, 2026 · 10:00–11:30 AM China Time`
- Simplified Chinese locale: use an administrator-reviewed natural Chinese date and time format
- Korean locale: use an administrator-reviewed natural Korean date and time format
- Price remains 388 RMB in all languages
- Timezone remains China Standard Time, UTC+8, with a clear localised label

Store copy in translation dictionaries or the application's existing content-localisation model rather than scattering hard-coded translations across components. Use English as the controlled source copy and the fallback when a translation key is missing during development. In production, do not publish while required Chinese or Korean keys are missing.

Machine translation may be used to prepare drafts, but the administrator must be able to review and edit the Simplified Chinese and Korean wording before publication. Do not present unreviewed machine translation as final professional copy, particularly for consent, privacy, payment, educational, or child-support language.

Add an administrator translation-completeness view showing whether every required English, Simplified Chinese, and Korean field or key has approved content. The publication check should warn or block publication when essential translation content is absent.

## What parents will learn

Present concise outcomes such as:

- How to listen when a child says a teacher does not like them without immediately confirming or dismissing the conclusion
- How to separate observable events from interpretations
- How to examine frequency, context, intensity, and impact
- How to include the child's perspective while remaining open to several possible explanations
- How to prepare for a constructive conversation with the school
- How to identify practical next steps, review dates, and appropriate escalation thresholds

## Detailed workshop inclusions

In addition to the concise summary near the top, include a dedicated section explaining what parents receive. Present this section as accessible HTML in English, Simplified Chinese, and Korean.

The workshop includes:

- A live 90-minute online parent workshop
- A framework for responding when a child says, “My teacher doesn't like me”
- Guidance for listening without dismissing the child or confirming an untested conclusion
- A method for separating observations, interpretations, patterns, and isolated incidents
- Consideration of frequency, context, intensity, and impact
- Guidance for including the child's perspective appropriately
- Preparation for respectful and productive parent-school communication
- A Parent Action Plan with specific next steps and a review date
- A Parent-School Meeting Preparation Form
- An observation and incident-recording template
- Sample language for contacting a teacher or school
- Guidance about reasonable escalation thresholds and when additional support may be appropriate
- Bilingual or multilingual workshop resources where provided by the administrator
- Access to the workshop WeChat group
- Seven days of structured, workshop-related WeChat group support

Also explain what is not included:

- Individual consultation
- Counselling or therapy
- Psychological or diagnostic assessment
- Review of an individual child's school records, reports, or assessment documents
- Legal advice or representation
- Mediation with the school
- A determination that a teacher dislikes, discriminates against, or has mistreated a child
- Unlimited or ongoing individual support through WeChat

Explain that parents who later want an assessment or another ReMynd service may make a separate enquiry. Registration for this workshop must not automatically initiate, imply, or authorise an assessment referral.

## Registration flow

Use the following sequence:

1. Parent opens the workshop landing page.
2. Parent selects Register.
3. Parent completes the short registration form.
4. The server creates an unverified registration with an expiring email-verification token.
5. The system sends a verification email.
6. Parent clicks the verification link.
7. The server marks the email as verified and opens the payment-selection page.
8. Parent selects WeChat Pay, Alipay, or Credit Card.
9. Payment instructions change according to the selected method without clearing any registration answers.
10. The registration remains pending until payment is verified.
11. An authorised administrator verifies or rejects the payment.
12. Only after verification does the system confirm the place and send protected workshop-access information.

If the parent leaves before paying, preserve the verified registration and allow them to return through a secure, expiring continuation link. Do not reveal whether an email address is already registered in a way that enables account enumeration.

## Registration form fields

Keep the registration form brief and valuable. Collect only information needed to administer and improve the workshop.

### Required fields

- Parent or caregiver full name
- Email address
- WeChat ID or WeChat display name
- Country or region
- Preferred language: English, Simplified Chinese, or Both
- Agreement to the workshop terms
- Agreement to the privacy notice and processing of registration and payment information

### Optional fields

- Mobile number, including country code
- City
- Child's age range or grade band; use broad choices rather than requesting the child's date of birth
- School type: International, Bilingual, Local, Homeschool, Other, or Prefer not to say
- One short question: “What would you most like help with in this workshop?”
- Accessibility, language, or participation support needed
- Optional consent to remain connected to the ReMynd parent community and receive future educational resources, workshop announcements, and relevant service information

Do not request the child's name, the teacher's name, the school's name, diagnostic information, assessment reports, detailed case histories, or sensitive school records during workshop registration.

Changing a payment choice must never erase registration information.

## Email verification

Require successful email verification before payment submission and before a place can be confirmed.

Implement the following:

- Generate a cryptographically secure, single-use verification token on the server.
- Store only a secure token hash when compatible with the existing architecture.
- Give the token an appropriate expiry period, such as 24 hours.
- Invalidate it after successful use.
- Add a resend-verification function with rate limiting.
- Do not disclose whether an address exists when handling resend requests.
- Record email verification date and time.
- If the registration deadline has passed or the workshop is full, verification must not bypass those rules.

The verification email should contain the workshop title, date, the verification button, token-expiry information, and a statement that payment is still required after verification.

## Payment choices

For this workshop, display exactly three customer-facing payment methods:

1. WeChat Pay
2. Alipay
3. Credit Card through Airwallex

Do not display bank transfer, cash, invoice, Other, custom methods, or any nested card-method selector.

The page must always display the server-controlled price clearly:

**Workshop registration: 388 RMB per family**

## WeChat Pay

When WeChat Pay is selected:

- Display the administrator-supplied WeChat Pay QR image.
- Show the workshop name, amount of 388 RMB, and currency next to the QR code.
- Include mobile-friendly instructions explaining that parents may scan the code with another device or save or long-press the image when supported.
- Require upload of a payment-confirmation screenshot before final submission.
- Allow an optional payment reference or payer-name field.
- Show clearly that uploading a screenshot does not by itself confirm registration.

Use wording similar to:

“Pay 388 RMB using the WeChat Pay QR code. After payment, upload a screenshot of the payment confirmation. Your workshop place remains pending until ReMynd verifies the payment.”

## Alipay

When Alipay is selected:

- Display the administrator-supplied Alipay QR image.
- Show the workshop name, amount of 388 RMB, and currency next to the QR code.
- Include mobile-friendly instructions.
- Require upload of a payment-confirmation screenshot before final submission.
- Allow an optional payment reference or payer-name field.
- Show clearly that uploading a screenshot does not by itself confirm registration.

Use wording similar to:

“Pay 388 RMB using the Alipay QR code. After payment, upload a screenshot of the payment confirmation. Your workshop place remains pending until ReMynd verifies the payment.”

## Credit Card through Airwallex

When Credit Card is selected:

- Display a clear **Pay Securely by Credit Card** button linked only to the administrator-supplied Airwallex hosted payment URL.
- Open the Airwallex hosted page safely in a new tab when possible.
- Provide a visible copy-link fallback in case the WeChat browser cannot open the hosted page correctly.
- Never collect card number, cardholder credentials, expiry date, security code, or other card data in the ReMynd application.
- Do not require a payment screenshot unless an administrator later enables that requirement explicitly.
- After returning from Airwallex, allow the parent to select **I have completed my credit-card payment** and optionally enter the Airwallex payment or transaction reference.
- Set the registration to pending payment verification unless a secure existing Airwallex webhook integration can authoritatively confirm payment.

Use wording similar to:

“Credit-card payment is processed securely through Airwallex. ReMynd does not collect or store your card details. Your workshop place will be confirmed after payment is successfully completed and verified.”

Do not build a new direct card form. Do not place WeChat Pay or Alipay transactions through Airwallex in this workshop flow.

## QR image handling

The administrator will supply the final WeChat Pay and Alipay QR images.

Implement configurable fields for both images. Reuse secure existing media storage when available.

- Support PNG, JPEG, and WebP images.
- Do not expose private storage object paths.
- If images are private, serve them through controlled application endpoints that return actual image bytes and the correct image Content-Type.
- Do not return HTML or an application fallback page from QR endpoints.
- Do not generate placeholder or fake payment QR codes.
- Show a safe administrator preview before publishing.
- Make replacement of a QR image an audited administrator action.

## Payment screenshot uploads

For WeChat Pay and Alipay:

- Require one payment-confirmation screenshot.
- Accept PNG, JPEG, and WebP only.
- Maximum size: 10 MB using actual byte validation.
- Validate MIME type and reject unsupported files.
- Generate storage keys on the server.
- Store screenshots privately.
- Never expose a public receipt URL.
- Allow only authorised administrators to retrieve a receipt through an authenticated endpoint.
- Preserve the original filename and detected MIME type as metadata, but do not use the original filename as the storage key.
- Prevent path traversal and arbitrary object access.
- Do not log image contents.

## Registration and payment statuses

Use explicit statuses rather than a single paid Boolean. Adapt names to existing conventions if necessary, while preserving these meanings:

- Registration Started
- Email Verification Pending
- Email Verified
- Payment Pending
- QR Receipt Submitted
- Credit Card Payment Initiated
- Payment Under Review
- Payment Verified
- Payment Rejected
- Registration Confirmed
- Registration Cancelled
- Workshop Completed

Payment status and registration status should be separate fields. Uploading a receipt or clicking “I have completed payment” must not set Payment Verified or Registration Confirmed.

## Confirmation and access rules

Submitting a registration or receipt must not automatically:

- Mark payment as paid
- Confirm a workshop place
- Grant access to the meeting link
- Reveal the private WeChat workshop-group joining information
- Issue a receipt that states payment was verified
- Create any other paid entitlement

Only an authorised administrator or a trusted, verified payment-provider event may mark payment as verified.

After verified payment:

- Confirm the registration exactly once.
- Reserve the family place against capacity exactly once.
- Send a confirmation email.
- Display a confirmation page.
- Release the online meeting instructions at the administrator-configured time.
- Provide the administrator-approved process for joining the workshop WeChat group.
- Record verification, confirmation, and the responsible administrator or trusted provider event.

Make verification and confirmation idempotent so repeated actions cannot create duplicate registrations, seats, emails, or entitlements.

## Administrator experience

Add the workshop to the existing administrator area rather than creating a disconnected admin system.

Authorised administrators must be able to:

- Create, edit, preview, publish, close, cancel, and archive the offering
- Configure the date, time, timezone, price, capacity, registration window, and language content
- Upload or replace the WeChat Pay QR image
- Upload or replace the Alipay QR image
- Enter or replace the Airwallex hosted credit-card link
- Configure the meeting link and when it becomes visible
- Configure WeChat group joining instructions
- View registrations and filter by verification, payment method, payment status, and registration status
- View all submitted registration answers
- View the selected payment method
- View the server-calculated amount and currency
- Securely open the uploaded payment screenshot
- View the payment reference
- Mark payment as verified or rejected
- Enter a rejection reason
- Correct an accidental decision through an audited process without deleting history
- Resend verification or confirmation messages where appropriate
- Export a minimal participant list in CSV format
- See capacity, confirmed places, pending reviews, and remaining availability
- See an audit history of submissions, emails, uploads, verification, rejection, confirmation, cancellation, and administrator actions

Do not display sensitive payment screenshots in list thumbnails. Require an intentional authorised action to open them.

## Database requirements

Use additive, backward-compatible schema changes. Preserve historical records.

Store, at minimum:

- Workshop offering ID
- Parent registration ID
- Existing account or customer ID when available
- Parent full name
- Email address and normalised email value
- Email verification status and timestamp
- WeChat ID or display name
- Optional mobile number
- Country or region
- Optional city
- Preferred language
- Optional child age or grade band
- Optional school type
- Optional workshop question
- Optional accessibility or participation needs
- Required terms acceptance and timestamp
- Required privacy consent and timestamp
- Optional future-communications consent and timestamp
- Server-resolved amount and currency
- Selected payment method
- Payment reference when supplied
- Private receipt object key when applicable
- Original receipt filename and detected MIME type
- Payment status
- Payment verification status
- Registration status
- Submission, verification, payment-review, and confirmation timestamps
- Verifying administrator or trusted provider event
- Rejection reason when applicable
- Meeting-access release status
- Audit history

Never trust client-submitted price, currency, workshop ID, capacity, payment status, or access entitlement. Validate them against server-controlled offering data.

## Capacity handling

- Count only verified and confirmed registrations as occupied places unless an existing temporary reservation system is already used.
- If temporary reservations are used, give them a clear expiry period.
- Prevent overbooking on the server using a transaction or equivalent concurrency-safe operation.
- If capacity is reached, stop new payment submissions and offer a waitlist if the existing system supports one.
- Never accept payment for a place that the server cannot reserve.

## Notifications

Send concise operational notifications to the configured ReMynd administrator when:

- A parent verifies their email
- A WeChat Pay receipt is submitted
- An Alipay receipt is submitted
- A parent reports completing Airwallex credit-card payment
- A payment requires review
- A registration is nearing an incomplete-payment expiry, if reminders are enabled

Send parent-facing messages for:

- Email verification
- Email successfully verified with payment continuation link
- Payment submission received and pending review
- Payment verified and registration confirmed
- Payment rejected or additional information required
- Workshop reminder
- Workshop cancellation or material schedule change

Do not include private receipt images, card information, secure tokens, or unnecessary personal information in email notifications.

## Privacy and consent

- Use data minimisation.
- Make future marketing and parent-community consent separate, optional, and unchecked by default.
- Record the version of the privacy notice and terms accepted.
- Explain that WeChat group participation may expose a participant's WeChat display name to other group members.
- Ask parents not to post child names, teacher names, school names, reports, or other identifying case information in the workshop group.
- Provide a way to request correction or deletion consistent with existing ReMynd policy and legal obligations.
- Do not use workshop registration as consent for psychological assessment or individual consultation.

## Security requirements

- Validate all registration and payment submissions on the server.
- Allow only WeChat Pay, Alipay, or Credit Card for this offering.
- Require verified email before payment submission.
- Require a valid screenshot for WeChat Pay and Alipay.
- Do not require or accept card credentials.
- Protect administrator routes with authentication and role-based authorisation.
- Apply CSRF protection where required by the application architecture.
- Rate-limit registration, email resend, token verification, upload, and public-status endpoints.
- Use secure, expiring, single-use tokens.
- Prevent user enumeration.
- Sanitise user-entered text.
- Do not log secrets, tokens, receipt contents, or card data.
- Keep meeting and WeChat joining information out of public API responses.
- Do not expose private storage URLs.
- Preserve a complete audit trail without storing unnecessary sensitive data.

## Analytics

Add privacy-conscious funnel events without storing sensitive free-text answers in analytics:

- Landing page viewed
- Registration started
- Registration submitted
- Email verified
- Payment method selected
- Receipt submitted
- Airwallex payment link opened
- Payment verified
- Registration confirmed

The administrator dashboard should show conversion counts without exposing private information in analytics logs.

## Accessibility and mobile compatibility

- Meet WCAG 2.1 AA expectations where practical within the existing system.
- Use proper labels, headings, focus states, keyboard navigation, error summaries, and accessible status messages.
- Do not communicate status by colour alone.
- Give QR images useful alternative text without placing payment secrets in the text.
- Ensure the registration and upload process works in current mobile browsers and the WeChat embedded browser.
- Make buttons and form targets comfortably touch-sized.
- Preserve partially completed form values after validation errors.
- Provide clear upload progress and retry behaviour.

## Required configuration

Provide secure administrator settings or documented environment variables for:

- Public workshop base URL
- Email sender name and address
- Operational administrator notification address
- Email verification token secret or existing application secret
- WeChat Pay QR image storage reference
- Alipay QR image storage reference
- Airwallex hosted credit-card payment URL
- Meeting link
- WeChat group joining instructions
- Registration opening and closing dates
- Workshop capacity
- Workshop flyer image and translated alternative text
- Approved English, Simplified Chinese, and Korean landing-page content

Do not hard-code secrets or private links into source control. The workshop price and public event details may live in a database or server-controlled configuration, but they must not be accepted from the client.

## Acceptance tests

Before declaring the work complete, verify all of the following:

1. The landing page displays the correct workshop title, Saturday October 17, 2026 date, 10:00 AM to 11:30 AM China time, and 388 RMB family price.
2. The page works on desktop, standard mobile browsers, and the WeChat embedded browser.
3. The registration form contains the required fields and does not request unnecessary child or school-identifying information.
4. Optional marketing and parent-community consent is separate, unchecked, and not required.
5. A registration remains unconfirmed until email is verified and payment is verified.
6. Verification tokens expire, are single use, and resend actions are rate-limited.
7. Selecting a payment method does not erase registration answers.
8. Only WeChat Pay, Alipay, and Credit Card are displayed.
9. WeChat Pay displays the correct administrator-supplied QR image and 388 RMB price.
10. Alipay displays the correct administrator-supplied QR image and 388 RMB price.
11. QR endpoints return real image bytes with the correct image Content-Type.
12. WeChat Pay and Alipay require an accepted screenshot of 10 MB or less.
13. Unsupported upload types and oversized files are rejected on the server.
14. Receipt files are private and cannot be accessed by an unauthorised user.
15. Credit Card opens only the configured Airwallex hosted payment link.
16. The ReMynd application never asks for or stores card credentials.
17. Opening Airwallex or reporting payment completion does not automatically confirm registration unless an authenticated provider event verifies payment.
18. An administrator can review, verify, or reject a payment and enter a reason.
19. Payment verification confirms a registration only once.
20. Server-side capacity controls prevent overbooking.
21. Meeting and WeChat joining information are unavailable before confirmation.
22. Parent and administrator notifications contain no sensitive receipt contents, card data, or secure tokens.
23. Existing workshop, free-registration, authentication, administrator, and unrelated payment flows still function.
24. All new schema migrations are additive and backward-compatible.
25. The production build and relevant automated tests pass.
26. The administrator-supplied flyer displays clearly on desktop, mobile, and the WeChat embedded browser without distorted aspect ratio or essential cropping.
27. The flyer is accompanied by accessible HTML information and is not used as the sole source of workshop details.
28. English, Simplified Chinese, and Korean are available throughout the complete landing-page, registration, verification, payment, and confirmation journey.
29. Changing languages preserves entered registration information, selected payment method, uploaded receipt state, and verified session.
30. No essential translation key is missing in the production build.
31. Chinese and Korean text is editable and can be marked administrator reviewed before publication.
32. The landing page clearly states in all three languages that the workshop supports constructive parent-school communication and is not about fighting, blaming, or assuming wrongdoing by the school.
33. The detailed inclusions and exclusions are visible in all three languages.

## Completion report

When implementation is complete, report:

- The existing architecture discovered
- Files and routes added or changed
- Database migrations and new fields
- Administrator settings or environment variables required
- Email templates added
- Payment and receipt security controls implemented
- Tests performed and their results
- Any items Noel must still supply, including the WeChat Pay QR image, Alipay QR image, Airwallex hosted payment URL, meeting link, and WeChat joining instructions
- Any limitations specific to the WeChat embedded browser

Do not publish or deploy automatically. Stop after the build and tests pass and wait for approval to deploy.

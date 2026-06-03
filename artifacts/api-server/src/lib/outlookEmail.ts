import nodemailer from "nodemailer";

export interface InquiryEmailData {
  inquiryType: "school" | "parent" | "partner_school";
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  wechatId?: string;
  whatsappId?: string;
  organisation?: string;
  role?: string;
  studentName?: string;
  studentAge?: string;
  yearGroup?: string;
  message: string;
  // Partner school specific
  schoolType?: string;
  schoolLocation?: string;
  enrollment?: string;
  currentSupport?: string;
  howHeard?: string;
  timeline?: string;
}

function getTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<void> {
  const transport = getTransport();
  const fromUser = process.env.GMAIL_USER!;
  await transport.sendMail({
    from: `"ReMynd Student Services" <${fromUser}>`,
    to,
    subject,
    html,
  });
}

function makeRow(label: string, value: string) {
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#475569;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 12px;color:#0f172a">${value}</td></tr>`;
}

export async function sendInquiryNotification(
  data: InquiryEmailData,
  notifyEmails: string | string[]
): Promise<string> {
  const transport = getTransport();
  const fromUser = process.env.GMAIL_USER!;
  const toList = Array.isArray(notifyEmails) ? notifyEmails.join(", ") : notifyEmails;

  let typeLabel: string;
  let headerColor: string;
  let rows: string;

  if (data.inquiryType === "partner_school") {
    typeLabel = "Partner School";
    headerColor = "#5b21b6";

    const rowData: Array<[string, string | undefined]> = [
      ["School Name", data.organisation],
      ["School Type", data.schoolType],
      ["Location", data.schoolLocation],
      ["Enrollment", data.enrollment],
      ["Contact Name", data.contactName],
      ["Job Title", data.role],
      ["Email", data.contactEmail],
      ["Phone", data.contactPhone],
      ["WeChat ID", data.wechatId],
      ["WhatsApp", data.whatsappId],
      ["Current Support", data.currentSupport],
      ["Reason for Interest", data.message],
      ["How They Heard", data.howHeard],
      ["Timeline", data.timeline],
    ];
    rows = rowData
      .filter(([, v]) => v)
      .map(([l, v]) => makeRow(l, v!))
      .join("");
  } else {
    typeLabel = data.inquiryType === "school" ? "School" : "Parent";
    headerColor = "#1e293b";

    const rowData: Array<[string, string | undefined | null]> = [
      ["Type", typeLabel],
      ["Contact Name", data.contactName],
      ["Email", data.contactEmail],
      data.contactPhone ? ["Phone", data.contactPhone] : null,
      data.wechatId ? ["WeChat ID", data.wechatId] : null,
      data.whatsappId ? ["WhatsApp ID", data.whatsappId] : null,
      data.organisation ? ["Organisation", data.organisation] : null,
      data.role ? ["Role", data.role] : null,
      data.studentName ? ["Student Name", data.studentName] : null,
      data.studentAge ? ["Student Age", data.studentAge] : null,
      data.yearGroup ? ["Year Group", data.yearGroup] : null,
      ["Message", data.message],
    ] as any;
    rows = rowData
      .filter(Boolean)
      .map((r: any) => makeRow(r[0], r[1]))
      .join("");
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${headerColor};padding:24px 28px;border-radius:12px 12px 0 0">
        <h1 style="margin:0;color:#fff;font-size:18px">New ${typeLabel} Inquiry — ReMynd Student Services</h1>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
        <table style="width:100%;border-collapse:collapse">
          ${rows}
        </table>
        <p style="margin-top:20px;font-size:12px;color:#94a3b8">
          Submitted via the ReMynd Assessment Operating System portal.
          Log in to RAOS to manage this inquiry.
        </p>
      </div>
    </div>`;

  await transport.sendMail({
    from: `"ReMynd RAOS" <${fromUser}>`,
    to: toList,
    subject: `[RAOS] New ${typeLabel} Inquiry from ${data.contactName}`,
    html,
  });

  return fromUser;
}

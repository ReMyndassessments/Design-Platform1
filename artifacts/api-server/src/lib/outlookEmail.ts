import { Client } from "@microsoft/microsoft-graph-client";

let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=outlook",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Outlook not connected");
  }
  return accessToken;
}

async function getUncachableOutlookClient() {
  const accessToken = await getAccessToken();
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken,
    },
  });
}

export interface InquiryEmailData {
  inquiryType: "school" | "parent";
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  organisation?: string;
  role?: string;
  studentName?: string;
  studentAge?: string;
  yearGroup?: string;
  message: string;
  wechatId?: string;
  whatsappId?: string;
}

export async function sendInquiryNotification(
  data: InquiryEmailData,
  notifyEmail: string
) {
  const client = await getUncachableOutlookClient();
  const typeLabel = data.inquiryType === "school" ? "School" : "Parent";

  const rows = [
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
  ]
    .filter(Boolean)
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px;font-weight:600;color:#475569;white-space:nowrap;vertical-align:top">${r![0]}</td><td style="padding:6px 12px;color:#0f172a">${r![1]}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e293b;padding:24px 28px;border-radius:12px 12px 0 0">
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

  const message = {
    subject: `[RAOS] New ${typeLabel} Inquiry from ${data.contactName}`,
    body: { contentType: "HTML", content: html },
    toRecipients: [{ emailAddress: { address: notifyEmail } }],
  };

  await client.api("/me/sendMail").post({ message });
}

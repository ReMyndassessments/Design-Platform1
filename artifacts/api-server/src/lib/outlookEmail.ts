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

async function getAccessToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) throw new Error("REPLIT_CONNECTORS_HOSTNAME not set");

  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) throw new Error("X-Replit-Token not available");

  const url = `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=outlook`;
  const connRes = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Replit-Token": xReplitToken,
    },
  });

  if (!connRes.ok) {
    const body = await connRes.text();
    throw new Error(`Connectors API ${connRes.status}: ${body}`);
  }

  const connData = await connRes.json();
  const connection = connData.items?.[0];
  const accessToken =
    connection?.settings?.access_token ||
    connection?.settings?.oauth?.credentials?.access_token;

  if (!accessToken) {
    throw new Error(
      `Outlook access token missing. Connection data: ${JSON.stringify(connData).slice(0, 300)}`
    );
  }

  return accessToken;
}

export async function sendInquiryNotification(
  data: InquiryEmailData,
  notifyEmail: string
): Promise<void> {
  const accessToken = await getAccessToken();
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

  const payload = {
    message: {
      subject: `[RAOS] New ${typeLabel} Inquiry from ${data.contactName}`,
      body: { contentType: "HTML", content: html },
      toRecipients: [{ emailAddress: { address: notifyEmail } }],
    },
    saveToSentItems: true,
  };

  // Identify the sending account for diagnostics
  let fromAddress = "unknown";
  try {
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (meRes.ok) {
      const me = await meRes.json() as { mail?: string; userPrincipalName?: string };
      fromAddress = me.mail || me.userPrincipalName || "unknown";
    }
  } catch {
    // non-fatal
  }

  const graphRes = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!graphRes.ok) {
    const errorBody = await graphRes.text();
    throw new Error(`Graph API ${graphRes.status} ${graphRes.statusText}: ${errorBody}`);
  }

  return fromAddress;
}

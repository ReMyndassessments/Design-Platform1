import { ReplitConnectors } from "@replit/connectors-sdk";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function buildIntakeQuestionEmail({
  audience, questions, recipientName, portalUrl, isTest = false,
}: {
  audience: "teacher" | "parent";
  questions: string[];
  recipientName?: string;
  portalUrl?: string;
  isTest?: boolean;
}): string {
  const label = audience === "teacher" ? "Teacher" : "Parent / Guardian";
  const list = questions.map(question => `<li style="margin-bottom:10px">${escapeHtml(question)}</li>`).join("");
  const introduction = isTest
    ? `<p><strong>TEST COPY:</strong> This previews the ${label.toLowerCase()} questions. It does not create an invitation or collect responses.</p>`
    : `<p>Hello ${escapeHtml(recipientName ?? "there")}, the ReMynd assessment team would appreciate your responses to the questions below.</p>`;
  const responseLink = portalUrl && !isTest
    ? `<p><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:white;text-decoration:none;border-radius:6px">Respond securely in your portal</a></p>
       <p style="font-size:12px;color:#64748b">This secure link is intended only for you. Please submit your answers through the portal rather than replying to this email.</p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#172033">
    <h2>${isTest ? "Test email — " : ""}${label} questions</h2>
    ${introduction}
    <ol style="line-height:1.6">${list}</ol>
    ${responseLink}
  </div>`;
}

export async function sendIntakeQuestionEmail({
  to, subject, html,
}: { to: string; subject: string; html: string }): Promise<void> {
  const connectors = new ReplitConnectors();
  const profileResponse = await connectors.proxy("google-mail", "/gmail/v1/users/me/profile", { method: "GET" });
  if (!profileResponse.ok) throw new Error(`Gmail account could not be verified (HTTP ${profileResponse.status})`);
  const profile = await profileResponse.json() as { emailAddress?: string };
  if (!profile.emailAddress || !/^[^\s@]+@[^\s@]+$/.test(profile.emailAddress)) {
    throw new Error("Gmail sender address is unavailable");
  }
  if (!/^[^\s@]+@[^\s@]+$/.test(to)) throw new Error("Recipient email address is invalid");
  const encodedHtml = Buffer.from(html, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
  const mime = [
    `From: ReMynd Student Services <${profile.emailAddress}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    encodedHtml,
  ].join("\r\n");
  const response = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: Buffer.from(mime).toString("base64url") }),
  });
  if (!response.ok) throw new Error(`Gmail did not accept the email (HTTP ${response.status})`);
}
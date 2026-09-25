import { ReplitConnectors } from "@replit/connectors-sdk";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

export function buildIntakeQuestionEmail({
  audience, recipientName, portalUrl, isTest = false,
}: {
  audience: "teacher" | "parent";
  recipientName?: string;
  portalUrl: string;
  isTest?: boolean;
}): string {
  const role = audience === "teacher" ? "teacher" : "parent or guardian";
  return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
    <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
      <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px">ReMynd Student Services</p>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Assessment Operating System</p>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      ${isTest ? '<p style="margin:0 0 20px;padding:10px 14px;border-radius:8px;background:#eef2ff;color:#3730a3;font-size:13px;font-weight:700">TEST PREVIEW — no invitation or response will be created</p>' : ""}
      <h2 style="margin:0 0 16px;font-size:18px;color:#0a1628">Hello${recipientName ? ` ${escapeHtml(recipientName)}` : ""},</h2>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#475569">
        ${isTest
          ? `Here is a preview of what a ${role} sees when invited to provide information through the ReMynd assessment portal.`
          : `Our assessment team is requesting your input as a ${role}. Your questions and secure response area are ready in your ReMynd assessment portal.`}
      </p>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569">
        ${isTest ? "Open the preview to review the portal experience. Submitting answers is disabled in preview mode." : "Please use the private link below to view the request and respond. You can return to the same portal link whenever you need."}
      </p>
      <p style="text-align:center;margin:28px 0">
        <a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${isTest ? "Preview ReMynd Portal" : "Open My ReMynd Portal"} ↗</a>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:12px;color:#94a3b8;text-align:center">ReMynd Student Services · Confidential<br/>${isTest ? "Test preview link — please do not forward." : "This private link is intended only for you. Please do not share it."}</p>
    </div>
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
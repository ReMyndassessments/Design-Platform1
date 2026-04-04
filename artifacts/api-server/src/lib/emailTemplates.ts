export function buildTeacherEmail(studentName: string, link: string, debriefMeetingUrl?: string | null, debriefMeetingDate?: string | null): string {
  const dateRow = debriefMeetingDate
    ? `<p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#166534">Scheduled: ${debriefMeetingDate}</p>`
    : "";
  const debriefBlock = debriefMeetingUrl
    ? `<div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:16px 20px;margin:24px 0;text-align:center">
        <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.05em">📹 Debrief Meeting</p>
        <p style="margin:0 0 10px;font-size:13px;color:#15803d">A virtual debrief meeting has been scheduled to walk the family through the assessment results. As the school representative, you are invited to attend. Click the button below to join at the scheduled time.</p>
        ${dateRow}
        <a href="${debriefMeetingUrl}" style="background:#16a34a;color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px" target="_blank">Join Debrief Meeting ↗</a>
      </div>`
    : "";

  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0a1628">Assessment report now available</h2>
    <p>The psychoeducational assessment report for <strong>${studentName}</strong> is now ready for you to download.</p>
    <p>The parent/guardian has reviewed the report and given their permission for the school to receive a copy.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
    </p>
    ${debriefBlock}
    <p style="font-size:13px;color:#64748b">This link is unique to you. Please do not share it.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
  </div>`;
}

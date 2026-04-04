export function buildTeacherEmail(studentName: string, link: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0a1628">Assessment report now available</h2>
    <p>The psychoeducational assessment report for <strong>${studentName}</strong> is now ready for you to download.</p>
    <p>The parent/guardian has reviewed the report and given their permission for the school to receive a copy.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
    </p>
    <p style="font-size:13px;color:#64748b">This link is unique to you. Please do not share it.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
  </div>`;
}

import type { LiteracyDocument } from "./chineseLiteracyStore.js";
import { buildChineseLiteracyDomainObservations } from "./chineseLiteracyDomainReport.js";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
const REPORT_DOMAIN_MARKER = "[[REMYND_DOMAIN_OBSERVATIONS]]";

function reportWithDomainMarker(markdown: string) {
  const output: string[] = [];
  let inserted = false;
  let skipping = false;
  let sectionLevel = 0;
  for (const line of String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const heading = line.trim().match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (skipping) {
      if (heading && heading[1].length <= sectionLevel) skipping = false;
      else continue;
    }
    if (heading) {
      if (/^observations\s+by\s+domain$/i.test(heading[2].trim())) {
        if (!inserted) output.push(REPORT_DOMAIN_MARKER);
        inserted = true;
        skipping = true;
        sectionLevel = heading[1].length;
        continue;
      }
      if (!inserted && /^(strengths and current supports|limitations and points for review)$/i.test(heading[2].trim())) {
        output.push(REPORT_DOMAIN_MARKER);
        inserted = true;
      }
    }
    output.push(line);
  }
  if (!inserted) output.push(REPORT_DOMAIN_MARKER);
  return output.join("\n");
}

function inlineReportText(value: string) {
  return esc(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>');
}

function domainObservationHtml(doc: LiteracyDocument) {
  const observations = buildChineseLiteracyDomainObservations(doc);
  const content = observations.map(observation => {
    const maxCount = Math.max(1, ...observation.distribution.map(row => row.count));
    const chartLabel = observation.distribution.map(row => `${row.value} ${row.label}: ${row.count}`).join("; ");
    const rows = observation.distribution.map(row => `<div class="bar-row"><span class="bar-label">${row.value} · ${esc(row.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${Math.round(row.count / maxCount * 100)}%"></span></span><span class="bar-count">${row.count}</span></div>`).join("");
    const frequentItems = observation.itemsWithFrequentRatings.length
      ? `<h4>Items rated often or almost always</h4><ul>${observation.itemsWithFrequentRatings.map(item => `<li><code>${esc(item.id)}</code> — ${esc(item.text)} <strong>(${item.value}/5)</strong></li>`).join("")}</ul>`
      : "";
    const evidence = [
      observation.strengths ? `<p><strong>Reported strengths:</strong> ${esc(observation.strengths)}</p>` : "",
      observation.supports ? `<p><strong>Current supports:</strong> ${esc(observation.supports)}</p>` : "",
      observation.examples.length
        ? `<h4>Respondent examples (original wording)</h4><ul>${observation.examples.map(example => `<li>${esc(example.text)} <span class="item-ids">(${esc(example.itemIds.join(", "))})</span></li>`).join("")}</ul>`
        : "",
    ].join("");
    const planningItems = observation.itemsForDiscussion.length
      ? `<h4>Items to review in support planning</h4><ul>${observation.itemsForDiscussion.map(item => `<li><code>${esc(item.id)}</code> — ${esc(item.text)} <strong>(${item.value}/5 · ${esc(observation.distribution.find(row => row.value === item.value)?.label)})</strong></li>`).join("")}</ul>`
      : "";
    return `<section class="domain-card"><h3>${esc(observation.label)}</h3>
      <figure class="rating-chart" role="img" aria-label="${esc(`${observation.label} item rating distribution. ${chartLabel}`)}">
        <figcaption>Distribution of observed-frequency ratings · number of items</figcaption>${rows}
        ${observation.validCount ? "" : '<p class="empty-chart">No numeric ratings are available for this domain.</p>'}
      </figure>
      <p class="domain-narrative">${esc(observation.narrative)}</p>
      <div class="interpretation"><h4>Interpretation</h4><p>${esc(observation.interpretation)}</p></div>
      ${planningItems}
      <div class="planning-recommendation"><h4>Recommendation for support planning</h4><p>${esc(observation.planningRecommendation)}</p></div>
      ${frequentItems}${evidence}
      <p class="caution">Rating counts include numeric responses only. Not observed, not applicable, and unanswered responses are reported separately; no norm or diagnostic cutoff is applied.</p>
    </section>`;
  }).join("");
  return `<section class="domain-results"><h2>Observations by Domain</h2>${content}
    <section class="report-recommendations"><h2>Recommendations and next steps</h2>
      <p>Review each domain’s interpretation alongside its exact item wording, respondent examples, current supports, and separately recorded access impact. Carry forward only priorities staff confirm are relevant to participation or learning.</p>
      <ol>
        <li>In the Support plan, link any agreed priority to specific item IDs and contextual evidence.</li>
        <li>Choose a suitable strategy, proposed owner, observable progress indicator, and review date.</li>
        <li>Keep parent and teacher observations separate. Do not treat low frequency ratings as proof that another setting has no need.</li>
      </ol>
      <p>These are planning prompts, not automatic interventions. Support-plan decisions remain a separate professional-review step.</p>
    </section>
  </section>`;
}

function markdownReportHtml(markdown: string, domainHtml: string) {
  const lines = reportWithDomainMarker(markdown).split("\n");
  const blocks: string[] = [];
  const startsBlock = (line: string) => /^(#{1,4})\s+/.test(line.trim())
    || /^\s*[-*+]\s+/.test(line)
    || /^\s*\d+[.)]\s+/.test(line)
    || /^(-{3,}|_{3,}|\*{3,})$/.test(line.trim());

  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    if (line === REPORT_DOMAIN_MARKER) { blocks.push(domainHtml); i++; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) { const level = heading[1].length; blocks.push(`<h${level}>${inlineReportText(heading[2])}</h${level}>`); i++; continue; }
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) { blocks.push("<hr>"); i++; continue; }
    const list = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/);
    if (list) {
      const ordered = /^\d/.test(list[1]);
      const items: string[] = [];
      while (i < lines.length) {
        const item = lines[i].match(ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${inlineReportText(item[1])}</li>`);
        i++;
      }
      blocks.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }
    const paragraph = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(`<p>${inlineReportText(paragraph.join(" "))}</p>`);
  }
  return blocks.join("\n");
}

/** A clean report-only export: formatted narrative plus per-domain charts and evidence summaries. */
export function literacyReportExport(doc: LiteracyDocument) {
  const parent = doc.metadata.respondent === "parent";
  const source = parent ? "Parent-reported · home setting" : "Teacher-reported · teaching setting";
  const status = doc.report?.approvedAt ? "Approved report" : "Draft · staff review required";
  const narrative = String(doc.report?.narrative ?? "Manual narrative awaiting professional review.");
  const domainHtml = domainObservationHtml(doc);
  const narrativeHtml = markdownReportHtml(narrative, domainHtml);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chinese Literacy Observation Report</title>
    <style>
      @page{margin:18mm}*{box-sizing:border-box}body{font:11pt Arial,sans-serif;color:#17253b;margin:0;line-height:1.55}
      header{border-bottom:3px solid #1379a8;padding:0 0 12pt;margin-bottom:16pt}h1{font-size:23pt;line-height:1.2;margin:0 0 7pt}
      h2{font-size:16pt;border-bottom:1px solid #d8e1e8;padding-bottom:5pt;margin:22pt 0 10pt;break-after:avoid}
      h3{font-size:13pt;margin:0 0 10pt;break-after:avoid}h4{font-size:10pt;margin:12pt 0 4pt;break-after:avoid}
      p{margin:6pt 0}ul,ol{padding-left:20pt;margin:6pt 0}li{margin:3pt 0}code{font-family:monospace;font-size:9pt}
      .meta{font-size:9pt;color:#53657a}.status{display:inline-block;padding:3pt 8pt;border-radius:10pt;background:#fff4d4;color:#805700;font-size:8pt;font-weight:bold}
       .report-body{margin-top:16pt}.domain-results{margin:22pt 0}.domain-card{border:1px solid #d8e1e8;border-radius:8pt;padding:12pt;margin:12pt 0;break-inside:auto}
      .rating-chart{background:#f6f9fb;border:1px solid #e4ebf0;border-radius:6pt;padding:10pt 12pt;margin:10pt 0}
      figcaption{font-size:9pt;font-weight:bold;margin-bottom:7pt}.bar-row{display:grid;grid-template-columns:155pt 1fr 20pt;gap:7pt;align-items:center;margin:4pt 0;font-size:8pt}
      .bar-track{height:7pt;background:#e2e8ee;border-radius:5pt;overflow:hidden}.bar-fill{display:block;height:100%;background:#1f74ad;border-radius:5pt}.bar-count{text-align:right;font-weight:bold}
       .domain-narrative{font-size:9.5pt}.interpretation{background:#eef7fb;border-left:3pt solid #1f74ad;padding:8pt 10pt;margin:10pt 0}.planning-recommendation{background:#f6f9fb;border:1px solid #d8e1e8;border-radius:5pt;padding:8pt 10pt;margin:10pt 0}
       .interpretation h4,.planning-recommendation h4{margin-top:0}.report-recommendations{border:1px solid #c9dceb;background:#f4f9fc;border-radius:8pt;padding:12pt;margin-top:18pt;break-inside:avoid}
       .caution,.empty-chart{font-size:8pt;color:#58697c}.item-ids{color:#64748b}
      .domain-card li,.domain-card p{overflow-wrap:anywhere}footer{border-top:1px solid #d8e1e8;margin-top:22pt;padding-top:8pt;font-size:8pt;color:#58697c}
      @media print{.domain-card{break-inside:avoid}figure{break-inside:avoid}}
    </style></head><body><header><h1>Chinese Literacy Observation Report</h1>
      <p class="meta">${esc(doc.metadata.formName)} · ${esc(source)} · ${esc(status)}</p>
       <p class="meta">Submitted ${esc(doc.submittedAt ?? "date not recorded")} · This report describes only the selected respondent’s record; parent and teacher records are not combined.</p></header>
      <main class="report-body">${narrativeHtml}</main>
      <footer>${esc(doc.metadata.reportLimitation)}<br>ReMynd Assessment Operating System · Confidential educational record.</footer>
    </body></html>`;
}

function exportScoreTable(scores: any[]) {
  if (!scores?.length) return '<p>No submitted ratings are available yet.</p>';
  return `<table><thead><tr><th>Domain</th><th>Difficulty frequency</th><th>Rated / applicable</th><th>Coverage</th><th>Not observed / not applicable / unanswered</th><th>Separate impact</th></tr></thead><tbody>${scores.map(s => `<tr>
    <th scope="row">${esc(s.label)}</th><td>${esc(s.status === "scored" ? `${s.displayMean} of 5 — observed difficulty frequency` : s.presentationLabel ?? s.status)}</td>
    <td>${esc(s.validCount ?? "—")} / ${esc(s.applicableCount ?? "—")} applicable; ${esc(s.totalItems ?? "—")} original</td>
    <td>${s.coverage == null ? "—" : esc((s.coverage * 100).toFixed(1) + "%")}</td>
    <td>NO ${esc(s.notObservedCount ?? "—")}; NA ${esc(s.notApplicableCount ?? "—")}; unanswered ${esc(s.unansweredCount ?? "—")}</td>
    <td>${esc(s.impact ?? "Unknown")}</td></tr>`).join("")}</tbody></table>`;
}

function exportScoreValue(value: any) {
  return value
    ? `${value.displayMean ?? "no numeric mean"} (${value.validCount ?? "?"}/${value.applicableCount ?? "?"} rated; ${value.coverage == null ? "coverage unavailable" : `${Math.round(value.coverage * 100)}% coverage`})`
    : "Not administered";
}

function linkedFollowupHtml(followups: LiteracyDocument[]) {
  if (!followups.length) return '<p>No linked follow-up has been created. Follow-up is optional and is not needed to complete the baseline report.</p>';
  return followups.map((followup, index) => {
    const submitted = Boolean(followup.scores?.length);
    const comparisons = followup.monitoring?.comparison ?? [];
    const comparisonHtml = comparisons.length
      ? `<h4>Baseline and follow-up comparison</h4><table><thead><tr><th>Domain</th><th>Baseline</th><th>Follow-up</th><th>Descriptive change</th><th>Conditions / limitations</th></tr></thead><tbody>${comparisons.map((row: any) => `<tr>
          <th scope="row">${esc(followup.metadata.domains.find(domain => domain.id === row.domainId)?.label ?? row.domainId)}</th><td>${esc(exportScoreValue(row.baseline))}</td><td>${esc(exportScoreValue(row.followup))}</td>
          <td>${row.change == null ? "Not calculated" : esc(`${row.change > 0 ? "+" : ""}${Number(row.change).toFixed(1)}`)}</td>
          <td>${esc((row.limitations ?? []).join("; ") || "Coverage conditions met")}</td>
        </tr>`).join("")}</tbody></table><p class="meta">Differences are descriptive only; they are not statistical significance or a clinical effect.</p>`
      : `<p>${submitted ? "A comparable baseline and follow-up rating set is not available for this record." : "This linked form has not been submitted, so follow-up results are not available yet."}</p>`;
    return `<section><h3>Linked follow-up ${index + 1}: ${esc(followup.metadata.formName)}</h3>
      <p>Status: ${esc(followup.status.replace(/_/g, " "))}${followup.submittedAt ? ` · Submitted ${esc(followup.submittedAt)}` : ""}</p>
      ${submitted ? exportScoreTable(followup.scores) : "<p>No follow-up scores are included until the form is submitted.</p>"}
      ${comparisonHtml}</section>`;
  }).join("");
}

export function literacyExport(doc: LiteracyDocument & { linkedFollowups?: LiteracyDocument[] }) {
  const parent = doc.metadata.respondent === "parent";
  const source = parent ? "parent or caregiver" : "teacher";
  const heading = parent ? "Parent-reported observations in the home setting" : "Teaching and observation context";
  const rows = doc.scores.map(s => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.status === "scored" ? `${s.displayMean} of 5 — observed difficulty frequency` : s.presentationLabel ?? s.status)}</td><td>${esc(s.validCount ?? "—")} / ${esc(s.applicableCount ?? "—")} applicable; ${esc(s.totalItems ?? "—")} original</td><td>${s.coverage == null ? "—" : esc((s.coverage * 100).toFixed(1) + "%")}</td><td>NO ${esc(s.notObservedCount ?? "—")}; NA ${esc(s.notApplicableCount ?? "—")}; unanswered ${esc(s.unansweredCount ?? "—")}</td><td>${esc(s.impact ?? "Unknown")}</td></tr>`).join("");
  const evidence = doc.metadata.domains.filter(d => doc.selectedDomains.includes(d.id)).map(d => `<section><h2>${esc(d.label)}</h2><p>Strengths: ${esc(doc.input.evidence[d.id]?.strengths || "Not recorded")}</p><p>Supports: ${esc(doc.input.evidence[d.id]?.supports || "Not recorded")}</p>${parent ? `<p>Home setting: ${esc(doc.input.evidence[d.id]?.setting || "Not observed")}; observation language: ${esc(doc.input.evidence[d.id]?.language || "Not observed")}.</p>` : ""}${(doc.input.evidence[d.id]?.examples ?? []).map(e => `<p>${esc(e.itemIds.join(", "))}: ${esc(e.text)}</p>`).join("")}<table><thead><tr><th>Item</th><th>Exact observation wording</th><th>Response / reason</th></tr></thead><tbody>${d.items.map(i => { const r = doc.input.responses.find(r => r.itemId === i.id); return `<tr><td>${esc(i.id)}</td><td>${esc(i.text)}</td><td>${esc(r?.status === "rated" ? r.value : r?.status ?? "unanswered")}${r?.status === "not_applicable" ? ` — ${esc(r.reason)}` : ""}</td></tr>`; }).join("")}</tbody></table></section>`).join("");
  const priorities = (doc.plan?.priorities ?? doc.input.summary.priorities).map((p: any) => `<li>${esc(p.text)} (${esc(p.itemIds.join(", "))}; strategy ${esc(p.strategyId)}). Owner ${esc(p.owner)}; progress ${esc(p.indicator)}; review ${esc(p.reviewDate)}.</li>`).join("");
  const followups = doc.linkedFollowups ?? [];
  const reportStatus = doc.report?.approvedAt ? "Approved" : doc.report?.narrative ? "Draft — professional review required" : "Not written";
  const reportHtml = doc.report?.narrative
    ? markdownReportHtml(String(doc.report.narrative), domainObservationHtml(doc))
    : "<p>No professional report has been saved for this record.</p>";
  const planHtml = doc.plan
    ? `<p><strong>Pathway:</strong> ${esc(String(doc.plan.pathway ?? "Not selected").replace(/_/g, " "))}</p>
       <p><strong>Status:</strong> ${doc.plan.approvedAt ? `Agreed · ${esc(doc.plan.approvedAt)}` : "Draft / not agreed"}</p>
       <p><strong>Rationale:</strong> ${esc(doc.plan.rationale || "Not recorded")}</p><ul>${priorities || "<li>No linked priorities recorded.</li>"}</ul>`
    : `<p>No separate support plan has been saved. This optional step is not required to complete the report.</p>${priorities ? `<ul>${priorities}</ul>` : ""}`;
  const monitoringEntries = doc.monitoring?.entries ?? [];
  const monitoringHtml = monitoringEntries.length
    ? `<ul>${monitoringEntries.map(e => `<li><strong>${esc(e.date)}:</strong> ${esc(e.supportDelivered)}. Participation: ${esc(e.participation || "not recorded")}.${e.note ? ` ${esc(e.note)}` : ""}</li>`).join("")}</ul>`
    : "<p>No progress-monitoring entries are recorded. Monitoring is optional and is not required before further assessment.</p>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Chinese Literacy ${source} report and follow-up record</title><style>
    @page{margin:18mm}*{box-sizing:border-box}
    body{font:11pt Arial,sans-serif;color:#17253b;margin:0;line-height:1.5}
    h1{font-size:23pt;line-height:1.2;margin:0 0 7pt}h2{font-size:16pt;border-bottom:1px solid #d8e1e8;padding-bottom:5pt;margin:22pt 0 10pt;break-after:avoid}
    h3{font-size:12pt;margin:10pt 0 6pt;break-after:avoid}h4{font-size:10pt;margin:12pt 0 4pt;break-after:avoid}
    p{margin:6pt 0}ul,ol{padding-left:20pt;margin:6pt 0}li{margin:3pt 0}
    header{border-bottom:3px solid #1379a8;padding-bottom:12pt;margin-bottom:18pt}
    table{border-collapse:collapse;width:100%;font-size:9pt;margin:12pt 0}td,th{border:1px solid #aab7c5;padding:6pt;vertical-align:top;text-align:left;overflow-wrap:anywhere}
    thead{display:table-header-group}tr{break-inside:avoid}.meta,.caution,.empty-chart{font-size:9pt;color:#53657a}
    .domain-card{border:1px solid #d8e1e8;border-radius:8pt;padding:10pt;margin:12pt 0;break-inside:auto}
    .rating-chart{background:#f6f9fb;border:1px solid #e4ebf0;border-radius:6pt;padding:10pt 12pt;margin:10pt 0}
    .bar-row{display:grid;grid-template-columns:155pt 1fr 20pt;gap:7pt;align-items:center;margin:4pt 0;font-size:8pt}
    .bar-track{height:7pt;background:#e2e8ee;border-radius:5pt;overflow:hidden}.bar-fill{display:block;height:100%;background:#1f74ad;border-radius:5pt}
    .interpretation{background:#eef7fb;border-left:3pt solid #1f74ad;padding:8pt 10pt;margin:10pt 0}
    .planning-recommendation{background:#f6f9fb;border:1px solid #d8e1e8;border-radius:5pt;padding:8pt 10pt;margin:10pt 0}
    .report-recommendations{border:1px solid #c9dceb;background:#f4f9fc;border-radius:8pt;padding:12pt;margin-top:18pt}
    footer{border-top:1px solid #d8e1e8;margin-top:22pt;padding-top:8pt;font-size:8pt;color:#58697c}
    @media print{@page{margin:18mm;@bottom-right{content:"Page " counter(page)}}.rating-chart,.domain-card,.report-recommendations{break-inside:avoid}}
    </style></head><body><header>
  <h1>${esc(doc.metadata.name)}</h1><p class="meta">${esc(doc.metadata.formName)} — professional report: ${esc(reportStatus)}</p>
  <p>Instrument ${esc(doc.instrumentVersion)}; scoring ${esc(doc.scoringVersion)}; language ${esc(doc.languageVersion)}; input revision ${esc(doc.report?.inputRevision ?? doc.revision)}; record revision ${doc.revision}; ${esc(doc.submittedAt)}</p>
  <p class="meta">Student identifier ${esc(doc.contextSnapshot.studentId)}; ${source} ${esc(doc.teacherName)}. This record contains one ${source}’s perspective in ${parent ? "the home setting" : "the classroom"}.</p>
  <p class="meta">This snapshot includes saved report, support plan, monitoring and linked follow-up records available at export time. Parent and teacher records are not combined.</p></header>
  <h2>${heading}</h2><p>${esc(doc.report?.classroomAvailabilityNote ?? "")}</p><dl>${Object.entries(doc.input.context).map(([key,value])=>`<dt>${esc(key.replace(/([a-z])([A-Z])/g, "$1 $2"))}</dt><dd>${esc(value)}</dd>`).join("")}</dl>
  ${parent ? `<p>Source-parent confirmation: ${esc(doc.sourceConfirmation?.confirmed ? "Confirmed" : "Pending")}; date ${esc(doc.sourceConfirmation?.date ?? "")}; entered by ${esc(doc.enteredBy ?? "Assigned parent or caregiver")}.</p>` : ""}
  <h2>Strengths and observations</h2><p>${esc(doc.input.summary.strengths)}</p><p>${esc(doc.input.summary.barriers)}</p><p>${esc(doc.input.summary.supportResponse)}</p><p>${esc(doc.input.summary.discussion)}</p><p>${esc(doc.evidenceStatus)}</p>
  <table><thead><tr><th>Domain</th><th>Difficulty frequency</th><th>Rated / applicable</th><th>Coverage</th><th>Missingness</th><th>Separate impact</th></tr></thead><tbody>${rows}</tbody></table>
  <p>The 80% rule is provisional data completeness guidance, not a psychometric or clinical cutoff. NA excludes items only with reasons; NO and unanswered items remain in the applicable denominator. No total, norm or risk category is calculated.</p>
  <h2>Professional report — ${esc(reportStatus)}</h2><main class="report-body">${reportHtml}</main>
  <h2>Support plan</h2>${planHtml}
  <h2>Monitoring (optional)</h2>${monitoringHtml}
  <h2>Follow-up (optional)</h2>${linkedFollowupHtml(followups)}
  ${evidence}<h2>Limitations</h2><p>${esc(doc.metadata.reportLimitation)}</p>
  <p>Reviewer ${esc(doc.report?.approvedBy ?? "Not approved")}; approval ${esc(doc.report?.approvedAt ?? "Pending")}. External Case Portal synchronization: not configured. No draft or raw comment is automatically released.</p><footer>ReMynd Assessment Operating System — confidential educational observation record.</footer></body></html>`;
}

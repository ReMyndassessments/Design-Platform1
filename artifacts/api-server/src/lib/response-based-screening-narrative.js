function normalized(value) {
  return value.trim().toLocaleLowerCase();
}

function isRecordedCode(value) {
  return /^(Recorded code\/value:|Recorded value:)/i.test(value);
}

/**
 * Build a local, non-diagnostic narrative from exact saved responses.
 * It does not call an AI provider or infer score direction from option order.
 */
export function buildResponseBasedScreeningNarrative(input) {
  const groups = new Map();
  let unmapped = 0;
  const answeredItems = input.items.filter(item => item.response !== null);

  for (const item of answeredItems) {
    const response = item.response;
    if (isRecordedCode(response)) {
      unmapped++;
      continue;
    }

    const selectedOption = item.options.find(option => normalized(option) === normalized(response));
    if (!selectedOption) {
      unmapped++;
      continue;
    }

    const groupKey = JSON.stringify(item.options.map(normalized));
    const group = groups.get(groupKey) ?? {
      options: item.options,
      counts: new Map(),
      itemsByLabel: new Map(),
    };
    group.counts.set(selectedOption, (group.counts.get(selectedOption) ?? 0) + 1);
    const matchingItems = group.itemsByLabel.get(selectedOption) ?? [];
    matchingItems.push(item);
    group.itemsByLabel.set(selectedOption, matchingItems);
    groups.set(groupKey, group);
  }

  const lines = [
    `RESPONSE-BASED SCREENING NARRATIVE — ${input.instrument}`,
    "",
    "Response overview",
    input.total === null
      ? `${input.answered} recorded responses are available; the saved item set is incomplete.`
      : `${input.answered} of ${input.total} items have recorded responses${input.total > input.answered ? `; ${input.total - input.answered} are unanswered` : ""}.`,
    "",
    "Observed response patterns",
  ];

  const groupedSummaries = Array.from(groups.values()).map(group => {
    const counts = Array.from(group.counts.entries())
      .sort((a, b) => b[1] - a[1] || group.options.indexOf(a[0]) - group.options.indexOf(b[0]));
    return counts.map(([label, count]) => `“${label}” was selected for ${count} item${count === 1 ? "" : "s"}`).join("; ");
  });
  lines.push(
    groupedSummaries.length
      ? groupedSummaries.join(". ")
      : "No responses could be matched to the saved answer labels.",
  );
  if (unmapped > 0) {
    lines.push(`${unmapped} response${unmapped === 1 ? " is" : "s are"} stored as a code/value or do not match a saved option, so ${unmapped === 1 ? "it is" : "they are"} not assigned a response label here.`);
  }

  const examples = [];
  for (const group of groups.values()) {
    for (const [label, items] of group.itemsByLabel.entries()) {
      if (items.length < 2) continue;
      for (const item of items.slice(0, 2)) {
        if (item.prompt) examples.push({ prompt: item.prompt, response: label, count: items.length });
      }
    }
  }
  examples.sort((a, b) => b.count - a.count || a.prompt.localeCompare(b.prompt));
  const selectedExamples = examples.slice(0, 6);
  if (selectedExamples.length > 0) {
    lines.push("", "Items sharing a recorded response (examples)");
    selectedExamples.forEach(item => lines.push(`• ${item.prompt} — “${item.response}”`));
    if (examples.length > selectedExamples.length) {
      lines.push(`${examples.length - selectedExamples.length} additional matching item example${examples.length - selectedExamples.length === 1 ? "" : "s"} omitted.`);
    }
  } else if (answeredItems.some(item => item.prompt)) {
    lines.push("", "Example recorded item responses");
    answeredItems.filter(item => item.prompt).slice(0, 4).forEach(item => {
      lines.push(`• ${item.prompt} — ${item.response}`);
    });
  }

  lines.push(
    "",
    "Planning discussion",
    "Use these exact item responses as prompts to ask when and where the situation occurs, how it affects learning or participation, what is already helping, and what support could be tried and monitored. Compare with other respondents and case information before deciding on supports.",
    "",
    "This is a descriptive, non-diagnostic narrative generated from the saved responses. It does not calculate scores, infer severity, apply norms, or establish a diagnosis. Response counts are not scale scores.",
  );
  return lines.join("\n");
}

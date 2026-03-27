import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function callDeepSeek(prompt) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "user", content: prompt }], temperature: 0.3, max_tokens: 8192 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.choices?.[0]?.message?.content ?? "";
}

async function translateBatch(items) {
  const needsKorean = items.filter(it => !it.textKorean);
  if (!needsKorean.length) return;
  const prompt = `You are a clinical psychologist. Translate each item to Korean only.
Return ONLY a JSON array, no markdown:
[{"id":"<id>","textKorean":"...","optionsKorean":[...]}]
Rules: optionsKorean must be same length as options; empty options = []

Items:
${JSON.stringify(needsKorean.map(it => ({ id: it.id, text: it.text, options: it.options ?? [] })))}`;

  const raw = await callDeepSeek(prompt);
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("["), end = cleaned.lastIndexOf("]");
  if (start === -1) { console.error("No JSON array in response"); return; }
  const arr = JSON.parse(cleaned.slice(start, end + 1));
  const byId = Object.fromEntries(arr.map(t => [t.id, t]));
  for (const item of items) {
    if (byId[item.id]) {
      item.textKorean = item.textKorean || byId[item.id].textKorean || "";
      if (!item.optionsKorean?.length) item.optionsKorean = byId[item.id].optionsKorean ?? [];
    }
  }
}

async function translateTool(toolId) {
  console.log(`\nTranslating ${toolId}...`);
  const { rows } = await pool.query('SELECT form_items FROM assessment_tools WHERE id = $1', [toolId]);
  if (!rows[0]) { console.log(`Not found: ${toolId}`); return; }
  const items = rows[0].form_items;

  const BATCH = 50;
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));
  console.log(`  ${items.length} items → ${batches.length} batches (parallel)`);

  await Promise.all(batches.map(b => translateBatch(b)));

  await pool.query('UPDATE assessment_tools SET form_items = $1 WHERE id = $2', [JSON.stringify(items), toolId]);
  const done = items.filter(it => it.textKorean).length;
  console.log(`  ✓ ${toolId} saved — ${done}/${items.length} items have Korean`);
}

(async () => {
  try {
    await Promise.all(["BRIEF2-P", "BRIEF2-SR", "BRIEF2-T"].map(translateTool));
    console.log("\nAll 3 BRIEF-2 forms translated successfully!");
  } catch(e) { console.error("Error:", e.message); }
  await pool.end();
})();

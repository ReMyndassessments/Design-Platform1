import test from "node:test";
import assert from "node:assert/strict";
import { translateChineseFields } from "./chineseLiteracyExportTranslation.ts";

test("builds an English export copy without changing the saved source object", async () => {
  const source = {
    input: { context: { homeLanguage: "中文", grade: "9" } },
    report: { narrative: "English text with a 中文 phrase." },
    plan: null,
  };
  const result = await translateChineseFields(source, async entries =>
    Object.fromEntries(entries.map(entry => [entry.path, entry.text.replaceAll("中文", "Chinese")])),
  );

  assert.equal(source.input.context.homeLanguage, "中文");
  assert.equal(result.translated.input.context.homeLanguage, "Chinese");
  assert.equal(result.translated.input.context.grade, "9");
  assert.equal(result.translated.report.narrative, "English text with a Chinese phrase.");
  assert.equal(result.translations["input.context.homeLanguage"], "Chinese");
});

test("fails instead of exporting untranslated Chinese when a translation is missing", async () => {
  await assert.rejects(
    translateChineseFields({ response: "需要翻译" }, async () => ({})),
    /incomplete/i,
  );
});

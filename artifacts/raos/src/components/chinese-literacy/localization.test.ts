import assert from "node:assert/strict";
import { test } from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LITERACY_METADATA } from "../../../../api-server/src/lib/chineseLiteracy";
import { PARENT_LITERACY_METADATA } from "../../../../api-server/src/lib/chineseLiteracyParent";
import { translateLiteracyText as t } from "./localization";
import { ClLanguageContext, localizeNode, Verbatim } from "./Localization";
import { DomainStep } from "./DomainStep";
import { ContextStep } from "./ContextStep";
import { ParentContextStep } from "./ParentContextStep";
import { SummaryStep } from "./SummaryStep";
import { ReviewStep } from "./ReviewStep";
import { normalizeInput, validateInput } from "./logic";
import type { ClMetadata } from "./types";
import { BrandedHeader } from "./BrandedHeader";

// tsx's standalone test runner uses classic JSX; Vite uses the automatic runtime.
Reflect.set(globalThis, "React", React);
Reflect.set(globalThis, "localStorage", { getItem: () => null });

for (const metadata of [LITERACY_METADATA, PARENT_LITERACY_METADATA]) {
  const meta = metadata as ClMetadata;
  test(`${meta.formName}: all 78 questions, domains, instructions, anchors and strategies translate`, () => {
    const strings = [
      meta.name, meta.formName!, meta.introduction, meta.limitation, meta.reportLimitation,
      ...meta.anchors, ...meta.anchors.map(a => a.split(/\s+[—-]\s+/)[0]),
      ...meta.domains.flatMap(d => [d.label, ...d.items.map(i => i.text)]),
      ...meta.strategies.flatMap(s => [s.label, ...s.options, s.options.join("; ")]),
    ];
    assert.equal(meta.domains.flatMap(d => d.items).length, 78);
    for (const source of strings) {
      assert.equal(t(source, "english"), source);
      assert.notEqual(t(source, "mandarin"), source, `Missing Chinese: ${source}`);
      assert.match(t(source, "mandarin"), /[\u3400-\u9fff]/);
      assert.doesNotMatch(t(source, "mandarin"), /\[L\d+\]/);
    }
  });
  test(`${meta.formName}: rendered questions, context, summary, review are Chinese, values unchanged`, () => {
    const input = normalizeInput(null, meta, 6);
    input.interfaceLanguage = "mandarin";
    input.responses[0] = { itemId: meta.domains[0].items[0].id, status: "rated", value: 3 };
    input.context.teacherRole = "Next";
    input.context.relationship = "Next";
    input.summary.strengths = "My unchanged answer";
    const before = JSON.stringify(input);
    const render = (node: any) => renderToStaticMarkup(createElement(ClLanguageContext.Provider, { value: "mandarin" }, node));
    const html = render(createElement(DomainStep, { domain: meta.domains[0], input, meta, update: () => {} }));
    assert.ok(html.includes(t(meta.domains[0].items[0].text, "mandarin")));
    assert.ok(html.includes('aria-checked="true"'));
    assert.ok(html.includes("NO 未观察到"));
    assert.ok(html.includes("NA 不适用"));
    assert.doesNotMatch(html, />Response scale</);
    const student = { identifier: "Next", grade: 6, age: 12 };
    const respondent = { name: "Reading", email: "" };
    const contextHtml = render(meta.key.includes("PARENT")
      ? createElement(ParentContextStep, { input, student, respondent, setContext: () => {} })
      : createElement(ContextStep, { input, student, teacher: respondent, setContext: () => {} }));
    assert.ok(contextHtml.includes(">Next<"), "Student name not translated");
    assert.ok(contextHtml.includes(">Reading<"), "Respondent name not translated");
    assert.ok(contextHtml.includes("value=\"Next\""), "Typed answer not translated");
    assert.ok(contextHtml.includes("提供答案"));
    const summary = render(createElement(SummaryStep, { input, meta, update: () => {}, parent: meta.key.includes("PARENT") }));
    assert.ok(summary.includes("My unchanged answer"));
    assert.ok(summary.includes("主要优势"));
    const review = render(createElement(ReviewStep, { input, domains: meta.domains, issues: validateInput(input, meta, meta.domains), goTo: () => {}, onSubmit: () => {}, submitting: false, preview: true, error: null, passed: false }));
    assert.ok(review.includes("复核并提交"));
    assert.doesNotMatch(review, /is required|choose Complete this section|still need a rating/);
    assert.equal(JSON.stringify(input), before, "Translation never mutates response data");
  });
}

test("presentation localization preserves enum values, keys, handlers and controlled text", () => {
  const onChange = () => {};
  const node = createElement("input", { key: "stable", value: "Next", placeholder: "Choose", onChange });
  const translated = localizeNode(node, "mandarin") as typeof node;
  assert.equal(translated.key, node.key);
  assert.equal(translated.props.value, "Next");
  assert.equal(translated.props.onChange, onChange);
  assert.equal(translated.props.placeholder, "选择");
  assert.equal(localizeNode(createElement(Verbatim, null, "Next"), "mandarin")?.toString().includes("下一步"), false);
});

test("dynamic validation, dates and Chinese NO/NA are distinct", () => {
  assert.equal(t("Saved 10:15", "mandarin"), "已保存 10:15");
  assert.ok(t("Reading: 8 items still need a rating, Not observed, or Not applicable.", "mandarin").includes("阅读"));
  assert.equal(t("NO Not observed", "mandarin"), "NO 未观察到");
  assert.equal(t("NA Not applicable", "mandarin"), "NA 不适用");
  assert.match(t("1 Never or almost never", "mandarin"), /从不/);
});

test("branded header translates both form versions and preserves language controls and identity", () => {
  for (const meta of [LITERACY_METADATA, PARENT_LITERACY_METADATA]) {
    const html = renderToStaticMarkup(createElement(BrandedHeader, {
      title: meta.name,
      formName: meta.formName,
      version: meta.version,
      studentIdentifier: createElement(Verbatim, null, "Reading"),
      respondentName: "Example respondent",
      language: "mandarin",
      setLang: () => {},
      progress: 0.52,
      status: createElement("span", { "data-testid": "status-save" }, "Draft"),
    }));
    assert.ok(html.includes(t(meta.name, "mandarin")));
    assert.ok(html.includes(t(meta.formName, "mandarin")));
    assert.ok(html.includes(t("Language", "mandarin")));
    assert.ok(html.includes("Reading"), "Student identity remains verbatim");
    assert.match(html, /aria-pressed="true"[^>]*title="中文（简体）"/);
    assert.ok(html.includes('data-testid="button-interface-language-english"'));
    assert.ok(html.includes('data-testid="button-interface-language-mandarin"'));
    assert.ok(html.includes('data-testid="button-interface-language-korean"'));
    assert.ok(!html.includes("<select"), "Uses the established portal language buttons, not a dropdown");
    assert.ok(html.includes("Example respondent"), "Respondent identity remains verbatim");
    assert.ok(html.includes("评估门户"));
    assert.ok(html.includes('data-testid="status-save"'));
    assert.ok(html.includes("width:52%"));
    assert.ok(html.includes('alt="ReMynd"'));
  }
});

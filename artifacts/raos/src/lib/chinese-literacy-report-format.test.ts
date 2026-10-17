import assert from "node:assert/strict";
import test from "node:test";
import {
  parseChineseLiteracyReportText,
  splitChineseLiteracyComparisonByDomain,
} from "./chinese-literacy-report-format.ts";

test("formats markdown headings, bullets, and numbered lists as separate blocks", () => {
  const blocks = parseChineseLiteracyReportText(
    "## Summary\nA short introduction.\n\n- First point\n- Second point\n\n1. First step\n2) Second step",
  );

  assert.deepEqual(blocks, [
    { type: "heading", text: "Summary" },
    { type: "paragraph", text: "A short introduction." },
    { type: "unordered-list", items: ["First point", "Second point"] },
    { type: "ordered-list", items: ["First step", "Second step"] },
  ]);
});

test("splits comparison prose into a lead-in and domain-labeled narratives", () => {
  const sections = splitChineseLiteracyComparisonByDomain(
    "Matched patterns are described below. Reading: both settings note strength. Written expression: both report difficulty.",
    ["Reading", "Written expression"],
  );

  assert.deepEqual(sections, [
    { label: null, text: "Matched patterns are described below." },
    { label: "Reading", text: "both settings note strength." },
    { label: "Written expression", text: "both report difficulty." },
  ]);
});

test("recognizes Chinese domain labels separated by Chinese punctuation", () => {
  const sections = splitChineseLiteracyComparisonByDomain(
    "共同表现如下。阅读：两种情境均有优势。书面表达：均报告困难。",
    ["阅读", "书面表达"],
  );

  assert.deepEqual(sections, [
    { label: null, text: "共同表现如下。" },
    { label: "阅读", text: "两种情境均有优势。" },
    { label: "书面表达", text: "均报告困难。" },
  ]);
});

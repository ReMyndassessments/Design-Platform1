import type { FormQuestion } from "./questions.js";

const ITEM_TYPE_MAP: Record<string, string> = {
  radio: "radio_group",
  multiple_choice: "radio_group",
};

type StoredFormItem = {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain?: string;
  required?: boolean;
  note?: string;
  noteChinese?: string;
  noteKorean?: string;
  links?: Array<{ text: string; url: string }>;
  rows?: StoredFormItem[];
  conditionalOn?: string;
  conditionalValue?: string;
  conditionalType?: string;
  reversed?: boolean;
};

export function questionsFromAssignmentSnapshot(snapshot: string | null | undefined): FormQuestion[] | null {
  if (!snapshot) return null;
  try {
    const stored = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(stored) || stored.length === 0) return null;
    const questions = stored.map(mapStoredFormItem);
    if (questions.some(question => question === null)) return null;
    return questions as FormQuestion[];
  } catch {
    return null;
  }
}

function mapStoredFormItem(value: unknown): FormQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as StoredFormItem;
  if (typeof item.id !== "string" || typeof item.text !== "string" || typeof item.type !== "string") {
    return null;
  }

  let rows: FormQuestion[] | undefined;
  if (item.rows !== undefined) {
    if (!Array.isArray(item.rows)) return null;
    const mappedRows = item.rows.map(mapStoredFormItem);
    if (mappedRows.some(row => row === null)) return null;
    rows = mappedRows as FormQuestion[];
  }

  return {
    id: item.id,
    text: item.text,
    textChinese: item.textChinese,
    textKorean: item.textKorean,
    type: (ITEM_TYPE_MAP[item.type] ?? item.type) as FormQuestion["type"],
    options: item.options,
    optionsChinese: item.optionsChinese,
    optionsKorean: item.optionsKorean,
    rows,
    domain: item.domain ?? "",
    required: item.required ?? false,
    note: item.note,
    noteChinese: item.noteChinese,
    noteKorean: item.noteKorean,
    links: item.links,
    conditionalOn: item.conditionalOn,
    conditionalValue: item.conditionalValue,
    conditionalType: item.conditionalType,
    reversed: item.reversed,
  };
}
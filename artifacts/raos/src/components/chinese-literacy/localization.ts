import chinese from "./zh-CN.json";
import type { InterfaceLanguage } from "./types";

const catalog: Record<string, string> = chinese;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = Object.entries(catalog)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, value]) => {
    const slots: number[] = [];
    const parts = key.split(/(\{\d+\})/g).map(part => {
      if (!/^\{\d+\}$/.test(part)) return escape(part);
      slots.push(Number(part.slice(1, -1)));
      return "(.*?)";
    });
    return { pattern: new RegExp(`^${parts.join("")}$`), value, slots };
  });

/** Presentation only: no response values, item IDs or stored narratives are translated. */
export function translateLiteracyText(text: string, language: InterfaceLanguage): string {
  if (language !== "mandarin" || !text.trim()) return text;
  const key = text.replace(/\s+/g, " ").trim();
  let translated = catalog[key];
  if (translated === undefined) {
    for (const template of templates) {
      const match = key.match(template.pattern);
      if (!match) continue;
      const args: Record<number, string> = {};
      template.slots.forEach((slot, index) => {
        args[slot] = translateLiteracyText(match[index + 1], language);
      });
      translated = template.value.replace(/\{(\d+)\}/g, (_, slot) => args[Number(slot)] ?? "");
      break;
    }
  }
  if (translated === undefined) return text;
  return `${/^\s/.test(text) ? " " : ""}${translated}${/\s$/.test(text) ? " " : ""}`;
}

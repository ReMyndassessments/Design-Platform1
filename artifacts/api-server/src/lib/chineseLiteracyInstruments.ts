import { CHINESE_LITERACY_KEY, LITERACY_METADATA, type LiteracyMetadata } from "./chineseLiteracy.js";
import { CHINESE_LITERACY_PARENT_KEY, PARENT_LITERACY_METADATA } from "./chineseLiteracyParent.js";

export const CHINESE_LITERACY_KEYS = [CHINESE_LITERACY_KEY, CHINESE_LITERACY_PARENT_KEY];
export const isChineseLiteracy = (key: string | null | undefined) => !!key && CHINESE_LITERACY_KEYS.includes(key);
export const isParentLiteracy = (key: string | null | undefined) => key === CHINESE_LITERACY_PARENT_KEY;
export function literacyMetadata(key: string): LiteracyMetadata {
  if (key === CHINESE_LITERACY_PARENT_KEY) return PARENT_LITERACY_METADATA;
  if (key === CHINESE_LITERACY_KEY) return LITERACY_METADATA;
  throw new Error("Unknown Chinese literacy instrument.");
}

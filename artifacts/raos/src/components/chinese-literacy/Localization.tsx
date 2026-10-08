import { cloneElement, createContext, isValidElement, useContext, type ReactNode } from "react";
import type { InterfaceLanguage } from "./types";
import { translateLiteracyText } from "./localization";

export const ClLanguageContext = createContext<InterfaceLanguage>("english");
/** Protect names and respondent-authored content from presentation translation. */
export function Verbatim({ children }: { children: ReactNode }) { return <>{children}</>; }

const displayAttributes = ["label", "title", "hint", "placeholder", "aria-label"];
export function localizeNode(node: ReactNode, language: InterfaceLanguage): ReactNode {
  if (typeof node === "string") return translateLiteracyText(node, language);
  if (Array.isArray(node)) return node.map(child => localizeNode(child, language));
  if (!isValidElement<Record<string, unknown>>(node) || node.type === Verbatim) return node;
  // Never alter input values, enum values, identifiers, handlers or accessibility state.
  const props: Record<string, unknown> = {};
  for (const attr of displayAttributes) {
    if (typeof node.props[attr] === "string") props[attr] = translateLiteracyText(node.props[attr] as string, language);
  }
  if (Array.isArray(node.props.children)) return cloneElement(node, props, ...node.props.children.map(child => localizeNode(child as ReactNode, language)));
  if (node.props.children !== undefined) return cloneElement(node, props, localizeNode(node.props.children as ReactNode, language));
  return cloneElement(node, props);
}

/** Each form component localizes its rendered presentation using the shared language. */
export function useLocalizedView(override?: InterfaceLanguage) {
  const inherited = useContext(ClLanguageContext);
  const language = override ?? inherited;
  return (node: ReactNode): ReactNode => language === "mandarin" ? localizeNode(node, language) : node;
}

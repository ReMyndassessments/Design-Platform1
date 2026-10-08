import { cloneElement, isValidElement, type ReactNode } from "react";
import type { InterfaceLanguage } from "./types";

const chineseCopy: Record<string, string> = {
  "Chinese literacy observation": "中文读写能力观察",
  "Parent Observation Form for Grades 3–12": "3–12年级家长观察表",
  "Teacher Form, Grades 3 to 12": "3至12年级教师表",
  "Student Services": "学生服务",
  "Student:": "学生：",
  "Language": "语言",
  "Retry save": "重试保存",
};

export function Verbatim({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function localizeNode(node: ReactNode): ReactNode {
  if (typeof node === "string") return chineseCopy[node.trim()] ?? node;
  if (Array.isArray(node)) return node.map(localizeNode);
  if (!isValidElement<Record<string, unknown>>(node) || node.type === Verbatim) return node;
  const props: Record<string, unknown> = {};
  for (const attr of ["label", "title", "hint", "placeholder", "aria-label"]) {
    if (typeof node.props[attr] === "string") props[attr] = chineseCopy[node.props[attr] as string] ?? node.props[attr];
  }
  if (Array.isArray(node.props.children)) return cloneElement(node, props, ...node.props.children.map(localizeNode));
  if (node.props.children !== undefined) return cloneElement(node, props, localizeNode(node.props.children as ReactNode));
  return cloneElement(node, props);
}

export function useLocalizedView(language: InterfaceLanguage) {
  return (node: ReactNode): ReactNode => language === "mandarin" ? localizeNode(node) : node;
}

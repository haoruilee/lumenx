"use client";

import enUS from "./messages/en-US";
import zhCN from "./messages/zh-CN";

export const messages = {
  "zh-CN": zhCN,
  "en-US": enUS,
} as const;

export type Locale = keyof typeof messages;
export type LocaleMode = Locale | "bilingual";

export const DEFAULT_LOCALE_MODE: LocaleMode = "bilingual";
export const I18N_STORAGE_KEY = "lumenx.locale_mode";

type Primitive = string | number | boolean;
type Params = Record<string, Primitive>;

const getByPath = (source: unknown, path: string): string | undefined => {
  const result = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);
  return typeof result === "string" ? result : undefined;
};

const interpolate = (template: string, params?: Params) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
};

export const getMessage = (locale: Locale, key: string, params?: Params) => {
  const template = getByPath(messages[locale], key) ?? key;
  return interpolate(template, params);
};

export const formatMessage = (mode: LocaleMode, key: string, params?: Params) => {
  if (mode === "bilingual") {
    return `${getMessage("zh-CN", key, params)} / ${getMessage("en-US", key, params)}`;
  }
  return getMessage(mode, key, params);
};

export type MessageParams = Params;

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOCALE_MODE,
  formatMessage,
  I18N_STORAGE_KEY,
  type LocaleMode,
  type MessageParams,
} from "./index";

interface I18nContextValue {
  localeMode: LocaleMode;
  setLocaleMode: (mode: LocaleMode) => void;
  t: (key: string, params?: MessageParams) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [localeMode, setLocaleModeState] = useState<LocaleMode>(DEFAULT_LOCALE_MODE);

  useEffect(() => {
    const stored = window.localStorage.getItem(I18N_STORAGE_KEY) as LocaleMode | null;
    if (stored === "zh-CN" || stored === "en-US" || stored === "bilingual") {
      setLocaleModeState(stored);
    }
  }, []);

  const setLocaleMode = (mode: LocaleMode) => {
    setLocaleModeState(mode);
    window.localStorage.setItem(I18N_STORAGE_KEY, mode);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      localeMode,
      setLocaleMode,
      t: (key: string, params?: MessageParams) => formatMessage(localeMode, key, params),
    }),
    [localeMode]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};

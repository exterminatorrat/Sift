import React, { createContext, useContext, useMemo } from "react";
import {
  AppLanguageCode,
  getLanguageCode,
  TranslationKey,
  translations
} from "./translations";

type TranslationValues = Record<string, string | number>;

type I18nContextValue = {
  languageCode: AppLanguageCode;
  t: (key: TranslationKey, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue>({
  languageCode: "en",
  t: (key) => translations.en[key]
});

type I18nProviderProps = {
  language?: string | null;
  children: React.ReactNode;
};

export function I18nProvider({ language, children }: I18nProviderProps) {
  const languageCode = getLanguageCode(language);

  const value = useMemo<I18nContextValue>(() => {
    const translate = (key: TranslationKey, values?: TranslationValues) => {
      let text = translations[languageCode][key] ?? translations.en[key] ?? key;

      if (values) {
        Object.entries(values).forEach(([name, replacement]) => {
          text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(replacement));
        });
      }

      return text;
    };

    return {
      languageCode,
      t: translate
    };
  }, [languageCode]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

import * as Speech from "expo-speech";
import { AppLanguageCode, getLanguageCode } from "../i18n/translations";

const speechLanguageByCode: Record<AppLanguageCode, string> = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
  pt: "pt-PT",
  th: "th-TH",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW"
};

type SpeakTextOptions = {
  fallbackLanguageCode?: AppLanguageCode;
  languageHint?: string | null;
  onDone?: () => void;
  onError?: () => void;
  onStopped?: () => void;
  text: string;
};

export function getSpeechLanguageTag(
  languageHint?: string | null,
  fallbackLanguageCode: AppLanguageCode = "en"
) {
  const languageCode = languageHint ? getLanguageCode(languageHint) : fallbackLanguageCode;
  return speechLanguageByCode[languageCode] ?? speechLanguageByCode[fallbackLanguageCode];
}

export async function stopSpeech() {
  await Speech.stop();
}

export async function speakText({
  fallbackLanguageCode = "en",
  languageHint,
  onDone,
  onError,
  onStopped,
  text
}: SpeakTextOptions) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No speech text provided.");
  }

  await Speech.stop();
  Speech.speak(trimmed, {
    language: getSpeechLanguageTag(languageHint, fallbackLanguageCode),
    onDone,
    onError,
    onStopped,
    pitch: 1,
    rate: 0.92
  });
}

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { FileSearch, ListChecks, MessageCircleQuestion, ScanSearch, ShieldAlert } from "lucide-react-native";
import { colors } from "../constants/colors";
import { typography } from "../constants/typography";
import { AppTopBar } from "./AppTopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { AppLanguageCode } from "../i18n/translations";

type LoadingAnalysisProps = {
  imageUri?: string | null;
  showTopBar?: boolean;
  showBack?: boolean;
  onBack?: () => void;
};

type LoadingPhrase = {
  title: string;
  subtitle: string;
};

const PHOTO_HEIGHT = 304;
const SCAN_DURATION_MS = 3000;
const LOOP_PAUSE_MS = 400;
const PHRASE_INTERVAL_MS = SCAN_DURATION_MS + LOOP_PAUSE_MS;

const loadingPhrases: Partial<Record<AppLanguageCode, LoadingPhrase[]>> = {
  en: [
    { title: "Reading the menu...", subtitle: "Pulling out visible dishes and ingredients" },
    { title: "Tracing hidden risks...", subtitle: "Checking sauces, oils, broths, and garnishes" },
    { title: "Cross-checking your profile...", subtitle: "Adjusting risk for severity and cross-contact" },
    { title: "Preparing staff questions...", subtitle: "Turning uncertainty into what to ask next" }
  ],
  es: [
    { title: "Leyendo el menú...", subtitle: "Buscando platos e ingredientes visibles" },
    { title: "Rastreando riesgos ocultos...", subtitle: "Revisando salsas, aceites, caldos y guarniciones" },
    { title: "Comparando con tu perfil...", subtitle: "Ajustando el riesgo por gravedad y contacto cruzado" },
    { title: "Preparando preguntas...", subtitle: "Convirtiendo la incertidumbre en preguntas útiles" }
  ],
  fr: [
    { title: "Lecture du menu...", subtitle: "Repérage des plats et ingrédients visibles" },
    { title: "Recherche de risques cachés...", subtitle: "Sauces, huiles, bouillons et garnitures" },
    { title: "Vérification du profil...", subtitle: "Ajustement selon la gravité et le contact croisé" },
    { title: "Préparation des questions...", subtitle: "Transformer l'incertitude en questions utiles" }
  ],
  it: [
    { title: "Lettura del menu...", subtitle: "Estrazione di piatti e ingredienti visibili" },
    { title: "Tracciamento dei rischi nascosti...", subtitle: "Controllo di salse, oli, brodi e guarnizioni" },
    { title: "Confronto con il tuo profilo...", subtitle: "Regolazione del rischio per gravità e contatto incrociato" },
    { title: "Preparazione delle domande...", subtitle: "Trasformare l'incertezza in cosa chiedere" }
  ],
  ja: [
    { title: "メニューを読んでいます...", subtitle: "見える料理名と材料を確認しています" },
    { title: "隠れたリスクを確認中...", subtitle: "ソース、油、だし、付け合わせを見ています" },
    { title: "プロフィールと照合中...", subtitle: "重症度と交差接触を考慮しています" },
    { title: "質問を準備中...", subtitle: "スタッフに確認する内容を整理しています" }
  ],
  de: [
    { title: "Speisekarte wird gelesen...", subtitle: "Sichtbare Gerichte und Zutaten werden erkannt" },
    { title: "Versteckte Risiken werden geprüft...", subtitle: "Saucen, Öle, Brühen und Garnituren" },
    { title: "Profil wird abgeglichen...", subtitle: "Risiko nach Schweregrad und Kreuzkontakt" },
    { title: "Fragen werden vorbereitet...", subtitle: "Aus Unsicherheit werden konkrete Fragen" }
  ],
  ko: [
    { title: "메뉴를 읽는 중...", subtitle: "보이는 요리와 재료를 확인하고 있습니다" },
    { title: "숨은 위험을 확인 중...", subtitle: "소스, 기름, 육수, 고명을 살펴보고 있습니다" },
    { title: "프로필과 대조 중...", subtitle: "중증도와 교차 접촉을 반영하고 있습니다" },
    { title: "직원에게 물어볼 질문 준비 중...", subtitle: "불확실한 부분을 질문으로 정리하고 있습니다" }
  ],
  "zh-Hans": [
    { title: "正在读取菜单...", subtitle: "提取可见菜品和配料" },
    { title: "正在追踪隐藏风险...", subtitle: "检查酱料、油、汤底和配菜" },
    { title: "正在对照过敏档案...", subtitle: "根据严重程度和交叉接触调整风险" },
    { title: "正在准备询问员工的问题...", subtitle: "把不确定之处整理成问题" }
  ],
  "zh-Hant": [
    { title: "正在讀取菜單...", subtitle: "提取可見菜品和配料" },
    { title: "正在追蹤隱藏風險...", subtitle: "檢查醬料、油、湯底和配菜" },
    { title: "正在對照過敏檔案...", subtitle: "根據嚴重程度和交叉接觸調整風險" },
    { title: "正在準備詢問員工的問題...", subtitle: "把不確定之處整理成問題" }
  ],
  pt: [
    { title: "Lendo o cardápio...", subtitle: "Extraindo pratos e ingredientes visíveis" },
    { title: "Rastreando riscos ocultos...", subtitle: "Verificando molhos, óleos, caldos e guarnições" },
    { title: "Comparando com seu perfil...", subtitle: "Ajustando risco por gravidade e contato cruzado" },
    { title: "Preparando perguntas...", subtitle: "Transformando incertezas em perguntas úteis" }
  ],
  th: [
    { title: "กำลังอ่านเมนู...", subtitle: "ดึงชื่อเมนูและส่วนผสมที่มองเห็น" },
    { title: "กำลังตรวจหาความเสี่ยงที่ซ่อนอยู่...", subtitle: "ตรวจซอส น้ำมัน น้ำซุป และเครื่องเคียง" },
    { title: "กำลังเทียบกับโปรไฟล์แพ้อาหาร...", subtitle: "ปรับความเสี่ยงตามความรุนแรงและการปนเปื้อนข้าม" },
    { title: "กำลังเตรียมคำถามสำหรับพนักงาน...", subtitle: "เปลี่ยนจุดที่ไม่แน่ใจให้เป็นคำถาม" }
  ]
};

const processChipLabels: Partial<Record<AppLanguageCode, string[]>> = {
  en: ["Visible text", "Hidden ingredients", "Cross-contact", "Staff questions"],
  es: ["Texto visible", "Ingredientes ocultos", "Contacto cruzado", "Preguntas"],
  fr: ["Texte visible", "Ingrédients cachés", "Contact croisé", "Questions"],
  it: ["Testo visibile", "Ingredienti nascosti", "Contatto incrociato", "Domande"],
  ja: ["見える文字", "隠れた材料", "交差接触", "質問"],
  de: ["Sichtbarer Text", "Versteckte Zutaten", "Kreuzkontakt", "Fragen"],
  ko: ["보이는 텍스트", "숨은 재료", "교차 접촉", "질문"],
  "zh-Hans": ["可见文字", "隐藏配料", "交叉接触", "提问"],
  "zh-Hant": ["可見文字", "隱藏配料", "交叉接觸", "提問"],
  pt: ["Texto visível", "Ingredientes ocultos", "Contato cruzado", "Perguntas"],
  th: ["ข้อความที่เห็น", "ส่วนผสมแอบแฝง", "การปนเปื้อนข้าม", "คำถาม"]
};

const loadingIcons = [FileSearch, ShieldAlert, ScanSearch, MessageCircleQuestion, ListChecks];

function chipOpacity(progress: Animated.Value, index: number) {
  const start = 0.2 + index * 0.16;
  return progress.interpolate({
    inputRange: [0, start, start + 0.08, 1],
    outputRange: [0, 0, 1, 1],
    extrapolate: "clamp"
  });
}

function stripOpacity(progress: Animated.Value, index: number) {
  const start = 0.12 + index * 0.2;
  return progress.interpolate({
    inputRange: [0, start, start + 0.1, 0.94, 1],
    outputRange: [0, 0, 1, 1, 0],
    extrapolate: "clamp"
  });
}

export function LoadingAnalysis({ imageUri, showTopBar = false, showBack = false, onBack }: LoadingAnalysisProps) {
  const { languageCode } = useI18n();
  const phrases = loadingPhrases[languageCode] ?? loadingPhrases.en!;
  const chips = processChipLabels[languageCode] ?? processChipLabels.en!;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const copyIn = useRef(new Animated.Value(0)).current;
  const stageIn = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;

  const phrase = phrases[phraseIndex % phrases.length];
  const ActiveLoadingIcon = loadingIcons[phraseIndex % loadingIcons.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(stageIn, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.timing(copyIn, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true
      })
    ]).start();

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          duration: 1,
          easing: Easing.linear,
          toValue: 0,
          useNativeDriver: true
        }),
        Animated.timing(scanProgress, {
          duration: SCAN_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.delay(LOOP_PAUSE_MS)
      ])
    );

    scanLoop.start();

    return () => {
      scanLoop.stop();
    };
  }, [copyIn, scanProgress, stageIn]);

  useEffect(() => {
    if (phrases.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(copyIn, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true
      }).start(() => {
        setPhraseIndex((current) => (current + 1) % phrases.length);
        Animated.timing(copyIn, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true
        }).start();
      });
    }, PHRASE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [copyIn, phrases.length]);

  const scanTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-72, PHOTO_HEIGHT + 38]
  });
  const stageScale = stageIn.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1]
  });
  const stageTranslateY = stageIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });
  const copyTranslateY = copyIn.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0]
  });
  const beamOpacity = scanProgress.interpolate({
    inputRange: [0, 0.06, 0.94, 1],
    outputRange: [0, 1, 1, 0],
    extrapolate: "clamp"
  });
  const iconTranslateY = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -4, 0]
  });
  const iconRotate = scanProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ["-2deg", "2deg", "-2deg"]
  });

  const firstStripOpacity = stripOpacity(scanProgress, 0);
  const secondStripOpacity = stripOpacity(scanProgress, 1);
  const thirdStripOpacity = stripOpacity(scanProgress, 2);
  const stripTranslateY = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -12],
    extrapolate: "clamp"
  });

  return (
    <SafeAreaView style={styles.screen}>
      {showTopBar && <AppTopBar showBack={showBack} onBack={onBack} />}
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.loaderWrap,
            {
              opacity: stageIn,
              transform: [{ translateY: stageTranslateY }, { scale: stageScale }]
            }
          ]}
        >
          <View style={styles.photoFrame}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.menuPhoto} resizeMode="cover" />
            ) : (
              <View style={styles.photoFallback}>
                <View style={styles.fallbackLinePrimary} />
                <View style={styles.fallbackLine} />
                <View style={[styles.fallbackLine, styles.fallbackLineShort]} />
                <View style={styles.fallbackDivider} />
                <View style={styles.fallbackLine} />
                <View style={[styles.fallbackLine, styles.fallbackLineMedium]} />
              </View>
            )}
            <View style={styles.photoDim} />

            <Animated.View
              style={[
                styles.scanWindow,
                {
                  opacity: beamOpacity,
                  transform: [{ translateY: scanTranslateY }]
                }
              ]}
            >
              <View style={styles.scanWindowEdge} />
              <View style={styles.scanWindowFill} />
              <View style={styles.scanWindowEdge} />
            </Animated.View>

            <Animated.View
              style={[
                styles.textStrip,
                styles.textStripOne,
                {
                  opacity: firstStripOpacity,
                  transform: [{ translateY: stripTranslateY }]
                }
              ]}
            >
              <View style={styles.textStripLine} />
              <View style={[styles.textStripLine, styles.textStripLineShort]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.textStrip,
                styles.textStripTwo,
                {
                  opacity: secondStripOpacity,
                  transform: [{ translateY: stripTranslateY }]
                }
              ]}
            >
              <View style={styles.textStripLine} />
              <View style={[styles.textStripLine, styles.textStripLineTiny]} />
            </Animated.View>
            <Animated.View
              style={[
                styles.textStrip,
                styles.textStripThree,
                {
                  opacity: thirdStripOpacity,
                  transform: [{ translateY: stripTranslateY }]
                }
              ]}
            >
              <View style={styles.textStripLine} />
              <View style={[styles.textStripLine, styles.textStripLineShort]} />
            </Animated.View>

            <Animated.View
              style={[
                styles.iconBadge,
                {
                  opacity: copyIn,
                  transform: [{ translateY: iconTranslateY }, { rotate: iconRotate }]
                }
              ]}
            >
              <ActiveLoadingIcon color={colors.primaryDark} size={22} strokeWidth={1.9} />
            </Animated.View>
          </View>

          <View style={styles.chipGrid}>
            {chips.map((label, index) => {
              const opacity = chipOpacity(scanProgress, index);
              const translateY = opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [7, 0]
              });

              return (
                <Animated.View
                  key={label}
                  style={[
                    styles.processChip,
                    {
                      opacity,
                      transform: [{ translateY }]
                    }
                  ]}
                >
                  <Text numberOfLines={1} style={styles.processChipText}>
                    {label}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.copy,
            {
              opacity: copyIn,
              transform: [{ translateY: copyTranslateY }]
            }
          ]}
        >
          <Text style={styles.title}>{phrase.title}</Text>
          <Text style={styles.subtitle}>{phrase.subtitle}</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingTop: 32
  },
  loaderWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  photoFrame: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    height: PHOTO_HEIGHT,
    overflow: "hidden",
    position: "relative",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.09,
    shadowRadius: 30,
    width: 216
  },
  menuPhoto: {
    height: "100%",
    width: "100%"
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFF4E6",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 44
  },
  fallbackLinePrimary: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 7,
    marginBottom: 10,
    width: 72
  },
  fallbackLine: {
    backgroundColor: colors.borderStrong,
    borderRadius: 999,
    height: 6,
    opacity: 0.65,
    width: 136
  },
  fallbackLineMedium: {
    width: 108
  },
  fallbackLineShort: {
    width: 92
  },
  fallbackDivider: {
    backgroundColor: colors.borderSoft,
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
    width: "100%"
  },
  photoDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 35, 33, 0.2)"
  },
  scanWindow: {
    height: 76,
    left: 0,
    position: "absolute",
    right: 0
  },
  scanWindowEdge: {
    backgroundColor: colors.primary,
    height: 2,
    opacity: 0.92,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8
  },
  scanWindowFill: {
    backgroundColor: "rgba(221, 244, 241, 0.28)",
    flex: 1
  },
  textStrip: {
    backgroundColor: "rgba(255, 252, 247, 0.93)",
    borderColor: "rgba(31, 138, 131, 0.22)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    width: 118
  },
  textStripOne: {
    left: -20,
    top: 74
  },
  textStripTwo: {
    right: -22,
    top: 142
  },
  textStripThree: {
    left: -10,
    top: 214
  },
  textStripLine: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    height: 4,
    width: 88
  },
  textStripLineShort: {
    opacity: 0.78,
    width: 62
  },
  textStripLineTiny: {
    opacity: 0.78,
    width: 46
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    top: 14,
    width: 48
  },
  chipGrid: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    maxWidth: 306
  },
  processChip: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderSoft,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12
  },
  processChipText: {
    color: colors.inkMuted,
    ...typography.caption
  },
  copy: {
    alignItems: "center",
    gap: 12,
    marginTop: 28,
    width: "100%"
  },
  title: {
    color: colors.ink,
    ...typography.title,
    maxWidth: 314,
    textAlign: "center"
  },
  subtitle: {
    color: colors.inkMuted,
    ...typography.bodyLarge,
    maxWidth: 314,
    minHeight: 52,
    textAlign: "center"
  }
});

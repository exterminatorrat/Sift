import { EvidenceConfidence, RiskBasis, ScanResult } from "../types/scan";
import { RiskLevel } from "../types/risk";

const riskLevels = new Set<RiskLevel>([
  "low_risk",
  "ask_staff",
  "high_risk",
  "avoid_unless_confirmed",
  "unclear"
]);

const readabilityValues = new Set(["clear", "partially_clear", "poor"]);
const evidenceConfidenceValues = new Set<EvidenceConfidence>(["high", "medium", "low"]);
const riskBasisValues = new Set<RiskBasis>([
  "visible_text",
  "common_pattern",
  "unknown_ingredient",
  "cross_contact",
  "translation_uncertain",
  "image_uncertain"
]);

const bannedSafetyLanguage = [
  /safe to eat/i,
  /safe option/i,
  /safe choice/i,
  /safe meal/i,
  /safe dish/i,
  /safe for (you|the user|this allergy)/i,
  /you can eat/i,
  /ok to eat/i,
  /probably fine/i,
  /\bguarantee(?:d|s|ing)?\b/i,
  /completely safe/i,
  /definitely safe/i,
  /no risk/i,
  /zero risk/i,
  /riskless/i,
  /nothing to worry about/i,
  /risk[- ]free/i,
  /allergen[- ]free/i,
  /seguro para comer/i,
  /completamente seguro/i,
  /sin riesgo/i,
  /sans danger/i,
  /aucun risque/i,
  /totalement s[ûu]r/i,
  /sicher zu essen/i,
  /kein risiko/i,
  /v[öo]llig sicher/i,
  /sicuro da mangiare/i,
  /nessun rischio/i,
  /completamente sicuro/i,
  /sem risco/i,
  /安全に食べ/u,
  /絶対に安全/u,
  /リスクはありません/u,
  /안전하게 먹/u,
  /완전히 안전/u,
  /위험이 없습니다/u,
  /可以安全食用/u,
  /完全安全/u,
  /没有风险/u,
  /ปลอดภัยที่จะกิน/u,
  /ไม่มีความเสี่ยง/u,
  /ปลอดภัยอย่างแน่นอน/u,
  /an toàn để ăn/iu,
  /hoàn toàn an toàn/iu,
  /không có rủi ro/iu,
  /yemek için güvenli/iu,
  /tamamen güvenli/iu,
  /risk yok/iu,
  /bezpieczne do jedzenia/iu,
  /całkowicie bezpieczne/iu,
  /brak ryzyka/iu,
  /aman untuk dimakan/iu,
  /sepenuhnya aman/iu,
  /tidak ada risiko/iu,
  /veilig om te eten/iu,
  /volledig veilig/iu,
  /geen risico/iu
];

export type ScanResultValidation =
  | { ok: true; value: ScanResult }
  | { ok: false; error: string };

type Validation<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateScanResult(value: unknown): ScanResultValidation {
  if (!isRecord(value)) {
    return invalid("Response was not an object.");
  }

  if (containsBannedSafetyLanguage(value)) {
    return invalid("Response used disallowed safety language.");
  }

  const id = readString(value.id);
  const createdAt = normalizeCreatedAt(value.createdAt);
  const profileId = readString(value.profileId);

  if (!id || !createdAt || !profileId) {
    return invalid("Response is missing id, createdAt, or profileId.");
  }

  const scanSummary = validateScanSummary(value.scanSummary);
  if (!scanSummary.ok) {
    return scanSummary;
  }

  const pageAssessments = validatePageAssessments(value.pageAssessments);
  if (!pageAssessments.ok) {
    return pageAssessments;
  }
  const pageCount = pageAssessments.value?.length ?? null;
  const allowEmptySourcePages = pageAssessments.value?.every((page) => page.readability === "poor") ?? false;

  if (!Array.isArray(value.dishes) || value.dishes.length === 0) {
    return invalid("Response must include at least one dish.");
  }

  const dishes = [];
  const seenDishIds = new Map<string, number>();
  for (const dish of value.dishes) {
    const validatedDish = validateDish(dish, pageCount, allowEmptySourcePages);
    if (!validatedDish.ok) {
      return validatedDish;
    }

    const seenCount = seenDishIds.get(validatedDish.value.id) ?? 0;
    seenDishIds.set(validatedDish.value.id, seenCount + 1);
    dishes.push({
      ...validatedDish.value,
      id: seenCount === 0 ? validatedDish.value.id : `${validatedDish.value.id}-${seenCount + 1}`
    });
  }

  const imageQuality = validateImageQuality(value.imageQuality);
  if (!imageQuality.ok) {
    return imageQuality;
  }

  if (pageAssessments.value) {
    const expectedAggregateReadability = pageAssessments.value.some((page) => page.readability === "poor")
      ? "poor"
      : pageAssessments.value.some((page) => page.readability === "partially_clear")
        ? "partially_clear"
        : "clear";
    if (imageQuality.value.readability !== expectedAggregateReadability) {
      return invalid("Aggregate image readability does not match the page assessments.");
    }
  }

  if (
    imageQuality.value.readability === "poor" &&
    (imageQuality.value.needsRetake !== true ||
      scanSummary.value.overallRisk !== "unclear" ||
      dishes.some((dish) => dish.riskLevel === "low_risk"))
  ) {
    return invalid("Poor-image results must require a retake and cannot contain low-risk dishes.");
  }

  const restaurantMessage = validateRestaurantMessage(value.restaurantMessage);
  if (!restaurantMessage.ok) {
    return restaurantMessage;
  }

  const transparency = validateScanTransparency(value.transparency);
  if (!transparency) {
    return invalid("Response must include scan transparency.");
  }

  const analysisSource = readOptionalString(value.analysisSource);
  const normalizedSource =
    analysisSource === "mock" || analysisSource === "ai" || analysisSource === "fallback"
      ? analysisSource
      : undefined;

  return {
    ok: true,
    value: {
      id,
      createdAt,
      imageUri: readOptionalString(value.imageUri),
      imageUris: readOptionalStringArray(value.imageUris, 8),
      restaurantName: readOptionalString(value.restaurantName),
      profileId,
      analysisLanguage: readOptionalString(value.analysisLanguage),
      analysisSource: normalizedSource,
      analysisModel: readOptionalString(value.analysisModel),
      analysisRequestId: readOptionalString(value.analysisRequestId),
      pageAssessments: pageAssessments.value,
      scanSummary: scanSummary.value,
      dishes,
      restaurantMessage: restaurantMessage.value,
      imageQuality: imageQuality.value,
      transparency
    }
  };
}

function readOptionalStringArray(value: unknown, maximum = Number.POSITIVE_INFINITY): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, maximum);
  return strings.length > 0 ? strings : undefined;
}

export function containsBannedSafetyLanguage(value: unknown): boolean {
  if (typeof value === "string") {
    return bannedSafetyLanguage.some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some(containsBannedSafetyLanguage);
  }

  if (isRecord(value)) {
    return Object.entries(value).some(([key, item]) => key !== "uri" && containsBannedSafetyLanguage(item));
  }

  return false;
}

function validateScanSummary(value: unknown): Validation<ScanResult["scanSummary"]> {
  if (!isRecord(value)) {
    return invalid("scanSummary was missing.");
  }

  const overallRisk = readRiskLevel(value.overallRisk);
  const summary = readString(value.summary);
  const limitations = readString(value.limitations);

  if (!overallRisk || !summary || !limitations) {
    return invalid("scanSummary is incomplete.");
  }

  if (!hasConservativeUncertaintyText(limitations)) {
    return invalid("scanSummary limitations must describe uncertainty.");
  }

  return {
    ok: true,
    value: { overallRisk, summary, limitations }
  };
}

function validateDish(
  value: unknown,
  pageCount: number | null,
  allowEmptySourcePages: boolean
): Validation<ScanResult["dishes"][number]> {
  if (!isRecord(value)) {
    return invalid("Dish entry was not an object.");
  }

  const id = readString(value.id);
  const dishName = readString(value.dishName);
  const riskLevel = readRiskLevel(value.riskLevel);
  const reason = readString(value.reason);
  const conservativeLanguage = readString(value.conservativeLanguage);
  const possibleAllergens = readStringArray(value.possibleAllergens, 12);
  const hiddenRiskIngredients = readStringArray(value.hiddenRiskIngredients, 12);
  const crossContactConcerns = readStringArray(value.crossContactConcerns, 8);
  const evidenceConfidence = readEvidenceConfidence(value.evidenceConfidence);
  const riskBasis = readRiskBasisArray(value.riskBasis);
  const questionsToAsk = readStringArray(value.questionsToAsk, 6);
  const questionsToAskUserLanguage = readStringArray(value.questionsToAskUserLanguage, 6);
  const sourcePageNumbers = readPageNumbers(value.sourcePageNumbers, pageCount);

  if (!id || !dishName || !riskLevel || !reason || !conservativeLanguage) {
    return invalid("Dish entry is missing required text fields.");
  }

  if (riskLevel === "low_risk" && !hasConservativeUncertaintyText(`${reason} ${conservativeLanguage}`)) {
    return invalid("Low-risk dish wording must include confirmation or uncertainty language.");
  }

  if (!possibleAllergens || !hiddenRiskIngredients || !crossContactConcerns || !questionsToAsk) {
    return invalid("Dish entry has malformed arrays.");
  }

  if (
    riskLevel === "low_risk" &&
    (possibleAllergens.length > 0 || hiddenRiskIngredients.length > 0 || crossContactConcerns.length > 0)
  ) {
    return invalid("Low-risk dish contains contradictory allergen or preparation concerns.");
  }

  if (questionsToAsk.length === 0) {
    return invalid("Dish entry must include staff questions.");
  }

  if (!questionsToAskUserLanguage || questionsToAskUserLanguage.length === 0) {
    return invalid("Dish entry must include user-language staff questions.");
  }

  if (
    pageCount !== null &&
    (sourcePageNumbers === undefined || (!allowEmptySourcePages && sourcePageNumbers.length === 0))
  ) {
    return invalid("Dish entry must include valid source page numbers.");
  }

  const transparency = validateDishTransparency(value.transparency);
  if (!transparency) {
    return invalid("Dish entry must include transparency evidence.");
  }

  return {
    ok: true,
    value: {
      id,
      dishName,
      menuDescription: readOptionalString(value.menuDescription),
      sourcePageNumbers,
      riskLevel,
      possibleAllergens,
      hiddenRiskIngredients,
      crossContactConcerns,
      evidenceConfidence,
      riskBasis,
      reason,
      questionsToAsk,
      questionsToAskUserLanguage,
      conservativeLanguage,
      transparency
    }
  };
}

function validatePageAssessments(
  value: unknown
): Validation<ScanResult["pageAssessments"]> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    return invalid("pageAssessments must contain between one and four pages.");
  }
  const pages: NonNullable<ScanResult["pageAssessments"]> = [];
  for (let index = 0; index < value.length; index += 1) {
    const page = value[index];
    if (!isRecord(page)) {
      return invalid("pageAssessments contains a malformed page.");
    }
    const readability = readString(page.readability);
    const issues = readStringArray(page.issues, 8);
    if (page.pageNumber !== index + 1 || !readabilityValues.has(readability) || !issues) {
      return invalid("pageAssessments must be ordered and contain valid readability data.");
    }
    pages.push({
      pageNumber: index + 1,
      readability: readability as ScanResult["imageQuality"]["readability"],
      issues
    });
  }
  return { ok: true, value: pages };
}

function readPageNumbers(value: unknown, pageCount: number | null): number[] | undefined {
  if (value === undefined && pageCount === null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const maximum = pageCount ?? 4;
  if (
    value.some((pageNumber) => !Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > maximum) ||
    new Set(value).size !== value.length
  ) {
    return undefined;
  }
  return value as number[];
}

function validateDishTransparency(value: unknown): ScanResult["dishes"][number]["transparency"] {
  if (!isRecord(value)) {
    return undefined;
  }

  const visibleMenuText = readStringArray(value.visibleMenuText, 5);
  const profileFactors = readStringArray(value.profileFactors, 5);
  const commonRiskPatterns = readStringArray(value.commonRiskPatterns, 5);
  const uncertainty = readStringArray(value.uncertainty, 5);

  if (!visibleMenuText || !profileFactors || !commonRiskPatterns || !uncertainty) {
    return undefined;
  }

  return {
    visibleMenuText,
    profileFactors,
    commonRiskPatterns,
    uncertainty
  };
}

function validateScanTransparency(value: unknown): ScanResult["transparency"] {
  if (!isRecord(value)) {
    return undefined;
  }

  const checked = readStringArray(value.checked, 6);
  const limitations = readStringArray(value.limitations, 6);
  const webSearchQueries = readStringArray(value.webSearchQueries, 12);
  const sourceReferences = Array.isArray(value.sourceReferences)
    ? value.sourceReferences
        .filter(isRecord)
        .map((source) => ({
          title: readString(source.title),
          uri: readString(source.uri),
          source: readOptionalString(source.source)
        }))
        .filter((source) => source.title && isSafeSourceReferenceUrl(source.uri))
        .slice(0, 12)
    : null;

  if (!checked || !limitations || !sourceReferences) {
    return undefined;
  }

  return {
    checked,
    limitations,
    sourceReferences,
    webSearchQueries: webSearchQueries ?? []
  };
}

function validateImageQuality(value: unknown): Validation<ScanResult["imageQuality"]> {
  if (!isRecord(value)) {
    return invalid("imageQuality was missing.");
  }

  const readability = readString(value.readability);
  const issues = readStringArray(value.issues, 8);

  if (!readabilityValues.has(readability) || !issues) {
    return invalid("imageQuality is malformed.");
  }

  return {
    ok: true,
    value: {
      readability: readability as ScanResult["imageQuality"]["readability"],
      issues,
      needsRetake:
        typeof value.needsRetake === "boolean"
          ? value.needsRetake
          : readability === "poor"
    }
  };
}

function validateRestaurantMessage(value: unknown): Validation<ScanResult["restaurantMessage"]> {
  if (value === undefined || value === null) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return invalid("restaurantMessage was malformed.");
  }

  const english = readString(value.english);
  if (!english) {
    return invalid("restaurantMessage.english is missing.");
  }

  return {
    ok: true,
    value: {
      english,
      translated: readOptionalString(value.translated),
      language: readOptionalString(value.language),
      userLanguageText: readOptionalString(value.userLanguageText),
      userLanguage: readOptionalString(value.userLanguage)
    }
  };
}

function invalid<T = ScanResult>(error: string): Validation<T> {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const text = readString(value);
  return text || undefined;
}

function readRiskLevel(value: unknown): RiskLevel | null {
  const text = readString(value);
  return riskLevels.has(text as RiskLevel) ? (text as RiskLevel) : null;
}

function readEvidenceConfidence(value: unknown): EvidenceConfidence {
  const text = readString(value);
  return evidenceConfidenceValues.has(text as EvidenceConfidence) ? (text as EvidenceConfidence) : "low";
}

function readRiskBasisArray(value: unknown): RiskBasis[] {
  if (!Array.isArray(value)) {
    return ["unknown_ingredient"];
  }

  const riskBasis = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item): item is RiskBasis => riskBasisValues.has(item as RiskBasis));

  return riskBasis.length > 0 ? Array.from(new Set(riskBasis)) : ["unknown_ingredient"];
}

function readStringArray(value: unknown, maximum = Number.POSITIVE_INFINITY): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maximum);
}

export function isSafeSourceReferenceUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeCreatedAt(value: unknown): string {
  const text = readString(value);
  const parsedTime = Date.parse(text);
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (!text || !Number.isFinite(parsedTime) || parsedTime > Date.now() + oneDayMs) {
    return new Date().toISOString();
  }

  return text;
}

function hasConservativeUncertaintyText(value: string) {
  const text = value.toLowerCase();
  return [
    "visible menu",
    "visible text",
    "confirm",
    "ask staff",
    "cannot verify",
    "cannot confirm",
    "not confirmed",
    "unclear",
    "uncertain",
    "cross-contact",
    "kitchen",
    "texto visible",
    "confirme",
    "pregunte al personal",
    "no se puede verificar",
    "contacto cruzado",
    "texte visible",
    "confirmez",
    "demandez au personnel",
    "ne peut pas vérifier",
    "contamination croisée",
    "sichtbar",
    "bestätigen",
    "personal fragen",
    "nicht überprüfen",
    "kreuzkontakt",
    "testo visibile",
    "confermare",
    "chiedere al personale",
    "non può verificare",
    "contatto incrociato",
    "texto visível",
    "confirmar",
    "pergunte à equipe",
    "não é possível verificar",
    "contato cruzado",
    "表示",
    "確認",
    "スタッフ",
    "検証でき",
    "交差接触",
    "표시된",
    "확인",
    "직원",
    "확인할 수",
    "교차 접촉",
    "可见",
    "确认",
    "无法核实",
    "交叉接触",
    "可見",
    "確認",
    "無法核實",
    "交叉接觸",
    "ข้อความที่มองเห็น",
    "ยืนยัน",
    "สอบถามพนักงาน",
    "ไม่สามารถตรวจสอบ",
    "การสัมผัสข้าม",
    "văn bản thực đơn nhìn thấy",
    "xác nhận",
    "hỏi nhân viên",
    "không thể xác minh",
    "tiếp xúc chéo",
    "görünür menü metni",
    "doğrulayın",
    "personele sorun",
    "doğrulanamaz",
    "çapraz temas",
    "widoczny tekst menu",
    "potwierdź",
    "zapytaj personel",
    "nie można zweryfikować",
    "kontakt krzyżowy",
    "teks menu yang terlihat",
    "konfirmasi",
    "tanyakan kepada staf",
    "tidak dapat memverifikasi",
    "kontak silang",
    "zichtbare menutekst",
    "bevestig",
    "vraag het personeel",
    "kan niet verifiëren",
    "kruiscontact"
  ].some((phrase) => text.includes(phrase));
}

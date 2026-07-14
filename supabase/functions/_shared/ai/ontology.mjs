export const ontologyVersion = "2026-07-14.3";

export const riskRank = {
  low_risk: 0,
  ask_staff: 1,
  unclear: 1,
  high_risk: 2,
  avoid_unless_confirmed: 3
};

export const allergenRiskPatterns = {
  sesame: ["sesame", "sesame oil", "tahini", "goma", "furikake", "za'atar", "benne"],
  peanut: ["peanut", "groundnut", "satay", "mole", "arachide", "peanut oil"],
  dairy: ["dairy", "milk", "cream", "butter", "ghee", "whey", "casein", "cheese", "queso", "paneer"],
  egg: ["egg", "mayo", "mayonnaise", "aioli", "custard"],
  soy: ["soy", "soy sauce", "tofu", "miso", "tamari", "edamame"],
  "wheat/gluten": ["wheat", "gluten", "flour", "batter", "breadcrumbs", "soy sauce", "noodles", "seitan"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
  "tree nuts": ["tree nut", "tree nuts", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia"],
  fish: ["fish", "fish sauce", "anchovy", "bacalhau", "pescado", "poisson", "fisch", "pesce", "peixe"],
  mustard: ["mustard", "mostaza", "moutarde", "senf", "senfsauce", "senape", "mostarda"],
  sulfites: ["sulfite", "sulfites", "sulphite", "sulphites", "sulfit", "sulfito", "sulfitos", "wine", "wein", "vino", "vin"],
  mango: ["mango", "mangue", "manga"]
};

export const supportedOntologyLanguages = Object.freeze([
  "en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh-Hans", "zh-Hant", "th"
]);

// Direct terms are intentionally curated by language. Avoid generic ingredients
// such as "flour", one-character Chinese dairy/egg tokens, and bare Thai sesame,
// which create unsafe substring matches in unrelated menu text.
export const directAllergenTermsByLanguage = Object.freeze({
  sesame: translatedTerms({
    en: ["sesame", "sesame seeds", "sesame oil", "tahini", "benne"],
    es: ["sésamo", "semillas de sésamo", "aceite de sésamo", "ajonjolí", "tahini"],
    fr: ["sésame", "graines de sésame", "huile de sésame", "tahini"],
    de: ["Sesam", "Sesamsamen", "Sesamöl", "Tahini"],
    it: ["sesamo", "semi di sesamo", "olio di sesamo", "tahina"],
    pt: ["gergelim", "sementes de gergelim", "óleo de gergelim", "tahine"],
    ja: ["ごま", "ゴマ", "胡麻", "ごま油", "胡麻油"],
    ko: ["참깨", "참기름", "참깨소스"],
    "zh-Hans": ["芝麻", "芝麻油", "芝麻酱", "香油"],
    "zh-Hant": ["芝麻", "芝麻油", "芝麻醬", "香油"],
    th: ["เมล็ดงา", "น้ำมันงา", "ซอสงา"]
  }),
  peanut: translatedTerms({
    en: ["peanut", "peanuts", "groundnut", "peanut oil", "peanut butter"],
    es: ["cacahuate", "cacahuete", "maní", "aceite de cacahuete", "mantequilla de maní"],
    fr: ["arachide", "cacahuète", "huile d'arachide", "beurre de cacahuète"],
    de: ["erdnuss", "erdnüsse", "erdnussöl", "erdnussbutter"],
    it: ["arachide", "arachidi", "olio di arachidi", "burro di arachidi"],
    pt: ["amendoim", "óleo de amendoim", "manteiga de amendoim"],
    ja: ["ピーナッツ", "落花生", "ピーナッツ油", "ピーナッツバター"],
    ko: ["땅콩", "땅콩기름", "땅콩버터"],
    "zh-Hans": ["花生", "花生油", "花生酱"],
    "zh-Hant": ["花生", "花生油", "花生醬"],
    th: ["ถั่วลิสง", "น้ำมันถั่วลิสง", "เนยถั่วลิสง"]
  }),
  dairy: translatedTerms({
    en: ["dairy", "milk", "cream", "butter", "ghee", "whey", "casein", "cheese", "yogurt", "yoghurt", "paneer"],
    es: ["leche", "mantequilla", "nata", "queso", "yogur", "suero de leche", "caseína"],
    fr: ["lait", "beurre", "crème", "fromage", "yaourt", "lactosérum", "caséine"],
    de: ["Milch", "Butter", "Sahne", "Käse", "Joghurt", "Molke", "Kasein"],
    it: ["latte", "burro", "panna", "formaggio", "parmigiano", "yogurt", "siero di latte", "caseina"],
    pt: ["leite", "manteiga", "creme de leite", "queijo", "iogurte", "soro de leite", "caseína"],
    ja: ["牛乳", "乳製品", "バター", "生クリーム", "チーズ", "ヨーグルト", "乳清", "カゼイン"],
    ko: ["우유", "유제품", "버터", "생크림", "치즈", "요구르트", "유청", "카제인"],
    "zh-Hans": ["牛奶", "乳制品", "黄油", "奶油", "芝士", "奶酪", "酸奶", "乳清", "酪蛋白"],
    "zh-Hant": ["牛奶", "乳製品", "黃油", "奶油", "起司", "乳酪", "優格", "乳清", "酪蛋白"],
    th: ["นม", "ผลิตภัณฑ์นม", "เนย", "ครีม", "ชีส", "โยเกิร์ต", "เวย์", "เคซีน"]
  }),
  egg: translatedTerms({
    en: ["egg", "eggs", "egg yolk", "egg white", "mayonnaise", "custard"],
    es: ["huevo", "huevos", "yema de huevo", "clara de huevo", "mayonesa"],
    fr: ["œuf", "oeuf", "œufs", "oeufs", "jaune d'œuf", "blanc d'œuf", "mayonnaise"],
    de: ["Ei", "Eier", "Eigelb", "Eiweiß", "Mayonnaise"],
    it: ["uovo", "uova", "tuorlo", "albume", "maionese"],
    pt: ["ovo", "ovos", "gema de ovo", "clara de ovo", "maionese"],
    ja: ["卵", "玉子", "鶏卵", "卵黄", "卵白", "マヨネーズ"],
    ko: ["계란", "달걀", "난황", "난백", "마요네즈"],
    "zh-Hans": ["鸡蛋", "蛋黄", "蛋白", "蛋清", "蛋黄酱"],
    "zh-Hant": ["雞蛋", "蛋黃", "蛋白", "蛋清", "美乃滋"],
    th: ["ไข่", "ไข่แดง", "ไข่ขาว", "มายองเนส"]
  }),
  soy: translatedTerms({
    en: ["soy", "soya", "soy sauce", "tofu", "miso", "tamari", "edamame"],
    es: ["soja", "salsa de soja", "tofu", "miso", "edamame"],
    fr: ["soja", "sauce soja", "tofu", "miso", "edamame"],
    de: ["Soja", "Sojasauce", "Tofu", "Miso", "Edamame"],
    it: ["soia", "salsa di soia", "tofu", "miso", "edamame"],
    pt: ["soja", "molho de soja", "tofu", "missô", "edamame"],
    ja: ["大豆", "醤油", "しょうゆ", "豆腐", "味噌", "枝豆"],
    ko: ["대두", "간장", "두부", "된장", "미소", "에다마메"],
    "zh-Hans": ["大豆", "黄豆", "酱油", "豆腐", "味噌", "毛豆"],
    "zh-Hant": ["大豆", "黃豆", "醬油", "豆腐", "味噌", "毛豆"],
    th: ["ถั่วเหลือง", "ซีอิ๊ว", "เต้าหู้", "มิโซะ", "ถั่วแระญี่ปุ่น"]
  }),
  "wheat/gluten": translatedTerms({
    en: ["wheat", "gluten", "wheat flour", "breadcrumbs", "seitan"],
    es: ["trigo", "gluten", "harina de trigo", "pan rallado", "seitán"],
    fr: ["blé", "gluten", "farine de blé", "chapelure", "seitan"],
    de: ["Weizen", "Gluten", "Weizenmehl", "Paniermehl", "Seitan"],
    it: ["grano", "frumento", "glutine", "farina di frumento", "pangrattato", "seitan"],
    pt: ["trigo", "glúten", "farinha de trigo", "pão ralado", "seitan"],
    ja: ["小麦", "小麦粉", "グルテン", "パン粉", "麩"],
    ko: ["밀", "밀가루", "글루텐", "빵가루"],
    "zh-Hans": ["小麦", "小麦粉", "面粉", "麸质", "面包糠"],
    "zh-Hant": ["小麥", "小麥粉", "麵粉", "麩質", "麵包糠"],
    th: ["ข้าวสาลี", "แป้งสาลี", "กลูเตน", "เกล็ดขนมปัง"]
  }),
  shellfish: translatedTerms({
    en: ["shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"],
    es: ["mariscos", "camarón", "gamba", "cangrejo", "langosta", "almeja", "mejillón", "ostra", "vieira"],
    fr: ["crustacés", "crevette", "crabe", "homard", "palourde", "moule", "huître", "coquille saint-jacques"],
    de: ["Schalentiere", "Garnele", "Krabbe", "Hummer", "Muschel", "Auster", "Jakobsmuschel"],
    it: ["crostacei", "gambero", "gamberi", "granchio", "aragosta", "vongola", "cozza", "ostrica", "capasanta"],
    pt: ["marisco", "camarão", "caranguejo", "lagosta", "amêijoa", "mexilhão", "ostra", "vieira"],
    ja: ["えび", "エビ", "海老", "蝦", "かに", "カニ", "蟹", "ロブスター", "あさり", "牡蠣", "ホタテ"],
    ko: ["새우", "게", "랍스터", "조개", "홍합", "굴", "가리비"],
    "zh-Hans": ["虾", "蟹", "龙虾", "蛤蜊", "贻贝", "牡蛎", "扇贝"],
    "zh-Hant": ["蝦", "蟹", "龍蝦", "蛤蜊", "貽貝", "牡蠣", "扇貝"],
    th: ["กุ้ง", "ปู", "ล็อบสเตอร์", "หอยลาย", "หอยแมลงภู่", "หอยนางรม", "หอยเชลล์"]
  }),
  "tree nuts": translatedTerms({
    en: ["tree nut", "tree nuts", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia"],
    es: ["almendra", "nuez", "anacardo", "pistacho", "avellana", "nuez pacana", "macadamia"],
    fr: ["amande", "noix", "noix de cajou", "pistache", "noisette", "noix de pécan", "macadamia"],
    de: ["Mandel", "Walnuss", "Cashew", "Pistazie", "Haselnuss", "Pekannuss", "Macadamia"],
    it: ["mandorla", "noce", "anacardo", "pistacchio", "nocciola", "noce pecan", "macadamia"],
    pt: ["amêndoa", "noz", "castanha de caju", "pistache", "avelã", "noz-pecã", "macadâmia"],
    ja: ["アーモンド", "くるみ", "クルミ", "カシューナッツ", "ピスタチオ", "ヘーゼルナッツ", "ピーカンナッツ", "マカダミアナッツ"],
    ko: ["아몬드", "호두", "캐슈넛", "피스타치오", "헤이즐넛", "피칸", "마카다미아"],
    "zh-Hans": ["杏仁", "巴旦木", "核桃", "腰果", "开心果", "榛子", "碧根果", "夏威夷果"],
    "zh-Hant": ["杏仁", "核桃", "腰果", "開心果", "榛果", "碧根果", "夏威夷果"],
    th: ["อัลมอนด์", "วอลนัต", "เม็ดมะม่วงหิมพานต์", "พิสตาชิโอ", "เฮเซลนัต", "พีแคน", "แมคคาเดเมีย"]
  }),
  fish: translatedTerms({
    en: ["fish", "fish sauce", "anchovy"],
    es: ["pescado", "salsa de pescado", "anchoa"],
    fr: ["poisson", "sauce de poisson", "anchois"],
    de: ["Fisch", "Fischsauce", "Sardelle"],
    it: ["pesce", "salsa di pesce", "acciuga"],
    pt: ["peixe", "molho de peixe", "anchova", "bacalhau"],
    ja: ["魚", "魚醤", "ナンプラー", "アンチョビ"],
    ko: ["생선", "어류", "액젓", "멸치"],
    "zh-Hans": ["鱼", "鱼露", "鱼酱", "凤尾鱼"],
    "zh-Hant": ["魚", "魚露", "魚醬", "鯷魚"],
    th: ["ปลา", "น้ำปลา", "ปลาแอนโชวี"]
  }),
  mustard: translatedTerms({
    en: ["mustard", "mustard seed", "mustard oil"],
    es: ["mostaza", "semillas de mostaza", "aceite de mostaza"],
    fr: ["moutarde", "graines de moutarde", "huile de moutarde"],
    de: ["Senf", "Senfsamen", "Senföl", "Senfsauce"],
    it: ["senape", "semi di senape", "olio di senape"],
    pt: ["mostarda", "sementes de mostarda", "óleo de mostarda"],
    ja: ["マスタード", "からし", "辛子", "からし油"],
    ko: ["겨자", "겨자씨", "겨자유"],
    "zh-Hans": ["黄芥末", "芥末籽", "芥末油", "芥末酱"],
    "zh-Hant": ["黃芥末", "芥末籽", "芥末油", "芥末醬"],
    th: ["มัสตาร์ด", "เมล็ดมัสตาร์ด", "น้ำมันมัสตาร์ด"]
  }),
  sulfites: translatedTerms({
    en: ["sulfite", "sulfites", "sulphite", "sulphites", "sulfur dioxide"],
    es: ["sulfito", "sulfitos", "dióxido de azufre"],
    fr: ["sulfite", "sulfites", "dioxyde de soufre"],
    de: ["Sulfit", "Sulfite", "Schwefeldioxid"],
    it: ["solfito", "solfiti", "anidride solforosa"],
    pt: ["sulfito", "sulfitos", "dióxido de enxofre"],
    ja: ["亜硫酸塩", "二酸化硫黄"],
    ko: ["아황산염", "이산화황"],
    "zh-Hans": ["亚硫酸盐", "二氧化硫"],
    "zh-Hant": ["亞硫酸鹽", "二氧化硫"],
    th: ["ซัลไฟต์", "ซัลเฟอร์ไดออกไซด์"]
  }),
  mango: translatedTerms({
    en: ["mango"],
    es: ["mango"],
    fr: ["mangue"],
    de: ["Mango"],
    it: ["mango"],
    pt: ["manga"],
    ja: ["マンゴー"],
    ko: ["망고"],
    "zh-Hans": ["芒果"],
    "zh-Hant": ["芒果"],
    th: ["มะม่วง"]
  })
});

export const directAllergenPatterns = Object.freeze(Object.fromEntries(
  Object.entries(directAllergenTermsByLanguage).map(([canonicalAllergen, byLanguage]) => [
    canonicalAllergen,
    Object.freeze([...new Set(supportedOntologyLanguages.flatMap((language) => byLanguage[language]))])
  ])
));

// Latin script alone cannot identify language. Store the declared source
// language for every direct term rather than inferring it from its characters.
export const ontologyTermLanguageMetadata = Object.freeze(
  Object.values(directAllergenTermsByLanguage).flatMap((byLanguage) =>
    supportedOntologyLanguages.flatMap((language) => languageRecords(language, byLanguage[language]))
  )
);

const ontologyLanguagesByTerm = new Map();
for (const record of ontologyTermLanguageMetadata) {
  const languages = ontologyLanguagesByTerm.get(record.normalizedTerm) ?? new Set();
  languages.add(record.language);
  ontologyLanguagesByTerm.set(record.normalizedTerm, languages);
}

export const vaguePrepPatterns = [
  "house sauce",
  "signature sauce",
  "dressing",
  "marinade",
  "broth",
  "soup",
  "batter",
  "fried",
  "shared fryer",
  "shared grill",
  "wok-tossed",
  "spice mix",
  "garnish"
];

const directNameTerms = new Set([
  "sesame", "peanut", "groundnut", "dairy", "milk", "egg", "soy", "wheat", "gluten",
  "shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop",
  "tree nut", "tree nuts", "almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan",
  "macadamia", "fish", "mustard", "sulfite", "sulfites", "sulphite", "sulphites", "mango"
]);

const ambiguousAssociationTerms = new Set([
  "mole", "wine", "wein", "vino", "vin", "noodles", "batter", "furikake", "za'atar"
]);

export const allergenRelationships = Object.freeze(
  Object.entries(allergenRiskPatterns).flatMap(([canonicalAllergen, contextualTerms]) => {
    const directTerms = directAllergenPatterns[canonicalAllergen] ?? [];
    const directSet = new Set(directTerms);
    const allTerms = [...new Set([...directTerms, ...contextualTerms])];

    return allTerms.map((term) => {
      const normalizedTerm = normalizeOntologyTerm(term);
      const relationship = directSet.has(term)
        ? directNameTerms.has(normalizedTerm) || normalizedTerm === normalizeOntologyTerm(canonicalAllergen)
          ? "direct_name"
          : "contains_allergen"
        : ambiguousAssociationTerms.has(normalizedTerm)
          ? "ambiguous_association"
          : "common_recipe_pattern";
      const strongEvidence = relationship === "direct_name" || relationship === "contains_allergen";

      return Object.freeze({
        canonicalAllergen,
        term,
        normalizedTerm,
        language: languageForOntologyTerm(term),
        relationship,
        confidence: strongEvidence ? "high" : relationship === "common_recipe_pattern" ? "medium" : "low",
        riskFloor: Object.freeze({
          default: strongEvidence ? "high_risk" : "ask_staff",
          severe: strongEvidence ? "avoid_unless_confirmed" : "ask_staff"
        }),
        sourceUrls: Object.freeze([])
      });
    });
  })
);

export const preparationSignals = Object.freeze(
  vaguePrepPatterns.map((term) => Object.freeze({
    canonicalAllergen: null,
    term,
    normalizedTerm: normalizeOntologyTerm(term),
    language: "en",
    relationship: isExplicitSharedPreparation(term)
      ? "cross_contact_question"
      : "preparation_risk",
    confidence: "high",
    riskFloor: Object.freeze({ default: "ask_staff", severe: "ask_staff" }),
    riskBasis: Object.freeze([
      isExplicitSharedPreparation(term) ? "cross_contact" : "unknown_ingredient"
    ]),
    sourceUrls: Object.freeze([])
  }))
);

export function ontologyEntriesForAllergy(allergy) {
  const allergyName = normalizeOntologyTerm(allergy?.name ?? "");
  if (!allergyName) return [];
  const matchingCanonicalAllergens = new Set();

  for (const canonicalAllergen of Object.keys(allergenRiskPatterns)) {
    const normalizedCanonical = normalizeOntologyTerm(canonicalAllergen);
    const terms = allergenRelationships.filter((entry) => entry.canonicalAllergen === canonicalAllergen);
    if (
      ontologyNameContainsTerm(allergyName, normalizedCanonical) ||
      terms.some((entry) => ontologyNameContainsTerm(allergyName, entry.normalizedTerm))
    ) {
      matchingCanonicalAllergens.add(canonicalAllergen);
    }
  }

  const matched = allergenRelationships.filter((entry) =>
    matchingCanonicalAllergens.has(entry.canonicalAllergen)
  );
  if (matched.length > 0) return matched;

  const customTerm = String(allergy?.name ?? "").trim();
  if (!customTerm) return [];
  return [Object.freeze({
    canonicalAllergen: normalizeOntologyTerm(customTerm),
    term: customTerm,
    normalizedTerm: normalizeOntologyTerm(customTerm),
    language: inferTermLanguage(customTerm),
    relationship: "direct_name",
    confidence: "medium",
    riskFloor: Object.freeze({
      default: "high_risk",
      severe: "avoid_unless_confirmed"
    }),
    sourceUrls: Object.freeze([])
  })];
}

export function getOntologyFingerprintSource() {
  return JSON.stringify({
    version: ontologyVersion,
    riskRank,
    allergenRiskPatterns,
    directAllergenPatterns,
    directAllergenTermsByLanguage,
    supportedOntologyLanguages,
    vaguePrepPatterns,
    allergenRelationships,
    preparationSignals,
    ontologyTermLanguageMetadata
  });
}

function inferTermLanguage(term) {
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(term)) return "ja";
  if (/\p{Script=Hangul}/u.test(term)) return "ko";
  if (/\p{Script=Han}/u.test(term)) return "zh";
  if (/\p{Script=Thai}/u.test(term)) return "th";
  return "multi";
}

function languageForOntologyTerm(term) {
  const explicitLanguages = ontologyLanguagesByTerm.get(normalizeOntologyTerm(term));
  if (!explicitLanguages || explicitLanguages.size === 0) return inferTermLanguage(term);
  const concreteLanguages = [...explicitLanguages].filter((language) => language !== "multi");
  if (
    concreteLanguages.length > 0 &&
    concreteLanguages.every((language) => language === "zh-Hans" || language === "zh-Hant")
  ) {
    return "zh";
  }
  return concreteLanguages.length === 1 ? concreteLanguages[0] : "multi";
}

function translatedTerms(termsByLanguage) {
  const declaredLanguages = Object.keys(termsByLanguage);
  for (const language of supportedOntologyLanguages) {
    if (!Array.isArray(termsByLanguage[language]) || termsByLanguage[language].length === 0) {
      throw new Error(`Missing direct allergen terms for ${language}.`);
    }
  }
  if (declaredLanguages.some((language) => !supportedOntologyLanguages.includes(language))) {
    throw new Error("Direct allergen terms contain an unsupported language.");
  }
  return Object.freeze(Object.fromEntries(
    supportedOntologyLanguages.map((language) => [language, Object.freeze([...termsByLanguage[language]])])
  ));
}

function languageRecords(language, terms) {
  return terms.map((term) => Object.freeze({
    term,
    normalizedTerm: normalizeOntologyTerm(term),
    language
  }));
}

function isExplicitSharedPreparation(term) {
  return normalizeOntologyTerm(term).startsWith("shared ");
}

function ontologyNameContainsTerm(normalizedName, normalizedTerm) {
  if (!normalizedName || !normalizedTerm) return false;
  const latinLike = /^[a-z0-9 ]+$/u.test(normalizedTerm);
  return latinLike
    ? ` ${normalizedName} `.includes(` ${normalizedTerm} `)
    : normalizedName.includes(normalizedTerm);
}

export function normalizeOntologyTerm(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

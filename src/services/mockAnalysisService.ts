import { Allergy, UserProfile } from "../types/allergy";
import { RiskLevel } from "../types/risk";
import { DishRisk, ScanResult } from "../types/scan";

export const mockProfile: UserProfile = {
  id: "profile-me",
  name: "Me",
  preferredLanguage: "English",
  restaurantLanguage: "Japanese",
  allergies: [
    {
      id: "peanut",
      name: "Peanut",
      severity: "severe",
      avoidCrossContact: true,
      notes: "Avoid peanut oil and shared prep surfaces."
    },
    {
      id: "sesame",
      name: "Sesame",
      severity: "severe",
      avoidCrossContact: true,
      notes: "Severe reaction to sesame oil."
    },
    {
      id: "mango",
      name: "Mango",
      severity: "moderate",
      avoidCrossContact: false
    }
  ]
};

type MockDishTemplate = {
  id: string;
  dishName: string;
  menuDescription: string;
  directAllergens: string[];
  hiddenAllergens: string[];
  hiddenRiskIngredients: string[];
  crossContactAllergens: string[];
  crossContactConcerns: string[];
  vaguePrepConcerns: string[];
  baseReason: string;
};

const sampleMenu: MockDishTemplate[] = [
  {
    id: "tonkotsu-ramen",
    dishName: "Tonkotsu Ramen",
    menuDescription: "Pork broth, noodles, egg, scallion",
    directAllergens: ["egg", "wheat", "gluten"],
    hiddenAllergens: ["sesame", "soy"],
    hiddenRiskIngredients: ["sesame oil", "tare", "soy sauce", "wheat noodles"],
    crossContactAllergens: ["sesame", "peanut", "wheat", "gluten", "egg"],
    crossContactConcerns: ["shared ladles", "shared noodle baskets", "sesame toppings nearby"],
    vaguePrepConcerns: ["broth", "tare", "toppings"],
    baseReason:
      "Ramen broth and tare often include ingredients not fully listed on menus, and toppings can vary by kitchen."
  },
  {
    id: "chicken-karaage",
    dishName: "Chicken Karaage",
    menuDescription: "Marinated fried chicken with lemon",
    directAllergens: ["wheat", "gluten"],
    hiddenAllergens: ["soy", "sesame"],
    hiddenRiskIngredients: ["soy marinade", "wheat coating", "shared fryer oil", "sesame seasoning"],
    crossContactAllergens: ["peanut", "sesame", "soy", "wheat", "gluten", "egg", "fish", "shellfish"],
    crossContactConcerns: ["shared fryer", "shared marinade containers", "shared tongs"],
    vaguePrepConcerns: ["marinade", "coating", "fryer"],
    baseReason:
      "Fried and marinated dishes commonly contain hidden sauce or coating ingredients and can involve shared fryer oil."
  },
  {
    id: "cucumber-sunomono",
    dishName: "Cucumber Sunomono",
    menuDescription: "Cucumber vinegar salad",
    directAllergens: [],
    hiddenAllergens: ["sesame", "soy", "fish"],
    hiddenRiskIngredients: ["sesame seeds", "sesame oil", "soy sauce", "bonito-based seasoning"],
    crossContactAllergens: ["sesame", "soy", "fish"],
    crossContactConcerns: ["shared garnish spoons", "shared dressing containers"],
    vaguePrepConcerns: ["dressing", "garnish"],
    baseReason:
      "Simple salads can still contain hidden dressing ingredients or sesame garnish that may not appear in the short menu description."
  },
  {
    id: "steamed-rice",
    dishName: "Steamed Rice",
    menuDescription: "Plain white rice",
    directAllergens: [],
    hiddenAllergens: [],
    hiddenRiskIngredients: [],
    crossContactAllergens: ["peanut", "tree nuts", "sesame", "shellfish", "fish", "dairy", "egg", "wheat", "gluten", "soy"],
    crossContactConcerns: ["serving utensils may be shared during busy service"],
    vaguePrepConcerns: [],
    baseReason:
      "No obvious listed-allergen risk appears in the visible menu text, but handling should still be confirmed for severe allergies."
  }
];

const riskRank: Record<RiskLevel, number> = {
  low_risk: 0,
  ask_staff: 1,
  high_risk: 2,
  avoid_unless_confirmed: 3,
  unclear: 1
};

export function createDefaultProfile(): UserProfile {
  return {
    id: "profile-me",
    name: "Me",
    preferredLanguage: "English",
    restaurantLanguage: "Japanese",
    allergies: []
  };
}

export function getMockScanResult(profile: UserProfile): ScanResult {
  const dishes = sampleMenu.map((dish) => buildDishRisk(dish, profile));
  const overallRisk = dishes.reduce<RiskLevel>(
    (highest, dish) => (riskRank[dish.riskLevel] > riskRank[highest] ? dish.riskLevel : highest),
    "low_risk"
  );

  return {
    id: `scan-mock-menu-${Date.now()}`,
    createdAt: new Date().toISOString(),
    restaurantName: "Mock Japanese Menu",
    profileId: profile.id,
    analysisSource: "mock",
    analysisModel: "local-profile-aware-mock",
    scanSummary: {
      overallRisk,
      summary: buildSummary(overallRisk, profile),
      limitations:
        "Mock analysis uses a sample menu and common ingredient patterns. Real scans still require staff confirmation."
    },
    imageQuality: {
      readability: "clear",
      issues: [],
      needsRetake: false
    },
    restaurantMessage: buildRestaurantMessage(profile),
    dishes,
    transparency: {
      checked: ["Visible sample menu text", "Allergy profile", "Common hidden-ingredient patterns"],
      limitations: ["Mock scans do not use external sources or restaurant-specific ingredient data."],
      sourceReferences: []
    }
  };
}

function buildDishRisk(template: MockDishTemplate, profile: UserProfile): DishRisk {
  const directMatches = matchedAllergies(profile.allergies, template.directAllergens);
  const hiddenMatches = matchedAllergies(profile.allergies, template.hiddenAllergens);
  const crossContactMatches = profile.allergies.filter(
    (allergy) => allergy.avoidCrossContact && template.crossContactAllergens.some((token) => matchesAllergy(allergy, token))
  );
  const severeAllergies = profile.allergies.filter((allergy) => allergy.severity === "severe");
  const hasSevereVaguePrepConcern = severeAllergies.length > 0 && template.vaguePrepConcerns.length > 0;

  const riskLevel = chooseRiskLevel({
    directMatches,
    hiddenMatches,
    crossContactMatches,
    hasSevereVaguePrepConcern
  });

  const matchedNames = unique([
    ...directMatches.map((allergy) => allergy.name),
    ...hiddenMatches.map((allergy) => allergy.name),
    ...crossContactMatches.map((allergy) => allergy.name)
  ]);

  const hiddenRiskIngredients =
    hiddenMatches.length > 0 || hasSevereVaguePrepConcern ? template.hiddenRiskIngredients : [];
  const crossContactConcerns = crossContactMatches.length > 0 ? template.crossContactConcerns : [];
  const evidenceConfidence = riskLevel === "low_risk" ? "medium" : "high";
  const riskBasis = unique([
    directMatches.length > 0 ? "visible_text" : "",
    hiddenMatches.length > 0 || hasSevereVaguePrepConcern ? "common_pattern" : "",
    crossContactMatches.length > 0 ? "cross_contact" : "",
    riskLevel === "low_risk" ? "visible_text" : ""
  ]) as DishRisk["riskBasis"];

  return {
    id: template.id,
    dishName: template.dishName,
    menuDescription: template.menuDescription,
    riskLevel,
    possibleAllergens: matchedNames,
    hiddenRiskIngredients,
    crossContactConcerns,
    evidenceConfidence,
    riskBasis,
    reason: buildReason(template, riskLevel, directMatches, hiddenMatches, crossContactMatches, hasSevereVaguePrepConcern),
    questionsToAsk: buildQuestions(template, profile, directMatches, hiddenMatches, crossContactMatches),
    questionsToAskUserLanguage: buildQuestions(template, profile, directMatches, hiddenMatches, crossContactMatches),
    conservativeLanguage: conservativeLanguageFor(riskLevel),
    transparency: {
      visibleMenuText: [template.dishName, template.menuDescription],
      profileFactors: profile.allergies.map((allergy) =>
        `${allergy.name}: ${allergy.severity}${allergy.avoidCrossContact ? ", cross-contact sensitive" : ""}`
      ),
      commonRiskPatterns: unique([
        ...template.hiddenRiskIngredients,
        ...template.crossContactConcerns
      ]).slice(0, 5),
      uncertainty: [
        "Mock analysis cannot confirm actual ingredients, kitchen preparation, or cross-contact."
      ]
    }
  };
}

function chooseRiskLevel(input: {
  directMatches: Allergy[];
  hiddenMatches: Allergy[];
  crossContactMatches: Allergy[];
  hasSevereVaguePrepConcern: boolean;
}): RiskLevel {
  const severeDirect = input.directMatches.some((allergy) => allergy.severity === "severe");
  const anyDirect = input.directMatches.length > 0;
  const severeHidden = input.hiddenMatches.some((allergy) => allergy.severity === "severe");
  const anyHidden = input.hiddenMatches.length > 0;
  const severeCrossContact = input.crossContactMatches.some((allergy) => allergy.severity === "severe");

  if (severeDirect) {
    return "avoid_unless_confirmed";
  }

  if (anyDirect || severeHidden) {
    return "high_risk";
  }

  if (anyHidden || severeCrossContact || input.hasSevereVaguePrepConcern) {
    return "ask_staff";
  }

  return "low_risk";
}

function buildReason(
  template: MockDishTemplate,
  riskLevel: RiskLevel,
  directMatches: Allergy[],
  hiddenMatches: Allergy[],
  crossContactMatches: Allergy[],
  hasSevereVaguePrepConcern: boolean
) {
  if (riskLevel === "low_risk") {
    return "No obvious listed-allergen risk appears in the visible menu text. Confirm preparation details with staff if your allergy is severe.";
  }

  const parts = [template.baseReason];
  if (directMatches.length > 0) {
    parts.push(`Visible menu text suggests ${allergyList(directMatches)} may be present.`);
  }
  if (hiddenMatches.length > 0) {
    parts.push(`Common preparation may involve ${allergyList(hiddenMatches)} through sauces, oils, marinades, or garnish.`);
  }
  if (crossContactMatches.length > 0) {
    parts.push(`Your profile marks cross-contact sensitivity for ${allergyList(crossContactMatches)}.`);
  }
  if (hasSevereVaguePrepConcern && hiddenMatches.length === 0) {
    parts.push("Because a severe allergy is in the profile, vague sauces, broths, marinades, or fryer steps should be confirmed.");
  }

  return parts.join(" ");
}

function buildQuestions(
  template: MockDishTemplate,
  profile: UserProfile,
  directMatches: Allergy[],
  hiddenMatches: Allergy[],
  crossContactMatches: Allergy[]
) {
  const allergyNames = allergyList(uniqueAllergies([...directMatches, ...hiddenMatches, ...crossContactMatches]));
  const profileAllergyNames = allergyList(profile.allergies);
  const targetNames = allergyNames || profileAllergyNames || "my listed allergens";
  const questions = [
    `Can you confirm whether this dish contains ${targetNames}?`,
    `Do the sauce, broth, marinade, oil, dressing, or garnish contain ${targetNames}?`
  ];

  if (template.vaguePrepConcerns.length > 0) {
    questions.push(`Can you check the ${template.vaguePrepConcerns.join(", ")} ingredients before I order?`);
  }

  if (crossContactMatches.length > 0 || profile.allergies.some((allergy) => allergy.severity === "severe")) {
    questions.push(`Is this prepared on shared equipment or with shared utensils that touch ${targetNames}?`);
  }

  return unique(questions).slice(0, 4);
}

function buildRestaurantMessage(profile: UserProfile): ScanResult["restaurantMessage"] {
  const allergyNames = allergyList(profile.allergies);
  if (!allergyNames) {
    return {
      english: "I have food allergies. Can you confirm the ingredients and preparation details before I order?",
      translated: null,
      language: null
    };
  }

  const severeNames = allergyList(profile.allergies.filter((allergy) => allergy.severity === "severe"));
  const crossContactNames = allergyList(profile.allergies.filter((allergy) => allergy.avoidCrossContact));
  const severityText = severeNames ? `I have severe allergies to ${severeNames}` : `I have allergies to ${allergyNames}`;
  const crossContactText = crossContactNames
    ? ` Please also confirm whether shared equipment, fryer oil, utensils, or preparation surfaces touch ${crossContactNames}.`
    : "";

  return {
    english: `${severityText}. Can you confirm whether this dish contains these ingredients in sauces, oils, marinades, broths, dressings, or garnishes?${crossContactText} If you are not sure, I should not order it.`,
    translated:
      profile.restaurantLanguage && profile.restaurantLanguage.toLowerCase() !== "english"
        ? "Live translation will appear when AI analysis is enabled."
        : null,
    language:
      profile.restaurantLanguage && profile.restaurantLanguage.toLowerCase() !== "english"
        ? profile.restaurantLanguage
        : null,
    userLanguageText: `${severityText}. Can you confirm whether this dish contains these ingredients in sauces, oils, marinades, broths, dressings, or garnishes?${crossContactText} If you are not sure, I should not order it.`,
    userLanguage: profile.preferredLanguage
  };
}

function buildSummary(overallRisk: RiskLevel, profile: UserProfile) {
  if (profile.allergies.length === 0) {
    return "Add an allergy profile before scanning a real menu.";
  }

  if (overallRisk === "avoid_unless_confirmed") {
    return "At least one dish has a direct or severe allergy concern. Avoid unless staff can clearly confirm ingredients and preparation.";
  }

  if (overallRisk === "high_risk") {
    return "Some dishes have likely allergen concerns from visible text or common preparation. Ask staff before ordering.";
  }

  if (overallRisk === "ask_staff") {
    return "Some dishes may involve hidden ingredients, sauces, oils, garnish, or cross-contact. Ask targeted questions before ordering.";
  }

  return "No obvious listed-allergen risk was found in this sample menu text. Confirm with staff if your allergy is severe.";
}

function conservativeLanguageFor(riskLevel: RiskLevel) {
  switch (riskLevel) {
    case "low_risk":
      return "No obvious risk found from visible menu text. Confirm with staff if your allergy is severe.";
    case "ask_staff":
      return "Possible hidden risk. Ask staff before ordering.";
    case "high_risk":
      return "High-risk dish based on visible text or common preparation. Avoid unless staff can clearly confirm.";
    case "avoid_unless_confirmed":
      return "Avoid unless the restaurant can clearly confirm ingredients and preparation.";
    case "unclear":
      return "Not enough information. Retake the photo or ask staff directly.";
  }
}

function matchedAllergies(allergies: Allergy[], tokens: string[]) {
  return allergies.filter((allergy) => tokens.some((token) => matchesAllergy(allergy, token)));
}

function matchesAllergy(allergy: Allergy, token: string) {
  const normalizedName = normalize(allergy.name);
  const normalizedToken = normalize(token);
  const normalizedNotes = normalize(allergy.notes ?? "");

  return (
    normalizedName === normalizedToken ||
    normalizedName.includes(normalizedToken) ||
    normalizedToken.includes(normalizedName) ||
    normalizedNotes.includes(normalizedToken)
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function allergyList(allergies: Allergy[]) {
  return unique(allergies.map((allergy) => allergy.name)).join(", ");
}

function uniqueAllergies(allergies: Allergy[]) {
  const seen = new Set<string>();
  return allergies.filter((allergy) => {
    const key = normalize(allergy.name);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

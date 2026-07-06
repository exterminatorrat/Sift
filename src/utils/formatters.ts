import { Allergy } from "../types/allergy";
import { TranslationKey } from "../i18n/translations";

export function formatAllergySummary(allergies: Allergy[]) {
  if (allergies.length === 0) {
    return "No allergies added yet";
  }

  return allergies.map((allergy) => allergy.name).join(", ");
}

export function formatDateTime(value: string, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

const allergenTranslationKeys: Record<string, TranslationKey> = {
  dairy: "allergen.dairy",
  egg: "allergen.egg",
  eggs: "allergen.egg",
  fish: "allergen.fish",
  gluten: "allergen.wheatGluten",
  mango: "allergen.mango",
  mustard: "allergen.mustard",
  peanut: "allergen.peanut",
  peanuts: "allergen.peanut",
  sesame: "allergen.sesame",
  shellfish: "allergen.shellfish",
  soy: "allergen.soy",
  sulfite: "allergen.sulfites",
  sulfites: "allergen.sulfites",
  "tree nut": "allergen.treeNuts",
  "tree nuts": "allergen.treeNuts",
  wheat: "allergen.wheatGluten",
  "wheat/gluten": "allergen.wheatGluten"
};

export function formatAllergenLabel(
  allergen: string,
  translate: (key: TranslationKey) => string
) {
  const key = allergenTranslationKeys[allergen.trim().toLowerCase()];
  return key ? translate(key) : allergen;
}

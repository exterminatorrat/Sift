import assert from "node:assert/strict";

import {
  allergenRelationships,
  directAllergenTermsByLanguage,
  ontologyEntriesForAllergy,
  ontologyTermLanguageMetadata,
  ontologyVersion,
  supportedOntologyLanguages
} from "../../supabase/functions/_shared/ai/ontology.mjs";

for (const [term, language] of [
  ["cacahuate", "es"],
  ["moutarde", "fr"],
  ["erdnuss", "de"],
  ["parmigiano", "it"],
  ["amendoim", "pt"],
  ["ごま", "ja"],
  ["참깨", "ko"],
  ["芝麻", "zh"],
  ["เมล็ดงา", "th"]
]) {
  const entry = allergenRelationships.find((candidate) => candidate.term === term);
  assert.ok(entry, `Missing ontology relationship for ${term}.`);
  assert.equal(entry.language, language, `${term} must retain explicit ${language} metadata.`);
}

assert.ok(
  ontologyTermLanguageMetadata.some((entry) => entry.term === "moutarde" && entry.language === "fr")
);
assert.equal(
  allergenRelationships.find((entry) => entry.term === "mole")?.relationship,
  "ambiguous_association"
);

for (const [canonicalAllergen, termsByLanguage] of Object.entries(directAllergenTermsByLanguage)) {
  assert.deepEqual(
    Object.keys(termsByLanguage),
    [...supportedOntologyLanguages],
    `${canonicalAllergen} must declare exactly the supported ontology languages.`
  );
  for (const language of supportedOntologyLanguages) {
    assert.ok(
      termsByLanguage[language].length > 0,
      `${canonicalAllergen} must include at least one direct ${language} term.`
    );
    for (const term of termsByLanguage[language]) {
      assert.ok(
        ontologyTermLanguageMetadata.some((entry) => entry.term === term && entry.language === language),
        `${canonicalAllergen}/${language}/${term} must retain explicit language metadata.`
      );
    }
  }
}

const japaneseWheat = allergenRelationships.find(
  (entry) => entry.canonicalAllergen === "wheat/gluten" && entry.term === "小麦"
);
assert.ok(japaneseWheat, "Japanese 小麦 must be deterministic wheat/gluten evidence.");
assert.equal(japaneseWheat.language, "multi");
assert.ok(
  ontologyTermLanguageMetadata.some((entry) => entry.term === "小麦" && entry.language === "ja"),
  "Shared Japanese/Chinese text must retain its explicit Japanese declaration."
);
assert.equal(japaneseWheat.riskFloor.severe, "avoid_unless_confirmed");

for (const [term, language] of [
  ["カシューナッツ", "ja"],
  ["호두", "ko"],
  ["腰果", "zh"],
  ["อัลมอนด์", "th"]
]) {
  const treeNut = allergenRelationships.find(
    (entry) => entry.canonicalAllergen === "tree nuts" && entry.term === term
  );
  assert.ok(treeNut, `Missing multilingual tree-nut term ${term}.`);
  assert.equal(treeNut.language, language);
}

const dairyWithNegatedEggNote = ontologyEntriesForAllergy({
  name: "Dairy",
  severity: "severe",
  avoidCrossContact: true,
  notes: "Egg is okay for me"
});
assert.ok(dairyWithNegatedEggNote.length > 0);
assert.ok(dairyWithNegatedEggNote.every((entry) => entry.canonicalAllergen === "dairy"));
assert.ok(!dairyWithNegatedEggNote.some((entry) => entry.canonicalAllergen === "egg"));
assert.deepEqual(ontologyEntriesForAllergy({ name: "", notes: "Peanut" }), []);

assert.ok(!directAllergenTermsByLanguage.dairy["zh-Hans"].includes("奶"));
assert.ok(!directAllergenTermsByLanguage.egg["zh-Hans"].includes("蛋"));
assert.ok(!directAllergenTermsByLanguage.sesame.th.includes("งา"));
assert.match(ontologyVersion, /^\d{4}-\d{2}-\d{2}\.\d+$/);

console.log(
  `Ontology ${ontologyVersion} coverage passed: ${Object.keys(directAllergenTermsByLanguage).length} allergen families x ${supportedOntologyLanguages.length} languages.`
);

import { UserProfile } from "../types/allergy";
import { ScanResult } from "../types/scan";

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
  return {
    id: `scan-japanese-menu-${Date.now()}`,
    createdAt: new Date().toISOString(),
    restaurantName: "Kobashi Japanese Menu",
    profileId: profile.id,
    scanSummary: {
      overallRisk: "ask_staff",
      summary:
        "Several dishes may involve sesame oil, soy sauce, wheat noodles, or shared preparation. Ask staff targeted questions before ordering.",
      limitations:
        "This prototype uses mock analysis based on visible menu-style text and common preparation patterns."
    },
    imageQuality: {
      readability: "clear",
      issues: []
    },
    restaurantMessage: {
      english:
        "I have severe peanut and sesame allergies. Can you confirm whether this dish contains peanuts, peanut oil, sesame oil, sesame seeds, or is prepared on shared equipment that touches these ingredients? If you are not sure, I should not order it.",
      translated:
        "私は重度のピーナッツとごまのアレルギーがあります。この料理にピーナッツ、ピーナッツ油、ごま油、ごま、またはそれらに触れた調理器具が使われているか確認できますか。わからない場合は注文しません。",
      language: "Japanese"
    },
    dishes: [
      {
        id: "tonkotsu-ramen",
        dishName: "Tonkotsu Ramen",
        menuDescription: "Pork broth, noodles, egg, scallion",
        riskLevel: "ask_staff",
        possibleAllergens: ["Sesame", "Soy", "Wheat/gluten", "Egg"],
        hiddenRiskIngredients: ["sesame oil", "tare", "soy sauce", "wheat noodles"],
        crossContactConcerns: ["shared ladles", "shared noodle baskets", "sesame toppings nearby"],
        reason:
          "Ramen often uses wheat noodles and soy-based tare. Some shops finish broth with sesame oil or sesame toppings, and the menu does not list the full broth ingredients.",
        questionsToAsk: [
          "Does the broth or tare contain sesame oil, sesame paste, or sesame seeds?",
          "Are the noodles wheat-based?",
          "Is any peanut or sesame used near the ramen station?",
          "Can this be prepared without sesame toppings or shared garnish utensils?"
        ],
        conservativeLanguage:
          "Possible hidden risk. Ask staff to confirm broth, tare, toppings, and shared preparation."
      },
      {
        id: "chicken-karaage",
        dishName: "Chicken Karaage",
        menuDescription: "Marinated fried chicken with lemon",
        riskLevel: "high_risk",
        possibleAllergens: ["Soy", "Wheat/gluten", "Sesame"],
        hiddenRiskIngredients: ["soy marinade", "wheat coating", "shared fryer oil", "sesame seasoning"],
        crossContactConcerns: ["shared fryer", "shared marinade containers"],
        reason:
          "Karaage commonly uses soy sauce and wheat starch or flour. Fried items can also involve shared fryer oil, which matters for severe allergies and cross-contact sensitivity.",
        questionsToAsk: [
          "What is in the marinade?",
          "Is the coating made with wheat flour or starch?",
          "Is the fryer shared with items containing sesame or peanuts?",
          "Is sesame oil or sesame seasoning used before serving?"
        ],
        conservativeLanguage:
          "High-risk dish based on common preparation. Avoid unless staff can clearly confirm ingredients and fryer practices."
      },
      {
        id: "cucumber-sunomono",
        dishName: "Cucumber Sunomono",
        menuDescription: "Cucumber vinegar salad",
        riskLevel: "ask_staff",
        possibleAllergens: ["Sesame", "Soy"],
        hiddenRiskIngredients: ["sesame seeds", "sesame oil", "soy sauce"],
        crossContactConcerns: ["shared garnish spoons"],
        reason:
          "The visible description sounds simple, but cucumber salads are sometimes topped with sesame seeds or seasoned with sesame oil or soy sauce.",
        questionsToAsk: [
          "Does the dressing contain sesame oil, sesame seeds, or soy sauce?",
          "Can it be served without sesame garnish?",
          "Are garnish utensils shared with sesame toppings?"
        ],
        conservativeLanguage:
          "Possible hidden risk. Ask staff whether the dressing or garnish contains sesame."
      },
      {
        id: "plain-rice",
        dishName: "Steamed Rice",
        menuDescription: "Plain white rice",
        riskLevel: "low_risk",
        possibleAllergens: [],
        hiddenRiskIngredients: [],
        crossContactConcerns: ["serving utensils may be shared during busy service"],
        reason:
          "No obvious listed-allergen risk appears in the visible menu text. Severe allergies still require staff confirmation about handling and serving utensils.",
        questionsToAsk: [
          "Is this plain rice without seasoning or garnish?",
          "Are separate serving utensils available?",
          "Is it handled away from my listed allergens?"
        ],
        conservativeLanguage:
          "No obvious risk found from visible menu text. Confirm with staff if your allergy is severe."
      }
    ]
  };
}

export type AppLanguageCode =
  | "en"
  | "es"
  | "fr"
  | "it"
  | "ja"
  | "de"
  | "ko"
  | "zh-Hans"
  | "zh-Hant"
  | "pt"
  | "th";

export type TranslationKey =
  | "common.back"
  | "common.close"
  | "common.sift"
  | "common.itemsCount"
  | "common.noObviousListedAllergen"
  | "common.recommended"
  | "risk.lowRisk"
  | "risk.lowRiskAction"
  | "risk.askStaff"
  | "risk.askStaffAction"
  | "risk.highRisk"
  | "risk.highRiskAction"
  | "risk.avoidUnlessConfirmed"
  | "risk.avoidUnlessConfirmedAction"
  | "risk.unclear"
  | "risk.unclearAction"
  | "onboarding.headline"
  | "onboarding.body"
  | "onboarding.safety"
  | "onboarding.stepOne"
  | "onboarding.stepTwo"
  | "onboarding.stepThree"
  | "onboarding.scanTitle"
  | "onboarding.scanBody"
  | "onboarding.safetyTitle"
  | "onboarding.safetyBody"
  | "onboarding.questionsTitle"
  | "onboarding.questionsBody"
  | "onboarding.continue"
  | "onboarding.stepProgress"
  | "onboarding.welcomeTitle"
  | "onboarding.welcomeBody"
  | "onboarding.safetyBoundaryTitle"
  | "onboarding.safetyBoundaryBody"
  | "onboarding.profileSetupTitle"
  | "onboarding.profileSetupBody"
  | "onboarding.scanTipsTitle"
  | "onboarding.scanTipsBody"
  | "onboarding.plusTitle"
  | "onboarding.plusBody"
  | "onboarding.iUnderstand"
  | "onboarding.createProfile"
  | "onboarding.continueFree"
  | "onboarding.profileNameLabel"
  | "onboarding.profileNameDefault"
  | "onboarding.chooseAllergies"
  | "onboarding.customAllergen"
  | "onboarding.sensitivityLabel"
  | "onboarding.crossContactTitle"
  | "onboarding.crossContactBody"
  | "onboarding.tipReadable"
  | "onboarding.tipDescriptions"
  | "onboarding.tipNoGlare"
  | "onboarding.plusFeatureScans"
  | "onboarding.plusFeatureTranslations"
  | "onboarding.plusFeatureFamily"
  | "onboarding.getStarted"
  | "login.eyebrow"
  | "login.title"
  | "login.body"
  | "login.trustTitle"
  | "login.trustBody"
  | "login.appleUnavailableTitle"
  | "login.appleUnavailableBody"
  | "login.terms"
  | "nav.home"
  | "nav.history"
  | "nav.profile"
  | "home.title"
  | "home.openSettings"
  | "home.activeFilters"
  | "home.createProfileTitle"
  | "home.createProfileBody"
  | "home.editProfile"
  | "home.scanMenu"
  | "home.scanBody"
  | "home.scanHint"
  | "home.uploadPhoto"
  | "home.recentScans"
  | "home.viewAll"
  | "home.menuScan"
  | "home.emptyRecent"
  | "scanCapture.title"
  | "scanCapture.body"
  | "scanCapture.takePhoto"
  | "scanCapture.uploadPhoto"
  | "imagePreview.title"
  | "imagePreview.body"
  | "imagePreview.noImage"
  | "imagePreview.usePhoto"
  | "imagePreview.retake"
  | "imagePreview.rechoose"
  | "analysis.title"
  | "analysis.subtitle"
  | "results.title"
  | "results.heroSubtitle"
  | "results.imageReadability"
  | "results.viewPhoto"
  | "results.menuPhoto"
  | "results.readability.clear"
  | "results.readability.partiallyClear"
  | "results.readability.poor"
  | "results.dishesFound"
  | "results.restaurantMessage"
  | "results.savedToHistory"
  | "dish.severeAllergyAlert"
  | "dish.readCarefully"
  | "dish.allergiesTo"
  | "dish.whyFlagged"
  | "dish.possibleAllergens"
  | "dish.hiddenRiskIngredients"
  | "dish.crossContactConcerns"
  | "dish.questionsToAsk"
  | "dish.profileNote"
  | "dish.backToResults"
  | "dish.emptyPossibleAllergens"
  | "dish.emptyHiddenRisk"
  | "dish.emptyCrossContact"
  | "voice.playMessage"
  | "voice.playForStaff"
  | "voice.readQuestions"
  | "voice.stop"
  | "voice.unavailable"
  | "profile.title"
  | "profile.body"
  | "profile.savedProfiles"
  | "profile.new"
  | "profile.profileFallback"
  | "profile.deleteProfileTitle"
  | "profile.deleteProfileBody"
  | "profile.allergiesCount"
  | "profile.profileName"
  | "profile.profileNamePlaceholder"
  | "profile.yourLanguage"
  | "profile.yourLanguagePlaceholder"
  | "profile.restaurantLanguage"
  | "profile.restaurantLanguagePlaceholder"
  | "profile.commonAllergens"
  | "profile.selectedCount"
  | "profile.severityMeta"
  | "profile.crossContactMeta"
  | "profile.customDetails"
  | "profile.customDetailsPlaceholder"
  | "profile.customAllergen"
  | "profile.add"
  | "profile.selectedDetails"
  | "profile.crossContactSensitive"
  | "profile.crossContactBody"
  | "profile.customDetailsLongPlaceholder"
  | "profile.saveProfile"
  | "profile.savedToast"
  | "severity.mild"
  | "severity.moderate"
  | "severity.severe"
  | "allergen.peanut"
  | "allergen.treeNuts"
  | "allergen.sesame"
  | "allergen.shellfish"
  | "allergen.fish"
  | "allergen.dairy"
  | "allergen.egg"
  | "allergen.wheatGluten"
  | "allergen.soy"
  | "allergen.mango"
  | "allergen.mustard"
  | "allergen.sulfites"
  | "history.title"
  | "history.noScansTitle"
  | "history.noScansBody"
  | "history.noObviousRisks"
  | "history.risksFound"
  | "history.deleteScan"
  | "settings.subscription"
  | "settings.language"
  | "settings.safetyDisclaimer"
  | "settings.clearScanHistory"
  | "settings.helpSupport"
  | "settings.logout"
  | "settings.clearHistoryTitle"
  | "settings.clearHistoryBody"
  | "settings.cancel"
  | "settings.clear"
  | "subscription.title"
  | "subscription.body"
  | "subscription.currentPlan"
  | "subscription.freeMvp"
  | "subscription.now"
  | "subscription.plans"
  | "subscription.free"
  | "subscription.plus"
  | "subscription.premium"
  | "subscription.family"
  | "subscription.freePrice"
  | "subscription.plusPrice"
  | "subscription.premiumPrice"
  | "subscription.familyPrice"
  | "subscription.freeBody"
  | "subscription.plusBody"
  | "subscription.premiumBody"
  | "subscription.familyBody"
  | "subscription.unavailable"
  | "subscription.current"
  | "subscription.questions"
  | "subscription.supportCenter"
  | "language.title"
  | "language.body"
  | "language.appLanguage"
  | "language.appLanguageBody"
  | "language.restaurantLanguage"
  | "language.restaurantLanguageBody"
  | "language.notSure"
  | "language.english"
  | "language.spanish"
  | "language.french"
  | "language.italian"
  | "language.japanese"
  | "language.german"
  | "language.korean"
  | "language.chineseSimplified"
  | "language.chineseTraditional"
  | "language.portuguese"
  | "language.thai"
  | "language.comingSoon"
  | "safety.title"
  | "safety.body"
  | "safety.visibleTitle"
  | "safety.visibleBody"
  | "safety.confirmTitle"
  | "safety.confirmBody"
  | "safety.callout"
  | "safety.medicalTitle"
  | "safety.medicalBody"
  | "safety.responsibilityTitle"
  | "safety.responsibilityBody"
  | "safety.understand"
  | "help.title"
  | "help.body"
  | "help.faq"
  | "help.faqBody"
  | "help.contact"
  | "help.contactBody"
  | "help.feedback"
  | "help.feedbackBody"
  | "help.openError"
  | "help.emailFeedbackTitle"
  | "help.emailSupportTitle"
  | "help.feedbackSubject"
  | "help.feedbackBodyTemplate"
  | "help.supportSubject"
  | "help.supportModalTitle"
  | "help.supportModalBody"
  | "help.emailSupport";

export const languageCodesByName: Record<string, AppLanguageCode> = {
  deutsch: "de",
  de: "de",
  english: "en",
  en: "en",
  espanol: "es",
  "español": "es",
  es: "es",
  francais: "fr",
  "français": "fr",
  french: "fr",
  fr: "fr",
  german: "de",
  italian: "it",
  italiano: "it",
  it: "it",
  japanese: "ja",
  ja: "ja",
  korean: "ko",
  ko: "ko",
  portuguese: "pt",
  "português": "pt",
  portugues: "pt",
  pt: "pt",
  spanish: "es",
  thai: "th",
  th: "th",
  "chinese simplified": "zh-Hans",
  "chinese traditional": "zh-Hant",
  "zh-hans": "zh-Hans",
  "zh-hant": "zh-Hant",
  "简体中文": "zh-Hans",
  "繁體中文": "zh-Hant",
  "日本語": "ja",
  "한국어": "ko",
  "ไทย": "th"
};

export type AppLanguageOption = {
  label: string;
  value: string;
  enabled: boolean;
};

export const waveOneAppLanguages: AppLanguageOption[] = [
  { label: "English", value: "English", enabled: true },
  { label: "Español", value: "Spanish", enabled: true },
  { label: "Français", value: "French", enabled: true },
  { label: "Italiano", value: "Italian", enabled: true },
  { label: "日本語", value: "Japanese", enabled: true },
  { label: "Deutsch", value: "German", enabled: true },
  { label: "한국어", value: "Korean", enabled: true },
  { label: "简体中文", value: "Chinese Simplified", enabled: true },
  { label: "繁體中文", value: "Chinese Traditional", enabled: true },
  { label: "Português", value: "Portuguese", enabled: true },
  { label: "ไทย", value: "Thai", enabled: true }
];

export const getLanguageCode = (language?: string | null): AppLanguageCode => {
  if (!language) {
    return "en";
  }

  return languageCodesByName[language.trim().toLowerCase()] ?? "en";
};

const en = {
  "common.back": "Go back",
  "common.close": "Close",
  "common.sift": "Sift",
  "common.itemsCount": "{count} items",
  "common.noObviousListedAllergen": "No obvious listed allergen",
  "common.recommended": "Recommended",
  "risk.lowRisk": "Low Risk",
  "risk.lowRiskAction": "Confirm if severe",
  "risk.askStaff": "Ask Staff",
  "risk.askStaffAction": "Ask before ordering",
  "risk.highRisk": "High Risk",
  "risk.highRiskAction": "Avoid unless confirmed",
  "risk.avoidUnlessConfirmed": "Avoid Unless Confirmed",
  "risk.avoidUnlessConfirmedAction": "Confirm ingredients first",
  "risk.unclear": "Unclear",
  "risk.unclearAction": "Retake or ask directly",
  "onboarding.headline": "Know what to\nask before you\neat.",
  "onboarding.body":
    "Sift helps you scan menus for possible allergen risks, hidden ingredients, and the exact questions to ask staff.",
  "onboarding.safety":
    "Sift cannot guarantee food safety. Always confirm with restaurant staff, especially for severe allergies.",
  "onboarding.stepOne": "Step 1 of 3",
  "onboarding.stepTwo": "Step 2 of 3",
  "onboarding.stepThree": "Step 3 of 3",
  "onboarding.scanTitle": "Scan menus for possible allergy risks.",
  "onboarding.scanBody":
    "Take or upload a menu photo. Sift reads visible menu text and looks for listed allergens and common hidden-risk patterns.",
  "onboarding.safetyTitle": "Sift helps you decide what to ask.",
  "onboarding.safetyBody":
    "Sift cannot confirm ingredients, kitchen preparation, or cross-contact. Always confirm with restaurant staff.",
  "onboarding.questionsTitle": "Leave with clear staff questions.",
  "onboarding.questionsBody":
    "Sift turns each scan into risk cards, explanations, and simple restaurant-facing messages.",
  "onboarding.continue": "Continue",
  "onboarding.stepProgress": "{current} of {total}",
  "onboarding.welcomeTitle": "Know what to ask before you eat.",
  "onboarding.welcomeBody":
    "Sift scans menu photos for possible allergen risks, hidden ingredients, and staff questions.",
  "onboarding.safetyBoundaryTitle": "Sift does not guarantee food safety.",
  "onboarding.safetyBoundaryBody":
    "Sift analyzes visible menu text and common ingredient patterns. Always confirm ingredients and preparation with restaurant staff.",
  "onboarding.profileSetupTitle": "Create your allergy profile.",
  "onboarding.profileSetupBody":
    "Choose the allergies Sift should check for first. You can edit details later in your profile.",
  "onboarding.scanTipsTitle": "Photograph the menu from above.",
  "onboarding.scanTipsBody":
    "Keep the page vertical, flat, and readable. Include dish descriptions when possible.",
  "onboarding.plusTitle": "Sift Plus is coming.",
  "onboarding.plusBody":
    "More scans, translation cards, saved history, and family profiles. Continue free while the MVP is in testing.",
  "onboarding.iUnderstand": "I understand",
  "onboarding.createProfile": "Create profile",
  "onboarding.continueFree": "Continue for free",
  "onboarding.profileNameLabel": "Who is this profile for?",
  "onboarding.profileNameDefault": "Me",
  "onboarding.chooseAllergies": "Choose allergies",
  "onboarding.customAllergen": "Custom allergen",
  "onboarding.sensitivityLabel": "How sensitive should Sift be?",
  "onboarding.crossContactTitle": "Ask about cross-contact",
  "onboarding.crossContactBody": "Include shared equipment and prep questions by default.",
  "onboarding.tipReadable": "Readable text",
  "onboarding.tipDescriptions": "Full dish descriptions",
  "onboarding.tipNoGlare": "No glare",
  "onboarding.plusFeatureScans": "More menu scans",
  "onboarding.plusFeatureTranslations": "Travel translation cards",
  "onboarding.plusFeatureFamily": "Family profiles",
  "onboarding.getStarted": "Get Started",
  "login.eyebrow": "Private account",
  "login.title": "Sign in to Sift",
  "login.body":
    "Keep your allergy profile, scan history, and restaurant notes available when you need them.",
  "login.trustTitle": "A practical allergy copilot, not a safety guarantee.",
  "login.trustBody":
    "Sift helps identify possible risks from visible menu text. Always confirm ingredients and preparation with restaurant staff.",
  "login.appleUnavailableTitle": "Apple sign-in is unavailable here",
  "login.appleUnavailableBody":
    "Sign in with Apple is available on supported iPhone devices. Test this flow on an iPhone build or Expo Go where Apple authentication is supported.",
  "login.terms":
    "By continuing, you agree to Sift's Terms of Service and Privacy Policy.",
  "nav.home": "Home",
  "nav.history": "History",
  "nav.profile": "Profile",
  "home.title": "Home",
  "home.openSettings": "Open settings",
  "home.activeFilters": "Active filters",
  "home.createProfileTitle": "Create an allergy profile",
  "home.createProfileBody":
    "Sift needs your allergies and severity before it can structure menu risks.",
  "home.editProfile": "Edit profile",
  "home.scanMenu": "Scan Menu",
  "home.scanBody": "Analyze ingredients instantly",
  "home.scanHint": "For best results, photograph the menu vertically from above.",
  "home.uploadPhoto": "Upload Photo",
  "home.recentScans": "Recent Scans",
  "home.viewAll": "View All",
  "home.menuScan": "Menu scan",
  "home.emptyRecent": "Scans you save on this device will appear here.",
  "scanCapture.title": "Capture one clear menu page.",
  "scanCapture.body": "Keep the page flat, include dish descriptions when possible, and avoid glare.",
  "scanCapture.takePhoto": "Take photo",
  "scanCapture.uploadPhoto": "Upload photo",
  "imagePreview.title": "Use this menu photo?",
  "imagePreview.body": "If text is cut off or blurry, retake it before analysis.",
  "imagePreview.noImage": "No image selected.",
  "imagePreview.usePhoto": "Use photo",
  "imagePreview.retake": "Retake",
  "imagePreview.rechoose": "Rechoose",
  "analysis.title": "Reading menu\ningredients...",
  "analysis.subtitle": "Scanning for traces and hidden\naliases",
  "results.title": "Scan Results",
  "results.heroSubtitle": "{restaurantName} for {profileName}",
  "results.imageReadability": "Image readability: {readability}",
  "results.viewPhoto": "View photo",
  "results.menuPhoto": "Menu photo",
  "results.readability.clear": "clear",
  "results.readability.partiallyClear": "partially clear",
  "results.readability.poor": "poor",
  "results.dishesFound": "Dishes found",
  "results.restaurantMessage": "Restaurant message",
  "results.savedToHistory": "Saved to scan history",
  "dish.severeAllergyAlert": "Severe allergy alert",
  "dish.readCarefully": "Please read carefully",
  "dish.allergiesTo": "I have allergies to:",
  "dish.whyFlagged": "Why it was flagged",
  "dish.possibleAllergens": "Possible allergens",
  "dish.hiddenRiskIngredients": "Hidden-risk ingredients",
  "dish.crossContactConcerns": "Cross-contact concerns",
  "dish.questionsToAsk": "Questions to ask staff",
  "dish.profileNote": "Built for {name}: {allergies}",
  "dish.backToResults": "Back to results",
  "dish.emptyPossibleAllergens": "No obvious listed allergen from visible menu text.",
  "dish.emptyHiddenRisk": "No common hidden ingredient pattern was flagged.",
  "dish.emptyCrossContact": "No specific cross-contact concern was found.",
  "voice.playMessage": "Play message",
  "voice.playForStaff": "Play for staff",
  "voice.readQuestions": "Read questions",
  "voice.stop": "Stop",
  "voice.unavailable": "Could not play audio on this device.",
  "profile.title": "Allergy Profile",
  "profile.body": "Choose allergies and severity. Sift uses this profile to scan menus and prepare questions.",
  "profile.savedProfiles": "Saved profiles",
  "profile.new": "New",
  "profile.profileFallback": "Profile",
  "profile.deleteProfileTitle": "Delete profile?",
  "profile.deleteProfileBody": "Delete {name} from this device?",
  "profile.allergiesCount": "{count} allergies",
  "profile.profileName": "Profile name",
  "profile.profileNamePlaceholder": "Me",
  "profile.yourLanguage": "Your language",
  "profile.yourLanguagePlaceholder": "English",
  "profile.restaurantLanguage": "Restaurant language",
  "profile.restaurantLanguagePlaceholder": "Japanese",
  "profile.commonAllergens": "Common allergens",
  "profile.selectedCount": "{count} selected",
  "profile.severityMeta": "{severity} severity",
  "profile.crossContactMeta": "cross-contact",
  "profile.customDetails": "Custom details",
  "profile.customDetailsPlaceholder": "Peanut oil, sesame oil, traces, shared fryer...",
  "profile.customAllergen": "Custom allergen",
  "profile.add": "Add",
  "profile.selectedDetails": "Selected allergies",
  "profile.crossContactSensitive": "Cross-contact sensitive",
  "profile.crossContactBody": "Ask about shared equipment and prep.",
  "profile.customDetailsLongPlaceholder": "Custom details, such as oils, traces, or tolerated forms",
  "profile.saveProfile": "Save profile",
  "profile.savedToast": "Allergy profile saved",
  "severity.mild": "Mild",
  "severity.moderate": "Moderate",
  "severity.severe": "Severe",
  "allergen.peanut": "Peanut",
  "allergen.treeNuts": "Tree nuts",
  "allergen.sesame": "Sesame",
  "allergen.shellfish": "Shellfish",
  "allergen.fish": "Fish",
  "allergen.dairy": "Dairy",
  "allergen.egg": "Egg",
  "allergen.wheatGluten": "Wheat/gluten",
  "allergen.soy": "Soy",
  "allergen.mango": "Mango",
  "allergen.mustard": "Mustard",
  "allergen.sulfites": "Sulfites",
  "history.title": "Scan History",
  "history.noScansTitle": "No scans yet",
  "history.noScansBody": "Scans you save on this device will appear here.",
  "history.noObviousRisks": "No Obvious Risks",
  "history.risksFound": "{count} Risks Found",
  "history.deleteScan": "Delete",
  "settings.subscription": "Subscription",
  "settings.language": "Language",
  "settings.safetyDisclaimer": "Safety Disclaimer",
  "settings.clearScanHistory": "Clear Scan History ({count})",
  "settings.helpSupport": "Help / Support",
  "settings.logout": "LOG OUT",
  "settings.clearHistoryTitle": "Clear scan history?",
  "settings.clearHistoryBody": "This only clears saved scans on this device.",
  "settings.cancel": "Cancel",
  "settings.clear": "Clear",
  "subscription.title": "Sift Premium",
  "subscription.body":
    "Elevate menu scanning with deeper tools designed for peace of mind.",
  "subscription.currentPlan": "Current plan",
  "subscription.freeMvp": "Free MVP",
  "subscription.now": "now",
  "subscription.plans": "Plans",
  "subscription.free": "Free",
  "subscription.plus": "Plus",
  "subscription.premium": "Premium",
  "subscription.family": "Family",
  "subscription.freePrice": "$0",
  "subscription.plusPrice": "$4.99/mo",
  "subscription.premiumPrice": "$8.99/mo",
  "subscription.familyPrice": "$12.99/mo",
  "subscription.freeBody": "3 scans/month, 1 profile, basic risk cards, and recent local history.",
  "subscription.plusBody": "50 scans/month, full local history, translation cards, and richer dish details.",
  "subscription.premiumBody": "200 scans/month, travel mode, offline allergy cards, export, and advanced risk detail.",
  "subscription.familyBody": "500 scans/month, multiple family profiles, child profiles, and shared allergy cards.",
  "subscription.unavailable": "Unavailable right now",
  "subscription.current": "Current",
  "subscription.questions": "Have questions about your plan?",
  "subscription.supportCenter": "Visit the Support Center",
  "language.title": "Language",
  "language.body":
    "Choose the language Sift should use around the app. Restaurant language stays with your allergy profile.",
  "language.appLanguage": "App language",
  "language.appLanguageBody": "The primary language used for navigation and menus.",
  "language.restaurantLanguage": "Restaurant language",
  "language.restaurantLanguageBody": "Used for restaurant-facing messages. Choose Not sure if you do not know yet.",
  "language.notSure": "Not sure",
  "language.english": "English",
  "language.spanish": "Spanish",
  "language.french": "French",
  "language.italian": "Italian",
  "language.japanese": "Japanese",
  "language.german": "German",
  "language.korean": "Korean",
  "language.chineseSimplified": "Chinese Simplified",
  "language.chineseTraditional": "Chinese Traditional",
  "language.portuguese": "Portuguese",
  "language.thai": "Thai",
  "language.comingSoon": "Coming soon",
  "safety.title": "Safety Disclaimer",
  "safety.body": "Please read carefully before using Sift for menu decisions.",
  "safety.visibleTitle": "1. Visible menu text only",
  "safety.visibleBody":
    "Sift analyzes visible menu text and common ingredient patterns. It cannot confirm full ingredients, kitchen preparation, substitutions, or cross-contact.",
  "safety.confirmTitle": "2. Confirm with staff",
  "safety.confirmBody":
    "Always confirm with restaurant staff, especially for severe allergies. Ask about sauces, oils, broths, marinades, garnishes, fryers, and shared equipment.",
  "safety.callout":
    "Sift never guarantees a dish is safe. It helps you know what to ask before ordering.",
  "safety.medicalTitle": "3. Not medical advice",
  "safety.medicalBody":
    "Sift is an allergy menu copilot, not a medical device, doctor, restaurant, or food safety certifier.",
  "safety.responsibilityTitle": "4. Your responsibility",
  "safety.responsibilityBody":
    "You are responsible for deciding what to order and whether restaurant confirmation is sufficient for your allergy needs.",
  "safety.understand": "I understand",
  "help.title": "Help & Support",
  "help.body": "How can we assist you today?",
  "help.faq": "Frequently Asked Questions",
  "help.faqBody": "Find quick answers to common issues.",
  "help.contact": "Contact Support",
  "help.contactBody": "Reach out to our team directly.",
  "help.feedback": "Submit Feedback",
  "help.feedbackBody": "Help us improve your Sift experience.",
  "help.openError": "We could not open this link on your device.",
  "help.emailFeedbackTitle": "Email feedback",
  "help.emailSupportTitle": "Email support",
  "help.feedbackSubject": "Sift feedback",
  "help.feedbackBodyTemplate":
    "What happened?\n\nWhat would you like Sift to improve?\n\nDevice/App version if relevant:\n",
  "help.supportSubject": "Sift support request",
  "help.supportModalTitle": "Contact Support",
  "help.supportModalBody":
    "Email us at support@siftallergy.app. We usually respond within 2-5 business days.",
  "help.emailSupport": "Email Support"
} satisfies Record<TranslationKey, string>;

const es = {
  ...en,
  "common.back": "Volver",
  "common.close": "Cerrar",
  "common.sift": "Sift",
  "nav.home": "Inicio",
  "nav.history": "Historial",
  "nav.profile": "Perfil",
  "home.title": "Inicio",
  "home.openSettings": "Abrir ajustes",
  "home.activeFilters": "Filtros activos",
  "home.createProfileTitle": "Crea un perfil de alergias",
  "home.createProfileBody":
    "Sift necesita tus alergias y su gravedad antes de estructurar riesgos del menú.",
  "home.editProfile": "Editar perfil",
  "home.scanMenu": "Escanear menú",
  "home.scanBody": "Analiza ingredientes al instante",
  "home.uploadPhoto": "Subir foto",
  "home.recentScans": "Escaneos recientes",
  "home.viewAll": "Ver todo",
  "home.menuScan": "Escaneo de menú",
  "home.emptyRecent": "Los escaneos que guardes en este dispositivo aparecerán aquí.",
  "profile.title": "Perfil de alergias",
  "profile.body": "Elige alergias y gravedad. Sift usa este perfil para escanear menús y preparar preguntas.",
  "profile.savedProfiles": "Perfiles guardados",
  "profile.new": "Nuevo",
  "profile.profileFallback": "Perfil",
  "profile.deleteProfileTitle": "¿Borrar perfil?",
  "profile.deleteProfileBody": "¿Borrar {name} de este dispositivo?",
  "profile.allergiesCount": "{count} alergias",
  "profile.profileName": "Nombre del perfil",
  "profile.yourLanguage": "Tu idioma",
  "profile.restaurantLanguage": "Idioma del restaurante",
  "profile.commonAllergens": "Alérgenos comunes",
  "profile.selectedCount": "{count} seleccionados",
  "profile.severityMeta": "Gravedad {severity}",
  "profile.crossContactMeta": "contacto cruzado",
  "profile.customDetails": "Detalles personalizados",
  "profile.customDetailsPlaceholder": "Aceite de cacahuate, aceite de sésamo, trazas, freidora compartida...",
  "profile.customAllergen": "Alérgeno personalizado",
  "profile.add": "Agregar",
  "profile.selectedDetails": "Alergias seleccionadas",
  "profile.crossContactSensitive": "Sensible al contacto cruzado",
  "profile.crossContactBody": "Pregunta por equipo y preparación compartidos.",
  "profile.customDetailsLongPlaceholder": "Detalles personalizados, como aceites, trazas o formas toleradas",
  "profile.saveProfile": "Guardar perfil",
  "profile.savedToast": "Perfil de alergias guardado",
  "severity.mild": "Leve",
  "severity.moderate": "Moderada",
  "severity.severe": "Grave",
  "allergen.peanut": "Cacahuate",
  "allergen.treeNuts": "Frutos secos",
  "allergen.sesame": "Sésamo",
  "allergen.shellfish": "Mariscos",
  "allergen.fish": "Pescado",
  "allergen.dairy": "Lácteos",
  "allergen.egg": "Huevo",
  "allergen.wheatGluten": "Trigo/gluten",
  "allergen.soy": "Soja",
  "allergen.mango": "Mango",
  "allergen.mustard": "Mostaza",
  "allergen.sulfites": "Sulfitos",
  "history.title": "Historial",
  "history.noScansTitle": "Aún no hay escaneos",
  "history.noScansBody": "Los escaneos que guardes en este dispositivo aparecerán aquí.",
  "history.noObviousRisks": "Sin riesgos obvios",
  "history.risksFound": "{count} riesgos encontrados",
  "history.deleteScan": "Borrar",
  "settings.subscription": "Suscripción",
  "settings.language": "Idioma",
  "settings.safetyDisclaimer": "Aviso de seguridad",
  "settings.clearScanHistory": "Borrar historial ({count})",
  "settings.helpSupport": "Ayuda / soporte",
  "settings.logout": "CERRAR SESIÓN",
  "settings.clearHistoryTitle": "¿Borrar historial?",
  "settings.clearHistoryBody": "Esto solo borra los escaneos guardados en este dispositivo.",
  "settings.cancel": "Cancelar",
  "settings.clear": "Borrar",
  "subscription.title": "Sift Premium",
  "subscription.body":
    "Mejora el escaneo de menús con herramientas más completas para mayor tranquilidad.",
  "subscription.currentPlan": "Plan actual",
  "subscription.freeMvp": "MVP gratis",
  "subscription.now": "ahora",
  "subscription.plans": "Planes",
  "subscription.free": "Gratis",
  "subscription.plus": "Plus",
  "subscription.premium": "Premium",
  "subscription.family": "Familia",
  "subscription.freePrice": "$0",
  "subscription.plusPrice": "$4.99/mes",
  "subscription.premiumPrice": "$8.99/mes",
  "subscription.familyPrice": "$12.99/mes",
  "subscription.freeBody": "3 escaneos/mes, 1 perfil, tarjetas de riesgo básicas e historial local reciente.",
  "subscription.plusBody": "50 escaneos/mes, historial local completo, tarjetas de traducción y detalles más completos.",
  "subscription.premiumBody": "200 escaneos/mes, modo viaje, tarjetas sin conexión, exportación y análisis avanzado.",
  "subscription.familyBody": "500 escaneos/mes, perfiles familiares, perfiles infantiles y tarjetas compartidas.",
  "subscription.unavailable": "No disponible por ahora",
  "subscription.current": "Actual",
  "subscription.questions": "¿Tienes preguntas sobre tu plan?",
  "subscription.supportCenter": "Visitar el centro de ayuda",
  "language.title": "Idioma",
  "language.body":
    "Elige el idioma que Sift debe usar en la app. El idioma del restaurante queda en tu perfil de alergias.",
  "language.appLanguage": "Idioma de la app",
  "language.appLanguageBody": "El idioma principal para navegación y menús.",
  "language.restaurantLanguage": "Idioma del restaurante",
  "language.restaurantLanguageBody": "Se usa para mensajes al restaurante. Elige No estoy seguro si aún no lo sabes.",
  "language.notSure": "No estoy seguro",
  "language.english": "Inglés",
  "language.spanish": "Español",
  "language.french": "Francés",
  "language.italian": "Italiano",
  "language.japanese": "Japonés",
  "language.german": "Alemán",
  "language.korean": "Coreano",
  "language.chineseSimplified": "Chino simplificado",
  "language.chineseTraditional": "Chino tradicional",
  "language.portuguese": "Portugués",
  "language.thai": "Tailandés",
  "language.comingSoon": "Próximamente",
  "safety.title": "Aviso de seguridad",
  "safety.body": "Lee esto con cuidado antes de usar Sift para decidir sobre menús.",
  "safety.visibleTitle": "1. Solo texto visible del menú",
  "safety.visibleBody":
    "Sift analiza el texto visible del menú y patrones comunes de ingredientes. No puede confirmar ingredientes completos, preparación, sustituciones ni contacto cruzado.",
  "safety.confirmTitle": "2. Confirma con el personal",
  "safety.confirmBody":
    "Confirma siempre con el personal del restaurante, especialmente si tus alergias son graves. Pregunta por salsas, aceites, caldos, marinados, guarniciones, freidoras y equipo compartido.",
  "safety.callout":
    "Sift nunca garantiza que un plato sea seguro. Te ayuda a saber qué preguntar antes de pedir.",
  "safety.medicalTitle": "3. No es consejo médico",
  "safety.medicalBody":
    "Sift es un copiloto para menús y alergias, no un dispositivo médico, doctor, restaurante ni certificador de seguridad alimentaria.",
  "safety.responsibilityTitle": "4. Tu responsabilidad",
  "safety.responsibilityBody":
    "Tú decides qué pedir y si la confirmación del restaurante es suficiente para tus necesidades de alergia.",
  "safety.understand": "Entiendo",
  "help.title": "Ayuda y soporte",
  "help.body": "¿Cómo podemos ayudarte hoy?",
  "help.faq": "Preguntas frecuentes",
  "help.faqBody": "Encuentra respuestas rápidas a problemas comunes.",
  "help.contact": "Contactar soporte",
  "help.contactBody": "Comunícate directamente con nuestro equipo.",
  "help.feedback": "Enviar comentarios",
  "help.feedbackBody": "Ayúdanos a mejorar tu experiencia con Sift.",
  "help.openError": "No pudimos abrir este enlace en tu dispositivo.",
  "help.emailFeedbackTitle": "Enviar comentarios",
  "help.emailSupportTitle": "Enviar email a soporte",
  "help.feedbackSubject": "Comentarios sobre Sift",
  "help.feedbackBodyTemplate":
    "¿Qué ocurrió?\n\n¿Qué te gustaría que Sift mejorara?\n\nDispositivo/versión de la app si aplica:\n",
  "help.supportSubject": "Solicitud de soporte de Sift",
  "help.supportModalTitle": "Contactar soporte",
  "help.supportModalBody":
    "Escríbenos a support@siftallergy.app. Normalmente respondemos en 2-5 días laborables.",
  "help.emailSupport": "Enviar email a soporte"
} satisfies Record<TranslationKey, string>;

const fr = {
  ...en,
  "common.back": "Retour",
  "common.close": "Fermer",
  "nav.home": "Accueil",
  "nav.history": "Historique",
  "nav.profile": "Profil",
  "home.title": "Accueil",
  "home.openSettings": "Ouvrir les réglages",
  "home.activeFilters": "Filtres actifs",
  "home.createProfileTitle": "Créer un profil d'allergies",
  "home.createProfileBody":
    "Sift a besoin de vos allergies et de leur gravité pour structurer les risques du menu.",
  "home.editProfile": "Modifier le profil",
  "home.scanMenu": "Scanner le menu",
  "home.scanBody": "Analyser les ingrédients instantanément",
  "home.uploadPhoto": "Importer une photo",
  "home.recentScans": "Scans récents",
  "home.viewAll": "Tout voir",
  "home.menuScan": "Scan de menu",
  "home.emptyRecent": "Les scans enregistrés sur cet appareil apparaîtront ici.",
  "profile.title": "Profil d'allergies",
  "profile.body": "Choisissez les allergies et leur gravité. Sift utilise ce profil pour scanner les menus et préparer les questions.",
  "profile.savedProfiles": "Profils enregistrés",
  "profile.new": "Nouveau",
  "profile.profileFallback": "Profil",
  "profile.deleteProfileTitle": "Supprimer le profil ?",
  "profile.deleteProfileBody": "Supprimer {name} de cet appareil ?",
  "profile.allergiesCount": "{count} allergies",
  "profile.profileName": "Nom du profil",
  "profile.yourLanguage": "Votre langue",
  "profile.restaurantLanguage": "Langue du restaurant",
  "profile.commonAllergens": "Allergènes courants",
  "profile.selectedCount": "{count} sélectionnés",
  "profile.severityMeta": "Gravité {severity}",
  "profile.crossContactMeta": "contact croisé",
  "profile.customDetails": "Détails personnalisés",
  "profile.customDetailsPlaceholder": "Huile d'arachide, huile de sésame, traces, friteuse partagée...",
  "profile.customAllergen": "Allergène personnalisé",
  "profile.add": "Ajouter",
  "profile.selectedDetails": "Allergies sélectionnées",
  "profile.crossContactSensitive": "Sensible au contact croisé",
  "profile.crossContactBody": "Demander les équipements et préparations partagés.",
  "profile.customDetailsLongPlaceholder": "Détails personnalisés, comme huiles, traces ou formes tolérées",
  "profile.saveProfile": "Enregistrer le profil",
  "profile.savedToast": "Profil d'allergies enregistré",
  "severity.mild": "Légère",
  "severity.moderate": "Modérée",
  "severity.severe": "Sévère",
  "allergen.peanut": "Arachide",
  "allergen.treeNuts": "Fruits à coque",
  "allergen.sesame": "Sésame",
  "allergen.shellfish": "Crustacés",
  "allergen.fish": "Poisson",
  "allergen.dairy": "Produits laitiers",
  "allergen.egg": "Œuf",
  "allergen.wheatGluten": "Blé/gluten",
  "allergen.soy": "Soja",
  "allergen.mango": "Mangue",
  "allergen.mustard": "Moutarde",
  "allergen.sulfites": "Sulfites",
  "history.title": "Historique",
  "history.noScansTitle": "Aucun scan pour le moment",
  "history.noScansBody": "Les scans enregistrés sur cet appareil apparaîtront ici.",
  "history.noObviousRisks": "Aucun risque évident",
  "history.risksFound": "{count} risques trouvés",
  "history.deleteScan": "Supprimer",
  "settings.subscription": "Abonnement",
  "settings.language": "Langue",
  "settings.safetyDisclaimer": "Avertissement de sécurité",
  "settings.clearScanHistory": "Effacer l'historique ({count})",
  "settings.helpSupport": "Aide / support",
  "settings.logout": "DÉCONNEXION",
  "settings.clearHistoryTitle": "Effacer l'historique ?",
  "settings.clearHistoryBody": "Cela efface uniquement les scans enregistrés sur cet appareil.",
  "settings.cancel": "Annuler",
  "settings.clear": "Effacer",
  "subscription.body":
    "Améliorez l'analyse des menus avec des outils plus complets conçus pour plus de tranquillité.",
  "subscription.currentPlan": "Forfait actuel",
  "subscription.freeMvp": "MVP gratuit",
  "subscription.now": "maintenant",
  "subscription.plans": "Forfaits",
  "subscription.free": "Gratuit",
  "subscription.family": "Famille",
  "subscription.plusPrice": "4,99 $/mois",
  "subscription.premiumPrice": "8,99 $/mois",
  "subscription.familyPrice": "12,99 $/mois",
  "subscription.freeBody": "3 scans/mois, 1 profil, cartes de risque simples et historique local récent.",
  "subscription.plusBody": "50 scans/mois, historique local complet, cartes de traduction et détails plus riches.",
  "subscription.premiumBody": "200 scans/mois, mode voyage, cartes hors ligne, exportation et analyse avancée.",
  "subscription.familyBody": "500 scans/mois, plusieurs profils familiaux, profils enfants et cartes partagées.",
  "subscription.unavailable": "Indisponible pour le moment",
  "subscription.current": "Actuel",
  "subscription.questions": "Des questions sur votre forfait ?",
  "subscription.supportCenter": "Visiter le centre d'aide",
  "language.title": "Langue",
  "language.body":
    "Choisissez la langue utilisée par Sift dans l'app. La langue du restaurant reste dans votre profil d'allergies.",
  "language.appLanguage": "Langue de l'app",
  "language.appLanguageBody": "La langue principale pour la navigation et les menus.",
  "language.restaurantLanguage": "Langue du restaurant",
  "language.restaurantLanguageBody": "Utilisée pour les messages destinés au restaurant. Choisissez Pas sûr si vous ne savez pas encore.",
  "language.notSure": "Pas sûr",
  "language.english": "Anglais",
  "language.spanish": "Espagnol",
  "language.french": "Français",
  "language.italian": "Italien",
  "language.japanese": "Japonais",
  "language.german": "Allemand",
  "language.korean": "Coréen",
  "language.chineseSimplified": "Chinois simplifié",
  "language.chineseTraditional": "Chinois traditionnel",
  "language.portuguese": "Portugais",
  "language.thai": "Thaï",
  "language.comingSoon": "Bientôt disponible",
  "safety.title": "Avertissement de sécurité",
  "safety.body": "Veuillez lire attentivement avant d'utiliser Sift pour vos décisions au restaurant.",
  "safety.visibleTitle": "1. Texte visible du menu uniquement",
  "safety.visibleBody":
    "Sift analyse le texte visible du menu et les schémas d'ingrédients courants. Il ne peut pas confirmer les ingrédients complets, la préparation, les substitutions ni le contact croisé.",
  "safety.confirmTitle": "2. Confirmer avec le personnel",
  "safety.confirmBody":
    "Confirmez toujours avec le personnel du restaurant, surtout pour les allergies graves. Demandez des précisions sur les sauces, huiles, bouillons, marinades, garnitures, friteuses et équipements partagés.",
  "safety.callout":
    "Sift ne garantit jamais qu'un plat est sûr. Il vous aide à savoir quoi demander avant de commander.",
  "safety.medicalTitle": "3. Pas un avis médical",
  "safety.medicalBody":
    "Sift est un copilote pour les menus et allergies, pas un dispositif médical, un médecin, un restaurant ni un certificateur de sécurité alimentaire.",
  "safety.responsibilityTitle": "4. Votre responsabilité",
  "safety.responsibilityBody":
    "Vous décidez quoi commander et si la confirmation du restaurant suffit à vos besoins liés aux allergies.",
  "safety.understand": "Je comprends",
  "help.title": "Aide et support",
  "help.body": "Comment pouvons-nous vous aider aujourd'hui ?",
  "help.faq": "Questions fréquentes",
  "help.faqBody": "Trouvez rapidement des réponses aux problèmes courants.",
  "help.contact": "Contacter le support",
  "help.contactBody": "Contactez directement notre équipe.",
  "help.feedback": "Envoyer un commentaire",
  "help.feedbackBody": "Aidez-nous à améliorer votre expérience Sift.",
  "help.openError": "Impossible d'ouvrir ce lien sur votre appareil.",
  "help.emailFeedbackTitle": "Envoyer un commentaire",
  "help.emailSupportTitle": "Envoyer un email au support",
  "help.feedbackSubject": "Commentaire Sift",
  "help.feedbackBodyTemplate":
    "Que s'est-il passé ?\n\nQue souhaitez-vous voir amélioré dans Sift ?\n\nAppareil/version de l'app si utile :\n",
  "help.supportSubject": "Demande de support Sift",
  "help.supportModalTitle": "Contacter le support",
  "help.supportModalBody":
    "Écrivez-nous à support@siftallergy.app. Nous répondons généralement sous 2 à 5 jours ouvrés.",
  "help.emailSupport": "Envoyer un email"
} satisfies Record<TranslationKey, string>;

const it = {
  ...en,
  "common.back": "Indietro",
  "common.close": "Chiudi",
  "nav.home": "Home",
  "nav.history": "Cronologia",
  "nav.profile": "Profilo",
  "home.title": "Home",
  "home.openSettings": "Apri impostazioni",
  "home.activeFilters": "Filtri attivi",
  "home.createProfileTitle": "Crea un profilo allergie",
  "home.createProfileBody":
    "Sift ha bisogno delle tue allergie e della loro gravità prima di strutturare i rischi del menu.",
  "home.editProfile": "Modifica profilo",
  "home.scanMenu": "Scansiona menu",
  "home.scanBody": "Analizza subito gli ingredienti",
  "home.uploadPhoto": "Carica foto",
  "home.recentScans": "Scansioni recenti",
  "home.viewAll": "Vedi tutto",
  "home.menuScan": "Scansione menu",
  "home.emptyRecent": "Le scansioni salvate su questo dispositivo appariranno qui.",
  "profile.title": "Profilo allergie",
  "profile.body": "Scegli allergie e gravità. Sift usa questo profilo per scansionare menu e preparare domande.",
  "profile.savedProfiles": "Profili salvati",
  "profile.new": "Nuovo",
  "profile.profileFallback": "Profilo",
  "profile.deleteProfileTitle": "Eliminare il profilo?",
  "profile.deleteProfileBody": "Eliminare {name} da questo dispositivo?",
  "profile.allergiesCount": "{count} allergie",
  "profile.profileName": "Nome profilo",
  "profile.yourLanguage": "La tua lingua",
  "profile.restaurantLanguage": "Lingua del ristorante",
  "profile.commonAllergens": "Allergeni comuni",
  "profile.selectedCount": "{count} selezionati",
  "profile.severityMeta": "Gravità {severity}",
  "profile.crossContactMeta": "contatto crociato",
  "profile.customDetails": "Dettagli personalizzati",
  "profile.customDetailsPlaceholder": "Olio di arachidi, olio di sesamo, tracce, friggitrice condivisa...",
  "profile.customAllergen": "Allergene personalizzato",
  "profile.add": "Aggiungi",
  "profile.selectedDetails": "Allergie selezionate",
  "profile.crossContactSensitive": "Sensibile al contatto crociato",
  "profile.crossContactBody": "Chiedi di attrezzature e preparazione condivise.",
  "profile.customDetailsLongPlaceholder": "Dettagli personalizzati, come oli, tracce o forme tollerate",
  "profile.saveProfile": "Salva profilo",
  "profile.savedToast": "Profilo allergie salvato",
  "severity.mild": "Lieve",
  "severity.moderate": "Moderata",
  "severity.severe": "Grave",
  "allergen.peanut": "Arachidi",
  "allergen.treeNuts": "Frutta a guscio",
  "allergen.sesame": "Sesamo",
  "allergen.shellfish": "Crostacei",
  "allergen.fish": "Pesce",
  "allergen.dairy": "Latticini",
  "allergen.egg": "Uovo",
  "allergen.wheatGluten": "Grano/glutine",
  "allergen.soy": "Soia",
  "allergen.mango": "Mango",
  "allergen.mustard": "Senape",
  "allergen.sulfites": "Solfiti",
  "history.title": "Cronologia",
  "history.noScansTitle": "Nessuna scansione",
  "history.noScansBody": "Le scansioni salvate su questo dispositivo appariranno qui.",
  "history.noObviousRisks": "Nessun rischio evidente",
  "history.risksFound": "{count} rischi trovati",
  "history.deleteScan": "Elimina",
  "settings.subscription": "Abbonamento",
  "settings.language": "Lingua",
  "settings.safetyDisclaimer": "Avviso di sicurezza",
  "settings.clearScanHistory": "Cancella cronologia ({count})",
  "settings.helpSupport": "Aiuto / supporto",
  "settings.logout": "ESCI",
  "settings.clearHistoryTitle": "Cancellare la cronologia?",
  "settings.clearHistoryBody": "Questo cancella solo le scansioni salvate su questo dispositivo.",
  "settings.cancel": "Annulla",
  "settings.clear": "Cancella",
  "subscription.body":
    "Potenzia la scansione dei menu con strumenti più approfonditi pensati per la tranquillità.",
  "subscription.currentPlan": "Piano attuale",
  "subscription.freeMvp": "MVP gratuito",
  "subscription.now": "ora",
  "subscription.plans": "Piani",
  "subscription.free": "Gratis",
  "subscription.family": "Famiglia",
  "subscription.plusPrice": "$4.99/mese",
  "subscription.premiumPrice": "$8.99/mese",
  "subscription.familyPrice": "$12.99/mese",
  "subscription.freeBody": "3 scansioni/mese, 1 profilo, schede rischio base e cronologia locale recente.",
  "subscription.plusBody": "50 scansioni/mese, cronologia locale completa, schede traduzione e dettagli più ricchi.",
  "subscription.premiumBody": "200 scansioni/mese, modalità viaggio, schede offline, esportazione e analisi avanzata.",
  "subscription.familyBody": "500 scansioni/mese, più profili familiari, profili bambini e schede condivise.",
  "subscription.unavailable": "Non disponibile al momento",
  "subscription.current": "Attuale",
  "subscription.questions": "Domande sul tuo piano?",
  "subscription.supportCenter": "Visita il centro assistenza",
  "language.title": "Lingua",
  "language.body":
    "Scegli la lingua che Sift deve usare nell'app. La lingua del ristorante resta nel tuo profilo allergie.",
  "language.appLanguage": "Lingua dell'app",
  "language.appLanguageBody": "La lingua principale per navigazione e menu.",
  "language.restaurantLanguage": "Lingua del ristorante",
  "language.restaurantLanguageBody": "Usata per i messaggi rivolti al ristorante. Scegli Non sono sicuro se non lo sai ancora.",
  "language.notSure": "Non sono sicuro",
  "language.english": "Inglese",
  "language.spanish": "Spagnolo",
  "language.french": "Francese",
  "language.italian": "Italiano",
  "language.japanese": "Giapponese",
  "language.german": "Tedesco",
  "language.korean": "Coreano",
  "language.chineseSimplified": "Cinese semplificato",
  "language.chineseTraditional": "Cinese tradizionale",
  "language.portuguese": "Portoghese",
  "language.thai": "Thailandese",
  "language.comingSoon": "Presto disponibile",
  "safety.title": "Avviso di sicurezza",
  "safety.body": "Leggi attentamente prima di usare Sift per decidere cosa ordinare.",
  "safety.visibleTitle": "1. Solo testo visibile del menu",
  "safety.visibleBody":
    "Sift analizza il testo visibile del menu e schemi comuni di ingredienti. Non può confermare ingredienti completi, preparazione, sostituzioni o contatto crociato.",
  "safety.confirmTitle": "2. Conferma con il personale",
  "safety.confirmBody":
    "Conferma sempre con il personale del ristorante, soprattutto per allergie gravi. Chiedi di salse, oli, brodi, marinature, guarnizioni, friggitrici e attrezzature condivise.",
  "safety.callout":
    "Sift non garantisce mai che un piatto sia sicuro. Ti aiuta a sapere cosa chiedere prima di ordinare.",
  "safety.medicalTitle": "3. Non è un consiglio medico",
  "safety.medicalBody":
    "Sift è un copilota per menu e allergie, non un dispositivo medico, un medico, un ristorante o un certificatore di sicurezza alimentare.",
  "safety.responsibilityTitle": "4. La tua responsabilità",
  "safety.responsibilityBody":
    "Sei tu a decidere cosa ordinare e se la conferma del ristorante è sufficiente per le tue esigenze allergiche.",
  "safety.understand": "Ho capito",
  "help.title": "Aiuto e supporto",
  "help.body": "Come possiamo aiutarti oggi?",
  "help.faq": "Domande frequenti",
  "help.faqBody": "Trova risposte rapide ai problemi comuni.",
  "help.contact": "Contatta supporto",
  "help.contactBody": "Contatta direttamente il nostro team.",
  "help.feedback": "Invia feedback",
  "help.feedbackBody": "Aiutaci a migliorare la tua esperienza con Sift.",
  "help.openError": "Non siamo riusciti ad aprire questo link sul dispositivo.",
  "help.emailFeedbackTitle": "Invia feedback",
  "help.emailSupportTitle": "Email al supporto",
  "help.feedbackSubject": "Feedback Sift",
  "help.feedbackBodyTemplate":
    "Cosa è successo?\n\nCosa vorresti che Sift migliorasse?\n\nDispositivo/versione app se rilevante:\n",
  "help.supportSubject": "Richiesta supporto Sift",
  "help.supportModalTitle": "Contatta supporto",
  "help.supportModalBody":
    "Scrivici a support@siftallergy.app. Di solito rispondiamo entro 2-5 giorni lavorativi.",
  "help.emailSupport": "Email al supporto"
} satisfies Record<TranslationKey, string>;

const ja = {
  ...en,
  "common.back": "戻る",
  "common.close": "閉じる",
  "nav.home": "ホーム",
  "nav.history": "履歴",
  "nav.profile": "プロフィール",
  "home.title": "ホーム",
  "home.openSettings": "設定を開く",
  "home.activeFilters": "有効なフィルター",
  "home.createProfileTitle": "アレルギープロフィールを作成",
  "home.createProfileBody":
    "Siftがメニューのリスクを整理するには、アレルギーと重症度が必要です。",
  "home.editProfile": "プロフィールを編集",
  "home.scanMenu": "メニューをスキャン",
  "home.scanBody": "食材をすぐに分析",
  "home.uploadPhoto": "写真をアップロード",
  "home.recentScans": "最近のスキャン",
  "home.viewAll": "すべて表示",
  "home.menuScan": "メニュースキャン",
  "home.emptyRecent": "この端末に保存したスキャンがここに表示されます。",
  "profile.title": "アレルギープロフィール",
  "profile.body": "アレルギーと重症度を選択します。Siftはこのプロフィールを使ってメニューをスキャンし、質問を準備します。",
  "profile.savedProfiles": "保存済みプロフィール",
  "profile.new": "新規",
  "profile.profileFallback": "プロフィール",
  "profile.deleteProfileTitle": "プロフィールを削除しますか？",
  "profile.deleteProfileBody": "この端末から{name}を削除しますか？",
  "profile.allergiesCount": "アレルギー {count}件",
  "profile.profileName": "プロフィール名",
  "profile.yourLanguage": "あなたの言語",
  "profile.restaurantLanguage": "レストランの言語",
  "profile.commonAllergens": "一般的なアレルゲン",
  "profile.selectedCount": "{count}件選択",
  "profile.severityMeta": "重症度: {severity}",
  "profile.crossContactMeta": "交差接触",
  "profile.customDetails": "詳細メモ",
  "profile.customDetailsPlaceholder": "ピーナッツ油、ごま油、微量、共用フライヤーなど",
  "profile.customAllergen": "カスタムアレルゲン",
  "profile.add": "追加",
  "profile.selectedDetails": "選択したアレルギー",
  "profile.crossContactSensitive": "交差接触に敏感",
  "profile.crossContactBody": "共用器具や調理場所について質問します。",
  "profile.customDetailsLongPlaceholder": "油、微量、許容できる形などの詳細",
  "profile.saveProfile": "プロフィールを保存",
  "profile.savedToast": "アレルギープロフィールを保存しました",
  "severity.mild": "軽度",
  "severity.moderate": "中等度",
  "severity.severe": "重度",
  "allergen.peanut": "ピーナッツ",
  "allergen.treeNuts": "木の実",
  "allergen.sesame": "ごま",
  "allergen.shellfish": "甲殻類",
  "allergen.fish": "魚",
  "allergen.dairy": "乳製品",
  "allergen.egg": "卵",
  "allergen.wheatGluten": "小麦/グルテン",
  "allergen.soy": "大豆",
  "allergen.mango": "マンゴー",
  "allergen.mustard": "マスタード",
  "allergen.sulfites": "亜硫酸塩",
  "history.title": "スキャン履歴",
  "history.noScansTitle": "まだスキャンはありません",
  "history.noScansBody": "この端末に保存したスキャンがここに表示されます。",
  "history.noObviousRisks": "明らかなリスクなし",
  "history.risksFound": "{count}件のリスク",
  "history.deleteScan": "削除",
  "settings.subscription": "サブスクリプション",
  "settings.language": "言語",
  "settings.safetyDisclaimer": "安全に関する注意",
  "settings.clearScanHistory": "履歴を消去（{count}）",
  "settings.helpSupport": "ヘルプ / サポート",
  "settings.logout": "ログアウト",
  "settings.clearHistoryTitle": "スキャン履歴を消去しますか？",
  "settings.clearHistoryBody": "この端末に保存されたスキャンのみ削除されます。",
  "settings.cancel": "キャンセル",
  "settings.clear": "消去",
  "subscription.title": "Sift Premium",
  "subscription.body":
    "より詳しいツールでメニュースキャンを強化し、安心して確認できるようにします。",
  "subscription.currentPlan": "現在のプラン",
  "subscription.freeMvp": "無料MVP",
  "subscription.now": "現在",
  "subscription.plans": "プラン",
  "subscription.free": "無料",
  "subscription.family": "ファミリー",
  "subscription.plusPrice": "$4.99/月",
  "subscription.premiumPrice": "$8.99/月",
  "subscription.familyPrice": "$12.99/月",
  "subscription.freeBody": "月3回のスキャン、1プロフィール、基本リスクカード、最近のローカル履歴。",
  "subscription.plusBody": "月50回のスキャン、完全なローカル履歴、翻訳カード、より詳しい料理情報。",
  "subscription.premiumBody": "月200回のスキャン、旅行モード、オフラインカード、エクスポート、高度なリスク詳細。",
  "subscription.familyBody": "月500回のスキャン、複数の家族プロフィール、子ども用プロフィール、共有カード。",
  "subscription.unavailable": "現在利用できません",
  "subscription.current": "現在",
  "subscription.questions": "プランについて質問がありますか？",
  "subscription.supportCenter": "サポートセンターへ",
  "language.title": "言語",
  "language.body":
    "Siftがアプリ内で使用する言語を選択します。レストラン向け言語はアレルギープロフィールに保存されます。",
  "language.appLanguage": "アプリの言語",
  "language.appLanguageBody": "ナビゲーションとメニューで使う主な言語です。",
  "language.restaurantLanguage": "レストランの言語",
  "language.restaurantLanguageBody": "レストラン向けメッセージに使用します。まだ分からない場合は「不明」を選んでください。",
  "language.notSure": "不明",
  "language.english": "英語",
  "language.spanish": "スペイン語",
  "language.french": "フランス語",
  "language.italian": "イタリア語",
  "language.japanese": "日本語",
  "language.german": "ドイツ語",
  "language.korean": "韓国語",
  "language.chineseSimplified": "簡体字中国語",
  "language.chineseTraditional": "繁体字中国語",
  "language.portuguese": "ポルトガル語",
  "language.thai": "タイ語",
  "language.comingSoon": "近日対応予定",
  "safety.title": "安全に関する注意",
  "safety.body": "Siftをメニュー判断に使う前に、注意事項をお読みください。",
  "safety.visibleTitle": "1. 目に見えるメニュー文字のみ",
  "safety.visibleBody":
    "Siftは目に見えるメニュー文字と一般的な食材パターンを分析します。全成分、調理方法、代替、交差接触は確認できません。",
  "safety.confirmTitle": "2. 店員に確認してください",
  "safety.confirmBody":
    "特に重いアレルギーがある場合は、必ず店員に確認してください。ソース、油、スープ、マリネ、付け合わせ、フライヤー、共用器具について質問してください。",
  "safety.callout":
    "Siftは料理が安全だと保証しません。注文前に何を聞くべきかを整理します。",
  "safety.medicalTitle": "3. 医療アドバイスではありません",
  "safety.medicalBody":
    "Siftはメニューとアレルギーのための補助ツールであり、医療機器、医師、レストラン、食品安全認証機関ではありません。",
  "safety.responsibilityTitle": "4. ご自身の判断",
  "safety.responsibilityBody":
    "何を注文するか、レストランの確認が十分かどうかは、ご自身で判断してください。",
  "safety.understand": "理解しました",
  "help.title": "ヘルプとサポート",
  "help.body": "今日はどのようにお手伝いできますか？",
  "help.faq": "よくある質問",
  "help.faqBody": "よくある問題への回答を確認できます。",
  "help.contact": "サポートに連絡",
  "help.contactBody": "チームに直接連絡できます。",
  "help.feedback": "フィードバックを送信",
  "help.feedbackBody": "Siftの改善にご協力ください。",
  "help.openError": "この端末でリンクを開けませんでした。",
  "help.emailFeedbackTitle": "フィードバックをメール",
  "help.emailSupportTitle": "サポートにメール",
  "help.feedbackSubject": "Siftフィードバック",
  "help.feedbackBodyTemplate":
    "何が起きましたか？\n\nSiftに改善してほしいことは何ですか？\n\n必要なら端末/アプリバージョン：\n",
  "help.supportSubject": "Siftサポート依頼",
  "help.supportModalTitle": "サポートに連絡",
  "help.supportModalBody":
    "support@siftallergy.app までメールしてください。通常2〜5営業日以内に返信します。",
  "help.emailSupport": "サポートにメール"
} satisfies Record<TranslationKey, string>;

const de = {
  ...en,
  "common.back": "Zurück",
  "common.close": "Schließen",
  "nav.home": "Start",
  "nav.history": "Verlauf",
  "nav.profile": "Profil",
  "home.title": "Start",
  "home.openSettings": "Einstellungen öffnen",
  "home.activeFilters": "Aktive Filter",
  "home.createProfileTitle": "Allergieprofil erstellen",
  "home.createProfileBody":
    "Sift benötigt deine Allergien und Schweregrade, bevor es Menürisiken strukturieren kann.",
  "home.editProfile": "Profil bearbeiten",
  "home.scanMenu": "Menü scannen",
  "home.scanBody": "Zutaten sofort analysieren",
  "home.uploadPhoto": "Foto hochladen",
  "home.recentScans": "Letzte Scans",
  "home.viewAll": "Alle anzeigen",
  "home.menuScan": "Menüscan",
  "home.emptyRecent": "Scans, die du auf diesem Gerät speicherst, erscheinen hier.",
  "profile.title": "Allergieprofil",
  "profile.body": "Wähle Allergien und Schweregrad. Sift nutzt dieses Profil, um Menüs zu scannen und Fragen vorzubereiten.",
  "profile.savedProfiles": "Gespeicherte Profile",
  "profile.new": "Neu",
  "profile.profileFallback": "Profil",
  "profile.deleteProfileTitle": "Profil löschen?",
  "profile.deleteProfileBody": "{name} von diesem Gerät löschen?",
  "profile.allergiesCount": "{count} Allergien",
  "profile.profileName": "Profilname",
  "profile.yourLanguage": "Deine Sprache",
  "profile.restaurantLanguage": "Restaurantsprache",
  "profile.commonAllergens": "Häufige Allergene",
  "profile.selectedCount": "{count} ausgewählt",
  "profile.severityMeta": "Schweregrad {severity}",
  "profile.crossContactMeta": "Kreuzkontakt",
  "profile.customDetails": "Eigene Details",
  "profile.customDetailsPlaceholder": "Erdnussöl, Sesamöl, Spuren, gemeinsame Fritteuse...",
  "profile.customAllergen": "Eigenes Allergen",
  "profile.add": "Hinzufügen",
  "profile.selectedDetails": "Ausgewählte Allergien",
  "profile.crossContactSensitive": "Empfindlich bei Kreuzkontakt",
  "profile.crossContactBody": "Nach gemeinsam genutzter Ausrüstung und Vorbereitung fragen.",
  "profile.customDetailsLongPlaceholder": "Eigene Details, z. B. Öle, Spuren oder tolerierte Formen",
  "profile.saveProfile": "Profil speichern",
  "profile.savedToast": "Allergieprofil gespeichert",
  "severity.mild": "Leicht",
  "severity.moderate": "Mittel",
  "severity.severe": "Schwer",
  "allergen.peanut": "Erdnuss",
  "allergen.treeNuts": "Baumnüsse",
  "allergen.sesame": "Sesam",
  "allergen.shellfish": "Schalentiere",
  "allergen.fish": "Fisch",
  "allergen.dairy": "Milchprodukte",
  "allergen.egg": "Ei",
  "allergen.wheatGluten": "Weizen/Gluten",
  "allergen.soy": "Soja",
  "allergen.mango": "Mango",
  "allergen.mustard": "Senf",
  "allergen.sulfites": "Sulfite",
  "history.title": "Scan-Verlauf",
  "history.noScansTitle": "Noch keine Scans",
  "history.noScansBody": "Scans, die du auf diesem Gerät speicherst, erscheinen hier.",
  "history.noObviousRisks": "Keine offensichtlichen Risiken",
  "history.risksFound": "{count} Risiken gefunden",
  "history.deleteScan": "Löschen",
  "settings.subscription": "Abo",
  "settings.language": "Sprache",
  "settings.safetyDisclaimer": "Sicherheitshinweis",
  "settings.clearScanHistory": "Scan-Verlauf löschen ({count})",
  "settings.helpSupport": "Hilfe / Support",
  "settings.logout": "ABMELDEN",
  "settings.clearHistoryTitle": "Scan-Verlauf löschen?",
  "settings.clearHistoryBody": "Dies löscht nur gespeicherte Scans auf diesem Gerät.",
  "settings.cancel": "Abbrechen",
  "settings.clear": "Löschen",
  "subscription.body":
    "Verbessere Menüscans mit tieferen Werkzeugen für mehr Sicherheit beim Nachfragen.",
  "subscription.currentPlan": "Aktueller Plan",
  "subscription.freeMvp": "Kostenloses MVP",
  "subscription.now": "jetzt",
  "subscription.plans": "Pläne",
  "subscription.free": "Kostenlos",
  "subscription.family": "Familie",
  "subscription.plusPrice": "4,99 $/Monat",
  "subscription.premiumPrice": "8,99 $/Monat",
  "subscription.familyPrice": "12,99 $/Monat",
  "subscription.freeBody": "3 Scans/Monat, 1 Profil, einfache Risikokarten und aktueller lokaler Verlauf.",
  "subscription.plusBody": "50 Scans/Monat, vollständiger lokaler Verlauf, Übersetzungskarten und mehr Details.",
  "subscription.premiumBody": "200 Scans/Monat, Reisemodus, Offline-Karten, Export und erweiterte Risikoanalyse.",
  "subscription.familyBody": "500 Scans/Monat, mehrere Familienprofile, Kinderprofile und geteilte Allergiekarten.",
  "subscription.unavailable": "Derzeit nicht verfügbar",
  "subscription.current": "Aktuell",
  "subscription.questions": "Fragen zu deinem Plan?",
  "subscription.supportCenter": "Support-Center besuchen",
  "language.title": "Sprache",
  "language.body":
    "Wähle die Sprache, die Sift in der App verwenden soll. Die Restaurantsprache bleibt in deinem Allergieprofil.",
  "language.appLanguage": "App-Sprache",
  "language.appLanguageBody": "Die Hauptsprache für Navigation und Menüs.",
  "language.restaurantLanguage": "Restaurantsprache",
  "language.restaurantLanguageBody": "Wird für Nachrichten an das Restaurant verwendet. Wähle Nicht sicher, wenn du es noch nicht weißt.",
  "language.notSure": "Nicht sicher",
  "language.english": "Englisch",
  "language.spanish": "Spanisch",
  "language.french": "Französisch",
  "language.italian": "Italienisch",
  "language.japanese": "Japanisch",
  "language.german": "Deutsch",
  "language.korean": "Koreanisch",
  "language.chineseSimplified": "Chinesisch vereinfacht",
  "language.chineseTraditional": "Chinesisch traditionell",
  "language.portuguese": "Portugiesisch",
  "language.thai": "Thailändisch",
  "language.comingSoon": "Bald verfügbar",
  "safety.title": "Sicherheitshinweis",
  "safety.body": "Bitte sorgfältig lesen, bevor du Sift für Menüentscheidungen verwendest.",
  "safety.visibleTitle": "1. Nur sichtbarer Menütext",
  "safety.visibleBody":
    "Sift analysiert sichtbaren Menütext und häufige Zutatenmuster. Es kann vollständige Zutaten, Zubereitung, Ersatzprodukte oder Kreuzkontakt nicht bestätigen.",
  "safety.confirmTitle": "2. Beim Personal bestätigen",
  "safety.confirmBody":
    "Bestätige immer beim Restaurantpersonal, besonders bei schweren Allergien. Frage nach Saucen, Ölen, Brühen, Marinaden, Garnituren, Fritteusen und gemeinsam genutzter Ausrüstung.",
  "safety.callout":
    "Sift garantiert nie, dass ein Gericht sicher ist. Es hilft dir zu wissen, was du vor der Bestellung fragen solltest.",
  "safety.medicalTitle": "3. Kein medizinischer Rat",
  "safety.medicalBody":
    "Sift ist ein Copilot für Menüs und Allergien, kein Medizinprodukt, Arzt, Restaurant oder Lebensmittelsicherheits-Zertifizierer.",
  "safety.responsibilityTitle": "4. Deine Verantwortung",
  "safety.responsibilityBody":
    "Du entscheidest, was du bestellst und ob die Bestätigung des Restaurants für deine Allergiebedürfnisse ausreicht.",
  "safety.understand": "Ich verstehe",
  "help.title": "Hilfe und Support",
  "help.body": "Wie können wir dir heute helfen?",
  "help.faq": "Häufige Fragen",
  "help.faqBody": "Finde schnelle Antworten auf häufige Probleme.",
  "help.contact": "Support kontaktieren",
  "help.contactBody": "Kontaktiere unser Team direkt.",
  "help.feedback": "Feedback senden",
  "help.feedbackBody": "Hilf uns, dein Sift-Erlebnis zu verbessern.",
  "help.openError": "Wir konnten diesen Link auf deinem Gerät nicht öffnen.",
  "help.emailFeedbackTitle": "Feedback per E-Mail",
  "help.emailSupportTitle": "Support per E-Mail",
  "help.feedbackSubject": "Sift Feedback",
  "help.feedbackBodyTemplate":
    "Was ist passiert?\n\nWas sollte Sift verbessern?\n\nGerät/App-Version, falls relevant:\n",
  "help.supportSubject": "Sift Supportanfrage",
  "help.supportModalTitle": "Support kontaktieren",
  "help.supportModalBody":
    "Schreibe uns an support@siftallergy.app. Wir antworten normalerweise innerhalb von 2-5 Werktagen.",
  "help.emailSupport": "Support mailen"
} satisfies Record<TranslationKey, string>;

const ko = {
  ...en,
  "common.back": "뒤로",
  "common.close": "닫기",
  "nav.home": "홈",
  "nav.history": "기록",
  "nav.profile": "프로필",
  "home.title": "홈",
  "home.openSettings": "설정 열기",
  "home.activeFilters": "활성 필터",
  "home.createProfileTitle": "알레르기 프로필 만들기",
  "home.createProfileBody":
    "Sift가 메뉴 위험을 정리하려면 알레르기와 심각도 정보가 필요합니다.",
  "home.editProfile": "프로필 편집",
  "home.scanMenu": "메뉴 스캔",
  "home.scanBody": "재료를 즉시 분석",
  "home.uploadPhoto": "사진 업로드",
  "home.recentScans": "최근 스캔",
  "home.viewAll": "모두 보기",
  "home.menuScan": "메뉴 스캔",
  "home.emptyRecent": "이 기기에 저장한 스캔이 여기에 표시됩니다.",
  "profile.title": "알레르기 프로필",
  "profile.body": "알레르기와 심각도를 선택하세요. Sift는 이 프로필로 메뉴를 스캔하고 질문을 준비합니다.",
  "profile.savedProfiles": "저장된 프로필",
  "profile.new": "새로 만들기",
  "profile.profileFallback": "프로필",
  "profile.deleteProfileTitle": "프로필을 삭제할까요?",
  "profile.deleteProfileBody": "이 기기에서 {name}을 삭제할까요?",
  "profile.allergiesCount": "알레르기 {count}개",
  "profile.profileName": "프로필 이름",
  "profile.yourLanguage": "내 언어",
  "profile.restaurantLanguage": "식당 언어",
  "profile.commonAllergens": "일반 알레르기 유발 식품",
  "profile.selectedCount": "{count}개 선택됨",
  "profile.severityMeta": "심각도 {severity}",
  "profile.crossContactMeta": "교차 접촉",
  "profile.customDetails": "사용자 지정 세부정보",
  "profile.customDetailsPlaceholder": "땅콩기름, 참기름, 흔적, 공용 튀김기...",
  "profile.customAllergen": "사용자 지정 알레르겐",
  "profile.add": "추가",
  "profile.selectedDetails": "선택된 알레르기",
  "profile.crossContactSensitive": "교차 접촉 민감",
  "profile.crossContactBody": "공용 장비와 준비 과정에 대해 질문합니다.",
  "profile.customDetailsLongPlaceholder": "기름, 흔적, 허용 가능한 형태 등 사용자 지정 세부정보",
  "profile.saveProfile": "프로필 저장",
  "profile.savedToast": "알레르기 프로필이 저장되었습니다",
  "severity.mild": "가벼움",
  "severity.moderate": "보통",
  "severity.severe": "심함",
  "allergen.peanut": "땅콩",
  "allergen.treeNuts": "견과류",
  "allergen.sesame": "참깨",
  "allergen.shellfish": "갑각류",
  "allergen.fish": "생선",
  "allergen.dairy": "유제품",
  "allergen.egg": "달걀",
  "allergen.wheatGluten": "밀/글루텐",
  "allergen.soy": "대두",
  "allergen.mango": "망고",
  "allergen.mustard": "겨자",
  "allergen.sulfites": "아황산염",
  "history.title": "스캔 기록",
  "history.noScansTitle": "아직 스캔이 없습니다",
  "history.noScansBody": "이 기기에 저장한 스캔이 여기에 표시됩니다.",
  "history.noObviousRisks": "명확한 위험 없음",
  "history.risksFound": "{count}개 위험 발견",
  "history.deleteScan": "삭제",
  "settings.subscription": "구독",
  "settings.language": "언어",
  "settings.safetyDisclaimer": "안전 안내",
  "settings.clearScanHistory": "스캔 기록 지우기 ({count})",
  "settings.helpSupport": "도움말 / 지원",
  "settings.logout": "로그아웃",
  "settings.clearHistoryTitle": "스캔 기록을 지울까요?",
  "settings.clearHistoryBody": "이 기기에 저장된 스캔만 삭제됩니다.",
  "settings.cancel": "취소",
  "settings.clear": "지우기",
  "subscription.body":
    "더 깊이 있는 도구로 메뉴 스캔을 강화하고 안심하고 확인하세요.",
  "subscription.currentPlan": "현재 플랜",
  "subscription.freeMvp": "무료 MVP",
  "subscription.now": "현재",
  "subscription.plans": "플랜",
  "subscription.free": "무료",
  "subscription.family": "가족",
  "subscription.plusPrice": "$4.99/월",
  "subscription.premiumPrice": "$8.99/월",
  "subscription.familyPrice": "$12.99/월",
  "subscription.freeBody": "월 3회 스캔, 프로필 1개, 기본 위험 카드, 최근 로컬 기록.",
  "subscription.plusBody": "월 50회 스캔, 전체 로컬 기록, 번역 카드, 더 자세한 음식 정보.",
  "subscription.premiumBody": "월 200회 스캔, 여행 모드, 오프라인 카드, 내보내기, 고급 위험 분석.",
  "subscription.familyBody": "월 500회 스캔, 여러 가족 프로필, 자녀 프로필, 공유 알레르기 카드.",
  "subscription.unavailable": "현재 사용할 수 없음",
  "subscription.current": "현재",
  "subscription.questions": "플랜에 대해 궁금한 점이 있나요?",
  "subscription.supportCenter": "지원 센터 방문",
  "language.title": "언어",
  "language.body":
    "Sift가 앱에서 사용할 언어를 선택하세요. 식당 언어는 알레르기 프로필에 유지됩니다.",
  "language.appLanguage": "앱 언어",
  "language.appLanguageBody": "탐색과 메뉴에 사용되는 기본 언어입니다.",
  "language.restaurantLanguage": "식당 언어",
  "language.restaurantLanguageBody": "식당에 보여줄 메시지에 사용됩니다. 아직 모르면 잘 모르겠음을 선택하세요.",
  "language.notSure": "잘 모르겠음",
  "language.english": "영어",
  "language.spanish": "스페인어",
  "language.french": "프랑스어",
  "language.italian": "이탈리아어",
  "language.japanese": "일본어",
  "language.german": "독일어",
  "language.korean": "한국어",
  "language.chineseSimplified": "중국어 간체",
  "language.chineseTraditional": "중국어 번체",
  "language.portuguese": "포르투갈어",
  "language.thai": "태국어",
  "language.comingSoon": "곧 제공 예정",
  "safety.title": "안전 안내",
  "safety.body": "메뉴 결정을 위해 Sift를 사용하기 전에 주의 깊게 읽어 주세요.",
  "safety.visibleTitle": "1. 보이는 메뉴 텍스트만",
  "safety.visibleBody":
    "Sift는 보이는 메뉴 텍스트와 일반적인 재료 패턴을 분석합니다. 전체 재료, 조리 과정, 대체 재료 또는 교차 접촉은 확인할 수 없습니다.",
  "safety.confirmTitle": "2. 직원에게 확인하세요",
  "safety.confirmBody":
    "특히 심한 알레르기가 있다면 항상 식당 직원에게 확인하세요. 소스, 기름, 육수, 양념, 고명, 튀김기, 공용 장비에 대해 질문하세요.",
  "safety.callout":
    "Sift는 어떤 음식도 안전하다고 보장하지 않습니다. 주문 전 무엇을 물어봐야 하는지 도와줍니다.",
  "safety.medicalTitle": "3. 의료 조언이 아닙니다",
  "safety.medicalBody":
    "Sift는 메뉴와 알레르기를 위한 도우미이며 의료기기, 의사, 식당 또는 식품 안전 인증 기관이 아닙니다.",
  "safety.responsibilityTitle": "4. 사용자의 책임",
  "safety.responsibilityBody":
    "무엇을 주문할지, 식당의 확인이 알레르기 요구에 충분한지는 사용자가 결정해야 합니다.",
  "safety.understand": "이해했습니다",
  "help.title": "도움말 및 지원",
  "help.body": "오늘 무엇을 도와드릴까요?",
  "help.faq": "자주 묻는 질문",
  "help.faqBody": "일반적인 문제에 대한 빠른 답변을 확인하세요.",
  "help.contact": "지원팀에 문의",
  "help.contactBody": "팀에 직접 연락하세요.",
  "help.feedback": "피드백 보내기",
  "help.feedbackBody": "Sift 경험을 개선할 수 있도록 도와주세요.",
  "help.openError": "이 기기에서 링크를 열 수 없습니다.",
  "help.emailFeedbackTitle": "피드백 이메일",
  "help.emailSupportTitle": "지원팀 이메일",
  "help.feedbackSubject": "Sift 피드백",
  "help.feedbackBodyTemplate":
    "무슨 일이 있었나요?\n\nSift가 무엇을 개선하면 좋을까요?\n\n관련 있는 경우 기기/앱 버전:\n",
  "help.supportSubject": "Sift 지원 요청",
  "help.supportModalTitle": "지원팀에 문의",
  "help.supportModalBody":
    "support@siftallergy.app으로 이메일을 보내 주세요. 보통 영업일 기준 2-5일 안에 답변합니다.",
  "help.emailSupport": "지원팀에 이메일"
} satisfies Record<TranslationKey, string>;

const zhHans = {
  ...en,
  "common.back": "返回",
  "common.close": "关闭",
  "nav.home": "首页",
  "nav.history": "历史",
  "nav.profile": "档案",
  "home.title": "首页",
  "home.openSettings": "打开设置",
  "home.activeFilters": "当前筛查",
  "home.createProfileTitle": "创建过敏档案",
  "home.createProfileBody":
    "Sift 需要你的过敏原和严重程度，才能整理菜单风险。",
  "home.editProfile": "编辑档案",
  "home.scanMenu": "扫描菜单",
  "home.scanBody": "立即分析食材",
  "home.uploadPhoto": "上传照片",
  "home.recentScans": "最近扫描",
  "home.viewAll": "查看全部",
  "home.menuScan": "菜单扫描",
  "home.emptyRecent": "你保存在此设备上的扫描会显示在这里。",
  "profile.title": "过敏档案",
  "profile.body": "选择过敏原和严重程度。Sift 会使用此档案扫描菜单并准备问题。",
  "profile.savedProfiles": "已保存档案",
  "profile.new": "新建",
  "profile.profileFallback": "档案",
  "profile.deleteProfileTitle": "删除档案？",
  "profile.deleteProfileBody": "从此设备删除 {name}？",
  "profile.allergiesCount": "{count} 个过敏项",
  "profile.profileName": "档案名称",
  "profile.yourLanguage": "你的语言",
  "profile.restaurantLanguage": "餐厅语言",
  "profile.commonAllergens": "常见过敏原",
  "profile.selectedCount": "已选择 {count} 项",
  "profile.severityMeta": "严重程度：{severity}",
  "profile.crossContactMeta": "交叉接触",
  "profile.customDetails": "自定义详情",
  "profile.customDetailsPlaceholder": "花生油、芝麻油、微量、共用炸锅...",
  "profile.customAllergen": "自定义过敏原",
  "profile.add": "添加",
  "profile.selectedDetails": "已选过敏项",
  "profile.crossContactSensitive": "对交叉接触敏感",
  "profile.crossContactBody": "询问共用设备和准备过程。",
  "profile.customDetailsLongPlaceholder": "自定义详情，例如油、微量或可耐受形式",
  "profile.saveProfile": "保存档案",
  "profile.savedToast": "过敏档案已保存",
  "severity.mild": "轻度",
  "severity.moderate": "中度",
  "severity.severe": "严重",
  "allergen.peanut": "花生",
  "allergen.treeNuts": "树坚果",
  "allergen.sesame": "芝麻",
  "allergen.shellfish": "甲壳类",
  "allergen.fish": "鱼",
  "allergen.dairy": "乳制品",
  "allergen.egg": "鸡蛋",
  "allergen.wheatGluten": "小麦/麸质",
  "allergen.soy": "大豆",
  "allergen.mango": "芒果",
  "allergen.mustard": "芥末",
  "allergen.sulfites": "亚硫酸盐",
  "history.title": "扫描历史",
  "history.noScansTitle": "还没有扫描",
  "history.noScansBody": "你保存在此设备上的扫描会显示在这里。",
  "history.noObviousRisks": "未发现明显风险",
  "history.risksFound": "发现 {count} 个风险",
  "history.deleteScan": "删除",
  "settings.subscription": "订阅",
  "settings.language": "语言",
  "settings.safetyDisclaimer": "安全声明",
  "settings.clearScanHistory": "清除扫描历史（{count}）",
  "settings.helpSupport": "帮助 / 支持",
  "settings.logout": "退出登录",
  "settings.clearHistoryTitle": "清除扫描历史？",
  "settings.clearHistoryBody": "这只会清除此设备上保存的扫描。",
  "settings.cancel": "取消",
  "settings.clear": "清除",
  "subscription.body":
    "使用更深入的工具提升菜单扫描，让你更安心地询问。",
  "subscription.currentPlan": "当前方案",
  "subscription.freeMvp": "免费 MVP",
  "subscription.now": "当前",
  "subscription.plans": "方案",
  "subscription.free": "免费",
  "subscription.family": "家庭",
  "subscription.plusPrice": "$4.99/月",
  "subscription.premiumPrice": "$8.99/月",
  "subscription.familyPrice": "$12.99/月",
  "subscription.freeBody": "每月 3 次扫描、1 个档案、基础风险卡和最近本地历史。",
  "subscription.plusBody": "每月 50 次扫描、完整本地历史、翻译卡和更丰富的菜品详情。",
  "subscription.premiumBody": "每月 200 次扫描、旅行模式、离线卡、导出和高级风险详情。",
  "subscription.familyBody": "每月 500 次扫描、多个家庭档案、儿童档案和共享过敏卡。",
  "subscription.unavailable": "暂时不可用",
  "subscription.current": "当前",
  "subscription.questions": "对你的方案有疑问？",
  "subscription.supportCenter": "访问支持中心",
  "language.title": "语言",
  "language.body":
    "选择 Sift 在应用中使用的语言。餐厅语言会保留在你的过敏档案中。",
  "language.appLanguage": "应用语言",
  "language.appLanguageBody": "导航和菜单使用的主要语言。",
  "language.restaurantLanguage": "餐厅语言",
  "language.restaurantLanguageBody": "用于面向餐厅的消息。如果还不知道，请选择不确定。",
  "language.notSure": "不确定",
  "language.english": "英语",
  "language.spanish": "西班牙语",
  "language.french": "法语",
  "language.italian": "意大利语",
  "language.japanese": "日语",
  "language.german": "德语",
  "language.korean": "韩语",
  "language.chineseSimplified": "简体中文",
  "language.chineseTraditional": "繁體中文",
  "language.portuguese": "葡萄牙语",
  "language.thai": "泰语",
  "language.comingSoon": "即将推出",
  "safety.title": "安全声明",
  "safety.body": "在使用 Sift 做菜单决定前，请仔细阅读。",
  "safety.visibleTitle": "1. 仅限可见菜单文字",
  "safety.visibleBody":
    "Sift 会分析可见菜单文字和常见食材模式。它无法确认完整食材、厨房准备、替换食材或交叉接触。",
  "safety.confirmTitle": "2. 向员工确认",
  "safety.confirmBody":
    "请始终向餐厅员工确认，尤其是严重过敏。询问酱汁、油、汤底、腌料、配料、炸锅和共用设备。",
  "safety.callout":
    "Sift 永远不会保证某道菜安全。它帮助你知道点餐前该问什么。",
  "safety.medicalTitle": "3. 不是医疗建议",
  "safety.medicalBody":
    "Sift 是菜单过敏助手，不是医疗设备、医生、餐厅或食品安全认证机构。",
  "safety.responsibilityTitle": "4. 你的责任",
  "safety.responsibilityBody":
    "你需要自行决定点什么，以及餐厅确认是否足以满足你的过敏需求。",
  "safety.understand": "我明白",
  "help.title": "帮助与支持",
  "help.body": "今天我们可以怎样帮你？",
  "help.faq": "常见问题",
  "help.faqBody": "快速找到常见问题的答案。",
  "help.contact": "联系支持",
  "help.contactBody": "直接联系我们的团队。",
  "help.feedback": "提交反馈",
  "help.feedbackBody": "帮助我们改善你的 Sift 体验。",
  "help.openError": "我们无法在你的设备上打开此链接。",
  "help.emailFeedbackTitle": "发送反馈邮件",
  "help.emailSupportTitle": "发送支持邮件",
  "help.feedbackSubject": "Sift 反馈",
  "help.feedbackBodyTemplate":
    "发生了什么？\n\n你希望 Sift 改进什么？\n\n如相关，请填写设备/应用版本：\n",
  "help.supportSubject": "Sift 支持请求",
  "help.supportModalTitle": "联系支持",
  "help.supportModalBody":
    "请发送邮件至 support@siftallergy.app。我们通常会在 2-5 个工作日内回复。",
  "help.emailSupport": "发送邮件"
} satisfies Record<TranslationKey, string>;

const zhHant = {
  ...zhHans,
  "nav.home": "首頁",
  "nav.history": "記錄",
  "nav.profile": "檔案",
  "home.title": "首頁",
  "home.openSettings": "開啟設定",
  "home.activeFilters": "目前篩查",
  "home.createProfileTitle": "建立過敏檔案",
  "home.createProfileBody":
    "Sift 需要你的過敏原和嚴重程度，才能整理菜單風險。",
  "home.editProfile": "編輯檔案",
  "home.scanMenu": "掃描菜單",
  "home.scanBody": "立即分析食材",
  "home.uploadPhoto": "上傳照片",
  "home.recentScans": "最近掃描",
  "home.viewAll": "查看全部",
  "home.menuScan": "菜單掃描",
  "home.emptyRecent": "你儲存在此裝置上的掃描會顯示在這裡。",
  "profile.title": "過敏檔案",
  "profile.body": "選擇過敏原和嚴重程度。Sift 會使用此檔案掃描菜單並準備問題。",
  "profile.savedProfiles": "已儲存檔案",
  "profile.new": "新增",
  "profile.profileFallback": "檔案",
  "profile.deleteProfileTitle": "刪除檔案？",
  "profile.deleteProfileBody": "從此裝置刪除 {name}？",
  "profile.allergiesCount": "{count} 個過敏項",
  "profile.profileName": "檔案名稱",
  "profile.yourLanguage": "你的語言",
  "profile.restaurantLanguage": "餐廳語言",
  "profile.commonAllergens": "常見過敏原",
  "profile.selectedCount": "已選擇 {count} 項",
  "profile.severityMeta": "嚴重程度：{severity}",
  "profile.crossContactMeta": "交叉接觸",
  "profile.customDetails": "自訂詳情",
  "profile.customDetailsPlaceholder": "花生油、芝麻油、微量、共用炸鍋...",
  "profile.customAllergen": "自訂過敏原",
  "profile.add": "新增",
  "profile.selectedDetails": "已選過敏項",
  "profile.crossContactSensitive": "對交叉接觸敏感",
  "profile.crossContactBody": "詢問共用設備和準備過程。",
  "profile.customDetailsLongPlaceholder": "自訂詳情，例如油、微量或可耐受形式",
  "profile.saveProfile": "儲存檔案",
  "profile.savedToast": "過敏檔案已儲存",
  "severity.mild": "輕度",
  "severity.moderate": "中度",
  "severity.severe": "嚴重",
  "allergen.peanut": "花生",
  "allergen.treeNuts": "樹堅果",
  "allergen.sesame": "芝麻",
  "allergen.shellfish": "甲殼類",
  "allergen.fish": "魚",
  "allergen.dairy": "乳製品",
  "allergen.egg": "雞蛋",
  "allergen.wheatGluten": "小麥/麩質",
  "allergen.soy": "大豆",
  "allergen.mango": "芒果",
  "allergen.mustard": "芥末",
  "allergen.sulfites": "亞硫酸鹽",
  "history.title": "掃描記錄",
  "history.noScansTitle": "尚未有掃描",
  "history.noScansBody": "你儲存在此裝置上的掃描會顯示在這裡。",
  "history.noObviousRisks": "未發現明顯風險",
  "history.risksFound": "發現 {count} 個風險",
  "history.deleteScan": "刪除",
  "settings.subscription": "訂閱",
  "settings.language": "語言",
  "settings.safetyDisclaimer": "安全聲明",
  "settings.clearScanHistory": "清除掃描記錄（{count}）",
  "settings.helpSupport": "幫助 / 支援",
  "settings.logout": "登出",
  "settings.clearHistoryTitle": "清除掃描記錄？",
  "settings.clearHistoryBody": "這只會清除此裝置上儲存的掃描。",
  "settings.cancel": "取消",
  "settings.clear": "清除",
  "subscription.body":
    "使用更深入的工具提升菜單掃描，讓你更安心地詢問。",
  "subscription.currentPlan": "目前方案",
  "subscription.freeMvp": "免費 MVP",
  "subscription.now": "目前",
  "subscription.plans": "方案",
  "subscription.free": "免費",
  "subscription.family": "家庭",
  "subscription.freeBody": "每月 3 次掃描、1 個檔案、基礎風險卡和最近本地記錄。",
  "subscription.plusBody": "每月 50 次掃描、完整本地記錄、翻譯卡和更豐富的菜品詳情。",
  "subscription.premiumBody": "每月 200 次掃描、旅行模式、離線卡、匯出和進階風險詳情。",
  "subscription.familyBody": "每月 500 次掃描、多個家庭檔案、兒童檔案和共享過敏卡。",
  "subscription.unavailable": "暫時不可用",
  "subscription.current": "目前",
  "subscription.questions": "對你的方案有疑問？",
  "subscription.supportCenter": "前往支援中心",
  "language.title": "語言",
  "language.body":
    "選擇 Sift 在應用程式中使用的語言。餐廳語言會保留在你的過敏檔案中。",
  "language.appLanguage": "應用程式語言",
  "language.appLanguageBody": "導覽和選單使用的主要語言。",
  "language.restaurantLanguage": "餐廳語言",
  "language.restaurantLanguageBody": "用於給餐廳看的訊息。如果還不知道，請選擇不確定。",
  "language.notSure": "不確定",
  "language.english": "英語",
  "language.spanish": "西班牙語",
  "language.french": "法語",
  "language.italian": "義大利語",
  "language.japanese": "日語",
  "language.german": "德語",
  "language.korean": "韓語",
  "language.chineseSimplified": "简体中文",
  "language.chineseTraditional": "繁體中文",
  "language.portuguese": "葡萄牙語",
  "language.thai": "泰語",
  "language.comingSoon": "即將推出",
  "safety.title": "安全聲明",
  "safety.body": "在使用 Sift 做菜單決定前，請仔細閱讀。",
  "safety.visibleTitle": "1. 僅限可見菜單文字",
  "safety.visibleBody":
    "Sift 會分析可見菜單文字和常見食材模式。它無法確認完整食材、廚房準備、替換食材或交叉接觸。",
  "safety.confirmTitle": "2. 向員工確認",
  "safety.confirmBody":
    "請始終向餐廳員工確認，尤其是嚴重過敏。詢問醬汁、油、湯底、醃料、配料、炸鍋和共用設備。",
  "safety.callout":
    "Sift 永遠不會保證某道菜安全。它幫助你知道點餐前該問什麼。",
  "safety.medicalTitle": "3. 不是醫療建議",
  "safety.medicalBody":
    "Sift 是菜單過敏助手，不是醫療設備、醫生、餐廳或食品安全認證機構。",
  "safety.responsibilityTitle": "4. 你的責任",
  "safety.responsibilityBody":
    "你需要自行決定點什麼，以及餐廳確認是否足以滿足你的過敏需求。",
  "safety.understand": "我明白",
  "help.title": "幫助與支援",
  "help.body": "今天我們可以怎樣幫你？",
  "help.faq": "常見問題",
  "help.faqBody": "快速找到常見問題的答案。",
  "help.contact": "聯絡支援",
  "help.contactBody": "直接聯絡我們的團隊。",
  "help.feedback": "提交回饋",
  "help.feedbackBody": "幫助我們改善你的 Sift 體驗。",
  "help.openError": "我們無法在你的裝置上開啟此連結。",
  "help.emailFeedbackTitle": "傳送回饋郵件",
  "help.emailSupportTitle": "傳送支援郵件",
  "help.feedbackSubject": "Sift 回饋",
  "help.feedbackBodyTemplate":
    "發生了什麼？\n\n你希望 Sift 改進什麼？\n\n如相關，請填寫裝置/應用程式版本：\n",
  "help.supportSubject": "Sift 支援請求",
  "help.supportModalTitle": "聯絡支援",
  "help.supportModalBody":
    "請傳送郵件至 support@siftallergy.app。我們通常會在 2-5 個工作日內回覆。",
  "help.emailSupport": "傳送郵件"
} satisfies Record<TranslationKey, string>;

const pt = {
  ...en,
  "common.back": "Voltar",
  "common.close": "Fechar",
  "nav.home": "Início",
  "nav.history": "Histórico",
  "nav.profile": "Perfil",
  "home.title": "Início",
  "home.openSettings": "Abrir ajustes",
  "home.activeFilters": "Filtros ativos",
  "home.createProfileTitle": "Criar perfil de alergias",
  "home.createProfileBody":
    "O Sift precisa das suas alergias e gravidade para organizar riscos do cardápio.",
  "home.editProfile": "Editar perfil",
  "home.scanMenu": "Escanear cardápio",
  "home.scanBody": "Analise ingredientes instantaneamente",
  "home.uploadPhoto": "Enviar foto",
  "home.recentScans": "Escaneamentos recentes",
  "home.viewAll": "Ver tudo",
  "home.menuScan": "Escaneamento de cardápio",
  "home.emptyRecent": "Os escaneamentos salvos neste dispositivo aparecerão aqui.",
  "profile.title": "Perfil de alergias",
  "profile.body": "Escolha alergias e gravidade. O Sift usa este perfil para escanear cardápios e preparar perguntas.",
  "profile.savedProfiles": "Perfis salvos",
  "profile.new": "Novo",
  "profile.profileFallback": "Perfil",
  "profile.deleteProfileTitle": "Excluir perfil?",
  "profile.deleteProfileBody": "Excluir {name} deste dispositivo?",
  "profile.allergiesCount": "{count} alergias",
  "profile.profileName": "Nome do perfil",
  "profile.yourLanguage": "Seu idioma",
  "profile.restaurantLanguage": "Idioma do restaurante",
  "profile.commonAllergens": "Alérgenos comuns",
  "profile.selectedCount": "{count} selecionados",
  "profile.severityMeta": "Gravidade {severity}",
  "profile.crossContactMeta": "contato cruzado",
  "profile.customDetails": "Detalhes personalizados",
  "profile.customDetailsPlaceholder": "Óleo de amendoim, óleo de gergelim, traços, fritadeira compartilhada...",
  "profile.customAllergen": "Alérgeno personalizado",
  "profile.add": "Adicionar",
  "profile.selectedDetails": "Alergias selecionadas",
  "profile.crossContactSensitive": "Sensível a contato cruzado",
  "profile.crossContactBody": "Pergunte sobre equipamentos e preparo compartilhados.",
  "profile.customDetailsLongPlaceholder": "Detalhes personalizados, como óleos, traços ou formas toleradas",
  "profile.saveProfile": "Salvar perfil",
  "profile.savedToast": "Perfil de alergias salvo",
  "severity.mild": "Leve",
  "severity.moderate": "Moderada",
  "severity.severe": "Grave",
  "allergen.peanut": "Amendoim",
  "allergen.treeNuts": "Castanhas",
  "allergen.sesame": "Gergelim",
  "allergen.shellfish": "Crustáceos",
  "allergen.fish": "Peixe",
  "allergen.dairy": "Laticínios",
  "allergen.egg": "Ovo",
  "allergen.wheatGluten": "Trigo/glúten",
  "allergen.soy": "Soja",
  "allergen.mango": "Manga",
  "allergen.mustard": "Mostarda",
  "allergen.sulfites": "Sulfitos",
  "history.title": "Histórico",
  "history.noScansTitle": "Nenhum escaneamento ainda",
  "history.noScansBody": "Os escaneamentos salvos neste dispositivo aparecerão aqui.",
  "history.noObviousRisks": "Sem riscos óbvios",
  "history.risksFound": "{count} riscos encontrados",
  "history.deleteScan": "Excluir",
  "settings.subscription": "Assinatura",
  "settings.language": "Idioma",
  "settings.safetyDisclaimer": "Aviso de segurança",
  "settings.clearScanHistory": "Limpar histórico ({count})",
  "settings.helpSupport": "Ajuda / suporte",
  "settings.logout": "SAIR",
  "settings.clearHistoryTitle": "Limpar histórico?",
  "settings.clearHistoryBody": "Isso só limpa os escaneamentos salvos neste dispositivo.",
  "settings.cancel": "Cancelar",
  "settings.clear": "Limpar",
  "subscription.body":
    "Eleve o escaneamento de cardápios com ferramentas mais profundas para mais tranquilidade.",
  "subscription.currentPlan": "Plano atual",
  "subscription.freeMvp": "MVP gratuito",
  "subscription.now": "agora",
  "subscription.plans": "Planos",
  "subscription.free": "Grátis",
  "subscription.family": "Família",
  "subscription.plusPrice": "$4.99/mês",
  "subscription.premiumPrice": "$8.99/mês",
  "subscription.familyPrice": "$12.99/mês",
  "subscription.freeBody": "3 escaneamentos/mês, 1 perfil, cartões básicos de risco e histórico local recente.",
  "subscription.plusBody": "50 escaneamentos/mês, histórico local completo, cartões de tradução e detalhes mais ricos.",
  "subscription.premiumBody": "200 escaneamentos/mês, modo viagem, cartões offline, exportação e análise avançada.",
  "subscription.familyBody": "500 escaneamentos/mês, múltiplos perfis familiares, perfis infantis e cartões compartilhados.",
  "subscription.unavailable": "Indisponível no momento",
  "subscription.current": "Atual",
  "subscription.questions": "Tem perguntas sobre seu plano?",
  "subscription.supportCenter": "Visitar a Central de Suporte",
  "language.title": "Idioma",
  "language.body":
    "Escolha o idioma que o Sift deve usar no app. O idioma do restaurante fica no seu perfil de alergias.",
  "language.appLanguage": "Idioma do app",
  "language.appLanguageBody": "O idioma principal usado na navegação e nos menus.",
  "language.restaurantLanguage": "Idioma do restaurante",
  "language.restaurantLanguageBody": "Usado para mensagens voltadas ao restaurante. Escolha Não tenho certeza se ainda não souber.",
  "language.notSure": "Não tenho certeza",
  "language.english": "Inglês",
  "language.spanish": "Espanhol",
  "language.french": "Francês",
  "language.italian": "Italiano",
  "language.japanese": "Japonês",
  "language.german": "Alemão",
  "language.korean": "Coreano",
  "language.chineseSimplified": "Chinês simplificado",
  "language.chineseTraditional": "Chinês tradicional",
  "language.portuguese": "Português",
  "language.thai": "Tailandês",
  "language.comingSoon": "Em breve",
  "safety.title": "Aviso de segurança",
  "safety.body": "Leia com atenção antes de usar o Sift para decisões sobre cardápios.",
  "safety.visibleTitle": "1. Apenas texto visível do cardápio",
  "safety.visibleBody":
    "O Sift analisa o texto visível do cardápio e padrões comuns de ingredientes. Ele não confirma ingredientes completos, preparo, substituições ou contato cruzado.",
  "safety.confirmTitle": "2. Confirme com a equipe",
  "safety.confirmBody":
    "Sempre confirme com a equipe do restaurante, especialmente em alergias graves. Pergunte sobre molhos, óleos, caldos, marinadas, guarnições, fritadeiras e equipamentos compartilhados.",
  "safety.callout":
    "O Sift nunca garante que um prato é seguro. Ele ajuda você a saber o que perguntar antes de pedir.",
  "safety.medicalTitle": "3. Não é orientação médica",
  "safety.medicalBody":
    "O Sift é um copiloto para cardápios e alergias, não um dispositivo médico, médico, restaurante ou certificador de segurança alimentar.",
  "safety.responsibilityTitle": "4. Sua responsabilidade",
  "safety.responsibilityBody":
    "Você decide o que pedir e se a confirmação do restaurante é suficiente para suas necessidades de alergia.",
  "safety.understand": "Entendi",
  "help.title": "Ajuda e suporte",
  "help.body": "Como podemos ajudar hoje?",
  "help.faq": "Perguntas frequentes",
  "help.faqBody": "Encontre respostas rápidas para problemas comuns.",
  "help.contact": "Contatar suporte",
  "help.contactBody": "Fale diretamente com nossa equipe.",
  "help.feedback": "Enviar feedback",
  "help.feedbackBody": "Ajude-nos a melhorar sua experiência com o Sift.",
  "help.openError": "Não foi possível abrir este link no seu dispositivo.",
  "help.emailFeedbackTitle": "Enviar feedback por email",
  "help.emailSupportTitle": "Enviar email ao suporte",
  "help.feedbackSubject": "Feedback do Sift",
  "help.feedbackBodyTemplate":
    "O que aconteceu?\n\nO que você gostaria que o Sift melhorasse?\n\nDispositivo/versão do app, se relevante:\n",
  "help.supportSubject": "Solicitação de suporte Sift",
  "help.supportModalTitle": "Contatar suporte",
  "help.supportModalBody":
    "Envie um email para support@siftallergy.app. Normalmente respondemos em 2-5 dias úteis.",
  "help.emailSupport": "Enviar email"
} satisfies Record<TranslationKey, string>;

const th = {
  ...en,
  "common.back": "ย้อนกลับ",
  "common.close": "ปิด",
  "nav.home": "หน้าแรก",
  "nav.history": "ประวัติ",
  "nav.profile": "โปรไฟล์",
  "home.title": "หน้าแรก",
  "home.openSettings": "เปิดการตั้งค่า",
  "home.activeFilters": "ตัวกรองที่ใช้",
  "home.createProfileTitle": "สร้างโปรไฟล์การแพ้",
  "home.createProfileBody":
    "Sift ต้องการข้อมูลสารก่อภูมิแพ้และความรุนแรงก่อนจัดโครงสร้างความเสี่ยงจากเมนู",
  "home.editProfile": "แก้ไขโปรไฟล์",
  "home.scanMenu": "สแกนเมนู",
  "home.scanBody": "วิเคราะห์ส่วนผสมทันที",
  "home.uploadPhoto": "อัปโหลดรูป",
  "home.recentScans": "สแกนล่าสุด",
  "home.viewAll": "ดูทั้งหมด",
  "home.menuScan": "สแกนเมนู",
  "home.emptyRecent": "รายการสแกนที่บันทึกไว้ในอุปกรณ์นี้จะแสดงที่นี่",
  "profile.title": "โปรไฟล์การแพ้",
  "profile.body": "เลือกสารก่อภูมิแพ้และความรุนแรง Sift ใช้โปรไฟล์นี้เพื่อสแกนเมนูและเตรียมคำถาม",
  "profile.savedProfiles": "โปรไฟล์ที่บันทึกไว้",
  "profile.new": "ใหม่",
  "profile.profileFallback": "โปรไฟล์",
  "profile.deleteProfileTitle": "ลบโปรไฟล์หรือไม่?",
  "profile.deleteProfileBody": "ลบ {name} จากอุปกรณ์นี้หรือไม่?",
  "profile.allergiesCount": "แพ้ {count} รายการ",
  "profile.profileName": "ชื่อโปรไฟล์",
  "profile.yourLanguage": "ภาษาของคุณ",
  "profile.restaurantLanguage": "ภาษาร้านอาหาร",
  "profile.commonAllergens": "สารก่อภูมิแพ้ทั่วไป",
  "profile.selectedCount": "เลือกแล้ว {count} รายการ",
  "profile.severityMeta": "ความรุนแรง {severity}",
  "profile.crossContactMeta": "การปนเปื้อนข้าม",
  "profile.customDetails": "รายละเอียดเพิ่มเติม",
  "profile.customDetailsPlaceholder": "น้ำมันถั่วลิสง น้ำมันงา ร่องรอย หม้อทอดร่วม...",
  "profile.customAllergen": "สารก่อภูมิแพ้กำหนดเอง",
  "profile.add": "เพิ่ม",
  "profile.selectedDetails": "รายการแพ้ที่เลือก",
  "profile.crossContactSensitive": "ไวต่อการปนเปื้อนข้าม",
  "profile.crossContactBody": "ถามเกี่ยวกับอุปกรณ์และการเตรียมที่ใช้ร่วมกัน",
  "profile.customDetailsLongPlaceholder": "รายละเอียดเพิ่มเติม เช่น น้ำมัน ร่องรอย หรือรูปแบบที่ทนได้",
  "profile.saveProfile": "บันทึกโปรไฟล์",
  "profile.savedToast": "บันทึกโปรไฟล์การแพ้แล้ว",
  "severity.mild": "เล็กน้อย",
  "severity.moderate": "ปานกลาง",
  "severity.severe": "รุนแรง",
  "allergen.peanut": "ถั่วลิสง",
  "allergen.treeNuts": "ถั่วเปลือกแข็ง",
  "allergen.sesame": "งา",
  "allergen.shellfish": "สัตว์น้ำมีเปลือก",
  "allergen.fish": "ปลา",
  "allergen.dairy": "นม",
  "allergen.egg": "ไข่",
  "allergen.wheatGluten": "ข้าวสาลี/กลูเตน",
  "allergen.soy": "ถั่วเหลือง",
  "allergen.mango": "มะม่วง",
  "allergen.mustard": "มัสตาร์ด",
  "allergen.sulfites": "ซัลไฟต์",
  "history.title": "ประวัติการสแกน",
  "history.noScansTitle": "ยังไม่มีการสแกน",
  "history.noScansBody": "รายการสแกนที่บันทึกไว้ในอุปกรณ์นี้จะแสดงที่นี่",
  "history.noObviousRisks": "ไม่พบความเสี่ยงชัดเจน",
  "history.risksFound": "พบความเสี่ยง {count} รายการ",
  "history.deleteScan": "ลบ",
  "settings.subscription": "การสมัครสมาชิก",
  "settings.language": "ภาษา",
  "settings.safetyDisclaimer": "คำชี้แจงด้านความปลอดภัย",
  "settings.clearScanHistory": "ล้างประวัติ ({count})",
  "settings.helpSupport": "ช่วยเหลือ / สนับสนุน",
  "settings.logout": "ออกจากระบบ",
  "settings.clearHistoryTitle": "ล้างประวัติการสแกนหรือไม่?",
  "settings.clearHistoryBody": "จะลบเฉพาะรายการสแกนที่บันทึกไว้ในอุปกรณ์นี้",
  "settings.cancel": "ยกเลิก",
  "settings.clear": "ล้าง",
  "subscription.body":
    "ยกระดับการสแกนเมนูด้วยเครื่องมือที่ละเอียดขึ้นเพื่อความสบายใจ",
  "subscription.currentPlan": "แผนปัจจุบัน",
  "subscription.freeMvp": "MVP ฟรี",
  "subscription.now": "ตอนนี้",
  "subscription.plans": "แผน",
  "subscription.free": "ฟรี",
  "subscription.family": "ครอบครัว",
  "subscription.plusPrice": "$4.99/เดือน",
  "subscription.premiumPrice": "$8.99/เดือน",
  "subscription.familyPrice": "$12.99/เดือน",
  "subscription.freeBody": "สแกน 3 ครั้ง/เดือน, 1 โปรไฟล์, บัตรความเสี่ยงพื้นฐาน และประวัติล่าสุดในเครื่อง",
  "subscription.plusBody": "สแกน 50 ครั้ง/เดือน, ประวัติในเครื่องทั้งหมด, บัตรแปลภาษา และรายละเอียดอาหารมากขึ้น",
  "subscription.premiumBody": "สแกน 200 ครั้ง/เดือน, โหมดเดินทาง, บัตรออฟไลน์, ส่งออก และรายละเอียดความเสี่ยงขั้นสูง",
  "subscription.familyBody": "สแกน 500 ครั้ง/เดือน, หลายโปรไฟล์ครอบครัว, โปรไฟล์เด็ก และบัตรภูมิแพ้ที่แชร์ได้",
  "subscription.unavailable": "ยังไม่พร้อมใช้งาน",
  "subscription.current": "ปัจจุบัน",
  "subscription.questions": "มีคำถามเกี่ยวกับแผนของคุณหรือไม่?",
  "subscription.supportCenter": "ไปที่ศูนย์ช่วยเหลือ",
  "language.title": "ภาษา",
  "language.body":
    "เลือกภาษาที่ Sift ควรใช้ในแอป ภาษาสำหรับร้านอาหารจะอยู่ในโปรไฟล์การแพ้ของคุณ",
  "language.appLanguage": "ภาษาแอป",
  "language.appLanguageBody": "ภาษาหลักสำหรับการนำทางและเมนู",
  "language.restaurantLanguage": "ภาษาร้านอาหาร",
  "language.restaurantLanguageBody": "ใช้สำหรับข้อความที่แสดงให้ร้านอาหาร เลือกไม่แน่ใจหากยังไม่ทราบ",
  "language.notSure": "ไม่แน่ใจ",
  "language.english": "อังกฤษ",
  "language.spanish": "สเปน",
  "language.french": "ฝรั่งเศส",
  "language.italian": "อิตาลี",
  "language.japanese": "ญี่ปุ่น",
  "language.german": "เยอรมัน",
  "language.korean": "เกาหลี",
  "language.chineseSimplified": "จีนตัวย่อ",
  "language.chineseTraditional": "จีนตัวเต็ม",
  "language.portuguese": "โปรตุเกส",
  "language.thai": "ไทย",
  "language.comingSoon": "เร็ว ๆ นี้",
  "safety.title": "คำชี้แจงด้านความปลอดภัย",
  "safety.body": "โปรดอ่านอย่างละเอียดก่อนใช้ Sift เพื่อตัดสินใจเกี่ยวกับเมนู",
  "safety.visibleTitle": "1. เฉพาะข้อความเมนูที่มองเห็นได้",
  "safety.visibleBody":
    "Sift วิเคราะห์ข้อความเมนูที่มองเห็นได้และรูปแบบส่วนผสมทั่วไป ไม่สามารถยืนยันส่วนผสมทั้งหมด วิธีเตรียม การเปลี่ยนส่วนผสม หรือการปนเปื้อนข้ามได้",
  "safety.confirmTitle": "2. ยืนยันกับพนักงาน",
  "safety.confirmBody":
    "ยืนยันกับพนักงานร้านอาหารเสมอ โดยเฉพาะเมื่อมีอาการแพ้รุนแรง ถามเรื่องซอส น้ำมัน น้ำซุป หมัก เครื่องโรยหน้า หม้อทอด และอุปกรณ์ที่ใช้ร่วมกัน",
  "safety.callout":
    "Sift ไม่เคยรับประกันว่าอาหารจานใดปลอดภัย แต่ช่วยให้คุณรู้ว่าควรถามอะไรก่อนสั่ง",
  "safety.medicalTitle": "3. ไม่ใช่คำแนะนำทางการแพทย์",
  "safety.medicalBody":
    "Sift เป็นผู้ช่วยด้านเมนูและการแพ้ ไม่ใช่อุปกรณ์แพทย์ แพทย์ ร้านอาหาร หรือผู้รับรองความปลอดภัยอาหาร",
  "safety.responsibilityTitle": "4. ความรับผิดชอบของคุณ",
  "safety.responsibilityBody":
    "คุณเป็นผู้ตัดสินใจว่าจะสั่งอะไร และการยืนยันจากร้านอาหารเพียงพอต่อความต้องการด้านภูมิแพ้ของคุณหรือไม่",
  "safety.understand": "เข้าใจแล้ว",
  "help.title": "ช่วยเหลือและสนับสนุน",
  "help.body": "วันนี้เราช่วยอะไรคุณได้บ้าง?",
  "help.faq": "คำถามที่พบบ่อย",
  "help.faqBody": "ค้นหาคำตอบอย่างรวดเร็วสำหรับปัญหาทั่วไป",
  "help.contact": "ติดต่อฝ่ายสนับสนุน",
  "help.contactBody": "ติดต่อทีมของเราโดยตรง",
  "help.feedback": "ส่งความคิดเห็น",
  "help.feedbackBody": "ช่วยเราปรับปรุงประสบการณ์ Sift ของคุณ",
  "help.openError": "เราไม่สามารถเปิดลิงก์นี้บนอุปกรณ์ของคุณได้",
  "help.emailFeedbackTitle": "ส่งความคิดเห็นทางอีเมล",
  "help.emailSupportTitle": "ส่งอีเมลถึงฝ่ายสนับสนุน",
  "help.feedbackSubject": "ความคิดเห็นเกี่ยวกับ Sift",
  "help.feedbackBodyTemplate":
    "เกิดอะไรขึ้น?\n\nคุณอยากให้ Sift ปรับปรุงอะไร?\n\nอุปกรณ์/เวอร์ชันแอป ถ้าเกี่ยวข้อง:\n",
  "help.supportSubject": "คำขอสนับสนุน Sift",
  "help.supportModalTitle": "ติดต่อฝ่ายสนับสนุน",
  "help.supportModalBody":
    "ส่งอีเมลถึงเราที่ support@siftallergy.app โดยปกติเราจะตอบกลับภายใน 2-5 วันทำการ",
  "help.emailSupport": "ส่งอีเมล"
} satisfies Record<TranslationKey, string>;

export const translations: Record<AppLanguageCode, Record<TranslationKey, string>> = {
  de,
  en,
  es,
  fr,
  it,
  ja,
  ko,
  pt,
  th,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant
};

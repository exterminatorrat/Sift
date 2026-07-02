export type AppLanguageCode = "en" | "es";

export type TranslationKey =
  | "common.back"
  | "common.close"
  | "common.sift"
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
  | "home.uploadPhoto"
  | "home.recentScans"
  | "home.viewAll"
  | "home.menuScan"
  | "home.emptyRecent"
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
  | "subscription.plannedBenefits"
  | "subscription.unlimitedScans"
  | "subscription.unlimitedScansBody"
  | "subscription.translationCards"
  | "subscription.translationCardsBody"
  | "subscription.detailedRisk"
  | "subscription.detailedRiskBody"
  | "subscription.manage"
  | "subscription.questions"
  | "subscription.supportCenter"
  | "language.title"
  | "language.body"
  | "language.appLanguage"
  | "language.appLanguageBody"
  | "language.english"
  | "language.spanish"
  | "language.french"
  | "language.italian"
  | "language.japanese"
  | "language.comingLater"
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
  english: "en",
  en: "en",
  spanish: "es",
  espanol: "es",
  "español": "es",
  es: "es"
};

export const supportedAppLanguages: Array<{ code: AppLanguageCode; labelKey: TranslationKey }> = [
  { code: "en", labelKey: "language.english" },
  { code: "es", labelKey: "language.spanish" }
];

export const plannedAppLanguages: TranslationKey[] = [
  "language.french",
  "language.italian",
  "language.japanese"
];

export const languageNameByCode: Record<AppLanguageCode, string> = {
  en: "English",
  es: "Spanish"
};

export const languageAutonymByCode: Record<AppLanguageCode, string> = {
  en: "English",
  es: "Español"
};

export const getLanguageCode = (language?: string | null): AppLanguageCode => {
  if (!language) {
    return "en";
  }

  return languageCodesByName[language.trim().toLowerCase()] ?? "en";
};

export const translations: Record<AppLanguageCode, Record<TranslationKey, string>> = {
  en: {
    "common.back": "Go back",
    "common.close": "Close",
    "common.sift": "Sift",
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
    "home.uploadPhoto": "Upload Photo",
    "home.recentScans": "Recent Scans",
    "home.viewAll": "View All",
    "home.menuScan": "Menu scan",
    "home.emptyRecent": "Scans you save on this device will appear here.",
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
    "subscription.plannedBenefits": "Planned benefits",
    "subscription.unlimitedScans": "Unlimited scans",
    "subscription.unlimitedScansBody":
      "Scan menus without monthly limits when subscriptions launch.",
    "subscription.translationCards": "Translation cards",
    "subscription.translationCardsBody":
      "Show restaurant staff a clear allergy message in travel languages.",
    "subscription.detailedRisk": "Detailed risk analysis",
    "subscription.detailedRiskBody":
      "Deeper hidden-ingredient and cross-contact explanations.",
    "subscription.manage": "Manage Subscription",
    "subscription.questions": "Have questions about your plan?",
    "subscription.supportCenter": "Visit the Support Center",
    "language.title": "Language",
    "language.body":
      "Choose the language Sift should use around the app. Restaurant language stays with your allergy profile.",
    "language.appLanguage": "App language",
    "language.appLanguageBody": "The primary language used for navigation and menus.",
    "language.english": "English",
    "language.spanish": "Spanish",
    "language.french": "French",
    "language.italian": "Italian",
    "language.japanese": "Japanese",
    "language.comingLater": "{languages} coming later.",
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
  },
  es: {
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
      "Sift necesita tus alergias y su gravedad antes de estructurar riesgos del menu.",
    "home.editProfile": "Editar perfil",
    "home.scanMenu": "Escanear menu",
    "home.scanBody": "Analiza ingredientes al instante",
    "home.uploadPhoto": "Subir foto",
    "home.recentScans": "Escaneos recientes",
    "home.viewAll": "Ver todo",
    "home.menuScan": "Escaneo de menu",
    "home.emptyRecent": "Los escaneos que guardes en este dispositivo apareceran aqui.",
    "history.title": "Historial de escaneos",
    "history.noScansTitle": "Aun no hay escaneos",
    "history.noScansBody": "Los escaneos que guardes en este dispositivo apareceran aqui.",
    "history.noObviousRisks": "Sin riesgos obvios",
    "history.risksFound": "{count} riesgos encontrados",
    "history.deleteScan": "Borrar",
    "settings.subscription": "Suscripcion",
    "settings.language": "Idioma",
    "settings.safetyDisclaimer": "Aviso de seguridad",
    "settings.clearScanHistory": "Borrar historial ({count})",
    "settings.helpSupport": "Ayuda / soporte",
    "settings.logout": "CERRAR SESION",
    "settings.clearHistoryTitle": "Borrar historial de escaneos?",
    "settings.clearHistoryBody": "Esto solo borra los escaneos guardados en este dispositivo.",
    "settings.cancel": "Cancelar",
    "settings.clear": "Borrar",
    "subscription.title": "Sift Premium",
    "subscription.body":
      "Mejora el escaneo de menus con herramientas mas completas para mayor tranquilidad.",
    "subscription.currentPlan": "Plan actual",
    "subscription.freeMvp": "MVP gratis",
    "subscription.now": "ahora",
    "subscription.plannedBenefits": "Beneficios planeados",
    "subscription.unlimitedScans": "Escaneos ilimitados",
    "subscription.unlimitedScansBody":
      "Escanea menus sin limites mensuales cuando lancemos suscripciones.",
    "subscription.translationCards": "Tarjetas de traduccion",
    "subscription.translationCardsBody":
      "Muestra al personal un mensaje claro sobre tus alergias en idiomas de viaje.",
    "subscription.detailedRisk": "Analisis de riesgo detallado",
    "subscription.detailedRiskBody":
      "Explicaciones mas profundas sobre ingredientes ocultos y contacto cruzado.",
    "subscription.manage": "Gestionar suscripcion",
    "subscription.questions": "Tienes preguntas sobre tu plan?",
    "subscription.supportCenter": "Visitar el centro de ayuda",
    "language.title": "Idioma",
    "language.body":
      "Elige el idioma que Sift debe usar en la app. El idioma del restaurante queda en tu perfil de alergias.",
    "language.appLanguage": "Idioma de la app",
    "language.appLanguageBody": "El idioma principal para navegacion y menus.",
    "language.english": "Ingles",
    "language.spanish": "Espanol",
    "language.french": "Frances",
    "language.italian": "Italiano",
    "language.japanese": "Japones",
    "language.comingLater": "{languages} llegaran mas adelante.",
    "safety.title": "Aviso de seguridad",
    "safety.body": "Lee esto con cuidado antes de usar Sift para decidir sobre menus.",
    "safety.visibleTitle": "1. Solo texto visible del menu",
    "safety.visibleBody":
      "Sift analiza texto visible del menu y patrones comunes de ingredientes. No puede confirmar ingredientes completos, preparacion, sustituciones ni contacto cruzado.",
    "safety.confirmTitle": "2. Confirma con el personal",
    "safety.confirmBody":
      "Confirma siempre con el personal del restaurante, especialmente si tus alergias son graves. Pregunta por salsas, aceites, caldos, marinados, guarniciones, freidoras y equipo compartido.",
    "safety.callout":
      "Sift nunca garantiza que un plato sea seguro. Te ayuda a saber que preguntar antes de pedir.",
    "safety.medicalTitle": "3. No es consejo medico",
    "safety.medicalBody":
      "Sift es un copiloto para menus y alergias, no un dispositivo medico, doctor, restaurante ni certificador de seguridad alimentaria.",
    "safety.responsibilityTitle": "4. Tu responsabilidad",
    "safety.responsibilityBody":
      "Tu decides que pedir y si la confirmacion del restaurante es suficiente para tus necesidades de alergia.",
    "safety.understand": "Entiendo",
    "help.title": "Ayuda y soporte",
    "help.body": "Como podemos ayudarte hoy?",
    "help.faq": "Preguntas frecuentes",
    "help.faqBody": "Encuentra respuestas rapidas a problemas comunes.",
    "help.contact": "Contactar soporte",
    "help.contactBody": "Comunicate directamente con nuestro equipo.",
    "help.feedback": "Enviar comentarios",
    "help.feedbackBody": "Ayudanos a mejorar tu experiencia con Sift.",
    "help.openError": "No pudimos abrir este enlace en tu dispositivo.",
    "help.emailFeedbackTitle": "Enviar comentarios",
    "help.emailSupportTitle": "Enviar email a soporte",
    "help.feedbackSubject": "Comentarios sobre Sift",
    "help.feedbackBodyTemplate":
      "Que ocurrio?\n\nQue te gustaria que Sift mejorara?\n\nDispositivo/version de la app si aplica:\n",
    "help.supportSubject": "Solicitud de soporte de Sift",
    "help.supportModalTitle": "Contactar soporte",
    "help.supportModalBody":
      "Escribenos a support@siftallergy.app. Normalmente respondemos en 2-5 dias laborables.",
    "help.emailSupport": "Enviar email a soporte"
  }
};

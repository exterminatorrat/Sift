const optional = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const site = {
  name: "Sift",
  origin: "https://siftallergy.app",
  tagline: "Know what to ask before you eat.",
  description:
    "Scan a restaurant menu against your allergy profile. Sift surfaces possible concerns and practical questions to confirm with restaurant staff.",
  supportEmail: "support@siftallergy.app",
  feedbackEmail: "feedback@siftallergy.app",
  appStoreUrl: optional(import.meta.env.PUBLIC_APP_STORE_URL),
  legalEntity: optional(import.meta.env.PUBLIC_LEGAL_ENTITY),
  legalAddress: optional(import.meta.env.PUBLIC_LEGAL_ADDRESS),
  legalJurisdiction: optional(import.meta.env.PUBLIC_LEGAL_JURISDICTION),
  legalEffectiveDate: optional(import.meta.env.PUBLIC_LEGAL_EFFECTIVE_DATE),
  accessibilityAuditDate: optional(import.meta.env.PUBLIC_ACCESSIBILITY_AUDIT_DATE)
} as const;

export const primaryNavigation = [
  { href: "/#product", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/reliability", label: "Reliability" },
  { href: "/safety", label: "Safety" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" }
] as const;

export const canonicalPath = (path: string) => {
  if (path === "/") return "/";
  return path.replace(/\/$/, "");
};

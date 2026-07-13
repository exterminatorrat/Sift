const required = [
  "PUBLIC_APP_STORE_URL",
  "PUBLIC_LEGAL_ENTITY",
  "PUBLIC_LEGAL_ADDRESS",
  "PUBLIC_LEGAL_JURISDICTION",
  "PUBLIC_LEGAL_EFFECTIVE_DATE",
  "PUBLIC_ACCESSIBILITY_AUDIT_DATE"
];

const requiredVerifications = [
  "PUBLIC_SUPPORT_EMAIL_VERIFIED",
  "PUBLIC_FEEDBACK_EMAIL_VERIFIED",
  "PUBLIC_ACCOUNT_DELETION_FLOW_VERIFIED",
  "PUBLIC_AI_LIVE_GATE_VERIFIED",
  "PUBLIC_PROVIDER_DISCLOSURES_VERIFIED",
  "PUBLIC_COUNSEL_REVIEWED",
  "PUBLIC_PRODUCTION_ICON_VERIFIED",
  "PUBLIC_PRICING_VERIFIED",
  "PUBLIC_SUBSCRIPTION_PRODUCTS_VERIFIED",
  "PUBLIC_SUBSCRIPTION_PURCHASE_RESTORE_VERIFIED"
];

const missing = required.filter((key) => !process.env[key]?.trim());
const unverified = requiredVerifications.filter((key) => process.env[key] !== "true");
let blocked = false;

if (missing.length > 0) {
  blocked = true;
  console.error("Release build blocked. Set and verify these production values:");
  for (const key of missing) console.error(`- ${key}`);
}

if (unverified.length > 0) {
  blocked = true;
  console.error("Release build blocked. These checks must be completed and set to true:");
  for (const key of unverified) console.error(`- ${key}`);
}

if (blocked) {
  process.exit(1);
}

const appStoreUrl = process.env.PUBLIC_APP_STORE_URL;
if (!/^https:\/\/apps\.apple\.com\//.test(appStoreUrl)) {
  console.error("PUBLIC_APP_STORE_URL must be a verified apps.apple.com listing URL.");
  process.exit(1);
}

console.log("Release configuration present. Continue with counsel and link verification before deploy.");

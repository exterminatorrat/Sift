import { existsSync, readFileSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = "https://siftallergy.app";
const routes = [
  ["/", "index.html"],
  ["/about", "about/index.html"],
  ["/accessibility", "accessibility/index.html"],
  ["/contact", "contact/index.html"],
  ["/cookies", "cookies/index.html"],
  ["/delete-account", "delete-account/index.html"],
  ["/how-it-works", "how-it-works/index.html"],
  ["/privacy", "privacy/index.html"],
  ["/reliability", "reliability/index.html"],
  ["/safety", "safety/index.html"],
  ["/support", "support/index.html"],
  ["/terms", "terms/index.html"]
];

const failures = [];
const titles = new Set();
const descriptions = new Set();
const internalLinks = new Set();

const fail = (message) => failures.push(message);
const distPath = (...parts) => join(dist, ...parts);

for (const [route, file] of routes) {
  const path = distPath(file);
  if (!existsSync(path)) {
    fail(`${route}: missing ${file}`);
    continue;
  }

  const html = readFileSync(path, "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  const h1Count = (html.match(/<h1(?:\s|>)/gi) ?? []).length;

  if (!title) fail(`${route}: missing title`);
  else if (titles.has(title)) fail(`${route}: duplicate title ${title}`);
  else titles.add(title);

  if (!description) fail(`${route}: missing meta description`);
  else if (descriptions.has(description)) fail(`${route}: duplicate meta description`);
  else descriptions.add(description);

  const expectedCanonical = new URL(route, origin).toString();
  if (canonical !== expectedCanonical) fail(`${route}: canonical is ${canonical}, expected ${expectedCanonical}`);
  if (h1Count !== 1) fail(`${route}: expected one h1, found ${h1Count}`);
  if (!/<html lang="en">/i.test(html)) fail(`${route}: missing html lang=en`);
  if (!/href="#main-content"/i.test(html)) fail(`${route}: missing skip link`);
  if (!/<main id="main-content" tabindex="-1">/i.test(html)) fail(`${route}: missing focusable main landmark`);
  if (!/property="og:image" content="https:\/\/siftallergy\.app\/og-sift\.png"/i.test(html)) fail(`${route}: missing absolute OG image`);
  if (!/type="application\/ld\+json"/i.test(html)) fail(`${route}: missing JSON-LD`);
  if (/\bTBD\b|\{\{|id000000|href="#"|early access|join (the )?waitlist/i.test(html)) fail(`${route}: unresolved placeholder or waitlist copy found`);
  if (/<form(?:\s|>)/i.test(html)) fail(`${route}: unexpected form found`);

  if (route === "/") {
    if (!/id="pricing"/i.test(html)) fail("/: missing pricing section");
    if (!/Sift plan features compared across Free, Plus, Pro, and Family/i.test(html)) fail("/: missing plan comparison table");
    for (const annotation of ["Start a new scan", "Clear risk flag", "Why it matters", "Allergens in play"]) {
      if (!html.includes(annotation)) fail(`/: missing product annotation "${annotation}"`);
    }
    for (const plan of ["Free", "Plus", "Pro", "Family"]) {
      if (!new RegExp(`<h3>${plan}<\\/h3>`, "i").test(html)) fail(`/: missing ${plan} plan card`);
    }
    if (/Bring better questions to the menu|From menu photo to better questions/i.test(html)) {
      fail("/: obsolete closing or duplicated workflow section still present");
    }
  }

  if (route === "/how-it-works" && /loading="lazy"/i.test(html)) {
    fail("/how-it-works: walkthrough evidence must load eagerly");
  }

  for (const match of html.matchAll(/href="([^"]+)"/gi)) {
    const href = match[1];
    if (href.startsWith("mailto:") || href.startsWith("http") || href.startsWith("#")) continue;
    internalLinks.add(href.split("#")[0].split("?")[0]);
  }
}

for (const href of internalLinks) {
  if (!href) continue;
  const relative = href === "/" ? "index.html" : href.replace(/^\//, "");
  const candidates = [relative, `${relative}/index.html`].map((item) => normalize(distPath(item)));
  if (!candidates.some(existsSync)) fail(`Broken internal link: ${href}`);
}

const notFoundPath = distPath("404.html");
if (!existsSync(notFoundPath)) fail("Missing 404.html");
else if (!/name="robots" content="noindex, nofollow"/i.test(readFileSync(notFoundPath, "utf8"))) fail("404 page is not noindex");

const sitemapPath = distPath("sitemap.xml");
if (!existsSync(sitemapPath)) fail("Missing sitemap.xml");
else {
  const sitemap = readFileSync(sitemapPath, "utf8");
  for (const [route] of routes) {
    if (!sitemap.includes(new URL(route, origin).toString())) fail(`Sitemap missing ${route}`);
  }
  if (/og-card|404/.test(sitemap)) fail("Sitemap includes a non-indexable route");
}

const robotsPath = distPath("robots.txt");
if (!existsSync(robotsPath) || !readFileSync(robotsPath, "utf8").includes(`${origin}/sitemap.xml`)) fail("robots.txt is missing the canonical sitemap");

const ogPath = distPath("og-sift.png");
if (!existsSync(ogPath)) fail("Missing og-sift.png");
else {
  const buffer = readFileSync(ogPath);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== 1200 || height !== 630) fail(`OG image is ${width}x${height}, expected 1200x630`);
  if (statSync(ogPath).size < 20_000) fail("OG image appears unexpectedly small");
}

const annotationFontPath = distPath("fonts", "kalam-regular.ttf");
const annotationLicensePath = distPath("fonts", "OFL-Kalam.txt");
if (!existsSync(annotationFontPath) || statSync(annotationFontPath).size < 100_000) {
  fail("Missing or unexpectedly small Kalam annotation font");
}
if (!existsSync(annotationLicensePath)) fail("Missing Kalam font license");

if (failures.length > 0) {
  console.error("Build verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified ${routes.length} public routes, annotations, fonts, metadata, internal links, sitemap, robots, 404, and 1200x630 social image.`);

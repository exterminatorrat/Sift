---
name: "Sift"
description: "Know what to ask before you eat."
colors:
  primary-teal: "#1F8A83"
  primary-deep: "#18746E"
  primary-soft: "#DDF4F1"
  app-cream: "#FFF8EF"
  warm-surface: "#FFFCF7"
  tangerine: "#F2A65A"
  safe-green: "#2FAE72"
  ask-amber: "#B17812"
  danger-red: "#D94F4F"
  ink: "#182321"
  ink-muted: "#5F6F6B"
  ink-subtle: "#8A9692"
  border: "#E6DCCF"
  border-soft: "#F0E7DB"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: "0"
  headline:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: "0"
  title:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0"
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.38
    letterSpacing: "0"
rounded:
  control: "10px"
  surface: "12px"
  feature: "16px"
  media: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "14px 22px"
    height: "48px"
  status-chip:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 10px"
  evidence-card:
    backgroundColor: "{colors.warm-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "16px"
---

# Design System: Sift

## 1. Overview

**Creative North Star: "The Menu Margin"**

Sift should feel like the calm, useful notes a careful diner would want beside a real restaurant menu. Product evidence sits close to the original menu language: a visible phrase, a possible concern, the uncertainty around it, and the question that follows. The system is human and table-side first; AI machinery stays behind the explanation.

The website may be more expressive than the app, but it must preserve Sift's protective clarity. Deep teal supplies confidence, true white creates breathing room, and app cream appears primarily inside authentic product surfaces. The system explicitly rejects generic AI startup templates and the V1 website's cream-and-serif editorial template.

**Key Characteristics:**

- Real app screens and real menu context carry the visual story.
- Editorial scale is used sparingly; the page is not styled like a magazine.
- Risk information pairs color with language, hierarchy, and iconography.
- Open layouts and strong bands replace repetitive card grids.
- Motion explains scanning or state change and always respects reduced motion.

## 2. Colors

The palette is composed and culinary without becoming rustic: protective teal, clean white space, restrained app cream, and semantic colors used only when they communicate risk.

### Primary

- **Protective Teal:** The main action and brand color. It anchors navigation, calls to action, and the scanning motif.
- **Deep Table Teal:** Used for high-contrast brand fields, footer structure, and active states.
- **Quiet Teal Wash:** Used for selected allergy states, evidence highlights, and low-intensity focus regions.

### Secondary

- **Table Tangerine:** A limited human accent for small moments of warmth. It is never a second primary action color.

### Tertiary

- **Safe Green, Ask Amber, and Danger Red:** Semantic-only colors. They describe a result state and never decorate a section.

### Neutral

- **App Cream:** The native product canvas. On the website it belongs inside app captures and small supporting surfaces, not across every page.
- **Warm Surface:** A near-white surface for product-aligned controls and evidence containers.
- **Dining Ink:** The primary text color.
- **Muted and Subtle Ink:** Supporting copy and metadata, used only where contrast remains WCAG 2.2 AA compliant.
- **Warm Borders:** Hairline separation for app-aligned controls and evidence structures.

**The App Cream Is Evidence Rule.** App cream belongs to Sift's product world. Do not turn it into the website's universal wallpaper.

**The Semantic Color Rule.** Green, amber, and red appear only when a visible label explains their meaning.

## 3. Typography

**Display Font:** Source Serif 4 (with Georgia fallback)
**Body Font:** Source Serif 4 (with Georgia fallback)
**Label Font:** Inter (with Arial fallback)

**Character:** Source Serif 4 gives Sift a patient, human voice without resorting to a high-fashion editorial serif. Inter remains a compact utility face for navigation, controls, and metadata already present in the app.

### Hierarchy

- **Display** (400, 36px app baseline, 1.22): Brand thesis and rare hero-scale statements. Website display sizes may scale fluidly but never exceed 96px or track tighter than -0.04em.
- **Headline** (600, 28px, 1.29): Page and major section headings.
- **Title** (500, 20px, 1.4): Product modules, evidence sections, and compact editorial statements.
- **Body** (400, 16px, 1.625): Explanations and legal/support copy, capped around 70ch.
- **Label** (600, 13px, 1.38): Controls, navigation, metadata, and risk labels. Uppercase is reserved for short functional labels, never repeated above every section.

**The Human First Rule.** Product and safety explanations use the serif body voice; utility labels use the sans. Technical language never takes over the page.

## 4. Elevation

Sift is flat by default. Depth comes from tonal layering, overlap between a real menu and a product screen, and crisp surface boundaries. Shadows are ambient and rare: use them for phone renders, navigation that must separate from moving content, or a temporary interactive layer—not on every container.

### Shadow Vocabulary

- **Phone Lift** (`0 24px 64px rgba(24, 35, 33, 0.18)`): Product renders only.
- **Control Lift** (`0 4px 8px rgba(24, 35, 33, 0.08)`): Floating controls and focused navigation only.
- **Ambient Veil** (`0 12px 32px rgba(24, 35, 33, 0.10)`): Menus, dialogs, and temporary overlays.

**The No Ghost Cards Rule.** Never combine a decorative 1px border with a wide soft shadow. Choose a structural border or a restrained lift.

## 5. Components

Components are tactile, quiet, and direct. Every interactive state should feel immediate without drawing attention away from product evidence.

### Buttons

- **Shape:** Full pill for primary and secondary actions.
- **Primary:** Protective teal with white text, 48px minimum height, and concise action copy.
- **Hover / Focus:** Darken to Deep Table Teal on hover. Use a 2px focus ring with clear offset. Press to 0.97 scale for 120-160ms.
- **Secondary:** Warm Surface with a structural border and Deep Table Teal text. Never add a broad shadow.

### Chips

- **Style:** Compact pill with a tinted surface and high-contrast text.
- **State:** Selected, risk, and filter chips always include text; status icons supplement rather than replace the label.

### Cards / Containers

- **Corner Style:** Disciplined 12-16px radii. Media may use 24px when the crop benefits.
- **Background:** True white for web content; Warm Surface for product-aligned evidence.
- **Shadow Strategy:** Flat at rest. Refer to the limited Elevation vocabulary.
- **Border:** Hairline warm border only when it clarifies grouping.
- **Internal Padding:** 16-24px, with more open space around primary product evidence.

### Inputs / Fields

- **Style:** Warm Surface or white fill, 10-12px radius, high-contrast placeholder, and a clear label above the field.
- **Focus:** 2px Protective Teal ring with 2px offset.
- **Error / Disabled:** Pair semantic color with explicit text. Never use color alone.

### Navigation

Navigation stays quiet: the real Sift mark, essential routes, and one App Store action. Desktop navigation may sit on a solid field; mobile navigation uses a simple disclosure without decorative glass or oversized pills.

### Menu Annotation

The signature component links visible menu language to one concern and one useful staff question. It may use underlines, marginal notes, and connectors only when they map to actual evidence. It never becomes decorative diagram wallpaper.

## 6. Do's and Don'ts

### Do:

- **Do** use authentic current Sift captures as the primary product proof.
- **Do** keep body contrast at or above WCAG 2.2 AA and provide visible keyboard focus.
- **Do** pair every green, amber, or red state with a readable label.
- **Do** use one strong menu-annotation moment as the site's memorable signature.
- **Do** show uncertainty, fallbacks, and limitations beside the reliability method.
- **Do** respect reduced motion and keep interface feedback under 300ms.

### Don't:

- **Don't** use generic AI startup templates: gradient meshes, glowing orbs, AI badges, fake dashboards, invented metrics, or vague intelligence claims.
- **Don't** repeat the V1 website's cream-and-serif editorial template, tiny uppercase kickers, decorative numbered scaffolding, glass navigation, broad shadows, or oversized radii.
- **Don't** add waitlist forms, early-access cards, “coming soon” calls to action, or launch theater.
- **Don't** present reconstructed, outdated, or invented phone UI as the real product.
- **Don't** claim that a dish is “safe to eat,” imply a food-safety guarantee, or publish an unsupported accuracy percentage.
- **Don't** fabricate testimonials, press logos, customer counts, or App Store availability.
- **Don't** use gradient text, decorative grid backgrounds, repeating stripes, side-stripe borders, or nested card grids.

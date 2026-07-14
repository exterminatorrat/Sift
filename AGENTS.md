# Sift Codex Instructions

These instructions apply to all work inside the Sift project.

## Default Workflow

For every coding, debugging, review, refactoring, architecture, implementation, and planning task:

- Use the `andrej-karpathy-skill` workflow by default.
- Keep changes surgical and directly tied to the request.
- Prefer the existing project structure, conventions, and dependencies.
- Avoid speculative architecture, broad rewrites, unrelated formatting, and new dependencies unless clearly justified.
- State assumptions when they affect the implementation.
- Define what success means before calling the task complete.
- Run the narrowest meaningful verification available. If verification is skipped, explain why.

## General Purpose Skills

For general product, engineering, implementation, review, and polish work, use these skills by default when available:

- `andrej-karpathy-skill`
- `ponytail`
- `impeccable`

If `ponytail` is not installed or not available in the active Codex session, continue with the available skills and mention the gap only when it materially affects the task.

## UI And Frontend Work

When a task touches UI, UX, frontend implementation, visual design, layout, styling, animation, responsive behavior, component polish, product flows, design systems, or user-facing copy, use all relevant UI skills that are available.

Default UI skill set:

- `impeccable`
- `emil-design-eng`
- `frontend-design`
- `build-web-apps:frontend-app-builder` for new frontend apps, dashboards, tools, games, or visually driven UI.
- `build-web-apps:frontend-testing-debugging` for rendered frontend testing, screenshots, browser debugging, and visual QA.
- `build-web-apps:react-best-practices` for React or Next.js implementation.
- `build-web-apps:shadcn` when the project uses shadcn components or the task asks for shadcn work.

Use Mobbin MCP for UI inspiration and reference research when current product examples, app screens, flows, or website sections would improve the design decision. Cite Mobbin links when presenting specific examples.

For frontend work, verify the rendered result when feasible, especially for layout, responsiveness, visual overlap, navigation, interactive states, and animation.

## App Store, Launch, Legal, And Compliance Work

When a task relates to App Store submission, Apple review risk, launch readiness, release checklists, compliance, policy, privacy, legal exposure, subscriptions, payments, permissions, tracking, user-generated content, moderation, safety, health, finance, children, account deletion, or any other submission-sensitive area:

- Use `app-store-review`.
- Treat App Store and legal/compliance checks as risk review, not legal advice.
- Identify concrete rejection risks, missing evidence, unclear claims, required disclosures, and launch-blocking gaps.
- Prefer actionable checklists tied to the app's actual implementation and release path.

## Reviews

When asked for a review, prioritize findings first:

- Bugs, regressions, reliability issues, security risks, privacy risks, compliance risks, accessibility issues, and missing tests.
- Order findings by severity.
- Include file and line references when reviewing code.
- Keep summaries secondary and brief.

## Verification Standard

Before finishing:

- Run the smallest useful command or manual check that proves the change.
- For UI, prefer a real browser/rendered verification when practical.
- For app launch or App Store readiness, produce a concrete pass/fail checklist with remaining risks.
- If a check cannot be run, say exactly why and what risk remains.

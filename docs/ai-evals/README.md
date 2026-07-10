# Sift AI Eval Set

This directory contains Sift's static and live menu-analysis reliability sets. Static checks never call a provider. Live checks call the deployed Supabase Edge Function and must remain within the free-tier safety controls described below.

The evals check the behavior Sift must preserve:

- Never use food-safety guarantee language.
- Escalate severe allergy uncertainty.
- Mark unreadable or incomplete menus as `unclear` or `ask_staff`.
- Include practical staff questions for every dish.
- Include restaurant-language questions and user-language references when requested.
- Keep transparency user-facing, not hidden chain-of-thought.

## How To Use

1. Run the static fixture checks:

```bash
npm run eval:ai
```

2. To validate a saved model response, place it in `docs/ai-evals/sample-output.json`.

3. Run the checks again:

```bash
npm run eval:ai -- docs/ai-evals/sample-output.json
```

4. For a live image run, prepare a disposable anonymous user:

```bash
npm run eval:ai:live -- prepare
```

Assign that user a server-side test entitlement, then run a paced phase:

```bash
npm run eval:ai:live -- run --phase gate --cases all
```

The runner spaces calls 15 seconds apart by default and refuses to exceed 120 claimed calls. Use `--min-call-interval-ms` when the active AI Studio free-tier limit requires slower pacing. Stop on quota or billing-required responses; never enable billing just to finish the eval.

Clean up when finished:

```bash
npm run eval:ai:live -- cleanup
```

Delete the disposable auth user server-side so entitlement and usage rows cascade. Raw evidence is written under ignored `output/ai-evals`.

These checks validate broad reliability requirements only. They do not prove that a model is medically or operationally correct.

## Cases

The static cases map to `E-001` through `E-025`. The live manifest adds 60 image cases:

- Japanese ramen menu with severe peanut and sesame allergies.
- Mexican menu with mole, dairy, egg, sesame, and peanut concerns.
- Blurry or unreadable menu.
- Direct listed shellfish allergen.
- Vague sauces and shared fryer.
- Same menu with severe vs mild sesame profile.
- Non-English niche-language menu with unknown restaurant language.
- Low-risk simple item with mild peanut profile.
- Hidden sesame, peanut, dairy, egg, soy, wheat/gluten, shellfish, and tree-nut risk patterns.
- Shared fryer, vague sauce, low-confidence, and poor-image escalation scenarios.
- Spanish, Japanese, French, and unclear-language menu scenarios.

The image set contains 48 deterministic menu renders and 12 licensed public-domain or Creative Commons photos. Attribution and source URLs are in `licensed-images.json`. The generated manifest is `image-cases.json`; deterministic source templates live in `scripts/generate-ai-image-fixtures.py`.

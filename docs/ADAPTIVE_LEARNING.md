# Adaptive Learning

How the app decides what to ask next and in which quiz mode. This describes the code as it
exists; older design docs for an "advanced ML" layer were removed because that code was never
wired into the app.

## Pipeline

1. **Word selection** – `services/wordSelectionManager.ts` picks the next words. Overdue words
   outrank new ones; sessions interleave small groups and both translation directions.
2. **Scheduling** – `services/spacedRepetitionService.ts` computes review intervals and the base
   quiz mode from a word's progress (`store/types.ts › WordProgress`).
3. **Mastery** – `services/masteryService.ts` converts answers into XP/mastery and applies decay.
4. **Adaptation** – `services/adaptiveLearningEngine.ts` may override the mode (for example fall
   back to multiple choice when the learner is struggling), using the lightweight signals in
   `services/simpleAIInterfaces.ts` (cognitive load, momentum, motivation).
5. **Challenge modes** – boss battle, quick dash, deep dive, streak and precision modes get the
   same signals through `services/challengeAIIntegrator.ts`, with a non-adaptive fallback.
6. **Learner profile** – `services/storage/userLearningProfile.ts` aggregates long-term patterns
   (using `services/ai/learningCoach.ts`) for the stats page.

## Rules of thumb

- Everything adaptive must degrade to the plain spaced-repetition behaviour if a signal is missing.
- Keep scheduling and mastery logic in pure functions with unit tests (`services/__tests__`).
- Don't add a new "AI" layer without a measurable effect on word selection; delete it if it has none.

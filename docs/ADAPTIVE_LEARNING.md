# Adaptive Learning

How the app decides what to ask next and in which quiz mode. This describes the code as it
exists; older design docs for an "advanced ML" layer were removed because that code was never
wired into the app.

## Regular practice

This is the path ordinary language/module practice takes. No adaptive-engine or "AI" step is
involved.

1. **Word selection** – `store/gameSlice.ts` asks `services/wordSelectionManager.ts` for the
   next word. It weighs struggling and overdue words, applies mastery decay
   (`calculateMasteryDecay`) and tracks recently shown words.
2. **Session building** – for module sessions, `services/enhancedWordService.ts` calls
   `services/cacheService.ts › createLearningSession`, which uses
   `services/spacedRepetitionService.ts` (`calculateNextReviewTime`, learning phases and word
   groups) to choose which words are due and how they are grouped.
3. **Quiz mode** – `services/masteryService.ts › getMasteryQuizMode` maps a word's mastery to a
   quiz mode.
4. **Scoring** – `services/masteryService.ts › calculateMasteryGain` turns an answer into XP.

## Challenge modes

Boss battle, quick dash, deep dive, streak, precision and fill-in-the-blank run through
`services/challengeAIIntegrator.ts`. It is the only runtime caller of
`services/adaptiveLearningEngine.ts`, which may override the quiz mode (for example fall back to
multiple choice when the learner is struggling) using the lightweight signals in
`services/simpleAIInterfaces.ts` (cognitive load, momentum, motivation). If those signals are
missing, challenge modes use their non-adaptive fallback.

## Learner profile and stats (separate data paths)

- **Learner profile** – `services/storage/userLearningProfile.ts` stores long-term data written
  by the challenge-mode services (session results, interventions). The profile page
  (`UserProfile` / `UserProfilePage`) reads it through `hooks/useUserLearningProfile.ts`.
  `services/ai/learningCoach.ts` is only a source of types for it; nothing runs the coach.
- **Stats page** – `LearningStatsPage` does not use the profile. It reads word progress
  (`DataMigrationService`) and the analytics from `learningCacheService` and displays measured
  counts only.

## Rules of thumb

- Anything adaptive must degrade to the plain spaced-repetition behaviour if a signal is missing.
- Keep scheduling and mastery logic in pure functions with unit tests (`services/__tests__`).
- Don't add a new "AI" layer without a measurable effect on word selection; delete it if it has none.

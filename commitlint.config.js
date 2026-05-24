/**
 * Conventional Commits enforcement.
 * See: https://www.conventionalcommits.org/
 *
 * Allowed types and what they mean for Tara:
 *   feat     — new feature (booking flow, owner dashboard, etc.)
 *   fix      — bug fix
 *   docs     — docs only (ADRs, README, comments)
 *   style    — formatting, missing semicolons, no code change
 *   refactor — code change that doesn't add a feature or fix a bug
 *   perf     — performance improvement
 *   test     — adding or refactoring tests
 *   build    — build system, dependencies, monorepo wiring
 *   ci       — CI config (GitHub Actions, etc.)
 *   chore    — misc that doesn't fit above (renames, version bumps)
 *   revert   — reverts a previous commit
 *
 * Scope (optional) usually names a module or app:
 *   booking, pricing, web, api, db, schemas, auth, payment, infra, docs
 *
 * Examples:
 *   feat(booking): add 15-minute hold expiry sweeper
 *   fix(pricing): correct length-of-stay discount edge case
 *   chore(deps): bump pnpm to 9.12.0
 *   docs(adr): add ADR-0008 for image pipeline
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [1, 'always', 120],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};

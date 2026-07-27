# Task List: Spellkit–Lexical Contract

This list implements the approved
`docs/spec-lexical-contract.md`. Tasks are ordered by dependency.

## Task 1: Establish the package toolchain

**Description:** Configure the root package as strict TypeScript with ESM
runtime output, declarations, linting, and a test runner. Add the four commands
promised by the spec and package metadata suitable for later export work.

**Acceptance criteria:**

- [x] `build`, `test`, `lint`, and `typecheck` scripts exist and run.
- [x] Strict TypeScript compiles a minimal source entry and test fixture.
- [x] Build output and dependency directories are ignored by Git.

**Verification:**

- [x] Run `npm run build`.
- [x] Run `npm test`.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `eslint.config.js`
- `.gitignore`

**Estimated scope:** Medium (5 files)

## Task 2: Define types and validate checker output

**Description:** Add the approved public contract types and an internal boundary
that validates, orders, and normalizes results returned by injected checkers.

**Acceptance criteria:**

- [x] The request, match, issue, snapshot, options, checker, and controller
  contracts match the approved spec.
- [x] Invalid, out-of-bounds, and overlapping matches are rejected
  deterministically.
- [x] Suggestions, optional codes, and opaque data normalize without mutation.

**Verification:**

- [x] Run `npm test -- tests/contract/checker.test.ts`.
- [x] Run `npm run typecheck`.

**Dependencies:** Task 1

**Files likely touched:**

- `src/types/index.ts`
- `src/checker/normalizeMatches.ts`
- `tests/contract/checker.test.ts`

**Estimated scope:** Medium (3 files)

## Task 3: Extract and map Lexical text

**Description:** Build the internal per-block extractor and segment map that
converts checker offsets into revision-bound Lexical ranges across adjacent text
nodes.

**Acceptance criteria:**

- [x] Each top-level block is a separate check unit.
- [x] Words split by inline formatting map across their source text nodes.
- [x] `shouldCheck` exclusions and UTF-16 offsets behave as specified.

**Verification:**

- [x] Run `npm test -- tests/integration/textMapping.test.ts`.
- [x] Run `npm run typecheck`.

**Dependencies:** Task 2

**Files likely touched:**

- `src/lexical/extractSegments.ts`
- `src/lexical/mapRange.ts`
- `tests/integration/textMapping.test.ts`

**Estimated scope:** Medium (3 files)

## Task 4: Implement controller lifecycle and issue store

**Description:** Register Lexical observation, schedule injected checks, publish
immutable snapshots, and implement subscription, error, cancellation, recheck,
and disposal semantics.

**Acceptance criteria:**

- [x] Text changes schedule debounced checks while selection-only changes do
  not.
- [x] Stale or aborted checker responses can never publish.
- [x] Snapshot identity, notification ordering, errors, and idempotent disposal
  match the spec.

**Verification:**

- [x] Run `npm test -- tests/integration/controller.test.ts`.
- [x] Run `npm run build`.
- [x] Run `npm run typecheck`.

**Dependencies:** Task 3

**Files likely touched:**

- `src/state/createStore.ts`
- `src/lexical/registerSpellCheck.ts`
- `src/checker/runCheck.ts`
- `tests/integration/controller.test.ts`

**Estimated scope:** Medium (4 files)

## Task 5: Add safe replacement

**Description:** Implement the controller's `replace()` operation with snapshot
membership and live-editor text validation before one discrete Lexical update.

**Acceptance criteria:**

- [x] A current issue replaces exactly its mapped range and returns `true`.
- [x] Stale, foreign, or text-mismatched issues leave the editor unchanged and
  return `false`.
- [x] A successful replacement is one undoable editor operation with the
  selection after the inserted text.

**Verification:**

- [x] Run `npm test -- tests/integration/replacement.test.ts`.
- [x] Run `npm run typecheck`.

**Dependencies:** Task 4

**Files likely touched:**

- `src/lexical/replaceIssue.ts`
- `src/lexical/registerSpellCheck.ts`
- `tests/integration/replacement.test.ts`

**Estimated scope:** Medium (3 files)

## Task 6: Lock down public exports

**Description:** Export only the documented controller function and public
types, finalize package entry points, and add a consumer-facing compilation
test.

**Acceptance criteria:**

- [x] Runtime and type exports match the approved contract.
- [x] Built JavaScript and declarations resolve through package exports.
- [x] Core output has no React import or dependency.

**Verification:**

- [x] Run `npm test -- tests/contract/publicApi.test.ts`.
- [x] Run `npm run build`.
- [x] Run `npm run typecheck`.

**Dependencies:** Tasks 4 and 5

**Files likely touched:**

- `src/index.ts`
- `package.json`
- `tests/contract/publicApi.test.ts`

**Estimated scope:** Medium (3 files)

## Checkpoint: Core package

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Compare the public declarations and behavior with the approved spec.

## Task 7: Prove the contract in the demo

**Description:** Consume the built core from the existing React/Lexical demo.
Keep subscription adaptation, issue decoration, suggestions, and interaction
entirely demo-owned.

**Acceptance criteria:**

- [x] The demo registers a checker and reacts to controller snapshots.
- [x] Demo-owned code renders a misspelling indicator and suggestion UI.
- [x] Selecting a suggestion calls `replace()` successfully.

**Verification:**

- [x] Run `npm --prefix lexical-editor run build`.
- [x] Run `npm --prefix lexical-editor run lint`.
- [ ] Manually type a misspelling, observe its indicator, and replace it.

**Dependencies:** Task 6

**Files likely touched:**

- `lexical-editor/package.json`
- `lexical-editor/src/App.jsx`
- `lexical-editor/src/App.css`
- `lexical-editor/src/SpellCheckPlugin.jsx`

**Estimated scope:** Medium (4 files)

## Task 8: Complete contract verification

**Description:** Run the entire quality suite, close coverage gaps, and update
documentation where implementation revealed details without changing approved
semantics.

**Acceptance criteria:**

- [ ] Every success criterion in the approved spec has evidence.
- [x] All automated and demo build checks pass.
- [x] Documentation accurately describes the shipped public API.

**Verification:**

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `npm run lint`.
- [x] Run `npm run typecheck`.
- [x] Run `npm --prefix lexical-editor run build`.
- [x] Run `npm --prefix lexical-editor run lint`.

**Dependencies:** Task 7

**Files likely touched:**

- `docs/spec-lexical-contract.md`
- `README.md`
- Existing test files requiring coverage completion

**Estimated scope:** Medium (up to 5 files)

## Checkpoint: Complete

- [ ] All eight tasks meet their acceptance criteria.
- [x] No task introduced React or presentation behavior into core.
- [x] The approved contract remains backward-compatible with its specification.
- [x] Implementation is ready for human review.

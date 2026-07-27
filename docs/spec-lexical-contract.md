# Spec: Spellkit–Lexical Contract

Status: Approved on 2026-07-26

## Objective

Build a framework-independent spellcheck integration for Lexical editors.

Spellkit observes editor text, delegates detection to a consumer-supplied
checker, maps checker results back to Lexical ranges, and exposes reactive issue
state. It does not render underlines, suggestion menus, or replacement UI.

The primary user is a library consumer building their own editor UI. The public
API must make these tasks straightforward:

- Subscribe to the current spelling issues.
- Associate each issue with an exact range in the current Lexical editor state.
- Render custom decorations such as underlines without Spellkit owning DOM.
- Present suggestions in any UI framework.
- Apply a selected replacement safely.
- Trigger or suspend checking as application state changes.

## Assumptions

1. `spellkit` is the package being designed; there is no separate
   `spellcheck-service` package.
2. The core package depends on Lexical but not React.
3. Consumers inject the spell checker implementation.
4. JavaScript UTF-16 code-unit offsets are used throughout the checker contract,
   matching string slicing and Lexical text offsets.
5. Spellkit may offer optional framework adapters later, but the core contract
   must not require them.
6. Issue snapshots are ephemeral views of a particular editor revision. Node
   keys and offsets are not promised to remain valid after subsequent edits.

## Tech Stack

- TypeScript
- `lexical` `^0.48.0` as a peer dependency
- No UI framework dependency in the core entry point
- Test runner, build tool, and lint tool: to be selected before implementation

## Proposed Public Contract

The names below are contract-level proposals, not an implementation.

```ts
import type {
  LexicalEditor,
  NodeKey,
  TextNode,
} from "lexical";

export interface SpellChecker {
  check(
    request: SpellCheckRequest,
    context: SpellCheckContext,
  ): Promise<readonly SpellCheckMatch[]>;
}

export interface SpellCheckRequest {
  /** Exact text against which every returned offset is measured. */
  readonly text: string;
  /** BCP 47 language tag when one is known. */
  readonly language?: string;
}

export interface SpellCheckContext {
  /**
   * Aborted when this request has been superseded or the integration is
   * disposed. A checker may use this to cancel local or network work.
   */
  readonly signal: AbortSignal;
}

export interface SpellCheckMatch {
  /** UTF-16 offset into request.text. */
  readonly offset: number;
  /** UTF-16 length in request.text; must be greater than zero. */
  readonly length: number;
  readonly suggestions?: readonly string[];
  /** Optional stable category supplied by the checker. */
  readonly code?: string;
  /** Checker-specific metadata preserved without interpretation. */
  readonly data?: unknown;
}

export interface SpellCheckPoint {
  readonly key: NodeKey;
  readonly offset: number;
}

export interface SpellCheckRange {
  readonly anchor: SpellCheckPoint;
  readonly focus: SpellCheckPoint;
}

export interface SpellCheckIssue {
  /** Unique only within the snapshot that contains it. */
  readonly id: string;
  readonly text: string;
  readonly range: SpellCheckRange;
  readonly suggestions: readonly string[];
  readonly code?: string;
  readonly data?: unknown;
}

export type SpellCheckStatus =
  | { readonly type: "idle" }
  | { readonly type: "checking" }
  | { readonly type: "ready" }
  | { readonly type: "error"; readonly error: unknown };

export interface SpellCheckSnapshot {
  /**
   * Monotonically increasing integration-local revision. A snapshot and all of
   * its issues must be treated as one immutable unit.
   */
  readonly revision: number;
  readonly status: SpellCheckStatus;
  readonly issues: readonly SpellCheckIssue[];
}

export interface SpellCheckOptions {
  readonly checker: SpellChecker;
  readonly language?: string | (() => string | undefined);
  readonly debounceMs?: number;
  /**
   * Runs inside a Lexical read transaction. It must be synchronous and
   * side-effect-free.
   */
  readonly shouldCheck?: (node: TextNode) => boolean;
  readonly onError?: (error: unknown) => void;
}

export interface SpellCheckController {
  getSnapshot(): SpellCheckSnapshot;
  subscribe(listener: () => void): () => void;
  recheck(): void;
  replace(issue: SpellCheckIssue, replacement: string): boolean;
  dispose(): void;
}

export function registerSpellCheck(
  editor: LexicalEditor,
  options: SpellCheckOptions,
): SpellCheckController;
```

### Checker semantics

- Spellkit supplies the exact string checked; matches are offsets into that
  string.
- A checker may be local, worker-backed, or remote.
- Matches may arrive in any order. Spellkit normalizes their order by document
  position.
- Spellkit validates every match. Non-finite, fractional, negative,
  zero-length, overlapping, or out-of-bounds matches are rejected.
- Suggestions default to an empty immutable array.
- Aborting a request is advisory: stale results are discarded even if the
  checker ignores `AbortSignal`.
- Rejected checker promises set the snapshot status to `error`. Issues remain
  empty because checking clears the previous revision before work begins.

### Lexical semantics

- Spellkit listens for text-affecting editor updates and ignores
  selection-only updates.
- Checking never runs synchronously inside a Lexical read or update transaction.
- Text extraction preserves an internal mapping from checker offsets to Lexical
  text-node offsets.
- Published issue ranges always refer to the editor revision from which their
  checker request was created.
- When the editor changes, previous issues are not applied to the new revision.
  They are cleared as one atomic snapshot notification before the new check.
- The first implementation checks text within each top-level element
  independently. Spellkit does not form words across top-level block
  boundaries.
- Spellkit must support words spanning adjacent text nodes within one block,
  including nodes split by inline formatting.
- Nodes that are not ordinary editable text are excluded by default.
- `shouldCheck` lets consumers exclude candidate text nodes. Returning `false`
  excludes the node. If it throws, extraction stops and the error is reported
  through the standard error path.
- Text stored only inside a custom non-text node is outside the v1 contract.

### Subscription semantics

- `getSnapshot()` returns the same object identity until observable state
  changes.
- A subscription callback receives no payload; the consumer calls
  `getSnapshot()` afterward. This works with framework subscription primitives
  without coupling the core to a framework.
- Notifications occur after the corresponding snapshot becomes readable.
- Listener ordering is unspecified.
- Unsubscribing is idempotent.
- `dispose()` is idempotent, unregisters Lexical listeners, aborts outstanding
  checks, and prevents future notifications.

### Decoration support

Spellkit does not mutate the document merely to display an issue. Consumers use
the immutable issue snapshot and its Lexical ranges to implement their chosen
presentation:

- a custom Lexical node or node-state strategy;
- a DOM overlay;
- editor theme classes managed by a consumer plugin; or
- a framework adapter built on `subscribe()` and `getSnapshot()`.

Any later decoration helper must remain optional and must not make presentational
nodes part of Spellkit's core document model.

### Replacement semantics

`replace(issue, replacement)` is a convenience operation, not UI:

- It returns `false` without editing when `issue` is not from the current
  snapshot or its range no longer contains `issue.text`.
- It performs one discrete Lexical update when valid and returns `true`.
- It replaces only the issue range and places the selection after the inserted
  text.
- It does not automatically choose a suggestion.
- Consumers may ignore this helper and perform their own editor command/update.

### Error and compatibility semantics

- Configuration errors throw synchronously during registration.
- Checker failures are represented in `SpellCheckSnapshot.status` and forwarded
  to `onError` when supplied.
- Consumer callback errors are not swallowed.
- Unknown checker `data` is passed through but never executed or rendered.
- Public types favor additive optional fields. Renaming fields or changing
  established semantics requires a major version.
- Lexical is a peer dependency so the host editor and Spellkit operate on the
  same Lexical instance.

## Commands

The root package currently defines no scripts. Before implementation, the
following command contract must be added and made executable:

```sh
npm run build
npm test
npm run lint
npm run typecheck
```

The demo editor retains:

```sh
npm --prefix lexical-editor run dev
npm --prefix lexical-editor run build
npm --prefix lexical-editor run lint
```

## Project Structure

```text
src/
  index.ts              Public core exports
  checker/              Checker-boundary validation and normalization
  lexical/              Text extraction, offset mapping, and registration
  state/                Snapshot and subscription implementation
  types/                Public contract types
tests/
  contract/             Public API and behavioral contract tests
  integration/          Tests against real Lexical editor states
lexical-editor/         Manual integration/demo application
docs/
  spec-lexical-contract.md
```

The exact file split may change during planning, but public exports remain
centralized in `src/index.ts`.

## Code Style

Use strict TypeScript, explicit public return types, immutable public data, and
descriptive domain names. Avoid leaking internal extraction units through the
API.

```ts
export function registerSpellCheck(
  editor: LexicalEditor,
  options: SpellCheckOptions,
): SpellCheckController {
  assertValidOptions(options);
  return createSpellCheckController(editor, options);
}
```

Conventions:

- `camelCase` for functions and values; `PascalCase` for types.
- `readonly` on public input and snapshot fields.
- Discriminated unions for observable lifecycle state.
- No `any` in public declarations.
- Public APIs are exported only from the package entry point.

## Testing Strategy

### Contract tests

- A checker receives the exact documented text and UTF-16 offset convention.
- Invalid checker matches never become issues.
- `getSnapshot()` object identity is stable between changes.
- Subscribe, unsubscribe, and dispose semantics are deterministic.
- Checker rejection produces the documented error state.

### Lexical integration tests

- Plain text maps to the correct node keys and offsets.
- A word split across formatted text nodes is checked as one word and maps to a
  multi-node range.
- Separate blocks are checked independently.
- Selection-only updates do not schedule checking.
- Rapid edits abort or supersede old requests, and stale results never publish.
- Replacements succeed for current issues and fail safely for stale issues.
- Undo treats one replacement as one editor operation.

### Manual demo verification

- A framework-specific demo subscribes to the core controller.
- The demo can render an underline without modifying Spellkit core.
- The demo can display suggestions and invoke `replace()`.

Coverage thresholds will be selected with the test runner. All public-state
transitions and offset-mapping branches require automated coverage.

## Boundaries

### Always

- Keep the core independent of React and other UI frameworks.
- Validate checker output at the checker boundary.
- Discard results that do not belong to the current editor revision.
- Treat public snapshots as immutable.
- Run build, tests, lint, and type checking before release.
- Document observable ordering, error, cancellation, and lifecycle semantics.

### Ask first

- Add a runtime dependency other than Lexical.
- Add a framework adapter to the core entry point.
- Introduce persistent decoration nodes into consumer documents.
- Change text segmentation or offset conventions.
- Add grammar or style issue variants to the spellchecking contract.

### Never

- Render menus, suggestions, underlines, or CSS from the core.
- Send editor text over the network except through the injected checker.
- Retain editor content after it is no longer needed for the current check.
- Trust checker-provided ranges without validation.
- Expose mutable internal issue collections.
- Publish stale checker results.

## Success Criteria

- A Lexical editor can register Spellkit without installing React.
- A local, worker-backed, or remote checker can implement one documented
  interface.
- Consumers can react to immutable issue snapshots using their framework of
  choice.
- Every published issue identifies its text, suggestions, and exact Lexical
  range for one documented revision.
- Consumers can implement underlines without Spellkit controlling presentation.
- A consumer can safely apply a suggestion through `replace()` or use the
  exposed range in its own update.
- Rapid typing cannot cause stale issues to be attached to newer editor text.
- Words split across inline formatting are mapped correctly.
- The package passes its build, test, lint, and typecheck commands.

## Resolved Design Decisions

1. V1 uses a synchronous, side-effect-free `shouldCheck` text-node predicate.
   A custom extractor registry is deferred until a concrete non-text-node use
   case establishes its mapping requirements.
2. `language` is global per controller and may be a static value or getter.
3. Issues are cleared immediately when their editor revision becomes stale.
4. Checker matches support an optional checker-defined `code` alongside opaque
   `data`.
5. `replace()` remains in the minimal core as a safe convenience operation.

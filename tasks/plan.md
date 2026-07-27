# Implementation Plan: Spellkit–Lexical Contract

## Overview

Implement the approved framework-independent Spellkit core described in
`docs/spec-lexical-contract.md`. Work proceeds from a compilable package and
public types through the two highest-risk internals—Lexical offset mapping and
stale async-result handling—then adds replacement behavior, locks down the
package surface, and finishes with a demo integration.

## Architecture Decisions

- `lexical` remains a peer dependency so Spellkit and its host use one Lexical
  runtime.
- The root package becomes strict TypeScript with ESM output and declaration
  files.
- The checker boundary accepts plain text and UTF-16 offsets. It validates and
  normalizes all async checker output before publication.
- Text is extracted per top-level block. An internal segment map joins adjacent
  text nodes so words may cross inline-format boundaries while issues still map
  back to exact node keys and offsets.
- A controller owns editor listeners, request cancellation, revision tracking,
  immutable snapshots, and subscriptions.
- Consumers receive revision-bound Lexical ranges. Core never creates
  presentational nodes or DOM.
- `replace()` validates the issue against the current snapshot and editor text
  before performing one Lexical update.
- `shouldCheck` is the v1 customization boundary. Arbitrary custom-node
  extraction is intentionally deferred.

## Dependency Graph

```text
Package toolchain
  └── Public types and checker validation
        └── Lexical text extraction and offset mapping
              └── Controller lifecycle and stale-result handling
                    ├── Safe replacement helper
                    └── Package export contract
                          └── Demo consumer and final verification
```

The offset mapper and async controller are sequential because the controller
publishes mapped output. Once the controller exists, replacement and public
export work can be developed independently, but they must be integrated before
the demo.

## Implementation Phases

### Phase 1: Foundation and checker boundary

1. Establish root TypeScript build, test, lint, and typecheck commands.
2. Define the approved public types and checker-result normalization.

Verification checkpoint:

- All four root commands execute successfully.
- Invalid checker results are rejected by focused contract tests.
- The built declarations contain no React imports.

### Phase 2: Lexical mapping and reactive controller

3. Extract top-level text segments and map UTF-16 ranges across adjacent text
   nodes.
4. Register the controller lifecycle, immutable store, debouncing, cancellation,
   and stale-result protection.

Verification checkpoint:

- Mapping tests cover plain, formatted, multi-node, multi-block, excluded-node,
  and astral-character text.
- Controlled deferred promises prove older results cannot publish after edits.
- Selection-only changes do not schedule checks.

### Phase 3: Consumer operations and public package

5. Implement safe issue replacement as one Lexical update.
6. Finalize the package exports and public contract tests.

Verification checkpoint:

- Current issues replace successfully; stale or altered issues do not edit.
- Replacement is undoable as one operation.
- A package consumer can import only the documented runtime and type exports.

### Phase 4: Integration proof

7. Connect the existing React/Lexical demo as a consumer of the framework-free
   core, with demo-owned issue visualization and suggestion interaction.
8. Run final quality checks and reconcile documentation with actual behavior.

Final checkpoint:

- Core remains free of React and presentation dependencies.
- The demo proves subscriptions, custom underlines, suggestions, and
  `replace()` without moving UI into the package.
- Build, test, lint, typecheck, and demo build all pass.
- Every success criterion in the approved spec is verified.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Lexical keys or offsets become stale during async work | High | Bind results to a controller revision, clear on editor changes, and validate again before replacement. |
| Words split by inline formatting are checked incorrectly | High | Extract per block with a segment table and test multi-node ranges before controller work. |
| UTF-16 offsets mishandle emoji or surrogate pairs | High | State the convention publicly and include astral-character contract tests. |
| Checker ignores cancellation | High | Treat abort as an optimization and gate publication independently by request and editor revision. |
| Spellcheck-generated updates create feedback loops | Medium | Tag internal replacement updates and test listener behavior. |
| Consumer predicates mutate or throw during reads | Medium | Document the predicate as pure and synchronous; route thrown errors through the controller error state. |
| Package accidentally acquires a React dependency | Medium | Test built declarations/exports and keep the demo outside root source. |
| Overlapping checker matches are ambiguous | Low | Reject them deterministically at the checker boundary. |

## Dependency Additions Requiring Plan Approval

The root currently has no development toolchain. Implementation is expected to
add development-only packages for TypeScript compilation, linting, and testing.
Exact packages and versions will be selected in Task 1 from versions compatible
with the current Node/npm environment. No new core runtime dependency is
planned.

## Open Questions

None. Changes to approved contract semantics return to the specification phase
before implementation.

# Spellkit

Framework-independent spellcheck infrastructure for
[Lexical](https://lexical.dev/) editors.

Spellkit extracts checkable editor text, calls an injected checker, maps its
UTF-16 offsets back to Lexical ranges, and publishes immutable issue snapshots.
It does not render underlines, menus, or replacement UI.

## Install

```sh
npm install spellkit lexical
```

`lexical` is a peer dependency. React is not required by the core package.

## Basic usage

```ts
import { registerSpellCheck, type SpellChecker } from "spellkit";

const checker: SpellChecker = {
  async check({ text }, { signal }) {
    const response = await fetch("/api/spellcheck", {
      method: "POST",
      body: JSON.stringify({ text }),
      signal,
    });

    return response.json();
  },
};

const controller = registerSpellCheck(editor, {
  checker,
  debounceMs: 150,
  language: "en-US",
});

const unsubscribe = controller.subscribe(() => {
  const snapshot = controller.getSnapshot();
  renderIssues(snapshot.issues);
});

// Teardown
unsubscribe();
controller.dispose();
```

Checker matches use JavaScript UTF-16 offsets into the exact supplied `text`:

```ts
interface SpellCheckMatch {
  readonly offset: number;
  readonly length: number;
  readonly suggestions?: readonly string[];
  readonly code?: string;
  readonly data?: unknown;
}
```

Dictionary-specific normalization—case folding, Unicode normalization,
tokenization, and punctuation policy—belongs to the injected checker. It must
still report offsets against the original request text.

## Rendering and replacement

Each issue includes its original text, suggestions, and a revision-bound
Lexical range:

```ts
const snapshot = controller.getSnapshot();
const issue = snapshot.issues[0];

if (issue) {
  controller.replace(issue, issue.suggestions[0] ?? issue.text);
}
```

Consumers can turn issue ranges into custom Lexical nodes, DOM overlays, CSS
Custom Highlights, or framework-specific components. The included
`lexical-editor` demo uses React only as consumer code; React does not enter the
Spellkit core.

Treat issues as ephemeral. `replace()` returns `false` if an issue is foreign,
stale, or no longer matches the live editor text.

## Filtering text

Use `shouldCheck` to exclude ordinary text nodes. The predicate runs
synchronously inside a Lexical read transaction and must be side-effect-free:

```ts
const controller = registerSpellCheck(editor, {
  checker,
  shouldCheck(node) {
    return !node.hasFormat("code");
  },
});
```

Excluded content is redacted before checking while its UTF-16 width is
preserved. Text stored only inside custom non-text nodes is outside the v1
contract.

## Commands

```sh
npm run build
npm test
npm run lint
npm run typecheck
```

Run the demo with:

```sh
npm --prefix lexical-editor run dev
```

The complete behavioral contract is documented in
[`docs/spec-lexical-contract.md`](docs/spec-lexical-contract.md).

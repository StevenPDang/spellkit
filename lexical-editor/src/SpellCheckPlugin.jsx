import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { registerSpellCheck } from "spellkit";
import { useEffect, useState, useSyncExternalStore } from "react";

const HIGHLIGHT_NAME = "spellkit-demo-issues";
const CORRECTIONS = new Map([
  ["mispelled", ["misspelled"]],
  ["recieve", ["receive"]],
  ["teh", ["the"]],
]);

const demoChecker = {
  async check({ text }) {
    const matches = [];
    for (const token of text.matchAll(/[\p{L}']+/gu)) {
      const suggestions = CORRECTIONS.get(token[0].toLocaleLowerCase());
      if (suggestions !== undefined && token.index !== undefined) {
        matches.push({
          offset: token.index,
          length: token[0].length,
          suggestions,
          code: "DEMO_DICTIONARY",
        });
      }
    }
    return matches;
  },
};

export function SpellCheckPlugin() {
  const [editor] = useLexicalComposerContext();
  const [controller, setController] = useState(null);

  useEffect(() => {
    const nextController = registerSpellCheck(editor, {
      checker: demoChecker,
      debounceMs: 150,
      language: "en-US",
    });
    const unsubscribe = nextController.subscribe(() => {
      setController(nextController);
    });

    return () => {
      unsubscribe();
      nextController.dispose();
    };
  }, [editor]);

  return controller === null ? null : (
    <SpellCheckResults controller={controller} editor={editor} />
  );
}

function SpellCheckResults({ controller, editor }) {
  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );

  useEffect(() => {
    if (!("highlights" in CSS) || typeof Highlight === "undefined") {
      return undefined;
    }

    const ranges = snapshot.issues.flatMap((issue) => {
      const range = createDomRange(editor, issue.range);
      return range === null ? [] : [range];
    });

    if (ranges.length === 0) {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    } else {
      CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
    }

    return () => {
      CSS.highlights.delete(HIGHLIGHT_NAME);
    };
  }, [editor, snapshot]);

  return (
    <aside className="spellcheck-panel" aria-labelledby="spellcheck-title">
      <div className="spellcheck-heading">
        <h2 id="spellcheck-title">Spelling</h2>
        <span className="spellcheck-count" aria-live="polite">
          {getStatusLabel(snapshot)}
        </span>
      </div>

      {snapshot.issues.length === 0 ? (
        <p className="spellcheck-empty">
          Type “mispelled”, “recieve”, or “teh” to try the injected checker.
        </p>
      ) : (
        <ul className="spellcheck-issues">
          {snapshot.issues.map((issue) => (
            <li key={issue.id}>
              <span className="spellcheck-word">{issue.text}</span>
              <div className="spellcheck-suggestions">
                {issue.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => controller.replace(issue, suggestion)}
                  >
                    Replace with “{suggestion}”
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function createDomRange(editor, lexicalRange) {
  const anchorElement = editor.getElementByKey(lexicalRange.anchor.key);
  const focusElement = editor.getElementByKey(lexicalRange.focus.key);
  const anchorText = anchorElement && getFirstTextNode(anchorElement);
  const focusText = focusElement && getFirstTextNode(focusElement);

  if (anchorText === null || focusText === null) {
    return null;
  }
  if (
    lexicalRange.anchor.offset > anchorText.length ||
    lexicalRange.focus.offset > focusText.length
  ) {
    return null;
  }

  const range = new Range();
  range.setStart(anchorText, lexicalRange.anchor.offset);
  range.setEnd(focusText, lexicalRange.focus.offset);
  return range;
}

function getFirstTextNode(element) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  return walker.nextNode();
}

function getStatusLabel(snapshot) {
  switch (snapshot.status.type) {
    case "checking":
      return "Checking…";
    case "error":
      return "Checker unavailable";
    default:
      return `${snapshot.issues.length} ${
        snapshot.issues.length === 1 ? "issue" : "issues"
      }`;
  }
}

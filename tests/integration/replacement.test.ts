import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  createEditor,
  HISTORY_PUSH_TAG,
} from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerSpellCheck } from "../../src/lexical/registerSpellCheck.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("SpellCheckController.replace", () => {
  it("replaces a current issue and moves selection after the new text", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorNodes(editor, [{ text: "mispelled" }]);
    const updateTags: Set<string>[] = [];
    editor.registerUpdateListener(({ tags }) => {
      updateTags.push(tags);
    });
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        async check() {
          return [{ offset: 0, length: 9, suggestions: ["misspelled"] }];
        },
      },
    });
    await vi.runAllTimersAsync();
    const issue = controller.getSnapshot().issues[0];

    expect(issue && controller.replace(issue, "misspelled")).toBe(true);

    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe("misspelled");
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.anchor.offset).toBe(10);
        expect(selection.focus.offset).toBe(10);
      }
    });
    expect(updateTags.some((tags) => tags.has(HISTORY_PUSH_TAG))).toBe(true);
  });

  it("replaces an issue spanning formatted text nodes", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorNodes(editor, [
      { text: "spell" },
      { text: "check", isBold: true },
    ]);
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        async check() {
          return [{ offset: 0, length: 10 }];
        },
      },
    });
    await vi.runAllTimersAsync();
    const issue = controller.getSnapshot().issues[0];

    expect(issue && controller.replace(issue, "correct")).toBe(true);

    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe("correct");
    });
  });

  it("does not edit for stale, foreign, or text-mismatched issues", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorNodes(editor, [{ text: "mispelled" }]);
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        async check() {
          return [{ offset: 0, length: 9 }];
        },
      },
    });
    await vi.runAllTimersAsync();
    const issue = controller.getSnapshot().issues[0];
    if (issue === undefined) {
      throw new Error("Expected an issue");
    }

    expect(controller.replace({ ...issue }, "foreign")).toBe(false);

    editor.update(
      () => {
        const text = $getRoot().getFirstDescendant();
        if ($isTextNode(text)) {
          text.setTextContent("changed");
        }
      },
      { discrete: true },
    );

    expect(controller.replace(issue, "stale")).toBe(false);
    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe("changed");
    });
  });
});

function setEditorNodes(
  editor: ReturnType<typeof createEditor>,
  nodes: Array<{ text: string; isBold?: boolean }>,
): void {
  editor.update(
    () => {
      const textNodes = nodes.map(({ text, isBold }) => {
        const node = $createTextNode(text);
        return isBold ? node.toggleFormat("bold") : node;
      });
      $getRoot().clear().append($createParagraphNode().append(...textNodes));
    },
    { discrete: true },
  );
}

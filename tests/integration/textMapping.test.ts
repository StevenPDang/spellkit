import {
  $createParagraphNode,
  $createLineBreakNode,
  $createTextNode,
  $getRoot,
  createEditor,
  type TextNode,
} from "lexical";
import { describe, expect, it } from "vitest";

import { extractTextSegments } from "../../src/lexical/extractSegments.js";
import { mapRange } from "../../src/lexical/mapRange.js";

describe("Lexical text mapping", () => {
  it("extracts each top-level block independently", () => {
    const editor = createEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append($createTextNode("first")),
            $createParagraphNode().append($createTextNode("second")),
          );
      },
      { discrete: true },
    );

    const units = editor.getEditorState().read(() => extractTextSegments());

    expect(units.map(({ text }) => text)).toEqual(["first", "second"]);
  });

  it("maps a word split across formatted text nodes", () => {
    const editor = createEditor();
    let firstKey = "";
    let secondKey = "";

    editor.update(
      () => {
        const first = $createTextNode("spell");
        const second = $createTextNode("check").toggleFormat("bold");
        firstKey = first.getKey();
        secondKey = second.getKey();
        $getRoot().clear().append($createParagraphNode().append(first, second));
      },
      { discrete: true },
    );

    const unit = editor
      .getEditorState()
      .read(() => extractTextSegments()[0]);

    expect(unit?.text).toBe("spellcheck");
    expect(unit && mapRange(unit, 0, 10)).toEqual({
      anchor: { key: firstKey, offset: 0 },
      focus: { key: secondKey, offset: 5 },
    });
  });

  it("redacts excluded text without joining surrounding words", () => {
    const editor = createEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode("before"),
              $createTextNode("secret").toggleFormat("code"),
              $createTextNode("after"),
            ),
          );
      },
      { discrete: true },
    );

    const shouldCheck = (node: TextNode) => !node.hasFormat("code");
    const unit = editor
      .getEditorState()
      .read(() => extractTextSegments(shouldCheck)[0]);

    expect(unit?.text).toBe("before      after");
    expect(unit && mapRange(unit, 6, 6)).toBeNull();
  });

  it("uses UTF-16 offsets for astral characters", () => {
    const editor = createEditor();
    let key = "";

    editor.update(
      () => {
        const text = $createTextNode("😀word");
        key = text.getKey();
        $getRoot().clear().append($createParagraphNode().append(text));
      },
      { discrete: true },
    );

    const unit = editor
      .getEditorState()
      .read(() => extractTextSegments()[0]);

    expect(unit && mapRange(unit, 2, 4)).toEqual({
      anchor: { key, offset: 2 },
      focus: { key, offset: 6 },
    });
  });

  it("preserves structural line breaks between text nodes", () => {
    const editor = createEditor();
    let secondKey = "";

    editor.update(
      () => {
        const second = $createTextNode("two");
        secondKey = second.getKey();
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode("one"),
              $createLineBreakNode(),
              second,
            ),
          );
      },
      { discrete: true },
    );

    const unit = editor
      .getEditorState()
      .read(() => extractTextSegments()[0]);

    expect(unit?.text).toBe("one\ntwo");
    expect(unit && mapRange(unit, 4, 3)).toEqual({
      anchor: { key: secondKey, offset: 0 },
      focus: { key: secondKey, offset: 3 },
    });
  });

  it("rejects zero-length and unmapped ranges", () => {
    const editor = createEditor();

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode("word")));
      },
      { discrete: true },
    );

    const unit = editor
      .getEditorState()
      .read(() => extractTextSegments()[0]);

    expect(unit && mapRange(unit, 0, 0)).toBeNull();
    expect(unit && mapRange(unit, 4, 1)).toBeNull();
  });
});

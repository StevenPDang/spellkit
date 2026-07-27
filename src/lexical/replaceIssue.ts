import {
  $createRangeSelection,
  $getNodeByKey,
  $isTextNode,
  $setSelection,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
} from "lexical";

import type { SpellCheckIssue } from "../types/index.js";

export function replaceIssue(
  editor: LexicalEditor,
  issue: SpellCheckIssue,
  replacement: string,
): boolean {
  let didReplace = false;

  editor.update(
    () => {
      const anchorNode = $getNodeByKey(issue.range.anchor.key);
      const focusNode = $getNodeByKey(issue.range.focus.key);
      if (!$isTextNode(anchorNode) || !$isTextNode(focusNode)) {
        return;
      }

      const selection = $createRangeSelection();
      selection.setTextNodeRange(
        anchorNode,
        issue.range.anchor.offset,
        focusNode,
        issue.range.focus.offset,
      );
      if (selection.getTextContent() !== issue.text) {
        return;
      }

      $setSelection(selection);
      selection.insertText(replacement);
      didReplace = true;
    },
    { discrete: true, tag: HISTORY_PUSH_TAG },
  );

  return didReplace;
}

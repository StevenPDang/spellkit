import { $getRoot, $isElementNode, type NodeKey, type TextNode } from "lexical";

export interface TextSegment {
  readonly key: NodeKey;
  readonly start: number;
  readonly end: number;
}

export interface TextCheckUnit {
  readonly blockKey: NodeKey;
  readonly text: string;
  readonly segments: readonly TextSegment[];
}

export function extractTextSegments(
  shouldCheck?: (node: TextNode) => boolean,
): readonly TextCheckUnit[] {
  return $getRoot()
    .getChildren()
    .flatMap((block): TextCheckUnit[] => {
      if (!$isElementNode(block)) {
        return [];
      }

      const sourceText = block.getTextContent();
      const textParts: string[] = [];
      const segments: TextSegment[] = [];
      let sourceOffset = 0;

      for (const node of block.getAllTextNodes()) {
        const content = node.getTextContent();
        const start = sourceText.indexOf(content, sourceOffset);
        if (start < 0) {
          throw new Error("Unable to map a Lexical text node into its block");
        }

        textParts.push(sourceText.slice(sourceOffset, start));
        const isCheckable =
          node.isSimpleText() && (shouldCheck?.(node) ?? true);
        textParts.push(isCheckable ? content : " ".repeat(content.length));
        sourceOffset = start + content.length;

        if (isCheckable && content.length > 0) {
          segments.push({
            key: node.getKey(),
            start,
            end: sourceOffset,
          });
        }
      }
      textParts.push(sourceText.slice(sourceOffset));

      return [
        Object.freeze({
          blockKey: block.getKey(),
          text: textParts.join(""),
          segments: Object.freeze(segments),
        }),
      ];
    });
}

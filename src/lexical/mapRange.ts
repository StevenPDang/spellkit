import type { SpellCheckRange } from "../types/index.js";
import type { TextCheckUnit, TextSegment } from "./extractSegments.js";

export function mapRange(
  unit: TextCheckUnit,
  offset: number,
  length: number,
): SpellCheckRange | null {
  if (
    !Number.isInteger(offset) ||
    !Number.isInteger(length) ||
    offset < 0 ||
    length <= 0 ||
    offset + length > unit.text.length
  ) {
    return null;
  }

  const end = offset + length;
  const coveredSegments = unit.segments.filter(
    (segment) => segment.start < end && segment.end > offset,
  );
  const anchorSegment = coveredSegments[0];
  const focusSegment = coveredSegments.at(-1);

  if (
    anchorSegment === undefined ||
    focusSegment === undefined ||
    coveredLength(coveredSegments, offset, end) !== length
  ) {
    return null;
  }

  return Object.freeze({
    anchor: Object.freeze({
      key: anchorSegment.key,
      offset: offset - anchorSegment.start,
    }),
    focus: Object.freeze({
      key: focusSegment.key,
      offset: end - focusSegment.start,
    }),
  });
}

function coveredLength(
  segments: readonly TextSegment[],
  start: number,
  end: number,
): number {
  return segments.reduce(
    (total, segment) =>
      total + Math.max(0, Math.min(segment.end, end) - Math.max(segment.start, start)),
    0,
  );
}

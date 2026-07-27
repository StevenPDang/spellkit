import type { SpellCheckMatch } from "../types/index.js";

export interface NormalizedSpellCheckMatch extends SpellCheckMatch {
  readonly suggestions: readonly string[];
}

export function normalizeMatches(
  text: string,
  value: unknown,
): readonly NormalizedSpellCheckMatch[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Spell checker output must be an array");
  }

  const matches = value.map((match, index) =>
    normalizeMatch(text, match, index),
  );
  matches.sort((left, right) => left.offset - right.offset);

  for (let index = 1; index < matches.length; index += 1) {
    const previous = matches[index - 1];
    const current = matches[index];

    if (
      previous !== undefined &&
      current !== undefined &&
      current.offset < previous.offset + previous.length
    ) {
      throw new TypeError("Spell checker matches must not overlap");
    }
  }

  return Object.freeze(matches);
}

function normalizeMatch(
  text: string,
  value: unknown,
  index: number,
): NormalizedSpellCheckMatch {
  if (!isRecord(value)) {
    throw new TypeError(`Spell checker match at index ${index} must be an object`);
  }

  const { offset, length } = value;

  if (!isInteger(offset) || offset < 0) {
    throw new TypeError(
      `Spell checker match at index ${index} has an invalid offset`,
    );
  }

  if (!isInteger(length) || length <= 0) {
    throw new TypeError(
      `Spell checker match at index ${index} has an invalid length`,
    );
  }

  if (offset + length > text.length) {
    throw new TypeError(
      `Spell checker match at index ${index} is outside the checked text`,
    );
  }

  const suggestions = normalizeSuggestions(value.suggestions, index);
  const normalized: {
    offset: number;
    length: number;
    suggestions: readonly string[];
    code?: string;
    data?: unknown;
  } = {
    offset,
    length,
    suggestions,
  };

  if ("code" in value) {
    if (typeof value.code !== "string") {
      throw new TypeError(
        `Spell checker match at index ${index} has an invalid code`,
      );
    }
    normalized.code = value.code;
  }

  if ("data" in value) {
    normalized.data = value.data;
  }

  return Object.freeze(normalized);
}

function normalizeSuggestions(
  value: unknown,
  matchIndex: number,
): readonly string[] {
  if (value === undefined) {
    return Object.freeze([]);
  }

  if (
    !Array.isArray(value) ||
    value.some((suggestion) => typeof suggestion !== "string")
  ) {
    throw new TypeError(
      `Spell checker match at index ${matchIndex} has invalid suggestions`,
    );
  }

  return Object.freeze([...value]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

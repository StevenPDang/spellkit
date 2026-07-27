import { describe, expect, it } from "vitest";

import { normalizeMatches } from "../../src/checker/normalizeMatches.js";

describe("normalizeMatches", () => {
  it("orders matches and copies suggestions without mutating checker output", () => {
    const suggestions = ["spelling"];
    const matches = [
      { offset: 9, length: 4, suggestions: ["tool"] },
      {
        offset: 0,
        length: 5,
        suggestions,
        code: "UNKNOWN_WORD",
        data: { source: "dictionary" },
      },
    ];

    const normalized = normalizeMatches("speling toolkit", matches);

    expect(normalized).toEqual([
      {
        offset: 0,
        length: 5,
        suggestions: ["spelling"],
        code: "UNKNOWN_WORD",
        data: { source: "dictionary" },
      },
      { offset: 9, length: 4, suggestions: ["tool"] },
    ]);
    expect(matches[0]?.offset).toBe(9);
    expect(normalized[0]?.suggestions).not.toBe(suggestions);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized[0])).toBe(true);
    expect(Object.isFrozen(normalized[0]?.suggestions)).toBe(true);
  });

  it("defaults omitted suggestions to an immutable empty array", () => {
    const normalized = normalizeMatches("mispelled", [
      { offset: 0, length: 9 },
    ]);

    expect(normalized[0]?.suggestions).toEqual([]);
    expect(Object.isFrozen(normalized[0]?.suggestions)).toBe(true);
  });

  it("measures ranges in UTF-16 code units", () => {
    const normalized = normalizeMatches("😀mispelled", [
      { offset: 2, length: 9 },
    ]);

    expect(normalized).toHaveLength(1);
  });

  it.each([
    ["non-array output", null],
    ["non-object match", [null]],
    ["non-finite offset", [{ offset: Number.NaN, length: 1 }]],
    ["fractional offset", [{ offset: 0.5, length: 1 }]],
    ["negative offset", [{ offset: -1, length: 1 }]],
    ["zero length", [{ offset: 0, length: 0 }]],
    ["fractional length", [{ offset: 0, length: 1.5 }]],
    ["out-of-bounds range", [{ offset: 3, length: 2 }]],
    [
      "invalid suggestions",
      [{ offset: 0, length: 1, suggestions: [42] }],
    ],
    ["invalid code", [{ offset: 0, length: 1, code: 42 }]],
  ])("rejects %s", (_case, matches) => {
    expect(() => normalizeMatches("text", matches)).toThrow(TypeError);
  });

  it("rejects overlapping matches after sorting", () => {
    expect(() =>
      normalizeMatches("speling", [
        { offset: 2, length: 3 },
        { offset: 0, length: 3 },
      ]),
    ).toThrow(TypeError);
  });
});

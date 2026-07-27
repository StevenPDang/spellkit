import { describe, expect, expectTypeOf, it } from "vitest";

import { registerSpellCheck } from "../../src/index.js";
import * as spellkit from "../../src/index.js";
import type {
  SpellChecker,
  SpellCheckContext,
  SpellCheckController,
  SpellCheckIssue,
  SpellCheckMatch,
  SpellCheckOptions,
  SpellCheckPoint,
  SpellCheckRange,
  SpellCheckRequest,
  SpellCheckSnapshot,
  SpellCheckStatus,
} from "../../src/index.js";

describe("public API", () => {
  it("exports only the registration function at runtime", () => {
    expect(Object.keys(spellkit)).toEqual(["registerSpellCheck"]);
    expect(registerSpellCheck).toBeTypeOf("function");
  });

  it("exports the documented TypeScript contracts", () => {
    expectTypeOf<SpellChecker>().toBeObject();
    expectTypeOf<SpellCheckContext>().toBeObject();
    expectTypeOf<SpellCheckController>().toBeObject();
    expectTypeOf<SpellCheckIssue>().toBeObject();
    expectTypeOf<SpellCheckMatch>().toBeObject();
    expectTypeOf<SpellCheckOptions>().toBeObject();
    expectTypeOf<SpellCheckPoint>().toBeObject();
    expectTypeOf<SpellCheckRange>().toBeObject();
    expectTypeOf<SpellCheckRequest>().toBeObject();
    expectTypeOf<SpellCheckSnapshot>().toBeObject();
    expectTypeOf<SpellCheckStatus>().toMatchTypeOf<
      { readonly type: string }
    >();
  });
});

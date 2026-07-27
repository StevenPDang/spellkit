import { normalizeMatches } from "./normalizeMatches.js";
import { mapRange } from "../lexical/mapRange.js";
import type { TextCheckUnit } from "../lexical/extractSegments.js";
import type {
  SpellChecker,
  SpellCheckIssue,
  SpellCheckRequest,
} from "../types/index.js";

export interface RunCheckOptions {
  readonly checker: SpellChecker;
  readonly language?: string;
  readonly signal: AbortSignal;
  readonly revision: number;
  readonly units: readonly TextCheckUnit[];
}

export async function runCheck({
  checker,
  language,
  signal,
  revision,
  units,
}: RunCheckOptions): Promise<readonly SpellCheckIssue[]> {
  const issueGroups = await Promise.all(
    units.map(async (unit, unitIndex) => {
      if (unit.text.trim().length === 0) {
        return [];
      }

      const request: SpellCheckRequest =
        language === undefined
          ? { text: unit.text }
          : { text: unit.text, language };
      const value: unknown = await checker.check(request, { signal });
      const matches = normalizeMatches(unit.text, value);

      return matches.map((match, matchIndex): SpellCheckIssue => {
        const range = mapRange(unit, match.offset, match.length);
        if (range === null) {
          throw new TypeError("Spell checker match does not map to editable text");
        }

        const issue: SpellCheckIssue = {
          id: `${revision}:${unitIndex}:${matchIndex}`,
          text: unit.text.slice(match.offset, match.offset + match.length),
          range,
          suggestions: match.suggestions,
          ...(match.code === undefined ? {} : { code: match.code }),
          ...(!("data" in match) ? {} : { data: match.data }),
        };

        return Object.freeze(issue);
      });
    }),
  );

  return Object.freeze(issueGroups.flat());
}

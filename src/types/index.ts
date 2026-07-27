import type { NodeKey, TextNode } from "lexical";

export interface SpellChecker {
  check(
    request: SpellCheckRequest,
    context: SpellCheckContext,
  ): Promise<readonly SpellCheckMatch[]>;
}

export interface SpellCheckRequest {
  readonly text: string;
  readonly language?: string;
}

export interface SpellCheckContext {
  readonly signal: AbortSignal;
}

export interface SpellCheckMatch {
  readonly offset: number;
  readonly length: number;
  readonly suggestions?: readonly string[];
  readonly code?: string;
  readonly data?: unknown;
}

export interface SpellCheckPoint {
  readonly key: NodeKey;
  readonly offset: number;
}

export interface SpellCheckRange {
  readonly anchor: SpellCheckPoint;
  readonly focus: SpellCheckPoint;
}

export interface SpellCheckIssue {
  readonly id: string;
  readonly text: string;
  readonly range: SpellCheckRange;
  readonly suggestions: readonly string[];
  readonly code?: string;
  readonly data?: unknown;
}

export type SpellCheckStatus =
  | { readonly type: "idle" }
  | { readonly type: "checking" }
  | { readonly type: "ready" }
  | { readonly type: "error"; readonly error: unknown };

export interface SpellCheckSnapshot {
  readonly revision: number;
  readonly status: SpellCheckStatus;
  readonly issues: readonly SpellCheckIssue[];
}

export interface SpellCheckOptions {
  readonly checker: SpellChecker;
  readonly language?: string | (() => string | undefined);
  readonly debounceMs?: number;
  readonly shouldCheck?: (node: TextNode) => boolean;
  readonly onError?: (error: unknown) => void;
}

export interface SpellCheckController {
  getSnapshot(): SpellCheckSnapshot;
  subscribe(listener: () => void): () => void;
  recheck(): void;
  replace(issue: SpellCheckIssue, replacement: string): boolean;
  dispose(): void;
}

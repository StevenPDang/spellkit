import type { EditorState, LexicalEditor } from "lexical";

import { runCheck } from "../checker/runCheck.js";
import { createStore } from "../state/createStore.js";
import type {
  SpellCheckController,
  SpellCheckOptions,
  SpellCheckSnapshot,
  SpellCheckStatus,
} from "../types/index.js";
import { extractTextSegments } from "./extractSegments.js";
import { replaceIssue } from "./replaceIssue.js";

const DEFAULT_DEBOUNCE_MS = 150;

export function registerSpellCheck(
  editor: LexicalEditor,
  options: SpellCheckOptions,
): SpellCheckController {
  assertValidOptions(options);

  let revision = 0;
  let requestSequence = 0;
  let activeRequest: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let isDisposed = false;
  const store = createStore(createSnapshot(0, { type: "idle" }, []));

  const schedule = (editorState: EditorState): void => {
    if (isDisposed) {
      return;
    }

    revision += 1;
    requestSequence += 1;
    const scheduledRevision = revision;
    const scheduledRequest = requestSequence;
    activeRequest?.abort();
    const abortController = new AbortController();
    activeRequest = abortController;
    if (timer !== null) {
      clearTimeout(timer);
    }

    store.publish(createSnapshot(revision, { type: "checking" }, []));
    timer = setTimeout(() => {
      timer = null;
      void executeCheck(
        editorState,
        scheduledRevision,
        scheduledRequest,
        abortController,
      );
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  };

  const executeCheck = async (
    editorState: EditorState,
    scheduledRevision: number,
    scheduledRequest: number,
    abortController: AbortController,
  ): Promise<void> => {
    let issues;
    try {
      const units = editorState.read(() =>
        extractTextSegments(options.shouldCheck),
      );
      const language = resolveLanguage(options.language);
      issues = await runCheck({
        checker: options.checker,
        language,
        signal: abortController.signal,
        revision: scheduledRevision,
        units,
      });
    } catch (error) {
      if (!isCurrent(scheduledRequest, abortController)) {
        return;
      }

      store.publish(
        createSnapshot(scheduledRevision, { type: "error", error }, []),
      );
      options.onError?.(error);
      return;
    }

    if (!isCurrent(scheduledRequest, abortController)) {
      return;
    }

    store.publish(
      createSnapshot(scheduledRevision, { type: "ready" }, issues),
    );
  };

  const isCurrent = (
    scheduledRequest: number,
    abortController: AbortController,
  ): boolean =>
    !isDisposed &&
    scheduledRequest === requestSequence &&
    !abortController.signal.aborted;

  const unregister = editor.registerUpdateListener(
    ({ dirtyElements, dirtyLeaves, editorState }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }
      schedule(editorState);
    },
  );

  schedule(editor.getEditorState());

  return {
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    recheck() {
      schedule(editor.getEditorState());
    },
    replace(issue, replacement) {
      const snapshot = store.getSnapshot();
      if (
        snapshot.status.type !== "ready" ||
        !snapshot.issues.includes(issue)
      ) {
        return false;
      }

      return replaceIssue(editor, issue, replacement);
    },
    dispose() {
      if (isDisposed) {
        return;
      }

      isDisposed = true;
      requestSequence += 1;
      activeRequest?.abort();
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      unregister();
      store.dispose();
    },
  };
}

function createSnapshot(
  revision: number,
  status: SpellCheckStatus,
  issues: SpellCheckSnapshot["issues"],
): SpellCheckSnapshot {
  return Object.freeze({
    revision,
    status: Object.freeze(status),
    issues: Object.freeze([...issues]),
  });
}

function assertValidOptions(options: SpellCheckOptions): void {
  if (
    typeof options !== "object" ||
    options === null ||
    typeof options.checker?.check !== "function"
  ) {
    throw new TypeError("SpellCheckOptions.checker must implement check()");
  }

  if (
    options.debounceMs !== undefined &&
    (!Number.isFinite(options.debounceMs) || options.debounceMs < 0)
  ) {
    throw new TypeError("SpellCheckOptions.debounceMs must be non-negative");
  }

  if (
    options.language !== undefined &&
    typeof options.language !== "string" &&
    typeof options.language !== "function"
  ) {
    throw new TypeError(
      "SpellCheckOptions.language must be a string or function",
    );
  }

  if (
    options.shouldCheck !== undefined &&
    typeof options.shouldCheck !== "function"
  ) {
    throw new TypeError("SpellCheckOptions.shouldCheck must be a function");
  }

  if (options.onError !== undefined && typeof options.onError !== "function") {
    throw new TypeError("SpellCheckOptions.onError must be a function");
  }
}

function resolveLanguage(
  language: SpellCheckOptions["language"],
): string | undefined {
  const resolved = typeof language === "function" ? language() : language;
  if (resolved !== undefined && typeof resolved !== "string") {
    throw new TypeError("SpellCheckOptions.language() must return a string");
  }
  return resolved;
}

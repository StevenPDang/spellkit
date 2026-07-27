import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerSpellCheck } from "../../src/lexical/registerSpellCheck.js";
import type {
  SpellCheckMatch,
  SpellCheckRequest,
} from "../../src/types/index.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("registerSpellCheck", () => {
  it("publishes immutable issue snapshots after checking editor text", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorText(editor, "mispelled");
    const listener = vi.fn();
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        async check() {
          return [{ offset: 0, length: 9, suggestions: ["misspelled"] }];
        },
      },
    });
    controller.subscribe(listener);

    const checkingSnapshot = controller.getSnapshot();
    await vi.runAllTimersAsync();
    const readySnapshot = controller.getSnapshot();

    expect(checkingSnapshot.status.type).toBe("checking");
    expect(readySnapshot.status.type).toBe("ready");
    expect(readySnapshot).not.toBe(checkingSnapshot);
    expect(controller.getSnapshot()).toBe(readySnapshot);
    expect(readySnapshot.issues[0]).toMatchObject({
      text: "mispelled",
      suggestions: ["misspelled"],
    });
    expect(Object.isFrozen(readySnapshot)).toBe(true);
    expect(Object.isFrozen(readySnapshot.issues)).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("does not schedule checks for selection-only updates", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorText(editor, "word");
    const check = vi.fn(async () => []);
    const controller = registerSpellCheck(editor, {
      checker: { check },
      debounceMs: 0,
    });
    await vi.runAllTimersAsync();

    editor.update(
      () => {
        $getRoot().getFirstDescendant()?.selectStart();
      },
      { discrete: true },
    );
    await vi.runAllTimersAsync();

    expect(check).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it("discards checker responses superseded by newer editor text", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorText(editor, "first");
    const pending: Array<{
      request: SpellCheckRequest;
      signal: AbortSignal;
      resolve: (matches: readonly SpellCheckMatch[]) => void;
    }> = [];
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        check(request, { signal }) {
          return new Promise((resolve) => {
            pending.push({ request, signal, resolve });
          });
        },
      },
    });
    await vi.runAllTimersAsync();
    expect(pending[0]?.request.text).toBe("first");

    setEditorText(editor, "second");
    await vi.runAllTimersAsync();
    expect(pending[1]?.request.text).toBe("second");
    expect(pending[0]?.signal.aborted).toBe(true);

    pending[0]?.resolve([{ offset: 0, length: 5 }]);
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().status.type).toBe("checking");
    expect(controller.getSnapshot().issues).toEqual([]);

    pending[1]?.resolve([{ offset: 0, length: 6 }]);
    await vi.runAllTimersAsync();
    expect(controller.getSnapshot().status.type).toBe("ready");
    expect(controller.getSnapshot().issues[0]?.text).toBe("second");
  });

  it("publishes checker failures and disposes idempotently", async () => {
    vi.useFakeTimers();
    const editor = createEditor();
    setEditorText(editor, "word");
    const error = new Error("checker unavailable");
    const onError = vi.fn();
    const listener = vi.fn();
    const controller = registerSpellCheck(editor, {
      debounceMs: 0,
      checker: {
        async check() {
          throw error;
        },
      },
      onError,
    });
    controller.subscribe(listener);

    await vi.runAllTimersAsync();

    expect(controller.getSnapshot().status).toEqual({ type: "error", error });
    expect(onError).toHaveBeenCalledWith(error);
    expect(listener).toHaveBeenCalledOnce();

    controller.dispose();
    controller.dispose();
    setEditorText(editor, "changed");
    await vi.runAllTimersAsync();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("rejects invalid configuration synchronously", () => {
    const editor = createEditor();

    expect(() =>
      registerSpellCheck(editor, {
        checker: null,
      } as never),
    ).toThrow(TypeError);
    expect(() =>
      registerSpellCheck(editor, {
        checker: { async check() { return []; } },
        debounceMs: -1,
      }),
    ).toThrow(TypeError);
  });
});

function setEditorText(
  editor: ReturnType<typeof createEditor>,
  text: string,
): void {
  editor.update(
    () => {
      $getRoot()
        .clear()
        .append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true },
  );
}

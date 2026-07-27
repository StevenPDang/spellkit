import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { SpellCheckPlugin } from "./SpellCheckPlugin.jsx";
import "./App.css";

const theme = {
  // Theme styling goes here
  //...
};

// Catch any errors that occur during Lexical updates and log them
// or throw them as needed. If you don't throw them, Lexical will
// try to recover gracefully without losing user data.
function onError(error) {
  console.error(error);
}

export default function Editor() {
  const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError,
  };

  return (
    <main className="editor-page">
      <section className="editor-card" aria-labelledby="editor-title">
        <header className="editor-header">
          <h1 id="editor-title">Editor</h1>
          <p>Start writing below and shape your ideas as you go.</p>
        </header>

        <LexicalComposer initialConfig={initialConfig}>
          <div className="editor-shell">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  aria-placeholder="Enter some text…"
                  placeholder={
                    <div className="editor-placeholder">Enter some text…</div>
                  }
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <AutoFocusPlugin />
          </div>
          <SpellCheckPlugin />
        </LexicalComposer>
      </section>
    </main>
  );
}

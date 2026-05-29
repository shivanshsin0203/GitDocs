import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  markdown: string;
  objectUrls?: Map<string, string>;
}

const PREVIEW_CSS = `
.gh-markdown {
  color: #e6edf3;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
}
.gh-markdown > *:first-child { margin-top: 0 !important; }
.gh-markdown > *:last-child { margin-bottom: 0 !important; }

.gh-markdown h1, .gh-markdown h2, .gh-markdown h3,
.gh-markdown h4, .gh-markdown h5, .gh-markdown h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: #f0f6fc;
}
.gh-markdown h1 { font-size: 2em; padding-bottom: .3em; border-bottom: 1px solid #21262d; }
.gh-markdown h2 { font-size: 1.5em; padding-bottom: .3em; border-bottom: 1px solid #21262d; }
.gh-markdown h3 { font-size: 1.25em; }
.gh-markdown h4 { font-size: 1em; }
.gh-markdown h5 { font-size: .875em; }
.gh-markdown h6 { font-size: .85em; color: #8b949e; }

.gh-markdown p { margin-top: 0; margin-bottom: 16px; }
.gh-markdown a { color: #58a6ff; text-decoration: none; }
.gh-markdown a:hover { text-decoration: underline; }

.gh-markdown strong { font-weight: 600; color: #f0f6fc; }
.gh-markdown em { font-style: italic; }

.gh-markdown ul, .gh-markdown ol {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}
.gh-markdown li { margin: .25em 0; }
.gh-markdown li > p { margin-top: 16px; }
.gh-markdown ul ul, .gh-markdown ul ol,
.gh-markdown ol ul, .gh-markdown ol ol { margin-bottom: 0; }
.gh-markdown ul { list-style: disc; }
.gh-markdown ol { list-style: decimal; }
.gh-markdown li input[type="checkbox"] { margin-right: .35em; }

.gh-markdown blockquote {
  margin: 0 0 16px 0;
  padding: 0 1em;
  color: #8b949e;
  border-left: .25em solid #30363d;
}

.gh-markdown code {
  padding: .2em .4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(110, 118, 129, .25);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  color: #e6edf3;
}
.gh-markdown pre {
  margin-top: 0;
  margin-bottom: 16px;
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #161b22;
  border-radius: 8px;
  border: 1px solid #21262d;
}
.gh-markdown pre code {
  padding: 0;
  margin: 0;
  background: transparent;
  border-radius: 0;
  font-size: 100%;
  white-space: pre;
}

.gh-markdown hr {
  height: .25em;
  padding: 0;
  margin: 24px 0;
  background-color: #21262d;
  border: 0;
}

.gh-markdown table {
  display: block;
  width: 100%;
  overflow: auto;
  margin-top: 0;
  margin-bottom: 16px;
  border-spacing: 0;
  border-collapse: collapse;
}
.gh-markdown table th { font-weight: 600; }
.gh-markdown table th, .gh-markdown table td {
  padding: 6px 13px;
  border: 1px solid #30363d;
}
.gh-markdown table tr { background-color: #0d1117; border-top: 1px solid #21262d; }
.gh-markdown table tr:nth-child(2n) { background-color: #161b22; }

.gh-markdown img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: transparent;
  border-radius: 4px;
  margin: .25em 0;
}

.gh-markdown kbd {
  display: inline-block;
  padding: 3px 5px;
  font: 11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  line-height: 10px;
  color: #e6edf3;
  vertical-align: middle;
  background-color: #161b22;
  border: solid 1px rgba(110, 118, 129, .4);
  border-bottom-color: rgba(110, 118, 129, .4);
  border-radius: 6px;
  box-shadow: inset 0 -1px 0 rgba(110, 118, 129, .4);
}

.gh-markdown details {
  margin-bottom: 16px;
}
.gh-markdown summary {
  cursor: pointer;
  font-weight: 600;
}

.gh-markdown .gh-broken-img {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 180, 171, .08);
  border: 1px dashed rgba(255, 180, 171, .3);
  border-radius: 6px;
  color: #ffb4ab;
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.gh-markdown-empty {
  color: rgba(255,255,255,.3);
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 13px;
  padding: 16px;
}
`;

function MarkdownPreview({ markdown, objectUrls }: MarkdownPreviewProps) {
  const urlTransform = useMemo(() => {
    return (url: string) => {
      if (objectUrls && objectUrls.has(url)) return objectUrls.get(url)!;
      return url;
    };
  }, [objectUrls]);

  return (
    <>
      <style>{PREVIEW_CSS}</style>
      {markdown.trim() ? (
        <div className="gh-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform}>
            {markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="gh-markdown-empty">
          <span style={{ color: "#27c93f" }}>❯</span> empty preview — start typing on the left
        </div>
      )}
    </>
  );
}

export default MarkdownPreview;

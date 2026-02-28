import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  content: string;
}

// ─── Think block ─────────────────────────────────────────────────────────────

function ThinkBlock({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const preview = content.trim().slice(0, 80).replace(/\n/g, ' ');
  return (
    <div style={{
      margin: '0.4rem 0',
      border: '1px solid #2a2a3a',
      borderRadius: '5px',
      overflow: 'hidden',
      fontSize: '0.82rem',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          width: '100%',
          background: '#161620',
          border: 'none',
          padding: '0.35rem 0.6rem',
          cursor: 'pointer',
          textAlign: 'left',
          color: '#6a6a9a',
          fontSize: '0.75rem',
        }}
      >
        <span style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        <span style={{ fontStyle: 'italic' }}>Thinking…</span>
        {!open && preview && (
          <span style={{ color: '#3a3a5a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {preview}{content.trim().length > 80 ? '…' : ''}
          </span>
        )}
      </button>
      {open && (
        <div style={{
          padding: '0.5rem 0.7rem',
          background: '#111118',
          color: '#7a7aaa',
          fontStyle: 'italic',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.55,
          borderTop: '1px solid #1e1e2e',
        }}>
          {content.trim()}
        </div>
      )}
    </div>
  );
}

// ─── Parse <think> blocks ────────────────────────────────────────────────────

type Segment = { type: 'text'; content: string } | { type: 'think'; content: string };

function parseThinkBlocks(content: string): Segment[] {
  const segments: Segment[] = [];
  const re = /<think>([\s\S]*?)<\/think>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', content: content.slice(last, match.index) });
    }
    segments.push({ type: 'think', content: match[1] });
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    segments.push({ type: 'text', content: content.slice(last) });
  }
  return segments;
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

const mdComponents = {
  code({ className, children, ...rest }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const code = String(children).replace(/\n$/, "");
    if (match) {
      return (
        <div style={{ position: "relative" }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#1d1f21",
            borderRadius: "6px 6px 0 0",
            padding: "4px 10px",
            fontSize: "0.72rem",
            color: "#888",
            borderBottom: "1px solid #333"
          }}>
            <span>{match[1]}</span>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              style={{
                background: "transparent",
                border: "none",
                color: "#666",
                cursor: "pointer",
                fontSize: "0.72rem",
                padding: "2px 4px",
                borderRadius: "3px"
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#aaa")}
              onMouseLeave={e => (e.currentTarget.style.color = "#666")}
              title="Copy code"
            >
              copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, borderRadius: "0 0 6px 6px", fontSize: "0.85rem", lineHeight: 1.5 }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code {...rest} style={{ background: "#1e1e1e", padding: "2px 6px", borderRadius: "3px", fontSize: "0.85em", color: "#e0e0e0" }}>
        {children}
      </code>
    );
  },
  pre({ children }: any) { return <div style={{ margin: "0.5rem 0" }}>{children}</div>; },
  p({ children }: any) { return <p style={{ margin: "0.25rem 0", lineHeight: 1.6 }}>{children}</p>; },
  ul({ children }: any) { return <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>{children}</ul>; },
  ol({ children }: any) { return <ol style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>{children}</ol>; },
  li({ children }: any) { return <li style={{ margin: "0.15rem 0" }}>{children}</li>; },
  blockquote({ children }: any) {
    return (
      <blockquote style={{ borderLeft: "3px solid #555", margin: "0.5rem 0", paddingLeft: "0.75rem", color: "#aaa" }}>
        {children}
      </blockquote>
    );
  },
  h1({ children }: any) { return <h1 style={{ fontSize: "1.2em", margin: "0.5rem 0 0.25rem", color: "#e0e0e0" }}>{children}</h1>; },
  h2({ children }: any) { return <h2 style={{ fontSize: "1.1em", margin: "0.5rem 0 0.25rem", color: "#e0e0e0" }}>{children}</h2>; },
  h3({ children }: any) { return <h3 style={{ fontSize: "1em", margin: "0.4rem 0 0.2rem", color: "#e0e0e0" }}>{children}</h3>; },
  strong({ children }: any) { return <strong style={{ color: "#f0f0f0" }}>{children}</strong>; },
  hr() { return <hr style={{ border: "none", borderTop: "1px solid #333", margin: "0.5rem 0" }} />; },
};

// ─── Main export ─────────────────────────────────────────────────────────────

export function MarkdownMessage({ content }: Props) {
  const segments = parseThinkBlocks(content);

  // Fast path: no think blocks
  if (segments.length === 1 && segments[0].type === 'text') {
    return <ReactMarkdown components={mdComponents}>{content}</ReactMarkdown>;
  }

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'think'
          ? <ThinkBlock key={i} content={seg.content} />
          : seg.content.trim()
            ? <ReactMarkdown key={i} components={mdComponents}>{seg.content}</ReactMarkdown>
            : null
      )}
    </>
  );
}

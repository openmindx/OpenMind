import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  content: string;
}

export function MarkdownMessage({ content }: Props) {
  return (
    <ReactMarkdown
      components={{
        code({ className, children, ...rest }) {
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
                  customStyle={{
                    margin: 0,
                    borderRadius: "0 0 6px 6px",
                    fontSize: "0.85rem",
                    lineHeight: 1.5
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          }
          return (
            <code
              {...rest}
              style={{
                background: "#1e1e1e",
                padding: "2px 6px",
                borderRadius: "3px",
                fontSize: "0.85em",
                color: "#e0e0e0"
              }}
            >
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <div style={{ margin: "0.5rem 0" }}>{children}</div>;
        },
        p({ children }) {
          return <p style={{ margin: "0.25rem 0", lineHeight: 1.6 }}>{children}</p>;
        },
        ul({ children }) {
          return <ul style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>{children}</ul>;
        },
        ol({ children }) {
          return <ol style={{ margin: "0.25rem 0", paddingLeft: "1.5rem" }}>{children}</ol>;
        },
        li({ children }) {
          return <li style={{ margin: "0.15rem 0" }}>{children}</li>;
        },
        blockquote({ children }) {
          return (
            <blockquote style={{
              borderLeft: "3px solid #555",
              margin: "0.5rem 0",
              paddingLeft: "0.75rem",
              color: "#aaa"
            }}>
              {children}
            </blockquote>
          );
        },
        h1({ children }) { return <h1 style={{ fontSize: "1.2em", margin: "0.5rem 0 0.25rem", color: "#e0e0e0" }}>{children}</h1>; },
        h2({ children }) { return <h2 style={{ fontSize: "1.1em", margin: "0.5rem 0 0.25rem", color: "#e0e0e0" }}>{children}</h2>; },
        h3({ children }) { return <h3 style={{ fontSize: "1em", margin: "0.4rem 0 0.2rem", color: "#e0e0e0" }}>{children}</h3>; },
        strong({ children }) { return <strong style={{ color: "#f0f0f0" }}>{children}</strong>; },
        hr() { return <hr style={{ border: "none", borderTop: "1px solid #333", margin: "0.5rem 0" }} />; },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

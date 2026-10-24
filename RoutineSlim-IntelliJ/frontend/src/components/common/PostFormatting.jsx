import React from "react";
function inline(text) {
  return text
    .split(/(\*\*[^*]+\*\*|__[^_]+__|_[^_]+_|`[^`]+`)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("__") && part.endsWith("__") ? (
        <u key={i}>{part.slice(2, -2)}</u>
      ) : part.startsWith("_") && part.endsWith("_") ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : part.startsWith("`") && part.endsWith("`") ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}
export function FormattedPostContent({ content = "" }) {
  return (
    <div className="post-body">
      {content.split("\n").map((line, i) =>
        line.startsWith("## ") ? (
          <h3 key={i}>{inline(line.slice(3))}</h3>
        ) : line.startsWith("> ") ? (
          <blockquote key={i}>{inline(line.slice(2))}</blockquote>
        ) : (
          <div key={i}>
            {line.startsWith("- ") ? "• " : ""}
            {inline(line.startsWith("- ") ? line.slice(2) : line)}
            {!line && <br />}
          </div>
        ),
      )}
    </div>
  );
}
export function FormattingToolbar({ onFormat }) {
  return (
    <div className="formatting-toolbar" role="toolbar" aria-label="본문 서식">
      <button
        type="button"
        aria-label="굵게"
        onClick={() => onFormat("**", "**")}
      >
        B
      </button>
      <button
        type="button"
        aria-label="기울임"
        onClick={() => onFormat("_", "_")}
      >
        <i>I</i>
      </button>
      <button
        type="button"
        aria-label="밑줄"
        onClick={() => onFormat("__", "__")}
      >
        <u>U</u>
      </button>
      <span />
      <button
        type="button"
        aria-label="소제목"
        onClick={() => onFormat("## ", "")}
      >
        H
      </button>
      <button
        type="button"
        aria-label="목록"
        onClick={() => onFormat("- ", "")}
      >
        ☷
      </button>
      <button
        type="button"
        aria-label="인용"
        onClick={() => onFormat("> ", "")}
      >
        ❞
      </button>
      <small>텍스트를 선택해 서식을 적용하세요</small>
    </div>
  );
}

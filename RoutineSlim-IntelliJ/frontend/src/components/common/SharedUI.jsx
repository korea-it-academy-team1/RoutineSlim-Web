import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export function Heading({ title, description, children }) {
  return (
    <div className="heading feature-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="feature-actions">{children}</div>
    </div>
  );
}
export function Status({ resource }) {
  return (
    <>
      {resource.error && (
        <p className="error" role="alert">
          {resource.error}
        </p>
      )}
      {resource.loading && <p className="muted">불러오는 중...</p>}
    </>
  );
}
export function Empty({ children }) {
  return (
    <p className="feature-empty">
      {children || "아직 등록된 항목이 없습니다."}
    </p>
  );
}
export function Tabs({ values, value, onChange }) {
  return (
    <div className="feature-tabs" role="group">
      {values.map(([key, label]) => (
        <button
          type="button"
          key={key}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
export function Stats({ items }) {
  return (
    <div className="stats feature-stats">
      {items.map(([label, value, detail]) => (
        <article className="stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          {detail && <small className="muted">{detail}</small>}
        </article>
      ))}
    </div>
  );
}
export function Modal({ title, onClose, error, children }) {
  const root = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const first = root.current?.querySelector("input,select,textarea,button");
    first?.focus();
    function key(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const fields = Array.from(
          root.current?.querySelectorAll(
            "button:not(:disabled),input:not(:disabled),select,textarea,a[href]",
          ) || [],
        );
        if (!fields.length) return;
        const first = fields[0],
          last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.isConnected && previous.focus();
    };
  }, []);
  return createPortal(
    <div
      className="feature-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="feature-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={root}
      >
        <div className="feature-modal-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="secondary small"
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {children}
      </section>
    </div>,
    document.body,
  );
}
export function Field({ label, children }) {
  return (
    <label className="feature-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function FormActions({ busy, onCancel, label = "저장" }) {
  return (
    <div className="feature-form-actions">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={onCancel}
      >
        취소
      </button>
      <button className="primary" disabled={busy}>
        {busy ? "처리 중..." : label}
      </button>
    </div>
  );
}
export const dateText = (value) => String(value || "").slice(0, 10);

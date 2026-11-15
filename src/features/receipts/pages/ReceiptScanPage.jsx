import React, { useEffect, useRef, useState } from "react";
import {
  scanReceipt,
  createSubscriptionFromReceipt,
} from "../../subscriptions/api/subscriptionsApi";
import { Heading } from "../../../shared/components/PagePrimitives";
import "../styles/receiptScan.css";

const scanErrors = {
  413: "파일이 너무 큽니다. 10MB 이하 파일을 선택해주세요.",
  415: "JPG, PNG, PDF 파일을 선택해주세요.",
  422: "영수증을 읽지 못했습니다. 더 선명한 파일로 다시 시도해주세요.",
  503: "서버의 영수증 인식 서비스가 설정되지 않았습니다.",
  504: "인식 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.",
};
export default function ReceiptScanPage({ navigate }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!file || !["image/jpeg", "image/png"].includes(file.type)) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function handleFileChange(event) {
    const next = event.target.files?.[0];
    setFile(null);
    setResult(null);
    setForm(null);
    setError("");
    setSaved(false);
    if (!next) return;
    if (
      !/\.(jpe?g|png|pdf)$/i.test(next.name) ||
      (next.type && !["image/jpeg", "image/png", "application/pdf"].includes(next.type))
    ) {
      setError("JPG, PNG, PDF 파일만 업로드할 수 있습니다.");
      return;
    }
    if (!next.size || next.size > 10 * 1024 * 1024) {
      setError("내용이 있는 10MB 이하 파일을 선택해주세요.");
      return;
    }
    setFile(next);
  }
  async function handleScanSubmit(event) {
    event.preventDefault();
    if (!file || pending.current) return;
    pending.current = true;
    setBusy("scan");
    setError("");
    setForm(null);
    setResult(null);
    setSaved(false);
    try {
      const data = await scanReceipt(file);
      if (!data || typeof data !== "object")
        throw new Error("인식 결과를 확인할 수 없습니다. 다시 시도해주세요.");
      setResult(data);
      setForm({
        name: data.name ?? "",
        amount: data.amount ?? "",
        categoryId: data.categoryId ?? "",
        billingCycle: data.billingCycle || "MONTHLY",
        startDate: data.startDate ?? "",
      });
    } catch (err) {
      setError(scanErrors[err.status] || err.message || "영수증 인식에 실패했습니다.");
    } finally {
      pending.current = false;
      setBusy("");
    }
  }
  async function handleSaveSubmit(event) {
    event.preventDefault();
    if (pending.current || saved) return;
    const categoryId = Number(form.categoryId),
      amount = Number(form.amount);
    if (
      !form.name.trim() ||
      !Number.isSafeInteger(categoryId) ||
      categoryId < 1 ||
      form.amount === "" ||
      !Number.isInteger(amount) ||
      amount < 0 ||
      amount > 2147483647 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)
    ) {
      setError("서비스명, 올바른 카테고리 ID, 금액, 결제일을 입력해주세요.");
      return;
    }
    pending.current = true;
    setBusy("save");
    setError("");
    try {
      await createSubscriptionFromReceipt({
        name: form.name.trim(),
        categoryId,
        presetId: result.presetId ?? null,
        amount,
        currency: "KRW",
        billingCycle: form.billingCycle,
        cycleInterval: 1,
        startDate: form.startDate,
        status: "ACTIVE",
        notifyEnabled: true,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || "구독 등록에 실패했습니다.");
    } finally {
      pending.current = false;
      setBusy("");
    }
  }
  const updateField = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <section className="feature-page receipt-page">
      <Heading
        title="영수증 OCR"
        description="영수증에서 구독 정보를 읽고, 확인한 내용을 구독으로 등록하세요."
      />
      <ol className="receipt-steps">
        <li>1. 영수증 업로드</li>
        <li>2. 인식 결과 확인</li>
        <li>3. 구독 등록</li>
      </ol>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <div className="receipt-card" role="status">
          <h2>구독이 등록되었습니다.</h2>
          <button className="primary" onClick={() => navigate("subscriptions")}>
            구독 목록 보기
          </button>
        </div>
      )}
      <div className="receipt-grid">
        <form className="receipt-card" onSubmit={handleScanSubmit} aria-busy={busy === "scan"}>
          <h2>영수증 파일</h2>
          <p>JPG · PNG · PDF, 최대 10MB</p>
          <label htmlFor="receipt-file">파일 선택</label>
          <input
            id="receipt-file"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleFileChange}
            disabled={Boolean(busy)}
          />
          {file && (
            <p>
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB
            </p>
          )}
          {preview && (
            <img className="receipt-preview" src={preview} alt="선택한 영수증 미리보기" />
          )}
          {file?.type === "application/pdf" && <p>PDF는 미리보기 없이 인식합니다.</p>}
          <button className="primary" disabled={!file || Boolean(busy)}>
            {busy === "scan" ? "영수증 인식 중..." : "영수증 인식하기"}
          </button>
        </form>
        <div className="receipt-card">
          <h2>인식 결과 확인</h2>
          {!form && <p>영수증을 인식하면 수정 가능한 구독 초안이 표시됩니다.</p>}
          {form && (
            <form onSubmit={handleSaveSubmit} aria-busy={busy === "save"}>
              <p>인식 결과가 정확한지 확인해주세요. 결제 주기는 월간으로 제안됩니다.</p>
              <fieldset disabled={Boolean(busy) || saved} className="receipt-fields">
                <label>
                  서비스명
                  <input
                    value={form.name}
                    maxLength={100}
                    required
                    onChange={updateField("name")}
                  />
                </label>
                <label>
                  결제 금액 (원)
                  <input
                    type="number"
                    min="0"
                    max="2147483647"
                    step="1"
                    required
                    value={form.amount}
                    onChange={updateField("amount")}
                  />
                </label>
                <label>
                  카테고리 ID
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.categoryId}
                    onChange={updateField("categoryId")}
                  />
                </label>
                <small>자동 입력되지 않았다면 서버에 등록된 카테고리 ID를 입력해주세요.</small>
                <label>
                  결제 주기
                  <select value={form.billingCycle} onChange={updateField("billingCycle")}>
                    <option value="MONTHLY">매월</option>
                    <option value="YEARLY">매년</option>
                    <option value="WEEKLY">매주</option>
                  </select>
                </label>
                <label>
                  결제 기준일
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={updateField("startDate")}
                  />
                </label>
                <button className="primary">
                  {busy === "save" ? "등록 중..." : "확인하고 구독 등록"}
                </button>
              </fieldset>
              <details>
                <summary>인식된 원문 보기</summary>
                <p>상호: {result.recognized?.storeName || "인식되지 않음"}</p>
                <ul>
                  {(result.recognized?.itemNames || []).map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </details>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

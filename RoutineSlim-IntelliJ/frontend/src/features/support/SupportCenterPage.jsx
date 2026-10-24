import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { request } from "../../api/apiClient";
import {
  Heading,
  Status,
  Empty,
  Tabs,
  Modal,
  Field,
  FormActions,
  dateText,
} from "../../components/common/SharedUI";
export default function SupportCenterPage({ user, navigate }) {
  const [tab, setTab] = useState("faqs"),
    [search, setSearch] = useState(""),
    [form, setForm] = useState(null);
  const r = useApiResource(
    tab === "inquiries" && !user ? null : "/api/v1/support/" + tab,
  );
  const rows = (r.data || []).filter((x) =>
    (x.title + " " + (x.content || "") + " " + (x.answer || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function send(e) {
    e.preventDefault();
    await r.run(async () => {
      await request("/api/v1/support/inquiries", {
        method: "POST",
        body: form,
      });
      setForm(null);
      setTab("inquiries");
      if (tab === "inquiries") await r.reload();
    });
  }
  async function remove(x) {
    if (!confirm("문의와 답변을 삭제할까요?")) return;
    await r.run(async () => {
      await request("/api/v1/support/inquiries/" + x.id, { method: "DELETE" });
      await r.reload();
    });
  }
  function open() {
    if (!user) {
      navigate("login");
      return;
    }
    r.setError("");
    setForm({ category: "서비스 이용", title: "", content: "" });
  }
  return (
    <section className="feature-page">
      <Heading
        title="고객센터"
        description="궁금한 점을 확인하고 도움이 필요하면 문의해주세요."
      >
        <button className="primary" onClick={open}>
          {user ? "문의하기" : "로그인 후 문의하기"}
        </button>
      </Heading>
      <Status resource={r} />
      <section className="panel">
        <Tabs
          values={[
            ["faqs", "FAQ"],
            ["notices", "공지사항"],
            ["inquiries", "내 문의"],
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="feature-search">
          <input
            aria-label="고객센터 검색"
            placeholder="궁금한 내용을 검색해보세요"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab === "inquiries" && !user ? (
          <Empty>내 문의 내역은 로그인 후 확인할 수 있습니다.</Empty>
        ) : rows.length ? (
          rows.map((x) => (
            <details className="feature-details" key={x.id}>
              <summary>
                <span className="feature-pill">
                  {tab === "inquiries"
                    ? x.status === "ANSWERED"
                      ? "답변 완료"
                      : "답변 대기"
                    : x.category}
                </span>
                <strong>{x.title}</strong>
                <small>{dateText(x.createdAt)}</small>
              </summary>
              <div className="feature-detail-content">
                <p>{x.content}</p>
                {x.answer && (
                  <div className="feature-answer">
                    <b>관리자 답변</b>
                    <p>{x.answer}</p>
                    <small>{dateText(x.answeredAt)}</small>
                  </div>
                )}
                {tab === "inquiries" && (
                  <button
                    className="danger small"
                    disabled={r.busy}
                    onClick={() => remove(x)}
                  >
                    문의 삭제
                  </button>
                )}
              </div>
            </details>
          ))
        ) : (
          !r.loading && (
            <Empty>
              {search
                ? "검색 결과가 없습니다."
                : tab === "inquiries"
                  ? "등록한 문의가 없습니다."
                  : "등록된 안내가 없습니다."}
            </Empty>
          )
        )}
      </section>
      {form && (
        <Modal
          title="문의하기"
          error={r.error}
          onClose={() => !r.busy && setForm(null)}
        >
          <form className="feature-form" onSubmit={send}>
            <Field label="문의 유형">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {["서비스 이용", "회원·인증", "데이터 관리", "기타"].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="제목">
              <input
                required
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="문의 내용">
              <textarea
                required
                rows={6}
                maxLength={5000}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </Field>
            <FormActions
              busy={r.busy}
              onCancel={() => setForm(null)}
              label="문의 등록"
            />
          </form>
        </Modal>
      )}
    </section>
  );
}

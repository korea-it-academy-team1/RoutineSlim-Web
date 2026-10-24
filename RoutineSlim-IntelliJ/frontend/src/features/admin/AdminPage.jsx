import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { request, money } from "../../api/apiClient";
import CommunityReportModeration from "./components/CommunityReportModeration";
import {
  Heading,
  Status,
  Empty,
  Tabs,
  Stats,
  Modal,
  Field,
  FormActions,
  dateText,
} from "../../components/common/SharedUI";
export default function AdminPage({ user }) {
  const overview = useApiResource("/api/v1/admin/overview"),
    [tab, setTab] = useState("members"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [form, setForm] = useState(null);
  const kind = { notices: "notice", faqs: "faq", plans: "plan" }[tab];
  const path =
    tab === "members"
      ? `/api/v1/admin/members?query=${encodeURIComponent(query)}&page=${page}&size=20`
      : tab === "inquiries"
        ? "/api/v1/admin/inquiries"
        : kind
          ? "/api/v1/admin/content/" + kind
          : null;
  const r = useApiResource(path);
  const counts = overview.data;
  function open(item) {
    r.setError("");
    if (tab === "plans")
      setForm(
        item
          ? { ...item, featuresText: (item.features || []).join("\n") }
          : {
              service: "",
              plan: "",
              category: "영상",
              amount: "",
              cycle: "monthly",
              featuresText: "",
              sourceUrl: "",
              active: true,
            },
      );
    else if (tab === "inquiries")
      setForm({ ...item, answer: item.answer || "" });
    else
      setForm(
        item || {
          title: "",
          category: "이용 안내",
          content: "",
          published: true,
        },
      );
  }
  async function save(e) {
    e.preventDefault();
    await r.run(async () => {
      let url, body;
      if (tab === "inquiries") {
        url = "/api/v1/admin/inquiries/" + form.id + "/answer";
        body = { answer: form.answer };
      } else if (tab === "plans") {
        url = "/api/v1/admin/plans" + (form.id ? "/" + form.id : "");
        body = {
          service: form.service,
          plan: form.plan,
          category: form.category,
          amount: Number(form.amount),
          cycle: form.cycle,
          features: form.featuresText
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean),
          sourceUrl: form.sourceUrl || "",
          active: form.active,
        };
      } else {
        url = "/api/v1/admin/content/" + kind + (form.id ? "/" + form.id : "");
        body = {
          title: form.title,
          category: form.category,
          content: form.content,
          published: form.published,
        };
      }
      await request(url, { method: form.id ? "PUT" : "POST", body });
      setForm(null);
      await r.reload();
      await overview.reload();
    });
  }
  async function remove(x) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    await r.run(async () => {
      await request("/api/v1/admin/content/" + kind + "/" + x.id, {
        method: "DELETE",
      });
      await r.reload();
      await overview.reload();
    });
  }
  async function suspend(x) {
    if (
      !confirm(
        x.suspended
          ? "이 회원의 이용 정지를 해제할까요?"
          : "이 회원을 이용 정지할까요?",
      )
    )
      return;
    await r.run(async () => {
      await request(
        `/api/v1/admin/members/${encodeURIComponent(x.id)}/suspension`,
        { method: "PUT", body: { suspended: !x.suspended } },
      );
      await r.reload();
      await overview.reload();
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title="관리자 대시보드"
        description="회원·콘텐츠·문의와 서비스 운영 현황을 관리하세요."
      />
      <Status resource={overview} />
      {counts && (
        <Stats
          items={[
            ["전체 회원", counts.members + "명"],
            ["커뮤니티 게시글", counts.posts + "개"],
            ["대기 중인 신고", counts.reports + "건"],
            ["답변 대기 문의", counts.openInquiries + "건"],
          ]}
        />
      )}
      <Tabs
        values={[
          ["members", "회원 관리"],
          ["reports", "신고 관리"],
          ["inquiries", "문의 답변"],
          ["notices", "공지사항"],
          ["faqs", "FAQ"],
          ["plans", "비교 요금제"],
        ]}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setForm(null);
          setPage(0);
        }}
      />
      <Status resource={r} />
      {tab === "reports" ? (
        <CommunityReportModeration />
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>
              {
                {
                  members: "회원 목록",
                  inquiries: "접수된 문의",
                  notices: "공지사항 관리",
                  faqs: "FAQ 관리",
                  plans: "구독 비교 요금제",
                }[tab]
              }
            </h2>
            {kind && (
              <button className="primary" onClick={() => open()}>
                ＋ 등록
              </button>
            )}
          </div>
          {tab === "members" ? (
            <>
              <form
                className="feature-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQuery(search);
                  setPage(0);
                }}
              >
                <input
                  aria-label="회원 검색"
                  maxLength={120}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="아이디·이름·이메일 검색"
                />
                <button className="secondary">검색</button>
              </form>
              {r.data?.content.map((x) => (
                <div className="feature-row" key={x.id}>
                  <div className="feature-grow">
                    <b>
                      {x.displayName} · {x.id}
                    </b>
                    <p>{x.email || "이메일 미등록"}</p>
                  </div>
                  <span className="feature-pill">
                    {x.role === "ADMIN"
                      ? "관리자"
                      : x.suspended
                        ? "이용 정지"
                        : "일반 회원"}
                  </span>
                  <button
                    className={x.suspended ? "secondary small" : "danger small"}
                    disabled={r.busy || x.id === user || x.role === "ADMIN"}
                    onClick={() => suspend(x)}
                  >
                    {x.suspended ? "이용 정지 해제" : "이용 정지"}
                  </button>
                </div>
              ))}
              {r.data && !r.data.content.length && (
                <Empty>검색 결과가 없습니다.</Empty>
              )}
              <div className="feature-pagination">
                <button
                  className="secondary small"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  이전
                </button>
                <span>
                  {page + 1} 페이지 · {r.data?.total || 0}명
                </span>
                <button
                  className="secondary small"
                  disabled={!r.data || (page + 1) * 20 >= r.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  다음
                </button>
              </div>
            </>
          ) : tab === "inquiries" ? (
            (r.data || []).map((x) => (
              <article className="feature-inquiry" key={x.id}>
                <div className="panel-heading">
                  <h3>{x.title}</h3>
                  <span className="feature-pill">
                    {x.status === "ANSWERED" ? "답변 완료" : "답변 대기"}
                  </span>
                </div>
                <p className="muted">
                  {x.ownerId} · {x.category} · {dateText(x.createdAt)}
                </p>
                <p className="post-body">{x.content}</p>
                {x.answer && <div className="feature-answer">{x.answer}</div>}
                <button className="secondary" onClick={() => open(x)}>
                  {x.answer ? "답변 수정" : "답변 작성"}
                </button>
              </article>
            ))
          ) : (
            (r.data || []).map((x) => (
              <div className="feature-row" key={x.id}>
                <div className="feature-grow">
                  <b>
                    {tab === "plans" ? x.service + " · " + x.plan : x.title}
                  </b>
                  <p>
                    {x.category} ·{" "}
                    {tab === "plans"
                      ? money(x.amount) +
                        " / " +
                        (x.cycle === "monthly" ? "월" : "년")
                      : dateText(x.updatedAt)}
                  </p>
                </div>
                <span className="feature-pill">
                  {(tab === "plans" ? x.active : x.published)
                    ? "공개"
                    : "비공개"}
                </span>
                <button
                  className="secondary small"
                  disabled={r.busy}
                  onClick={() => open(x)}
                >
                  수정
                </button>
                <button
                  className="danger small"
                  disabled={r.busy}
                  onClick={() => remove(x)}
                >
                  삭제
                </button>
              </div>
            ))
          )}
          {tab !== "members" && Array.isArray(r.data) && !r.data.length && (
            <Empty>등록된 항목이 없습니다.</Empty>
          )}
        </section>
      )}
      {form && (
        <Modal
          title={
            tab === "inquiries"
              ? "문의 답변"
              : tab === "plans"
                ? "비교 요금제 등록·수정"
                : "안내 등록·수정"
          }
          error={r.error}
          onClose={() => !r.busy && setForm(null)}
        >
          <form className="feature-form" onSubmit={save}>
            {tab === "inquiries" ? (
              <>
                <p>
                  <b>{form.title}</b>
                </p>
                <p className="post-body">{form.content}</p>
                <Field label="답변 내용">
                  <textarea
                    required
                    maxLength={5000}
                    rows={6}
                    value={form.answer}
                    onChange={(e) =>
                      setForm({ ...form, answer: e.target.value })
                    }
                  />
                </Field>
              </>
            ) : tab === "plans" ? (
              <>
                <Field label="서비스명">
                  <input
                    required
                    maxLength={80}
                    value={form.service}
                    onChange={(e) =>
                      setForm({ ...form, service: e.target.value })
                    }
                  />
                </Field>
                <Field label="요금제 이름">
                  <input
                    required
                    maxLength={80}
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  />
                </Field>
                <Field label="카테고리">
                  <input
                    required
                    maxLength={40}
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </Field>
                <Field label="금액">
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000000000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                  />
                </Field>
                <Field label="결제 주기">
                  <select
                    value={form.cycle}
                    onChange={(e) =>
                      setForm({ ...form, cycle: e.target.value })
                    }
                  >
                    <option value="monthly">매월</option>
                    <option value="yearly">매년</option>
                  </select>
                </Field>
                <Field label="제공 조건 (한 줄에 하나, 최대 12개)">
                  <textarea
                    maxLength={1440}
                    rows={4}
                    value={form.featuresText}
                    onChange={(e) =>
                      setForm({ ...form, featuresText: e.target.value })
                    }
                  />
                </Field>
                <Field label="공식 출처 주소">
                  <input
                    type="url"
                    maxLength={500}
                    value={form.sourceUrl}
                    onChange={(e) =>
                      setForm({ ...form, sourceUrl: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </Field>
                <label className="feature-task">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  공개
                </label>
              </>
            ) : (
              <>
                <Field label="제목">
                  <input
                    required
                    maxLength={120}
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </Field>
                <Field label="카테고리">
                  <input
                    required
                    maxLength={40}
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </Field>
                <Field label="내용">
                  <textarea
                    required
                    maxLength={10000}
                    rows={8}
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                  />
                </Field>
                <label className="feature-task">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                  />
                  공개
                </label>
              </>
            )}
            <FormActions busy={r.busy} onCancel={() => setForm(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}

import { useApiResource } from "../../hooks/useApiResource";
import React, { useState } from "react";
import { request } from "../../api/apiClient";
import {
  Heading,
  Status,
  Empty,
  Tabs,
  Stats,
  dateText,
} from "../../components/common/SharedUI";
export default function CommunityActivityPage({ navigate }) {
  const r = useApiResource("/api/v1/activity/me"),
    [tab, setTab] = useState("posts"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1);
  const d = r.data || { posts: [], comments: [], likes: [] };
  const rows = d[tab].filter((x) =>
    (x.title + " " + (x.content || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  async function remove(x) {
    if (
      !confirm(
        tab === "comments"
          ? "이 댓글을 삭제할까요?"
          : "이 게시글을 삭제할까요?",
      )
    )
      return;
    await r.run(async () => {
      await request(
        "/api/v1/community/posts/" +
          (tab === "comments" ? x.postId + "/comments/" + x.id : x.id),
        { method: "DELETE" },
      );
      await r.reload();
      setPage(1);
    });
  }
  async function unlike(x) {
    await r.run(async () => {
      await request(`/api/v1/community/posts/${x.id}/likes/toggle`, {
        method: "POST",
      });
      await r.reload();
      setPage(1);
    });
  }
  return (
    <section className="feature-page">
      <Heading
        title="내 활동"
        description="내가 나눈 이야기와 관심 있는 글을 한곳에서 확인하세요."
      />
      <Status resource={r} />
      <Stats
        items={[
          ["작성한 글", d.posts.length + "개"],
          ["작성한 댓글", d.comments.length + "개"],
          ["좋아요한 글", d.likes.length + "개"],
        ]}
      />
      <section className="panel">
        <div className="panel-heading">
          <Tabs
            values={[
              ["posts", "작성한 글"],
              ["comments", "댓글"],
              ["likes", "좋아요"],
            ]}
            value={tab}
            onChange={(value) => {
              setTab(value);
              setPage(1);
            }}
          />
          <input
            aria-label="내 활동 검색"
            placeholder="내 활동 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {rows
          .slice((Math.min(page, pages) - 1) * 10, Math.min(page, pages) * 10)
          .map((x) => (
            <article className="feature-row" key={x.id}>
              <div className="feature-grow">
                <button
                  className="feature-text-link"
                  onClick={() => navigate("community", x.postId || x.id)}
                >
                  {x.title}
                </button>
                {x.content && <p className="post-body">{x.content}</p>}
                <p>
                  {dateText(x.createdAt)}
                  {x.category ? " · " + x.category : ""}
                </p>
              </div>
              <button
                className="secondary small"
                onClick={() => navigate("community", x.postId || x.id)}
              >
                글 보기
              </button>
              {tab === "likes" ? (
                <button
                  className="secondary small"
                  disabled={r.busy}
                  onClick={() => unlike(x)}
                >
                  좋아요 취소
                </button>
              ) : (
                <button
                  className="danger small"
                  disabled={r.busy}
                  onClick={() => remove(x)}
                >
                  삭제
                </button>
              )}
            </article>
          ))}
        {!rows.length && <Empty>표시할 활동이 없습니다.</Empty>}
        <div className="feature-pagination">
          <button
            className="secondary small"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span>
            {Math.min(page, pages)} / {pages}
          </span>
          <button
            className="secondary small"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      </section>
    </section>
  );
}

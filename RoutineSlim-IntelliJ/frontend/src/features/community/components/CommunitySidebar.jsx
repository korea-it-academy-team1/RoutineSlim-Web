import React, { useEffect, useState } from "react";
import { request } from "../../../api/apiClient";
export default function CommunitySidebar({ navigate }) {
  const [posts, setPosts] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    function load() {
      request("/api/v1/community/posts")
        .then((value) => {
          if (active) {
            setPosts(value);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    load();
    window.addEventListener("routineslim:community", load);
    return () => {
      active = false;
      window.removeEventListener("routineslim:community", load);
    };
  }, []);
  const tags = {};
  for (const p of posts)
    for (const tag of p.tags || []) tags[tag] = (tags[tag] || 0) + 1;
  return (
    <aside className="overview-rail" aria-label="커뮤니티 안내">
      <section className="panel">
        <h2>최근 올라온 이야기</h2>
        {error && <p className="muted">{error}</p>}
        {posts.slice(0, 5).map((p, i) => (
          <button
            className="community-recent"
            key={p.id}
            onClick={() => navigate("community", p.id)}
          >
            <b>{i + 1}</b>
            <span>
              {p.title}
              <small>
                {p.category} · {p.authorId}
              </small>
            </span>
          </button>
        ))}
        {!posts.length && !error && (
          <p className="muted">첫 이야기를 나눠보세요.</p>
        )}
      </section>
      <section className="panel">
        <h2>함께 찾는 태그</h2>
        <div className="tag-cloud">
          {Object.entries(tags)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([tag, count]) => (
              <button
                key={tag}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("routineslim:community-search", {
                      detail: tag,
                    }),
                  )
                }
              >
                #{tag} <small>{count}</small>
              </button>
            ))}
        </div>
        {!Object.keys(tags).length && (
          <p className="muted">게시글에 태그를 추가해보세요.</p>
        )}
      </section>
      <section className="rail-tip">
        <span className="eyebrow">COMMUNITY GUIDE</span>
        <h2>
          작은 경험도
          <br />
          누군가에게는 큰 도움
        </h2>
        <p>
          직접 사용한 서비스와 절약 습관을 나눠주세요. 개인정보는 올리지 말고
          서로 존중해주세요.
        </p>
      </section>
      <section className="panel">
        <h2>함께 만드는 커뮤니티</h2>
        <div className="community-counts">
          <div>
            <b>{posts.length}</b>
            <small>게시글</small>
          </div>
          <div>
            <b>{new Set(posts.map((p) => p.authorId)).size}</b>
            <small>작성자</small>
          </div>
          <div>
            <b>{Object.keys(tags).length}</b>
            <small>태그</small>
          </div>
        </div>
      </section>
    </aside>
  );
}

import {
  FormattingToolbar,
  FormattedPostContent,
} from "../../components/common/PostFormatting";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { request } from "../../api/apiClient";
const categories = ["자유", "절약 팁", "추천", "질문"];
const empty = {
  title: "",
  category: "자유",
  content: "",
  images: [],
  tags: "",
};
const tagList = (value) =>
  value
    .split(",")
    .map((x) => x.trim().replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 10);
export default function CommunityPage({ user, initialPostId }) {
  const [composing, setComposing] = useState(false);
  const [posts, setPosts] = useState([]),
    [selected, setSelected] = useState(null),
    [comments, setComments] = useState([]),
    [likes, setLikes] = useState({ likes: 0, liked: false });
  const [draft, setDraft] = useState(empty),
    [edit, setEdit] = useState(null),
    [comment, setComment] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("전체"),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const composeInput = useRef(null);
  const locked = useRef(false),
    detailVersion = useRef(0);
  const draftKey = "routineslim:post-draft:" + user;
  async function load() {
    const value = await request("/api/v1/community/posts");
    setPosts(value);
    window.dispatchEvent(new Event("routineslim:community"));
  }
  useEffect(() => {
    let active = true;
    request("/api/v1/community/posts")
      .then((value) => {
        if (active) setPosts(value);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      detailVersion.current++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (initialPostId)
      request("/api/v1/community/posts/" + encodeURIComponent(initialPostId))
        .then((post) => {
          if (active) open(post);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [initialPostId]);
  useEffect(() => {
    function searchTag(event) {
      setSearch(String(event.detail || ""));
      setPage(1);
      back();
    }
    window.addEventListener("routineslim:community-search", searchTag);
    return () =>
      window.removeEventListener("routineslim:community-search", searchTag);
  }, []);
  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          (filter === "전체" || p.category === filter) &&
          (p.title + " " + p.content + " " + (p.tags || []).join(" "))
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [posts, filter, search],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  useEffect(() => setPage((current) => Math.min(current, pages)), [pages]);
  async function act(work) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function open(post) {
    const version = ++detailVersion.current;
    setSelected(post);
    setEdit(null);
    setComment("");
    setComments([]);
    setLikes({ likes: 0, liked: false });
    setLoading(true);
    setError("");
    try {
      const [current, cs, counts] = await Promise.all([
        request(`/api/v1/community/posts/${post.id}`),
        request(`/api/v1/community/posts/${post.id}/comments`),
        request(`/api/v1/community/posts/${post.id}/likes/count`),
      ]);
      if (version === detailVersion.current) {
        setSelected(current);
        setComments(cs);
        setLikes(counts);
      }
    } catch (e) {
      if (version === detailVersion.current) setError(e.message);
    } finally {
      if (version === detailVersion.current) setLoading(false);
    }
  }
  function back() {
    detailVersion.current++;
    setSelected(null);
    setEdit(null);
    setLoading(false);
    setError("");
  }
  async function create(e) {
    e.preventDefault();
    await act(async () => {
      await request("/api/v1/community/posts", {
        method: "POST",
        body: { ...draft, tags: tagList(draft.tags) },
      });
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      setDraft(empty);
      setComposing(false);
      setPage(1);
      await load();
    });
  }
  async function saveEdit(e) {
    e.preventDefault();
    await act(async () => {
      const updated = await request(`/api/v1/community/posts/${selected.id}`, {
        method: "PUT",
        body: { ...edit, tags: tagList(edit.tags) },
      });
      setSelected(updated);
      setEdit(null);
      await load();
    });
  }
  async function addComment(e) {
    e.preventDefault();
    const value = comment.trim();
    if (!value) return;
    await act(async () => {
      await request(`/api/v1/community/posts/${selected.id}/comments`, {
        method: "POST",
        body: { content: value },
      });
      setComment("");
      setComments(
        await request(`/api/v1/community/posts/${selected.id}/comments`),
      );
    });
  }
  async function changeComment(c) {
    const value = prompt("댓글 수정", c.content);
    if (!value?.trim()) return;
    await act(async () => {
      await request(`/api/v1/community/posts/${selected.id}/comments/${c.id}`, {
        method: "PUT",
        body: { content: value.trim() },
      });
      setComments(
        await request(`/api/v1/community/posts/${selected.id}/comments`),
      );
    });
  }
  async function deleteComment(c) {
    if (!confirm("댓글을 삭제할까요?")) return;
    await act(async () => {
      await request(`/api/v1/community/posts/${selected.id}/comments/${c.id}`, {
        method: "DELETE",
      });
      setComments(
        await request(`/api/v1/community/posts/${selected.id}/comments`),
      );
    });
  }
  async function like() {
    await act(async () =>
      setLikes(
        await request(`/api/v1/community/posts/${selected.id}/likes/toggle`, {
          method: "POST",
        }),
      ),
    );
  }
  async function report() {
    const reason = prompt("신고 사유를 입력해주세요");
    if (!reason?.trim()) return;
    if (reason.trim().length > 500) {
      setError("신고 사유는 500자 이하로 입력해주세요.");
      return;
    }
    await act(async () => {
      await request(`/api/v1/community/posts/${selected.id}/reports`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      alert("신고가 접수되었습니다");
    });
  }
  async function remove() {
    if (!confirm("게시글을 삭제할까요?")) return;
    await act(async () => {
      await request(`/api/v1/community/posts/${selected.id}`, {
        method: "DELETE",
      });
      back();
      await load();
    });
  }
  async function selectImages(e, isEdit = false) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    const model = isEdit ? edit : draft;
    try {
      if (files.length + model.images.length > 3)
        throw Error("이미지는 최대 3장입니다.");
      for (const file of files)
        if (
          !["image/jpeg", "image/png", "image/gif"].includes(file.type) ||
          file.size > 3 * 1024 * 1024
        )
          throw Error("JPG, PNG, GIF 파일은 각 3MB까지 가능합니다.");
      const images = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () =>
                reject(Error("이미지를 읽을 수 없습니다."));
              reader.readAsDataURL(file);
            }),
        ),
      );
      (isEdit ? setEdit : setDraft)((previous) =>
        previous
          ? { ...previous, images: [...previous.images, ...images].slice(0, 3) }
          : previous,
      );
    } catch (e) {
      setError(e.message);
    }
  }
  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ ...draft, images: [] }));
      alert("임시저장했습니다. 첨부 이미지는 다시 선택해주세요.");
    } catch {
      setError("브라우저 저장 공간이 부족합니다.");
    }
  }
  function restoreDraft() {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (!saved) {
        setError("저장된 임시글이 없습니다.");
        return;
      }
      if (typeof saved.title !== "string" || typeof saved.content !== "string")
        throw Error();
      if (
        (draft.title || draft.content) &&
        !confirm("현재 작성 내용을 임시글로 교체할까요?")
      )
        return;
      setDraft({
        title: saved.title.slice(0, 120),
        category: typeof saved.category === "string" ? saved.category : "자유",
        content: saved.content.slice(0, 5000),
        tags: typeof saved.tags === "string" ? saved.tags.slice(0, 600) : "",
        images: [],
      });
      setError("");
    } catch {
      setError("임시글을 불러오지 못했습니다.");
    }
  }
  function formatText(before, after) {
    const input = composeInput.current;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd;
    const selected = draft.content.slice(start, end) || "내용";
    if (
      draft.content.length +
        before.length +
        after.length +
        (start === end ? 2 : 0) >
      5000
    ) {
      setError("내용은 5,000자 이하로 입력해주세요.");
      return;
    }
    setDraft({
      ...draft,
      content:
        draft.content.slice(0, start) +
        before +
        selected +
        after +
        draft.content.slice(end),
    });
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  }
  function mediaInputs(model, setModel, isEdit) {
    return (
      <>
        <label>
          이미지 첨부 (최대 3장, 각 3MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif"
            multiple
            disabled={busy}
            onChange={(e) => selectImages(e, isEdit)}
          />
        </label>
        <div className="actions">
          {model.images.map((src, i) => (
            <button
              type="button"
              className="secondary"
              key={i}
              disabled={busy}
              onClick={() =>
                setModel({
                  ...model,
                  images: model.images.filter((_, index) => index !== i),
                })
              }
            >
              <img src={src} alt={`선택 이미지 ${i + 1} 삭제`} width={64} /> ×
            </button>
          ))}
        </div>
        <input
          aria-label={isEdit ? "수정 태그" : "태그"}
          placeholder="태그 (쉼표로 구분)"
          value={model.tags}
          maxLength={600}
          onChange={(e) => setModel({ ...model, tags: e.target.value })}
        />
      </>
    );
  }
  return (
    <section className="community-page">
      <div className="heading dashboard-heading">
        <div>
          <h1>커뮤니티</h1>
          <p>구독 절약 팁과 경험을 나눠보세요.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            back();
            setComposing(!composing);
          }}
        >
          ✎ 글쓰기
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {selected ? (
        <div className="panel">
          <button className="secondary" disabled={busy} onClick={back}>
            ← 목록으로
          </button>
          {edit ? (
            <form className="post-form" onSubmit={saveEdit}>
              <input
                aria-label="수정 제목"
                required
                maxLength={120}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
              <input
                aria-label="수정 카테고리"
                required
                maxLength={40}
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
              <textarea
                aria-label="수정 내용"
                required
                maxLength={5000}
                value={edit.content}
                onChange={(e) => setEdit({ ...edit, content: e.target.value })}
              />
              {mediaInputs(edit, setEdit, true)}
              <button className="primary" disabled={busy}>
                수정 저장
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                취소
              </button>
            </form>
          ) : (
            <h2>{selected.title}</h2>
          )}
          <p className="muted">
            {selected.category} · {selected.authorId}
          </p>
          <FormattedPostContent content={selected.content} />
          {(selected.images || [])
            .filter((src) => /^data:image\/(png|jpeg|gif);base64,/.test(src))
            .map((src, i) => (
              <img
                key={i}
                src={src}
                alt={`첨부 이미지 ${i + 1}`}
                style={{ maxWidth: "100%", maxHeight: 360 }}
              />
            ))}
          {(selected.tags || []).map((tag, i) => (
            <span className="muted" key={i}>
              {" "}
              #{tag}{" "}
            </span>
          ))}
          <div className="actions">
            <button
              className="secondary"
              disabled={busy || loading}
              onClick={like}
              aria-pressed={Boolean(likes.liked)}
            >
              {likes.liked ? "♥" : "♡"} 좋아요 {likes.likes}
            </button>
            <button
              className="secondary"
              disabled={busy || loading}
              onClick={report}
            >
              신고
            </button>
            {selected.authorId === user && (
              <>
                <button
                  className="secondary"
                  disabled={busy || loading}
                  onClick={() =>
                    setEdit({
                      title: selected.title,
                      category: selected.category,
                      content: selected.content,
                      images: selected.images || [],
                      tags: (selected.tags || []).join(", "),
                    })
                  }
                >
                  수정
                </button>
                <button
                  className="danger"
                  disabled={busy || loading}
                  onClick={remove}
                >
                  삭제
                </button>
              </>
            )}
          </div>
          <h3>댓글</h3>
          {loading && <p>불러오는 중...</p>}
          {comments.map((c) => (
            <div className="item" key={c.id}>
              <b>{c.authorId}</b>
              <span>{c.content}</span>
              {c.authorId === user && (
                <>
                  <button
                    className="secondary small"
                    disabled={busy}
                    onClick={() => changeComment(c)}
                  >
                    수정
                  </button>
                  <button
                    className="danger small"
                    disabled={busy}
                    onClick={() => deleteComment(c)}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          ))}
          <form className="comment-form" onSubmit={addComment}>
            <input
              value={comment}
              required
              maxLength={2000}
              onChange={(e) => setComment(e.target.value)}
              placeholder="댓글 입력"
            />
            <button className="primary" disabled={busy || loading}>
              등록
            </button>
          </form>
        </div>
      ) : (
        <>
          {composing && (
            <div className="panel community-composer">
              <h2>새 게시글 작성</h2>
              <form onSubmit={create} className="post-form">
                <input
                  required
                  maxLength={120}
                  placeholder="제목"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                >
                  {[...new Set([draft.category, ...categories])].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
                <FormattingToolbar onFormat={formatText} />
                <textarea
                  ref={composeInput}
                  required
                  maxLength={5000}
                  placeholder="내용을 입력하세요"
                  rows={4}
                  value={draft.content}
                  onChange={(e) =>
                    setDraft({ ...draft, content: e.target.value })
                  }
                />
                <details className="post-preview">
                  <summary>본문 미리보기</summary>
                  <FormattedPostContent content={draft.content} />
                </details>
                {mediaInputs(draft, setDraft, false)}
                <div className="actions">
                  <button className="primary" disabled={busy}>
                    글 작성
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={saveDraft}
                  >
                    임시저장
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={restoreDraft}
                  >
                    임시글 불러오기
                  </button>
                </div>
              </form>
            </div>
          )}
          <div className="panel community-list">
            <div className="panel-heading">
              <h2>게시글 ({posts.length})</h2>
              <input
                placeholder="게시글 검색"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="게시글 카테고리"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              {[
                ...new Set(["전체", filter, ...posts.map((p) => p.category)]),
              ].map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            {filtered.slice((page - 1) * 10, page * 10).map((p) => (
              <button className="post-item" key={p.id} onClick={() => open(p)}>
                <span className="community-post-copy">
                  <small className="post-category">{p.category}</small>
                  <strong>{p.title}</strong>
                  <p>{p.content?.slice(0, 130)}</p>
                  <small>
                    {p.authorId} · {p.createdAt?.slice(0, 10)}
                  </small>
                </span>
                {p.images?.[0] &&
                /^data:image\/(png|jpeg|gif);base64,/.test(p.images[0]) ? (
                  <img
                    className="post-thumbnail"
                    src={p.images[0]}
                    alt="게시글 첨부 미리보기"
                  />
                ) : (
                  <span className="post-placeholder" aria-hidden="true">
                    {p.category === "질문" ? "?" : "✦"}
                  </span>
                )}
              </button>
            ))}
            <div className="actions">
              <button
                className="secondary"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                이전
              </button>
              <span>{page} 페이지</span>
              <button
                className="secondary"
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                다음
              </button>
            </div>
            {!filtered.length && (
              <p className="muted">
                {posts.length
                  ? "검색 결과가 없습니다."
                  : "아직 게시글이 없습니다."}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

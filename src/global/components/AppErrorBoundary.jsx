import React from "react";

export default class AppErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="public-site">
        <section className="panel" role="alert">
          <h1>화면을 표시하지 못했습니다.</h1>
          <p>잠시 후 다시 시도해주세요. 입력 중이던 내용은 다시 확인해주세요.</p>
          <button
            type="button"
            className="primary"
            onClick={() => this.setState({ failed: false })}
          >
            화면 다시 열기
          </button>
        </section>
      </main>
    );
  }
}

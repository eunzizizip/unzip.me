import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const TYPING_TEXT = "./start_challenge.sh";

export default function Home() {
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [revealed, setRevealed] = useState(false);

  const token = localStorage.getItem("token");
  const username = localStorage.getItem("username");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < TYPING_TEXT.length) {
        setTyped(TYPING_TEXT.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setRevealed(true), 300);
      }
    }, 60);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const blink = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(blink);
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/");
    window.location.reload();
  };

  return (
    <div className="home-page">
      <div className="home-grid" />

      <header className="home-topbar">
        <span className="home-logo">
          <span className="green">unzip</span>
          <span className="dot">.</span>
          <span className="gray">me</span>
        </span>

        <nav className="home-nav">
          {token && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span>{username}님 달려봅시다 🚀</span>
              <button className="btn-nav" onClick={logout}>
                로그아웃
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="home-hero">
        <div className="home-prompt">
          <span className="prompt-user">root@unzip</span>
          <span className="prompt-sep">:~$</span>
          <span className="prompt-cmd"> {typed}</span>
          <span
            className="prompt-cursor"
            style={{ opacity: showCursor ? 1 : 0 }}
          >
            █
          </span>
        </div>

        <div className={`home-badge ${revealed ? "revealed" : ""}`}>
          <span className="badge-dot" />
          SYSTEM ONLINE
        </div>

        <h1 className={`home-title ${revealed ? "revealed" : ""}`}>
          CTF <span className="accent">Challenge</span>
        </h1>

        <div className={`home-divider ${revealed ? "revealed" : ""}`} />

        <p className={`home-subtitle ${revealed ? "revealed" : ""}`}>
          웹 보안의 세계에 입장하세요.{" "}
          <code>SQLi</code> · <code>XSS</code> · <code>CSRF</code>{" "}
          취약점을 직접 경험해보세요.
        </p>

        <div className={`home-btn-row ${revealed ? "revealed" : ""}`}>
          <button
            className="btn-primary"
            onClick={() => {
              if (token) navigate("/challenges");
              else navigate("/login");
            }}
          >
            시작하기
          </button>

          {!token && (
            <button
              className="btn-secondary"
              onClick={() => navigate("/signup")}
            >
              회원가입
            </button>
          )}
        </div>

        <div className={`home-chips ${revealed ? "revealed" : ""}`}>
          <span className="chip chip-sqli">SQLi</span>
          <span className="chip chip-xss">XSS</span>
          <span className="chip chip-csrf">CSRF</span>
        </div>

        <div className={`home-stats ${revealed ? "revealed" : ""}`}>
          <div className="stat-item">
            <div className="stat-num">9</div>
            <div className="stat-label">CHALLENGES</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">3</div>
            <div className="stat-label">CATEGORIES</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">Easy–Hard</div>
            <div className="stat-label">DIFFICULTY</div>
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <span>© 2026 unzip.me — 웹 보안 학습 플랫폼</span>
      </footer>
    </div>
  );
}
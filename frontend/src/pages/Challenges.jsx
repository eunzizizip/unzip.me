import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Challenges.css";
import { getChallengeContent } from "./challengeContent";

const categoryDotClass = {
  "SQL Injection": "sql",
  XSS: "xss",
  CSRF: "csrf",
};

const diffClass = (difficulty) => {
  if (!difficulty) return "";
  return difficulty.toLowerCase();
};

const getPoints = (difficulty) => {
  const map = { easy: 100, medium: 200, hard: 300 };
  return map[difficulty?.toLowerCase()] ?? 100;
};

const TABS = [
  { key: "description", label: "문제 설명" },
  { key: "theory", label: "이론" },
  { key: "attack", label: "공격 풀이" },
  { key: "defense", label: "방어 코드" },
];

// 콘텐츠 블록 렌더러
const renderBlocks = (blocks = []) =>
  blocks.map((b, i) => {
    if (b.type === "h") return <h3 key={i} className="ct-h">{b.text}</h3>;
    if (b.type === "code")
      return (
        <pre key={i} className="ct-code">
          <code>{b.text}</code>
        </pre>
      );
    if (b.type === "list")
      return (
        <ul key={i} className="ct-list">
          {b.items.map((it, j) => (
            <li key={j}>{it}</li>
          ))}
        </ul>
      );
    return <p key={i} className="ct-p">{b.text}</p>;
  });

export default function Challenges() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flagInput, setFlagInput] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [openHints, setOpenHints] = useState({});
  const [solvedIds, setSolvedIds] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [userName, setUserName] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const [showSolution, setShowSolution] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    axios
      .get("http://localhost:3000/problems", {
        headers: { authorization: token },
      })
      .then((res) => {
        setProblems(res.data);
        const solved = res.data
          .filter((p) => p.is_solved === 1)
          .map((p) => p.id);
        setSolvedIds(solved);
      })
      .catch(console.error);

    axios
      .get("http://localhost:3000/me", {
        headers: { authorization: token },
      })
      .then((res) => {
        setTotalScore(res.data.score || 0);
        setUserName(res.data.name || "");
      })
      .catch(console.error);
  }, []);

  const selectProblemById = (id) => {
    const token = sessionStorage.getItem("token");
    axios
      .get(`http://localhost:3000/problems/${id}`, {
        headers: { authorization: token },
      })
      .then((res) => {
        setSelected(res.data);
        setFlagInput("");
        setMessage("");
        setOpenHints({});
        setActiveTab("description");
        setShowSolution(false);
      })
      .catch(console.error);
  };

  const submitFlag = () => {
    if (!selected) return;
    const token = sessionStorage.getItem("token");
    axios
      .post(
        "http://localhost:3000/submit",
        { problemId: selected.id, flag: flagInput },
        { headers: { authorization: token } }
      )
      .then((res) => {
        if (res.data.success) {
          setMessage(
            `정답입니다 🔥  +${res.data.points}pt 획득!  (누적 점수: ${res.data.total_score}pt)`
          );
          setSolvedIds((prev) => [...prev, selected.id]);
          setTotalScore(res.data.total_score);
        } else {
          setMessage(res.data.message);
        }
        setMessageType(res.data.success ? "success" : "error");
      })
      .catch(console.error);
  };

  const toggleHint = (i) => {
    setOpenHints((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const grouped = problems.reduce((acc, p) => {
    const cat = p.category || "기타";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const parseHints = (hint) => {
    if (!hint) return [];
    try {
      const parsed = JSON.parse(hint);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return hint.split("\n").filter(Boolean);
  };

  const isSolved = selected && solvedIds.includes(selected.id);
  const content = getChallengeContent(selected);

  // 탭별 읽기 영역 내용
  const renderTab = () => {
    if (activeTab === "description") {
      return (
        <>
          <div className="section">
            <div className="section-label">DESCRIPTION</div>
            <div className="desc-box">
              <p>{selected.description}</p>
              {selected.target && (
                <p>
                  타겟: <code>{selected.target}</code>
                </p>
              )}
              <p>
                Flag 형식: <code>ez{"{"}...{"}"}</code>
              </p>
            </div>
          </div>

          {selected.hint && (
            <div className="section">
              <div className="section-label">HINTS</div>
              {parseHints(selected.hint).map((h, i) => (
                <div
                  key={i}
                  className="hint-box"
                  onClick={() => toggleHint(i)}
                >
                  <span className="hint-arrow">
                    {openHints[i] ? "▼" : "▶"}
                  </span>
                  <span>
                    {openHints[i] ? h : `힌트 ${i + 1} — 클릭하여 확인`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (activeTab === "theory") {
      if (!content?.theory)
        return <div className="no-content">이 문제의 이론 설명은 준비 중입니다.</div>;
      return (
        <div className="section">
          {content.theory.summary && (
            <div className="ct-summary">{content.theory.summary}</div>
          )}
          {renderBlocks(content.theory.blocks)}
        </div>
      );
    }

    if (activeTab === "attack") {
      if (!content?.attack)
        return <div className="no-content">이 문제의 공격 풀이는 준비 중입니다.</div>;

      // 스포일러 게이트: 이미 풀었거나, 사용자가 직접 펼쳤을 때만 공개
      if (!isSolved && !showSolution) {
        return (
          <div className="spoiler-gate">
            <div className="spoiler-icon">🔒</div>
            <p className="spoiler-title">공격 풀이에는 정답이 포함되어 있어요</p>
            <p className="spoiler-sub">
              먼저 직접 시도해 보는 걸 추천해요. 막히면 해설을 확인하세요.
            </p>
            <button
              className="spoiler-btn"
              onClick={() => setShowSolution(true)}
            >
              해설 보기
            </button>
          </div>
        );
      }

      return <div className="section">{renderBlocks(content.attack.blocks)}</div>;
    }

    if (activeTab === "defense") {
      if (!content?.defense)
        return <div className="no-content">이 문제의 방어 코드는 준비 중입니다.</div>;
      return <div className="section">{renderBlocks(content.defense.blocks)}</div>;
    }

    return null;
  };

  return (
    <div className="challenge-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div
            className="sidebar-logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
            title="시작 페이지로"
          >
            <span className="green">unzip</span>
            <span className="dot">.</span>
            <span className="gray">me</span>
          </div>
          <div className="sidebar-score">
            <span className="score-label">SCORE</span>
            <span className="score-num">{totalScore}pt</span>
          </div>
        </div>

        {userName && (
          <div className="sidebar-user">
            <span className="prompt-sym">$</span> {userName}
          </div>
        )}

        <div className="sidebar-divider" />

        <div className="sidebar-title">CHALLENGES</div>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="category-group">
            <div className="category-header">
              <span
                className={`category-dot ${categoryDotClass[category] || "other"}`}
              />
              <span className="category-name">{category}</span>
            </div>

            {items.map((item) => {
              const isActive = selected && selected.id === item.id;
              const itemSolved = solvedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`problem-item ${isActive ? "active" : ""} ${
                    itemSolved ? "solved" : ""
                  }`}
                  onClick={() => selectProblemById(item.id)}
                >
                  <div className="problem-item-left">
                    <span className="solved-indicator">
                      {itemSolved ? "✓" : "○"}
                    </span>
                    <span>{item.title}</span>
                  </div>
                  <div className="problem-item-badges">
                    {item.difficulty && (
                      <span className={`badge ${diffClass(item.difficulty)}`}>
                        {item.difficulty}
                      </span>
                    )}
                    <span className="badge-points">
                      {getPoints(item.difficulty)}pt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </aside>

      <main className="content">
        {selected ? (
          <>
            <div className="content-header">
              <h1>{selected.title}</h1>

              <div className="badge-row">
                {selected.category && (
                  <span className="badge-category">{selected.category}</span>
                )}
                {selected.difficulty && (
                  <span className={`badge-diff ${diffClass(selected.difficulty)}`}>
                    {selected.difficulty}
                  </span>
                )}
                <span className="badge-points-main">
                  🏆 {getPoints(selected.difficulty)}pt
                </span>
                {isSolved && <span className="badge-solved">SOLVED</span>}
              </div>

              <div className="tabs">
                {TABS.map((t) => {
                  const locked =
                    t.key === "attack" && !isSolved && !showSolution;
                  return (
                    <button
                      key={t.key}
                      className={`tab ${activeTab === t.key ? "active" : ""}`}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                      {locked && <span className="lock">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="work-area">
              <div className="read-pane">{renderTab()}</div>

              <div className="lab-pane">
                <div className="lab-frame-wrap">
                  <div className="section-label">LAB</div>
                  {selected.dvwa_path ? (
                    <iframe
                      src={`http://localhost:3000/dvwa/${selected.dvwa_path.replace(
                        /^\//,
                        ""
                      )}`}
                      title="DVWA"
                      className="lab-iframe"
                    />
                  ) : (
                    <div className="lab-empty">실습 환경이 연결되지 않은 문제입니다.</div>
                  )}
                </div>

                <div className="submit-area">
                  <div className="section-label">SUBMIT FLAG</div>
                  <div className="flag-row">
                    <input
                      type="text"
                      placeholder="ez{...}"
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitFlag()}
                      className="flag-input"
                    />
                    <button onClick={submitFlag} className="submit-btn">
                      제출
                    </button>
                  </div>
                  {message && (
                    <p className={`flag-message ${messageType}`}>{message}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-prompt">
              <span className="green">root@unzip</span>
              <span className="gray">:~$</span>
              <span className="cursor">█</span>
            </div>
            <p className="empty-title">문제를 선택하세요</p>
            <p className="empty-sub">사이드바에서 도전할 문제를 골라보세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}
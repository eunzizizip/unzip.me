import { useEffect, useState } from "react";
import axios from "axios";
import "./Challenges.css";

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

export default function Challenges() {
  const [problems, setProblems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flagInput, setFlagInput] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [openHints, setOpenHints] = useState({});

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    axios
      .get("http://localhost:3000/problems", {
        headers: { authorization: token },
      })
      .then((res) => {
        setProblems(res.data);
        if (res.data.length > 0) {
          const firstId = res.data[0].id;
          axios
            .get(`http://localhost:3000/problems/${firstId}`, {
              headers: { authorization: token },
            })
            .then((r) => {
              setSelected(r.data);
              setFlagInput("");
              setMessage("");
              setOpenHints({});
            })
            .catch(console.error);
        }
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

  return (
    <div className="challenge-container">
      <aside className="sidebar">
        <h2>CHALLENGES</h2>

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="category-group">
            <div className="category-header">
              <span className={`category-dot ${categoryDotClass[category] || "other"}`} />
              <span className="category-name">{category}</span>
            </div>

            {items.map((item) => {
              const isActive = selected && selected.id === item.id;

              return (
                <div
                  key={item.id}
                  className={`problem-item ${isActive ? "active" : ""}`}
                  onClick={() => selectProblemById(item.id)}
                >
                  <span>{item.title}</span>

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
            </div>

            <div className="section">
              <div className="section-label">DESCRIPTION</div>
              <div className="desc-box">
                <p>{selected.description}</p>
                {selected.target && (
                  <p>타겟: <code>{selected.target}</code></p>
                )}
                <p>Flag 형식: <code>ez{"{"}...{"}"}</code></p>
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
                    <span className="hint-arrow">{openHints[i] ? "▼" : "▶"}</span>
                    <span>{openHints[i] ? h : `힌트 ${i + 1} — 클릭하여 확인`}</span>
                  </div>
                ))}
              </div>
            )}

            <hr className="divider" />

            <div className="section">
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
                <button onClick={submitFlag} className="submit-btn">제출</button>
              </div>
              {message && (
                <p className={`flag-message ${messageType}`}>{message}</p>
              )}
            </div>

            {selected.dvwa_path && (
              <div className="section">
                <div className="section-label">LAB</div>
                <iframe
                  src={`http://localhost:3000/dvwa-proxy?path=${encodeURIComponent(selected.dvwa_path)}`}
                  title="DVWA"
                  className="lab-iframe"
                />
              </div>
            )}
          </>
        ) : (
          <p>문제를 선택하세요.</p>
        )}
      </main>
    </div>
  );
}
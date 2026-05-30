const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SECRET = "ctf_secret";
const DVWA_BASE = "http://localhost:8080";

const DIFFICULTY_POINTS = { easy: 100, medium: 200, hard: 300 };

// =========================
// ✅ DB 연결
// =========================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "0826",
  database: "ctf_db",
});

db.connect((err) => {
  if (err) console.log("DB 연결 실패 ❌", err);
  else console.log("DB 연결 성공 🔥");
});

// =========================
// ✅ 인증 미들웨어 (JWT)
// =========================
const auth = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).send({ message: "토큰 없음 ❌" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(403).send({ message: "토큰 오류 ❌" });
  }
};

app.get("/", (req, res) => res.send("서버 실행 중 🔥"));

// =========================
// ✅ 회원가입
// =========================
app.post("/signup", (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).send({ message: "모든 값을 입력해주세요." });
  }
  const sql = "INSERT INTO users (name, username, password) VALUES (?, ?, ?)";
  db.query(sql, [name, username, password], (err) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).send({ message: "이미 사용 중인 아이디입니다." });
      }
      return res.status(500).send({ message: "회원가입 실패 ❌" });
    }
    res.send({ message: "회원가입 성공 🔥" });
  });
});

// =========================
// ✅ 로그인
// =========================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username=? AND password=?";
  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).send({ message: "로그인 오류 ❌" });
    if (result.length > 0) {
      const user = result[0];
      const token = jwt.sign(
        { id: user.id, username: user.username },
        SECRET,
        { expiresIn: "1h" }
      );
      return res.send({ message: "로그인 성공 🔥", token });
    }
    return res.status(401).send({ message: "아이디 또는 비밀번호 틀림 ❌" });
  });
});

// =========================
// ✅ 내 정보 + 점수
// =========================
app.get("/me", auth, (req, res) => {
  const sql = "SELECT id, name, username, score FROM users WHERE id = ?";
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).send({ message: "조회 실패 ❌" });
    res.send(result[0]);
  });
});

// =========================
// ✅ 문제 목록
// =========================
app.get("/problems", auth, (req, res) => {
  const sql = `
    SELECT p.id, p.title, p.category, p.difficulty, p.dvwa_path,
           MAX(IF(s.id IS NOT NULL, 1, 0)) AS is_solved
    FROM problems p
    LEFT JOIN solved s ON p.id = s.problem_id AND s.user_id = ?
    GROUP BY p.id
    ORDER BY p.id
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).send({ message: "문제 불러오기 실패 ❌" });
    res.send(result);
  });
});

// =========================
// ✅ 문제 상세
// =========================
app.get("/problems/:id", auth, (req, res) => {
  const sql = "SELECT * FROM problems WHERE id=?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).send({ message: "문제 조회 실패 ❌" });
    res.send(result[0]);
  });
});

// =========================
// ✅ FLAG 제출 + 점수 반영
// =========================
app.post("/submit", auth, (req, res) => {
  const { problemId, flag } = req.body;
  db.query(
    "SELECT flag, difficulty FROM problems WHERE id = ?",
    [problemId],
    (err, result) => {
      if (err) return res.status(500).send({ message: "서버 오류 ❌" });
      if (result.length === 0) return res.send({ success: false, message: "문제 없음 ❌" });

      const correctFlag = result[0].flag;
      const difficulty = (result[0].difficulty || "easy").toLowerCase();
      const earnedPoints = DIFFICULTY_POINTS[difficulty] ?? 100;

      if (flag !== correctFlag) {
        return res.send({ success: false, message: "틀렸습니다 ❌" });
      }

      db.query(
        "SELECT id FROM solved WHERE user_id = ? AND problem_id = ?",
        [req.user.id, problemId],
        (err, already) => {
          if (err) return res.status(500).send({ message: "서버 오류 ❌" });
          if (already.length > 0) {
            return res.send({ success: false, message: "이미 푼 문제입니다 ✅" });
          }
          db.query(
            "INSERT INTO solved (user_id, problem_id) VALUES (?, ?)",
            [req.user.id, problemId],
            (err) => {
              if (err) return res.status(500).send({ message: "서버 오류 ❌" });
              db.query(
                "UPDATE users SET score = score + ? WHERE id = ?",
                [earnedPoints, req.user.id],
                (err) => {
                  if (err) return res.status(500).send({ message: "서버 오류 ❌" });
                  db.query(
                    "SELECT score FROM users WHERE id = ?",
                    [req.user.id],
                    (err, userResult) => {
                      if (err) return res.status(500).send({ message: "서버 오류 ❌" });
                      res.send({
                        success: true,
                        message: "정답입니다 🔥",
                        points: earnedPoints,
                        difficulty,
                        total_score: userResult[0].score,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// =========================
// ✅ 스코어보드
// =========================
app.get("/scoreboard", auth, (req, res) => {
  const sql = `
    SELECT u.username, u.score,
           COUNT(s.id) AS solved_count,
           MAX(s.solved_at) AS last_solved_at
    FROM users u
    LEFT JOIN solved s ON u.id = s.user_id
    GROUP BY u.id
    ORDER BY u.score DESC, last_solved_at ASC
    LIMIT 50
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send({ message: "스코어보드 조회 실패 ❌" });
    res.send(result);
  });
});

// =========================
// ✅ 내가 푼 문제 목록
// =========================
app.get("/solved", auth, (req, res) => {
  const sql = `
    SELECT p.id, p.title, p.category, p.difficulty, s.solved_at
    FROM solved s
    JOIN problems p ON s.problem_id = p.id
    WHERE s.user_id = ?
    ORDER BY s.solved_at DESC
  `;
  db.query(sql, [req.user.id], (err, result) => {
    if (err) return res.status(500).send({ message: "조회 실패 ❌" });
    res.send(result);
  });
});

// ============================================================
// ✅ DVWA 프록시 (경로 프리픽스 방식)  ──  여기가 핵심 변경 부분
// ============================================================

let dvwaSession = null;

// --- 쿠키 문자열 ↔ 맵 유틸 ---
function parseSetCookie(setCookie, base = {}) {
  const map = { ...base };
  (setCookie || []).forEach((c) => {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i < 0) return;
    map[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  });
  return map;
}
function cookieMapToStr(map) {
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join("; ");
}

// --- DVWA 자동 로그인 + 보안 레벨 low ---
async function initDvwaSession() {
  try {
    const getRes = await axios.get(`${DVWA_BASE}/login.php`, {
      validateStatus: () => true,
    });
    let cookieMap = parseSetCookie(getRes.headers["set-cookie"]);
    const tempCookie = cookieMapToStr(cookieMap);

    const tokenMatch = getRes.data.match(/name='user_token'\s+value='([^']+)'/);
    if (!tokenMatch) return console.log("user_token 없음 ❌");

    const postRes = await axios.post(
      `${DVWA_BASE}/login.php`,
      new URLSearchParams({
        username: "admin",
        password: "password",
        Login: "Login",
        user_token: tokenMatch[1],
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: tempCookie,
        },
        maxRedirects: 0,
        validateStatus: (s) => s < 400,
      }
    );

    cookieMap = parseSetCookie(postRes.headers["set-cookie"], cookieMap);
    cookieMap["security"] = "low";
    dvwaSession = cookieMapToStr(cookieMap);

    const secPage = await axios.get(`${DVWA_BASE}/security.php`, {
      headers: { Cookie: dvwaSession },
      responseType: "text",
      validateStatus: () => true,
    });
    const secMatch = secPage.data.match(/name='user_token'\s+value='([^']+)'/);
    if (secMatch) {
      await axios.post(
        `${DVWA_BASE}/security.php`,
        new URLSearchParams({
          seclev_submit: "Submit",
          security: "low",
          user_token: secMatch[1],
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: dvwaSession,
          },
          maxRedirects: 0,
          validateStatus: () => true,
        }
      );
    }
    console.log("DVWA 자동 로그인 + 보안 low 완료 🔥");
  } catch (err) {
    console.log("DVWA 로그인 실패 ❌", err.message);
  }
}
initDvwaSession();

// --- 응답 쿠키로 세션 갱신 ---
function refreshSession(response) {
  const setCookie = response.headers["set-cookie"];
  if (!setCookie) return;
  const base = {};
  (dvwaSession || "").split("; ").forEach((c) => {
    const i = c.indexOf("=");
    if (i > 0) base[c.slice(0, i)] = c.slice(i + 1);
  });
  dvwaSession = cookieMapToStr(parseSetCookie(setCookie, base));
}

// --- HTML 내 절대경로만 /dvwa 프리픽스 붙이기 (상대경로는 그대로 둠) ---
function rewriteHtml(html) {
  return html.replace(
    /(href|src|action)=("|')(\/[^"']*)\2/g,
    (m, attr, q, p) => {
      if (p.startsWith("//")) return m;        // 프로토콜 상대경로
      if (p.startsWith("/dvwa/")) return m;     // 이미 처리됨
      return `${attr}=${q}/dvwa${p}${q}`;
    }
  );
}

// --- /dvwa, /dvwa/* 전부 처리 ---
app.all(/^\/dvwa(\/.*)?$/, async (req, res) => {
  if (!dvwaSession) await initDvwaSession();

  // /dvwa 프리픽스 제거 → 실제 DVWA 경로 (쿼리스트링 포함)
  const dvwaPath = req.originalUrl.replace(/^\/dvwa/, "") || "/";
  const target = `${DVWA_BASE}${dvwaPath}`;

  try {
    let response;

    if (req.method === "POST") {
      // 폼의 user_token이 만료됐을 수 있으니 신선한 토큰으로 교체
      const tokenPage = await axios.get(target, {
        headers: { Cookie: dvwaSession },
        responseType: "text",
        validateStatus: () => true,
      });
      const tm = tokenPage.data.match(/name='user_token'\s+value='([^']+)'/);
      if (tm) req.body.user_token = tm[1];

      response = await axios.post(target, new URLSearchParams(req.body), {
        headers: {
          Cookie: dvwaSession,
          Referer: target,
          Origin: DVWA_BASE,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        responseType: "arraybuffer",
        maxRedirects: 0,
        validateStatus: () => true,
      });
    } else {
      response = await axios.get(target, {
        headers: { Cookie: dvwaSession, Referer: target, Origin: DVWA_BASE },
        responseType: "arraybuffer",
        maxRedirects: 0,
        validateStatus: () => true,
      });
    }

    refreshSession(response);

    // 리다이렉트 처리
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const loc = response.headers.location;

      // 로그인 페이지로 튕기면 세션 만료 → 재로그인 후 원래 경로로
      if (loc.includes("login.php") || loc === "/index.php" || loc === "/") {
        console.log("세션 만료 감지 → 재초기화 🔄");
        await initDvwaSession();
        return res.redirect(`/dvwa${dvwaPath}`);
      }

      let resolved;
      if (loc.startsWith("http")) {
        const u = new URL(loc);
        resolved = u.pathname + u.search;
      } else if (loc.startsWith("/")) {
        resolved = loc;
      } else if (loc.startsWith("?")) {
        resolved = dvwaPath.split("?")[0] + loc;
      } else {
        const base = dvwaPath.split("?")[0];
        resolved = base.substring(0, base.lastIndexOf("/") + 1) + loc;
      }
      return res.redirect(`/dvwa${resolved}`);
    }

    // 콘텐츠 타입에 따라 분기
    const contentType = response.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    if (contentType.includes("text/html")) {
      const html = Buffer.from(response.data).toString("utf8");
      res.send(rewriteHtml(html));
    } else {
      // CSS / JS / 이미지 등은 그대로 전달
      res.send(Buffer.from(response.data));
    }
  } catch (err) {
    console.log("프록시 오류:", err.message);
    res.status(500).send("DVWA 프록시 오류: " + err.message);
  }
});

// =========================
// ✅ 서버 실행
// =========================
app.listen(3000, () => {
  console.log("서버 실행 중: http://localhost:3000");
});
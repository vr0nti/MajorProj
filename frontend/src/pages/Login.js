import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import "../styles/login.css";
import { motion } from "framer-motion";
import useAuth from "../hooks/useAuth";
import { handleError, handleSuccess } from "../utils/toast";

export default function Login() {
  const { user, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    // Redirect based on role
    if (user.role === "admin") {
      // return <Navigate to="/super-admin/dashboard" />;
      return <Navigate to="/dashboard" />;
    } else if (user.role === "departmentAdmin") {
      // return <Navigate to="/department-admin/dashboard" />;
      return <Navigate to="/dashboard" />;
    } else if (user.role === "faculty") {
      // return <Navigate to="/teacher/dashboard" />;
      return <Navigate to="/dashboard" />;
    } else if (user.role === "student") {
      // return <Navigate to="/student/dashboard" />;
      return <Navigate to="/dashboard" />;
    } else {
      return <Navigate to="/login" />;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      handleSuccess("Login successful!");
    } catch (error) {
      handleError(error, "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
      >
        {/* <div className="login-card-header">
          <h3>Login</h3>
        </div> */}
        <div className="login-card-body">
          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="email" className="login-form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="login-form-control"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoFocus
                placeholder="Enter your email"
              />
            </div>
            <div className="login-form-group" style={{ position: "relative" }}>
              <label htmlFor="password" className="login-form-label">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="login-form-control"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
              />
              <i
                className={`fa-solid ${
                  showPassword ? "fa-eye-slash" : "fa-eye"
                }`}
                onClick={() => setShowPassword((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "20px",
                  top: "50%",
                  paddingTop: "25px",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  color: "#888",
                }}
              ></i>
            </div>

            <button
              type="submit"
              className={`login-btn${loading ? " loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
        <div className="login-footer">
          <p className="login-footer-text">
            Forgot password?{" "}
            <Link to="#" className="login-link">
              Reset password
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

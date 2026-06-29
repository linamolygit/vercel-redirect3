import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Register: NextPage = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, username }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccessMessage("Account successfully created! Redirecting... ⏳");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || "Registration failed. Please check the fields and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <Head>
        <title>Create Account — WP Link Cloaker</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <div className="card register-card">
          <header className="header">
            <span className="logo-icon">🚀</span>
            <h1>Get Started</h1>
            <p className="description">Enter your email and password to create a new account.</p>
          </header>

          {errorMessage && <div className="error-banner">⚠️ {errorMessage}</div>}
          {successMessage && <div className="success-banner">✅ {successMessage}</div>}

          <form onSubmit={handleSubmit} className="form-panel">
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Choose a username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="At least 6 characters..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                placeholder="Repeat password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating Account... ⏳" : "Sign Up"}
            </button>
          </form>

          <footer className="card-footer">
            Already have an account?{" "}
            <Link href="/login">
              <a className="login-link">Log In</a>
            </Link>
          </footer>
        </div>
      </main>

      <Footer />

      <style jsx global>{`
        :root {
          --bg: #070215;
          --card-bg: rgba(255, 255, 255, 0.02);
          --card-border: rgba(255, 255, 255, 0.08);
          --accent: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          --accent-hover: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
          --text: #f3f4f6;
          --text-muted: #9ca3af;
          --success: #22c55e;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Outfit', sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }

        .wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg);
        }

        .background-glows {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: -1;
          pointer-events: none;
        }

        .glow {
          position: absolute;
          width: 45vw;
          height: 45vw;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.15;
        }

        .glow-1 {
          top: -10%;
          left: -10%;
          background: #6366f1;
        }

        .glow-2 {
          bottom: -10%;
          right: -10%;
          background: #a855f7;
        }

        .container {
          width: 100%;
          max-width: 450px;
          margin: 60px auto;
          padding: 0 20px;
          flex: 1;
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo-icon {
          font-size: 3.5rem;
          margin-bottom: 12px;
          display: inline-block;
        }

        h1 {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -1px;
          background: var(--accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 6px;
        }

        .description {
          font-size: 0.95rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-muted);
        }

        input {
          width: 100%;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: var(--text);
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
          background: rgba(255, 255, 255, 0.04);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .success-banner {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #a7f3d0;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .btn-submit {
          width: 100%;
          padding: 16px;
          border: none;
          border-radius: 12px;
          background: var(--accent);
          color: white;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
          margin-top: 10px;
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99, 102, 241, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .card-footer {
          margin-top: 25px;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .login-link {
          color: #818cf8;
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .login-link:hover {
          color: #a855f7;
        }
      `}</style>
    </div>
  );
};

export default Register;

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

      setSuccessMessage("Account successfully created! Redirecting...");
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
        <title>Create Account — LinkPika</title>
      </Head>

      <Header />

      <main className="container">
        <div className="glass-panel register-card">
          <header className="header">
            <span className="logo-icon">🚀</span>
            <h2>Get Started</h2>
            <p className="description">Enter your details to create a new account.</p>
          </header>

          {errorMessage && <div className="error-banner"><svg style={{display:'inline', width:'18px', height:'18px', verticalAlign:'middle', marginRight:'4px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> {errorMessage}</div>}
          {successMessage && <div className="success-banner"><svg style={{display:'inline', width:'18px', height:'18px', verticalAlign:'middle', marginRight:'4px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> {successMessage}</div>}

          <form onSubmit={handleSubmit} className="form-panel">
            <div className="control-row">
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

            <div className="control-row">
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

            <div className="control-row">
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

            <div className="control-row">
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

            <div className="control-row">
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

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
              {loading ? "Creating Account..." : "Sign Up"}
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

      <style jsx>{`
        .wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
        }

        .container {
          width: 100%;
          max-width: 450px;
          margin: 60px auto;
          padding: 0 20px;
          flex: 1;
        }

        .register-card {
          padding: 40px;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
          font-size: 3rem;
          margin-bottom: 12px;
          display: inline-block;
        }

        .description {
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.5;
          margin-top: 8px;
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .error-banner {
          background: rgba(255, 59, 48, 0.1);
          border: 1px solid rgba(255, 59, 48, 0.25);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .success-banner {
          background: rgba(52, 199, 89, 0.1);
          border: 1px solid rgba(52, 199, 89, 0.25);
          color: var(--success);
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .card-footer {
          margin-top: 25px;
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
        }

        .login-link {
          color: var(--primary);
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .login-link:hover {
          color: var(--primary-hover);
        }
      `}</style>
    </div>
  );
};

export default Register;

import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Login: NextPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            router.push("/");
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    checkUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/");
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wrapper">
      <Head>
        <title>Sign In — LinkPika</title>
      </Head>

      <Header />

      <main className="container">
        <div className="glass-panel login-card">
          <header className="header">
            <span className="logo-icon">🔐</span>
            <h2>Welcome Back</h2>
            <p className="description">Sign in to manage and generate your links.</p>
          </header>

          {errorMessage && <div className="error-banner">⚠️ {errorMessage}</div>}

          <form onSubmit={handleSubmit} className="form-panel">
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
              <label htmlFor="password">
                <span>Password</span>
                <Link href="/forgot-password">
                  <a className="forgot-link">Forgot?</a>
                </Link>
              </label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px' }}>
              {loading ? "Signing in... ⏳" : "Log In"}
            </button>
          </form>

          <footer className="card-footer">
            New user?{" "}
            <Link href="/register">
              <a className="signup-link">Create an Account</a>
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

        .login-card {
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
          gap: 16px;
        }

        .forgot-link {
          font-size: 12px;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease;
        }
        .forgot-link:hover {
          color: var(--primary-hover);
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

        .card-footer {
          margin-top: 25px;
          text-align: center;
          font-size: 14px;
          color: var(--text-muted);
        }

        .signup-link {
          color: var(--primary);
          text-decoration: none;
          font-weight: 700;
          transition: color 0.2s ease;
        }

        .signup-link:hover {
          color: var(--primary-hover);
        }
      `}</style>
    </div>
  );
};

export default Login;

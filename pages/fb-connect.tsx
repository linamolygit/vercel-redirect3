import type { NextPage } from "next";
import Head from "next/head";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Key,
  Cookie,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  Share2,
  Copy,
  Zap,
  HelpCircle,
} from "lucide-react";

const GET_TOKEN_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/get-token-cookie/naciaagbkifhpnoodlkhbejjldaiffcm?pli=1";

const FbConnect: NextPage = () => {
  const [rawCookie, setRawCookie] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [secondaryToken, setSecondaryToken] = useState("");

  const [cUser, setCUser] = useState("");
  const [xs, setXs] = useState("");

  const [saving, setSaving] = useState(false);
  const [connectedUser, setConnectedUser] = useState<any>(null);
  const [connectedPages, setConnectedPages] = useState<any[]>([]);
  const [connectedAdAccounts, setConnectedAdAccounts] = useState<any[]>([]);

  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-parse c_user and xs when raw cookie is updated
  useEffect(() => {
    if (rawCookie) {
      const cUserMatch = rawCookie.match(/c_user=([0-9]+)/);
      const xsMatch = rawCookie.match(/xs=([^;]+)/);
      if (cUserMatch) setCUser(cUserMatch[1]);
      if (xsMatch) setXs(xsMatch[1]);
    } else {
      setCUser("");
      setXs("");
    }
  }, [rawCookie]);

  // Load cached credentials on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedCookie = localStorage.getItem("fb_raw_cookie");
      const cachedToken = localStorage.getItem("fb_access_token");
      const cachedSecToken = localStorage.getItem("fb_secondary_token");
      if (cachedCookie) setRawCookie(cachedCookie);
      if (cachedToken) setAccessToken(cachedToken);
      if (cachedSecToken) setSecondaryToken(cachedSecToken);

      if (cachedToken || cachedCookie) {
        // Auto-validate existing token
        handleSave(cachedCookie || "", cachedToken || "", cachedSecToken || "", false);
      }
    }
  }, []);

  const handleSave = async (
    cookieVal = rawCookie,
    tokenVal = accessToken,
    secTokenVal = secondaryToken,
    showToastAlert = true
  ) => {
    if (!cookieVal.trim() && !tokenVal.trim()) {
      setErrorMessage("Please paste your Facebook Cookie string or Access Token.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/save-fb-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawCookie: cookieVal.trim(),
          accessToken: tokenVal.trim(),
          secondaryToken: secTokenVal.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save Facebook credentials.");
      }

      setConnectedUser(data.fbUser);
      setConnectedPages(data.pages || []);
      setConnectedAdAccounts(data.adAccounts || []);

      if (data.accessToken) {
        setAccessToken(data.accessToken);
        if (typeof window !== "undefined") {
          localStorage.setItem("fb_access_token", data.accessToken);
          if (cookieVal) localStorage.setItem("fb_raw_cookie", cookieVal);
          if (secTokenVal) localStorage.setItem("fb_secondary_token", secTokenVal);
        }
      }

      if (showToastAlert) {
        showToast("Facebook account connected successfully!", "success");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Facebook connection error.");
      if (showToastAlert) showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fb-connect-wrapper">
      <Head>
        <title>Facebook Account Setup & Token Manager — LinkPika</title>
        <meta name="description" content="Connect your Facebook Account using Get Token Cookie extension." />
      </Head>

      <Header />

      <main className="main-content">
        <div className="title-banner">
          <div className="banner-left">
            <h1 className="main-heading">
              <Key className="heading-icon" size={28} />
              <span>Facebook Account Setup & Token Manager</span>
            </h1>
            <p className="sub-heading">
              Connect your Facebook Account using Access Tokens or Session Cookies for 1-Click Dark Posting.
            </p>
          </div>

          <a
            href={GET_TOKEN_EXTENSION_URL}
            target="_blank"
            rel="noreferrer"
            className="btn-download-ext"
          >
            <Download size={16} />
            <span>Get Token Cookie Extension</span>
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="connect-grid">
          {/* ─── LEFT SIDE: USER GUIDE & EXTENSION INSTRUCTIONS ─────────── */}
          <aside className="guide-card">
            <h3>
              <HelpCircle size={18} /> How to Get Cookie & Access Token
            </h3>

            <div className="step-list">
              <div className="step-item">
                <span className="step-num">1</span>
                <div className="step-text">
                  Install the official <strong>"Get Token Cookie"</strong> Chrome Extension.
                  <br />
                  <a href={GET_TOKEN_EXTENSION_URL} target="_blank" rel="noreferrer" className="inline-link">
                    Open Chrome Web Store ↗
                  </a>
                </div>
              </div>

              <div className="step-item">
                <span className="step-num">2</span>
                <div className="step-text">
                  Log in to your <strong>Facebook Account</strong> in your Chrome browser.
                </div>
              </div>

              <div className="step-item">
                <span className="step-num">3</span>
                <div className="step-text">
                  Click the <strong>Get Token Cookie</strong> extension icon in your Chrome toolbar.
                </div>
              </div>

              <div className="step-item">
                <span className="step-num">4</span>
                <div className="step-text">
                  Copy the <strong>Cookie</strong> string and <strong>Access Token</strong> (EAAG... or EAAB...) and paste them in the form on the right.
                </div>
              </div>
            </div>

            {/* Status Preview Box */}
            {connectedUser ? (
              <div className="status-preview connected">
                <div className="status-header">
                  <ShieldCheck size={20} className="status-icon" />
                  <span>Facebook Connected</span>
                </div>
                <div className="user-details">
                  <div className="user-name">{connectedUser.name || "FB User"}</div>
                  <div className="user-id">ID: {connectedUser.id}</div>
                  <div className="counts-row">
                    <span>📄 {connectedPages.length} Pages</span>
                    <span>📊 {connectedAdAccounts.length} Ad Accounts</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-preview pending">
                <AlertCircle size={20} />
                <span>No Facebook Account Connected Yet</span>
              </div>
            )}
          </aside>

          {/* ─── RIGHT SIDE: CREDENTIALS INPUT FORM ──────────────────────── */}
          <section className="form-card">
            <h3>
              <Cookie size={18} /> Enter Facebook Credentials
            </h3>

            {/* Full Cookie Input */}
            <div className="form-group">
              <label>
                Facebook Full Cookie String <span className="req">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="datr=EaDA...; c_user=61586005054887; xs=31%3A...; presence=...;"
                value={rawCookie}
                onChange={(e) => setRawCookie(e.target.value)}
              />
              {cUser && xs && (
                <div className="parsed-badge">
                  <CheckCircle2 size={13} />
                  <span>
                    Detected c_user: <strong>{cUser}</strong> | xs: <strong>{xs.substring(0, 10)}...</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Primary Access Token (EAAG... / EAA...) */}
            <div className="form-group">
              <label>
                Primary Access Token (EAAG... / EAA...)
              </label>
              <input
                type="text"
                placeholder="EAAGNO4a7r2wBSKKexpRQvuZAYG1i..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
            </div>

            {/* Secondary Access Token (EAAB...) */}
            <div className="form-group">
              <label>
                Secondary Access Token (EAAB... / Optional)
              </label>
              <input
                type="text"
                placeholder="EAABsbCS1iHgBSBU0hk2IKTz3ZCs8..."
                value={secondaryToken}
                onChange={(e) => setSecondaryToken(e.target.value)}
              />
            </div>

            {errorMessage && (
              <div className="error-box">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              className="btn-save-credentials"
              onClick={() => handleSave(rawCookie, accessToken, secondaryToken, true)}
              disabled={saving}
            >
              <Zap size={18} />
              <span>{saving ? "SAVING & VALIDATING..." : "SAVE & CONNECT FACEBOOK"}</span>
            </button>
          </section>
        </div>
      </main>

      <Footer />

      {toast && (
        <div className={`dark-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <style jsx>{`
        .fb-connect-wrapper {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f1117;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .main-content {
          flex: 1;
          padding: 24px 20px 40px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .title-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding: 20px 24px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
        }

        .main-heading {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: #0f1117;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .main-heading :global(.heading-icon) {
          color: #1877f2;
        }

        .sub-heading {
          margin: 4px 0 0 0;
          font-size: 0.83rem;
          color: #64748b;
        }

        .btn-download-ext {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          background: #1877f2;
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(24, 119, 242, 0.25);
          transition: transform 0.15s, background 0.15s;
        }

        .btn-download-ext:hover {
          background: #1565c0;
          transform: translateY(-1px);
        }

        .connect-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ─── GUIDE CARD ───────────────────────────────────────────────── */
        .guide-card,
        .form-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
        }

        .guide-card h3,
        .form-card h3 {
          margin: 0 0 16px 0;
          font-size: 1.05rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .step-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 20px;
        }

        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .step-num {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(24, 119, 242, 0.1);
          color: #1877f2;
          font-weight: 800;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.4;
        }

        .inline-link {
          color: #1877f2;
          font-weight: 700;
          text-decoration: none;
        }

        .status-preview {
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-preview.connected {
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #16a34a;
          flex-direction: column;
          align-items: flex-start;
        }

        .status-preview.pending {
          background: #fffbe6;
          border: 1px solid #ffe58f;
          color: #d48806;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
        }

        .user-details {
          font-size: 0.8rem;
          color: #334155;
        }

        .counts-row {
          display: flex;
          gap: 12px;
          margin-top: 4px;
          font-weight: 600;
          color: #1877f2;
        }

        /* ─── FORM CARD ────────────────────────────────────────────────── */
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .form-group label {
          font-size: 0.84rem;
          font-weight: 700;
          color: #475569;
        }

        .req { color: #ef4444; }

        .form-group input,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.88rem;
          color: #0f1117;
          outline: none;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: #1877f2;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.12);
        }

        .parsed-badge {
          background: #dcfce7;
          color: #15803d;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-save-credentials {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #1877f2 0%, #1565c0 100%);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(24, 119, 242, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, opacity 0.15s;
          margin-top: 8px;
        }

        .btn-save-credentials:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .btn-save-credentials:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .dark-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 0.88rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dark-toast.success { background: #22c55e; }
        .dark-toast.error { background: #ef4444; }

        @media (max-width: 900px) {
          .connect-grid {
            grid-template-columns: 1fr;
          }
          .title-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default FbConnect;

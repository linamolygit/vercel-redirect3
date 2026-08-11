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
  Zap,
  HelpCircle,
  X,
  User,
  Check,
  FileText,
  Users,
  Puzzle,
  Sparkles,
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

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Custom Extension detection & integration state
  const [isExtInstalled, setIsExtInstalled] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Extension detection & auto-fill listener
  useEffect(() => {
    const handleMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      const { type, data } = event.data || {};

      if (type === "FBVIRALL_EXTENSION_INSTALLED") {
        setIsExtInstalled(true);
      }

      if (type === "FBVIRALL_EXTENSION_RESPONSE" && data?.cookieString) {
        setRawCookie(data.cookieString);
        if (data.accessToken) setAccessToken(data.accessToken);
        showToast("Credentials loaded from Extension!", "success");
      }
    };

    window.addEventListener("message", handleMsg);
    window.postMessage({ type: "FBVIRALL_PING" }, "*");

    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const handleAutoFillFromExtension = () => {
    window.postMessage({ type: "FBVIRALL_FETCH_TOKEN", requestId: "connect_page" }, "*");
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

  const userAvatar = connectedUser?.picture?.data?.url;

  return (
    <div className="fb-connect-wrapper">
      <Head>
        <title>Facebook Account Setup & Token Manager — LinkPika</title>
        <meta name="description" content="Connect your Facebook Account using LinkPika Extension or Get Token Cookie extension." />
      </Head>

      <Header />

      <main className="main-content">
        {/* Title Banner */}
        <div className="title-banner">
          <div className="banner-left">
            <h1 className="main-heading">
              <Key className="heading-icon" size={28} />
              <span>Facebook Account Setup & Token Manager</span>
            </h1>
            <p className="sub-heading">
              Connect your Facebook Account using Custom LinkPika Extension (Auto-fill) or manual Session Cookies / Access Tokens.
            </p>
          </div>

          <div className="banner-actions">
            {isExtInstalled ? (
              <div className="ext-badge active">
                <CheckCircle2 size={15} /> LinkPika Extension Active
              </div>
            ) : (
              <div className="ext-badge inactive">
                <Puzzle size={15} /> Extension Not Detected
              </div>
            )}

            <button className="btn-info-guide" onClick={() => setShowGuideModal(true)} title="Extension Installation Guide">
              <HelpCircle size={16} />
              <span>Guide (i)</span>
            </button>

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
        </div>

        <div className="connect-grid">
          {/* ─── LEFT SIDE: CONNECTED ACCOUNT ASSETS & PROFILE ─────────────── */}
          <aside className="assets-card">
            <h3>
              <User size={18} /> Connected Facebook Profile & Assets
            </h3>

            {connectedUser ? (
              <div className="profile-dashboard">
                {/* Profile Header */}
                <div className="user-profile-header">
                  {userAvatar ? (
                    <img src={userAvatar} alt="Profile" className="user-avatar-img" />
                  ) : (
                    <div className="user-avatar-fallback">
                      {connectedUser.name ? connectedUser.name.charAt(0).toUpperCase() : "FB"}
                    </div>
                  )}

                  <div className="user-header-info">
                    <div className="user-name-title">{connectedUser.name || "Facebook User"}</div>
                    <div className="user-id-sub">ID: {connectedUser.id}</div>
                    <div className="status-pill-active">
                      <ShieldCheck size={13} /> Account Active & Synced
                    </div>
                  </div>
                </div>

                {/* Pages List */}
                <div className="asset-section">
                  <h4 className="asset-title">
                    <Share2 size={15} /> Connected Pages ({connectedPages.length})
                  </h4>

                  {connectedPages.length === 0 ? (
                    <div className="empty-asset">No Facebook Pages found.</div>
                  ) : (
                    <div className="pages-list">
                      {connectedPages.map((page) => (
                        <div key={page.id} className="page-item-card">
                          {page.picture ? (
                            <img src={page.picture} alt={page.name} className="page-item-img" />
                          ) : (
                            <div className="page-item-icon">
                              {page.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="page-item-details">
                            <div className="page-item-name">{page.name}</div>
                            <div className="page-item-meta">
                              ID: {page.id} {page.category ? `• ${page.category}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ad Accounts List */}
                <div className="asset-section">
                  <h4 className="asset-title">
                    <Layers size={15} /> Connected Ad Accounts ({connectedAdAccounts.length})
                  </h4>

                  {connectedAdAccounts.length === 0 ? (
                    <div className="empty-asset">No Ad Accounts found.</div>
                  ) : (
                    <div className="ad-accounts-list">
                      {connectedAdAccounts.map((ad) => (
                        <div key={ad.id} className="ad-account-item">
                          <div className="ad-item-name">{ad.name || ad.id}</div>
                          <div className="ad-item-id">ID: {ad.id}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pending-connect-card">
                <AlertCircle size={36} className="pending-icon" />
                <h4>No Facebook Account Connected</h4>
                <p>
                  Use the LinkPika Extension for 1-click auto fill, or manually paste your Facebook Cookie and Access Tokens on the right.
                </p>
                <button className="btn-open-guide" onClick={() => setShowGuideModal(true)}>
                  <HelpCircle size={15} /> View Setup Instructions
                </button>
              </div>
            )}
          </aside>

          {/* ─── RIGHT SIDE: CREDENTIALS INPUT FORM ──────────────────────── */}
          <section className="form-card">
            <div className="form-card-header">
              <h3>
                <Cookie size={18} /> Enter Facebook Credentials
              </h3>

              {isExtInstalled ? (
                <button type="button" className="btn-auto-fill" onClick={handleAutoFillFromExtension}>
                  <Zap size={16} />
                  <span>Auto Fill from Extension</span>
                </button>
              ) : (
                <div className="ext-not-found-pill">
                  <Puzzle size={14} />
                  <span>Custom Extension not detected. You can still paste manually.</span>
                </div>
              )}
            </div>

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

      {/* ─── FLOATING EXTENSION GUIDE MODAL ───────────────────────────────── */}
      {showGuideModal && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="guide-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <HelpCircle size={18} /> Extension & Token Setup Guide
              </h3>
              <button className="btn-close-modal" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="option-block">
                <h4>⚡ Option A: Custom LinkPika Extension (Recommended)</h4>
                <div className="step-list">
                  <div className="step-item">
                    <span className="step-num">1</span>
                    <div className="step-text">
                      Load the <strong>LinkPika Custom Extension</strong> in Chrome Developer Mode (chrome://extensions).
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <div className="step-text">
                      Log in to your <strong>Facebook Account</strong> in the browser.
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">3</span>
                    <div className="step-text">
                      Click the <strong>&quot;Auto Fill from Extension&quot;</strong> button above to automatically extract your cookie and access token!
                    </div>
                  </div>
                </div>
              </div>

              <div className="option-block" style={{ marginTop: "20px" }}>
                <h4>📋 Option B: Public &quot;Get Token Cookie&quot; Extension (Manual)</h4>
                <div className="step-list">
                  <div className="step-item">
                    <span className="step-num">1</span>
                    <div className="step-text">
                      Install <strong>&quot;Get Token Cookie&quot;</strong> from Chrome Web Store.
                      <br />
                      <a href={GET_TOKEN_EXTENSION_URL} target="_blank" rel="noreferrer" className="inline-link">
                        Open Chrome Web Store ↗
                      </a>
                    </div>
                  </div>
                  <div className="step-item">
                    <span className="step-num">2</span>
                    <div className="step-text">
                      Click the extension icon while logged into Facebook, copy the Cookie string and Access Token, and paste them manually into the form.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          background: var(--bg-main);
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: background 0.3s, color 0.3s;
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
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
        }

        .main-heading {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .main-heading :global(.heading-icon) {
          color: var(--primary);
        }

        .sub-heading {
          margin: 4px 0 0 0;
          font-size: 0.83rem;
          color: var(--text-muted);
        }

        .banner-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ext-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
        }

        .ext-badge.active {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: #16a34a;
        }

        .ext-badge.inactive {
          background: rgba(234, 179, 8, 0.12);
          border: 1px solid rgba(234, 179, 8, 0.3);
          color: #d97706;
        }

        .btn-info-guide {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background: var(--btn-hover);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-info-guide:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .btn-download-ext {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(0, 113, 227, 0.25);
          transition: transform 0.15s, background 0.15s;
        }

        .btn-download-ext:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        .connect-grid {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ─── ASSETS CARD & FORM CARD ──────────────────────────────────── */
        .assets-card,
        .form-card {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          padding: 24px;
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
        }

        .assets-card h3,
        .form-card h3 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 20px;
        }

        .btn-auto-fill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          color: white;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          transition: transform 0.15s, opacity 0.15s;
        }

        .btn-auto-fill:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        .ext-not-found-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.76rem;
          color: var(--text-muted);
          background: var(--input-bg);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--glass-border);
        }

        /* Profile Dashboard */
        .user-profile-header {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          margin-bottom: 20px;
        }

        .user-avatar-img {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--primary);
        }

        .user-avatar-fallback {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 1.3rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-name-title {
          font-weight: 800;
          font-size: 1rem;
          color: var(--text-main);
        }

        .user-id-sub {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .status-pill-active {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 0.73rem;
          font-weight: 700;
          color: #16a34a;
        }

        .asset-section {
          margin-bottom: 20px;
        }

        .asset-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 10px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pages-list,
        .ad-accounts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .page-item-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
        }

        .page-item-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--glass-border);
        }

        .page-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-item-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .page-item-meta {
          font-size: 0.74rem;
          color: var(--text-muted);
        }

        .ad-account-item {
          padding: 8px 12px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
        }

        .ad-item-name {
          font-size: 0.83rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .ad-item-id {
          font-size: 0.73rem;
          color: var(--text-muted);
        }

        .empty-asset {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .pending-connect-card {
          text-align: center;
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .pending-connect-card :global(.pending-icon) {
          color: #d48806;
        }

        .pending-connect-card h4 {
          margin: 0;
          font-size: 1rem;
          color: var(--text-main);
        }

        .pending-connect-card p {
          margin: 0;
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .btn-open-guide {
          background: var(--btn-hover);
          border: 1px solid var(--glass-border);
          color: var(--text-main);
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
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
          color: var(--text-main);
        }

        .req { color: #ef4444; }

        .form-group input,
        .form-group textarea {
          width: 100%;
          box-sizing: border-box;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 0.88rem;
          color: var(--text-main);
          outline: none;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15);
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
          border-radius: var(--radius-md);
          border: none;
          background: var(--primary);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 113, 227, 0.35);
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
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        /* ─── MODAL DIALOG ─────────────────────────────────────────────── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .guide-modal-content {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 520px;
          box-shadow: var(--glass-shadow);
          overflow: hidden;
        }

        .modal-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.05rem;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-body {
          padding: 20px;
        }

        .option-block h4 {
          margin: 0 0 10px 0;
          font-size: 0.9rem;
          color: var(--primary);
        }

        .step-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 113, 227, 0.12);
          color: var(--primary);
          font-weight: 800;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .step-text {
          font-size: 0.85rem;
          color: var(--text-main);
          line-height: 1.4;
        }

        .inline-link {
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
        }

        .dark-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: var(--radius-sm);
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

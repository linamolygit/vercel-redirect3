import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";

interface SavedLink {
  id: number;
  short_id: string;
  original_url: string;
  wp_post_path: string;
  custom_title: string;
  custom_desc: string;
  custom_image: string;
  created_at: string;
}

const Home: NextPage = () => {
  const [wpUrl, setWpUrl] = useState("");
  const [wpPostPath, setWpPostPath] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customImg, setCustomImg] = useState("");
  
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [converting, setConverting] = useState(false);
  
  const [resultUrl, setResultUrl] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);
  const [history, setHistory] = useState<SavedLink[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Authentication check on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserEmail(data.user.email);
            // Fetch history only after successful auth
            fetchHistory();
          } else {
            // Guest Mode: load from localStorage
            const localLinks = localStorage.getItem("guest_links");
            if (localLinks) {
              setHistory(JSON.parse(localLinks));
            }
          }
        } else {
          // Guest Mode fallback
          const localLinks = localStorage.getItem("guest_links");
          if (localLinks) {
            setHistory(JSON.parse(localLinks));
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // Guest Mode fallback
        const localLinks = localStorage.getItem("guest_links");
        if (localLinks) {
          setHistory(JSON.parse(localLinks));
        }
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // Load redirects history for this user
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load links history:", err);
    }
  };

  // Fetch metadata from WordPress URL to pre-populate fields
  const handleFetchMetadata = async () => {
    if (!wpUrl) {
      alert("Kripya pehle apne WordPress Post ka URL daalein.");
      return;
    }
    setFetchingMeta(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/fetch-wp?url=${encodeURIComponent(wpUrl)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "WordPress details fetch karne me error.");
      }
      
      setCustomTitle(data.title || "");
      setCustomDesc(data.excerpt || "");
      setCustomImg(data.imageUrl || "");
      setWpPostPath(data.postPath || "");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "WordPress details nahi mil payi. Kripya check karein ki us website par 'WPGraphQL' plugin active aur configured hai. (Setup guidance niche check karein).");
    } finally {
      setFetchingMeta(false);
    }
  };

  // Create redirect and save to MySQL
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl) {
      alert("Kripya WordPress Post URL fill karein.");
      return;
    }

    setConverting(true);
    setErrorMessage("");
    setResultUrl("");
    try {
      const res = await fetch("/api/create-redirect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: wpUrl,
          wpPostPath: wpPostPath,
          customTitle: customTitle,
          customDesc: customDesc,
          customImage: customImg,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Link convert karne me error.");
      }

      setResultUrl(data.shortLink);
      
      if (userEmail) {
        // Logged in: Refresh history from MySQL
        fetchHistory();
      } else {
        // Guest Mode: Save generated link to localStorage guest history
        const newGuestLink: SavedLink = {
          id: Date.now(),
          short_id: data.shortId,
          original_url: wpUrl,
          wp_post_path: wpPostPath,
          custom_title: customTitle,
          custom_desc: customDesc,
          custom_image: customImg,
          created_at: new Date().toISOString(),
        };

        const existingLinks = localStorage.getItem("guest_links");
        const guestHistory = existingLinks ? JSON.parse(existingLinks) : [];
        const updatedHistory = [newGuestLink, ...guestHistory];
        
        setHistory(updatedHistory);
        localStorage.setItem("guest_links", JSON.stringify(updatedHistory));
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "MySQL save fail ho gaya.");
    } finally {
      setConverting(false);
    }
  };

  // Logout Handler
  const handleSignout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Signout failed:", err);
    }
  };

  const copyToClipboard = (text: string, id: number | null = null) => {
    navigator.clipboard.writeText(text).then(() => {
      if (id !== null) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        setCopiedResult(true);
        setTimeout(() => setCopiedResult(false), 2000);
      }
    });
  };

  if (checkingAuth) {
    return (
      <div className="loader-screen">
        <div className="spinner"></div>
        <p>Verifying session... ⏳</p>
        <style jsx>{`
          .loader-screen {
            background: #070215;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #9ca3af;
            font-family: sans-serif;
            gap: 15px;
          }
          .spinner {
            border: 4px solid rgba(255,255,255,0.05);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #6366f1;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <Head>
        <title>WP Link Converter Dashboard</title>
        <meta name="description" content="WordPress Full-stack Social Media Redirect Tool" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        {/* Top Profile Header Bar */}
        {userEmail ? (
          <div className="top-bar">
            <span className="user-email">Logged in as: <strong>{userEmail}</strong></span>
            <button onClick={handleSignout} className="btn-signout">Sign Out</button>
          </div>
        ) : (
          <div className="top-bar">
            <span className="user-email">Using as <strong>Guest Mode</strong></span>
            <button onClick={() => router.push("/login")} className="btn-signin">Sign In / Register</button>
          </div>
        )}

        {/* Main Dashboard Card */}
        <div className="card main-card">
          <header className="header">
            <span className="logo-icon">🌐</span>
            <h1>WP Link Cloaker</h1>
            <p className="description">
              Apne WordPress post links ko convert karein. Social platforms (Facebook/WA) ko overridden meta tags serve karein aur normal users ko WP site par redirect karein.
            </p>
            <span className="badge">Full-Stack MySQL Mode</span>
          </header>

          <form onSubmit={handleConvert} className="form-panel">
            {/* Input 1: WordPress URL with Auto Fetch */}
            <div className="input-group">
              <label htmlFor="wpUrl">WordPress Post URL</label>
              <div className="input-with-action">
                <input
                  type="url"
                  id="wpUrl"
                  placeholder="https://yourblog.com/my-awesome-post/"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-fetch"
                  onClick={handleFetchMetadata}
                  disabled={fetchingMeta}
                >
                  {fetchingMeta ? "Fetching... ⏳" : "Auto Fetch Details"}
                </button>
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && <div className="error-banner">⚠️ {errorMessage}</div>}

            {/* Social Override Panel */}
            <fieldset className="override-panel">
              <legend>Facebook OG Tags Override (Optional)</legend>
              <p className="panel-hint">
                Facebook aur Twitter preview images/titles ko customize karein click-through-rates optimize karne ke liye:
              </p>

              <div className="input-group">
                <label htmlFor="customTitle">Custom Title</label>
                <input
                  type="text"
                  id="customTitle"
                  placeholder="Facebook feed ke liye ek dhamakedar title..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label htmlFor="customDesc">Custom Description</label>
                <textarea
                  id="customDesc"
                  placeholder="Post ke bare me description..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="input-group">
                <label htmlFor="customImg">Custom Image URL</label>
                <input
                  type="url"
                  id="customImg"
                  placeholder="https://yourblog.com/wp-content/uploads/custom-photo.jpg"
                  value={customImg}
                  onChange={(e) => setCustomImg(e.target.value)}
                />
              </div>
            </fieldset>

            {/* Convert Button */}
            <button type="submit" className="btn-submit" disabled={converting}>
              {converting ? (
                <span>Generating Short Link... ⏳</span>
              ) : (
                <>
                  <span>Link Convert & Save Karen</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Success Result Panel */}
          {resultUrl && (
            <div className="result-section">
              <label>Generated Cloaked Link (Facebook par share karne ke liye):</label>
              <div className="result-wrapper">
                <div className="result-url">{resultUrl}</div>
                <button
                  type="button"
                  className={`btn-copy ${copiedResult ? "copied" : ""}`}
                  onClick={() => copyToClipboard(resultUrl)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {copiedResult ? (
                      <polyline points="20 6 9 17 4 12"></polyline>
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </>
                    )}
                  </svg>
                  <span>{copiedResult ? "Copied! ✅" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* History Table Card */}
        <div className="card history-card">
          <h2>Database Links History 🕒</h2>
          <p className="hint">Hostinger MySQL database me stored generated links:</p>

          <div className="table-responsive">
            {history.length === 0 ? (
              <div className="empty-state">Database me abhi koi link nahi hai. Naya link banayein!</div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Short ID</th>
                    <th>WordPress Link</th>
                    <th>Custom Title</th>
                    <th>Created At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((link) => {
                    const host = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
                    const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
                    const fullShortLink = `${protocol}//${host}/${link.short_id}`;
                    
                    return (
                      <tr key={link.id}>
                        <td>
                          <span className="id-tag">{link.short_id}</span>
                        </td>
                        <td>
                          <div className="truncate" title={link.original_url}>{link.original_url}</div>
                        </td>
                        <td>
                          <div className="truncate" title={link.custom_title || "N/A"}>
                            {link.custom_title || <span className="dim">No custom title</span>}
                          </div>
                        </td>
                        <td>{new Date(link.created_at).toLocaleDateString()}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn-table-copy ${copiedId === link.id ? "copied" : ""}`}
                            onClick={() => copyToClipboard(fullShortLink, link.id)}
                          >
                            {copiedId === link.id ? "Copied! ✅" : "Copy Link"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* WPGraphQL Setup Guide Card */}
        <div className="card guide-card">
          <h2>⚙️ WordPress WPGraphQL Setup Guide</h2>
          <p className="guide-intro">
            Agar aap kisi WordPress URL se title aur image dynamic-fetch karna chahte hain, to us WordPress site par <strong>WPGraphQL</strong> plugin active hona zaruri hai. Apne users ko ye configure karne ko kahein:
          </p>
          <div className="steps-container">
            <div className="step-item">
              <h3>Step 1: Install Plugin 🔌</h3>
              <p>Apne WordPress Dashboard me <strong>Plugins &rarr; Add New</strong> par jayein. Search karein <strong>WPGraphQL</strong>, use Install aur <strong>Activate</strong> karein.</p>
            </div>
            <div className="step-item">
              <h3>Step 2: Verify & Test 🧪</h3>
              <p>Setup verify karne ke liye apne browser me <code>https://yoursite.com/graphql</code> open karein. Agar blank page ya GraphQL JSON response aaye, to ye active hai.</p>
            </div>
            <div className="step-item">
              <h3>Step 3: Auto Fetch Link ⚡</h3>
              <p>Bas, ab apna post URL dashboard par paste karke <strong>Auto Fetch</strong> click karein. Title, Description aur Image automatic load ho jayenge!</p>
            </div>
          </div>
        </div>
      </main>

      {/* Embedded Vanilla CSS */}
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
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
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
          max-width: 850px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 14px 28px;
          backdrop-filter: blur(20px);
          font-size: 0.95rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .user-email strong {
          color: #c084fc;
        }

        .btn-signout {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-signout:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
          transform: translateY(-1px);
        }

        .btn-signin {
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: #818cf8;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-signin:hover {
          background: rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          border-color: rgba(99, 102, 241, 0.45);
          transform: translateY(-1px);
        }

        .card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
        }

        .main-card {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .history-card {
          animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header {
          text-align: center;
          margin-bottom: 35px;
        }

        .logo-icon {
          font-size: 3.5rem;
          margin-bottom: 15px;
          display: inline-block;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        h1 {
          font-size: 2.6rem;
          font-weight: 800;
          letter-spacing: -1px;
          background: var(--accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }

        .description {
          font-size: 1rem;
          color: var(--text-muted);
          line-height: 1.6;
          max-width: 620px;
          margin: 0 auto;
        }

        .badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 600;
          background: rgba(168, 85, 247, 0.15);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.3);
          margin-top: 15px;
        }

        .form-panel {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-muted);
        }

        input[type="url"],
        input[type="text"],
        textarea {
          width: 100%;
          padding: 15px 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: var(--text);
          font-size: 1rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        input:focus,
        textarea:focus {
          border-color: #a855f7;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.25);
          background: rgba(255, 255, 255, 0.04);
        }

        .input-with-action {
          display: flex;
          gap: 12px;
        }

        .input-with-action input {
          flex: 1;
        }

        .btn-fetch {
          padding: 0 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-fetch:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .btn-fetch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 0.9rem;
        }

        .override-panel {
          border: 1px solid rgba(168, 85, 247, 0.15);
          border-radius: 16px;
          padding: 24px;
          background: rgba(168, 85, 247, 0.02);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .override-panel legend {
          font-weight: 700;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #c084fc;
          padding: 0 10px;
        }

        .panel-hint {
          font-size: 0.85rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin-bottom: 5px;
        }

        .btn-submit {
          width: 100%;
          padding: 18px;
          border: none;
          border-radius: 12px;
          background: var(--accent);
          color: white;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3);
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 12px 35px rgba(99, 102, 241, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .result-section {
          margin-top: 30px;
          padding-top: 30px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .result-wrapper {
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px;
          align-items: center;
          margin-top: 10px;
        }

        .result-url {
          flex: 1;
          padding: 10px 14px;
          font-size: 1rem;
          color: #818cf8;
          font-weight: 600;
          overflow-x: auto;
          white-space: nowrap;
          scrollbar-width: none;
        }

        .result-url::-webkit-scrollbar { display: none; }

        .btn-copy {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          cursor: pointer;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-copy:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .btn-copy.copied {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        /* History panel styling */
        h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .hint {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
          font-style: italic;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.05);
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .history-table th,
        .history-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.9rem;
        }

        .history-table th {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .id-tag {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
          padding: 4px 10px;
          border-radius: 6px;
          font-family: monospace;
          font-weight: 600;
        }

        .truncate {
          max-width: 220px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dim {
          color: rgba(255, 255, 255, 0.2);
          font-style: italic;
        }

        .btn-table-copy {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-table-copy:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .btn-table-copy.copied {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }

        .guide-card {
          margin-top: 25px;
          animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: rgba(255, 255, 255, 0.01) !important;
          border: 1px solid rgba(255, 255, 255, 0.04) !important;
          padding: 30px !important;
        }

        .guide-card h2 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #c084fc;
          margin-bottom: 10px;
        }

        .guide-intro {
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        @media (min-width: 640px) {
          .steps-container {
            flex-direction: row;
            gap: 20px;
          }
        }

        .step-item {
          flex: 1;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 20px;
          border-radius: 12px;
          transition: all 0.25s ease;
        }

        .step-item:hover {
          border-color: rgba(168, 85, 247, 0.35);
          background: rgba(168, 85, 247, 0.03);
          transform: translateY(-2px);
        }

        .step-item h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 8px;
        }

        .step-item p {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .step-item code {
          background: rgba(0, 0, 0, 0.4);
          padding: 2px 6px;
          border-radius: 4px;
          color: #f472b6;
          font-family: monospace;
          font-size: 0.8rem;
        }

        @media (max-width: 768px) {
          .input-with-action {
            flex-direction: column;
            gap: 10px;
          }
          
          .btn-fetch {
            padding: 15px;
          }

          .card {
            padding: 25px;
          }

          h1 {
            font-size: 2.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;

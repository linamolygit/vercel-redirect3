import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
            setUserName(data.user.name || "");
            setUserUsername(data.user.username || "");
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

  // Drag and Drop Image Upload Listeners
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const mockEvent = {
        target: {
          files: [file]
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleImageUpload(mockEvent);
    }
  };

  // ImgBB Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setUploadSuccess(false);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Image upload fail ho gaya.");
      }

      const imageUrl = data.data.url;
      setCustomImg(imageUrl);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000); // Clear message after 4s
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "ImgBB Image upload me error aaya.");
    } finally {
      setUploadingImage(false);
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
            background: var(--bg);
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
  }  const filteredHistory = history.filter((link) => {
    const term = searchQuery.toLowerCase();
    return (
      link.short_id.toLowerCase().includes(term) ||
      link.original_url.toLowerCase().includes(term) ||
      (link.custom_title || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="wrapper">
      <Head>
        <title>SaaS Link Cloaker Dashboard</title>
        <meta name="description" content="WordPress Full-stack Social Media Redirect Tool" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <div className="dashboard-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          {/* User Profile Card */}
          <div className="sidebar-profile-card">
            <div className="profile-avatar">
              {userName ? userName.substring(0, 2).toUpperCase() : "GU"}
            </div>
            <div className="profile-info">
              <h3>{userName || "Guest User"}</h3>
              {userUsername ? (
                <span className="profile-handle">@{userUsername}</span>
              ) : (
                <span className="profile-guest-badge">Limited Access</span>
              )}
            </div>
          </div>

          <div className="sidebar-divider"></div>

          {/* Links list & Search */}
          <div className="sidebar-search-sec">
            <span className="sec-title">Redirect Links 🔗</span>
            <div className="sidebar-search-box">
              <svg className="search-icon-small" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-links-list">
            {history.length === 0 ? (
              <div className="sidebar-empty">
                <p>No redirects generated yet. Convert your first link!</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="sidebar-empty">
                <p>No matching redirects found.</p>
              </div>
            ) : (
              filteredHistory.map((link) => {
                const host = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
                const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
                const fullShortLink = `${protocol}//${host}/${link.short_id}`;
                const isCopied = copiedId === link.id;

                return (
                  <div className="sidebar-link-card" key={link.id}>
                    <div className="link-card-meta">
                      <span className="link-card-id">{link.short_id}</span>
                      <span className="link-card-date">{new Date(link.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="link-card-title" title={link.custom_title || link.original_url}>
                      {link.custom_title || link.original_url}
                    </div>
                    <div className="link-card-url" title={fullShortLink}>{fullShortLink}</div>
                    <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                      <button
                        type="button"
                        className={`btn-sidebar-copy ${isCopied ? "copied" : ""}`}
                        onClick={() => copyToClipboard(fullShortLink, link.id)}
                      >
                        {isCopied ? (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Copied
                          </span>
                        ) : "Copy"}
                      </button>
                      <button
                        type="button"
                        className="btn-sidebar-analytics"
                        onClick={() => router.push(`/analytics/${link.short_id}`)}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Stats
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Main Work Area */}
        <main className="dashboard-main-content">
          <section className="dashboard-hero">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              WP Link Cloaker
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </h1>
            <p>Paste target link, customize preview details, upload custom featured image, and deploy instant server-side redirects.</p>
          </section>

          <div className="main-work-card">
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
                  Customize preview images, titles, and descriptions to optimize your click-through rates (CTR) on social media platforms:
                </p>

                <div className="input-group">
                  <label htmlFor="customTitle">Custom Title</label>
                  <input
                    type="text"
                    id="customTitle"
                    placeholder="Enter custom title for Facebook feed..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="customDesc">Custom Description</label>
                  <textarea
                    id="customDesc"
                    placeholder="Enter custom description..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="customImg">Custom Image (Drag & Drop or Upload)</label>
                  <div 
                    className={`dropzone ${isDragging ? "dragging" : ""} ${customImg ? "has-image" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("imageFile")?.click()}
                  >
                    <input
                      type="file"
                      id="imageFile"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ display: "none" }}
                    />
                    
                    {customImg ? (
                      <div className="dropzone-preview">
                        <img src={customImg} alt="Preview" className="img-preview" />
                        <div className="dropzone-overlay">
                          <svg className="upload-icon-small" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="dropzone-prompt">
                        <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {uploadingImage ? (
                          <span>Uploading to ImgBB... ⏳</span>
                        ) : (
                          <span><strong>Choose a file</strong> or drag & drop here (ImgBB)</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="image-url-manual">
                    <span className="or-divider">Or enter URL manually:</span>
                    <input
                      type="url"
                      placeholder="https://yourblog.com/wp-content/uploads/photo.jpg"
                      value={customImg}
                      onChange={(e) => setCustomImg(e.target.value)}
                    />
                  </div>
                  {uploadSuccess && <span className="upload-success-label">Image uploaded successfully! ✅</span>}
                </div>
              </fieldset>

              {/* Convert Button */}
              <button type="submit" className="btn-submit" disabled={converting}>
                {converting ? (
                  <span>Generating Short Link... ⏳</span>
                ) : (
                  <>
                    <span>Convert</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Success Result Panel */}
            {resultUrl && (
              <>
                {/* Facebook Feed Preview */}
                <div className="preview-container">
                  <label>Facebook Feed Preview 📱</label>
                  <div className="facebook-card">
                    <div className="fb-header">
                      <div className="fb-avatar">LP</div>
                      <div className="fb-meta">
                        <div className="fb-name">LinkPika Share Page</div>
                        <div className="fb-time">
                          Just now · 
                          <svg className="globe-icon-small" fill="currentColor" viewBox="0 0 16 16" width="12" height="12" style={{ marginLeft: "4px", display: "inline-block", verticalAlign: "middle" }}>
                            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM1.006 8a6.978 6.978 0 0 1 1.545-4.385L6.03 7.09c-.066.38-.13.782-.13 1.139 0 .428.163.856.49 1.186l1.63 1.63c.33.33.758.49 1.186.49v2.115l-1.63 1.63c-.33.33-.758.49-1.186.49H6.03a1.99 1.99 0 0 1-1.414-.586L2.348 12.87A6.974 6.974 0 0 1 1.006 8zm13.988 0a6.975 6.975 0 0 1-1.342 4.385L12 10.758v-1.63c0-.428-.163-.856-.49-1.186L9.88 7.31c-.33-.33-.49-.758-.49-1.186V3.687l1.63-1.63c.33-.33.758-.49 1.186-.49h.56a1.99 1.99 0 0 1 1.414.586l2.268 2.268A6.98 6.98 0 0 1 14.994 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="fb-post-text">Check this out!</div>
                    <div className="fb-image-container">
                      {customImg ? (
                        <img src={customImg} alt="Preview" className="fb-preview-img" />
                      ) : (
                        <div className="fb-image-placeholder">No Image Available</div>
                      )}
                    </div>
                    <div className="fb-card-footer">
                      <div className="fb-card-domain">
                        {(() => {
                          try {
                            return new URL(wpUrl).hostname.toUpperCase();
                          } catch {
                            return "YOURWEBSITE.COM";
                          }
                        })()}
                      </div>
                      <div className="fb-card-title">{customTitle || "Custom Title"}</div>
                      <div className="fb-card-desc">{customDesc || "Click here to read the full story and learn more details."}</div>
                    </div>
                  </div>
                </div>

                <div className="result-section">
                  <label>Generated Cloaked Link (Ready to share on social media):</label>
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
              </>
            )}
          </div>
        </main>
      </div>

      <Footer />

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
          --input-bg: rgba(255, 255, 255, 0.03);
          --input-border: rgba(255, 255, 255, 0.08);
        }

        :root.light-theme {
          --bg: #f9fafb;
          --card-bg: #ffffff;
          --card-border: #e5e7eb;
          --accent: linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%);
          --accent-hover: linear-gradient(135deg, #3730a3 0%, #6d28d9 100%);
          --text: #111827;
          --text-muted: #4b5563;
          --success: #16a34a;
          --input-bg: #f3f4f6;
          --input-border: #d1d5db;
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
          transition: background 0.3s ease, color 0.3s ease;
        }

        .wrapper {
          position: relative;
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg);
          transition: background 0.3s ease;
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
          opacity: 0.12;
          transition: opacity 0.3s ease;
        }

        :root.light-theme .glow {
          opacity: 0.04;
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

        /* Two-Column Dashboard Layout */
        .dashboard-layout {
          display: flex;
          flex-direction: row;
          width: 100%;
          min-height: calc(100vh - 70px);
          position: relative;
          z-index: 10;
          flex: 1;
        }

        /* Sidebar Styling */
        .dashboard-sidebar {
          width: 340px;
          min-width: 340px;
          background: rgba(255, 255, 255, 0.01);
          border-right: 1px solid var(--card-border);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: calc(100vh - 70px);
          overflow-y: auto;
          box-shadow: 10px 0 30px rgba(0, 0, 0, 0.05);
        }

        :root.light-theme .dashboard-sidebar {
          background: rgba(255, 255, 255, 0.7);
        }

        .sidebar-profile-card {
          display: flex;
          align-items: center;
          gap: 15px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--accent);
          color: #ffffff;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.15rem;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .profile-info h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
          margin-bottom: 2px;
        }

        .profile-handle {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .profile-guest-badge {
          display: inline-block;
          font-size: 0.75rem;
          color: #a855f7;
          background: rgba(168, 85, 247, 0.1);
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 600;
          width: max-content;
        }

        .sidebar-divider {
          height: 1px;
          background: var(--card-border);
          width: 100%;
        }

        .sidebar-search-sec {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .sec-title {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        .sidebar-search-box {
          position: relative;
          width: 100%;
        }

        .search-icon-small {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: var(--text-muted);
        }

        .sidebar-search-box input {
          width: 100%;
          padding: 10px 12px 10px 38px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 10px;
          color: var(--text);
          font-size: 0.85rem;
          outline: none;
          transition: all 0.25s ease;
        }

        .sidebar-search-box input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
        }

        /* Sidebar Links List Scrollable */
        .sidebar-links-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .sidebar-links-list::-webkit-scrollbar {
          width: 4px;
        }

        .sidebar-links-list::-webkit-scrollbar-thumb {
          background: var(--card-border);
          border-radius: 4px;
        }

        .sidebar-link-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.25s ease;
        }

        .sidebar-link-card:hover {
          border-color: rgba(168, 85, 247, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .link-card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .link-card-id {
          font-family: monospace;
          background: rgba(168, 85, 247, 0.1);
          color: #c084fc;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .link-card-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .link-card-url {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .btn-sidebar-copy {
          width: 100%;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.15);
          color: #c084fc;
          padding: 7px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: center;
        }

        .btn-sidebar-copy:hover {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.35);
        }

        .btn-sidebar-copy.copied {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .btn-sidebar-analytics {
          width: 100%;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.15);
          color: #818cf8;
          padding: 7px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: center;
        }

        .btn-sidebar-analytics:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.35);
        }

        /* Center Main Work Panel Area */
        .dashboard-main-content {
          flex: 1;
          padding: 40px 60px;
          overflow-y: auto;
          max-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .dashboard-hero {
          text-align: left;
        }

        .dashboard-hero h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: var(--accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
          letter-spacing: -1.2px;
        }

        .dashboard-hero p {
          font-size: 1rem;
          color: var(--text-muted);
          line-height: 1.5;
          max-width: 800px;
        }

        .main-work-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 35px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          width: 100%;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
        }

        input[type="url"],
        input[type="text"],
        textarea {
          width: 100%;
          padding: 14px 18px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 12px;
          color: var(--text);
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        input:focus,
        textarea:focus {
          border-color: #a855f7;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
          background: var(--input-bg);
        }

        .input-with-action {
          display: flex;
          gap: 12px;
        }

        .btn-fetch {
          padding: 0 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        :root.light-theme .btn-fetch {
          background: #e5e7eb;
          border-color: #d1d5db;
        }

        .btn-fetch:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .btn-fetch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropzone {
          border: 2px dashed rgba(255, 255, 255, 0.15);
          background: var(--input-bg);
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          min-height: 120px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        :root.light-theme .dropzone {
          border-color: #cbd5e1;
        }

        .dropzone:hover,
        .dropzone.dragging {
          border-color: #a855f7;
          background: rgba(168, 85, 247, 0.03);
        }

        .dropzone-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .dropzone-prompt strong {
          color: #c084fc;
        }

        .upload-icon {
          width: 32px;
          height: 32px;
          color: rgba(255, 255, 255, 0.3);
        }

        :root.light-theme .upload-icon {
          color: #94a3b8;
        }

        .dropzone-preview {
          position: relative;
          width: 100%;
          height: 160px;
          border-radius: 8px;
          overflow: hidden;
        }

        .img-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .dropzone-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.25s ease;
          color: #fff;
        }

        .dropzone-preview:hover .dropzone-overlay {
          opacity: 1;
        }

        .upload-icon-small {
          width: 24px;
          height: 24px;
        }

        .image-url-manual {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .or-divider {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .upload-success-label {
          font-size: 0.8rem;
          color: #4ade80;
          font-weight: 600;
          margin-top: 4px;
        }

        .override-panel {
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: rgba(255, 255, 255, 0.01);
        }

        :root.light-theme .override-panel {
          background: #f9fafb;
        }

        .override-panel legend {
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0 10px;
          color: var(--text);
        }

        .panel-hint {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .btn-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          background: var(--accent);
          color: white;
          border: none;
          padding: 16px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.3);
        }

        .btn-submit:hover:not(:disabled) {
          background: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.45);
        }

        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 0.9rem;
          text-align: left;
        }

        :root.light-theme .error-banner {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fca5a5;
        }

        /* Success Results Area */
        .result-section {
          margin-top: 30px;
          background: rgba(34, 197, 94, 0.04);
          border: 1px solid rgba(34, 197, 94, 0.15);
          border-radius: 16px;
          padding: 24px;
          animation: fadeIn 0.4s ease forwards;
        }

        :root.light-theme .result-section {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .result-section label {
          color: var(--success);
          margin-bottom: 8px;
        }

        .result-wrapper {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .result-url {
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--card-border);
          padding: 14px 18px;
          border-radius: 10px;
          color: #fff;
          font-family: monospace;
          font-size: 0.95rem;
          word-break: break-all;
        }

        :root.light-theme .result-url {
          background: #f3f4f6;
          color: #111827;
        }

        .btn-copy {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          color: #4ade80;
          padding: 0 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-copy:hover {
          background: rgba(34, 197, 94, 0.15);
        }

        .btn-copy.copied {
          background: #22c55e;
          color: #fff;
        }

        /* Facebook Preview Component Styles */
        .preview-container {
          margin-top: 25px;
          margin-bottom: 10px;
          animation: fadeIn 0.4s ease forwards;
        }

        .preview-container label {
          display: block;
          font-size: 0.8rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .facebook-card {
          background: #ffffff;
          color: #1c1e21;
          border-radius: 12px;
          border: 1px solid #dddfe2;
          overflow: hidden;
          font-family: Helvetica, Arial, sans-serif;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          max-width: 550px;
        }

        .fb-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
        }

        .fb-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-weight: 800;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fb-meta {
          display: flex;
          flex-direction: column;
        }

        .fb-name {
          font-weight: 700;
          font-size: 0.85rem;
          color: #050505;
        }

        .fb-time {
          font-size: 0.75rem;
          color: #65676b;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
        }

        .fb-post-text {
          font-size: 0.9rem;
          padding: 0 12px 10px;
          color: #050505;
        }

        .fb-image-container {
          width: 100%;
          height: 280px;
          overflow: hidden;
          background: #f0f2f5;
          border-top: 1px solid #ebedf0;
          border-bottom: 1px solid #ebedf0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fb-preview-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #f0f2f5;
        }

        .fb-image-placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #8a8d91;
          font-size: 0.9rem;
        }

        .fb-card-footer {
          background: #f0f2f5;
          padding: 12px;
          border-top: 1px solid #ebedf0;
        }

        .fb-card-domain {
          font-size: 0.7rem;
          color: #65676b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .fb-card-title {
          font-weight: 700;
          font-size: 0.95rem;
          color: #050505;
          line-height: 1.25;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fb-card-desc {
          font-size: 0.8rem;
          color: #65676b;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        @media (max-width: 992px) {
          .dashboard-layout {
            flex-direction: column;
          }
          
          .dashboard-sidebar {
            width: 100%;
            min-width: 100%;
            max-height: 350px;
            border-right: none;
            border-bottom: 1px solid var(--card-border);
          }
          
          .dashboard-main-content {
            padding: 30px 20px;
            max-height: none;
          }
        }

        @media (max-width: 580px) {
          .fb-image-container {
            height: 180px;
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

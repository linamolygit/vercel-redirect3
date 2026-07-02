import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
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

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserEmail(data.user.email);
            setUserName(data.user.name || null);
            setUserUsername(data.user.username || null);
            fetchUserLinks();
          } else {
            router.push("/login");
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth verification error:", err);
        router.push("/login");
      } finally {
        setLoadingAuth(false);
      }
    };
    verifyUser();
  }, [router]);

  const fetchUserLinks = async () => {
    setLoadingLinks(true);
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data || []);
      }
    } catch (err) {
      console.error("Failed to load user links:", err);
    } finally {
      setLoadingLinks(false);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredLinks = links.filter((link) => {
    const term = searchQuery.toLowerCase();
    return (
      link.short_id.toLowerCase().includes(term) ||
      link.original_url.toLowerCase().includes(term) ||
      (link.custom_title || "").toLowerCase().includes(term)
    );
  });

  if (loadingAuth) {
    return (
      <div className="loader-screen">
        <div className="spinner"></div>
        <p>Loading Profile... ⏳</p>
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
            border: 4px solid rgba(255, 255, 255, 0.05);
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border-left-color: #a855f7;
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
        <title>User Profile — LinkPika</title>
        <meta name="description" content="View and manage all your generated short links" />
      </Head>

      <Header />

      <div className="background-glows">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
      </div>

      <main className="container">
        <header className="profile-header">
          <h1>My Profile Dashboard</h1>
          <p className="subtitle">Manage your account details and generated social redirects.</p>
        </header>

        {/* User Card */}
        <div className="card info-card">
          <div className="avatar-sec">
            <div className="avatar-large">
              {userName ? userName.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div className="avatar-info">
              <h2>{userName || userEmail}</h2>
              {userUsername && <span className="profile-handle" style={{ color: "#a855f7", fontSize: "0.85rem", display: "block", marginTop: "2px" }}>@{userUsername}</span>}
              <span className="badge-user">PRO Member</span>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-box">
              <span className="stat-num">{links.length}</span>
              <span className="stat-label">Total Redirects Created</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">Active</span>
              <span className="stat-label">System Status</span>
            </div>
          </div>
        </div>

        {/* Redirects Datatable */}
        <div className="card links-card">
          <div className="links-header">
            <h2>Your Redirect Links 🔗</h2>
            <div className="search-bar-wrapper">
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search links by title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loadingLinks ? (
            <p className="loading-text">Loading redirect list... ⏳</p>
          ) : filteredLinks.length === 0 ? (
            <div className="no-records">
              <p>No redirects found. Convert your first link on the homepage!</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="links-table">
                <thead>
                  <tr>
                    <th>Short ID</th>
                    <th>Original URL</th>
                    <th>Custom Title</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => {
                    const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
                    const proto = typeof window !== "undefined" ? window.location.protocol : "http:";
                    const fullShortLink = `${proto}//${host}/${link.short_id}`;

                    return (
                      <tr key={link.id}>
                        <td>
                          <span className="id-tag">{link.short_id}</span>
                        </td>
                        <td>
                          <div className="truncate" title={link.original_url}>
                            {link.original_url}
                          </div>
                        </td>
                        <td>
                          <div className="truncate" title={link.custom_title || "N/A"}>
                            {link.custom_title || <span className="dim">No custom title</span>}
                          </div>
                        </td>
                        <td>{new Date(link.created_at).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className={`btn-table-copy ${copiedId === link.id ? "copied" : ""}`}
                              onClick={() => copyToClipboard(fullShortLink, link.id)}
                            >
                              {copiedId === link.id ? "Copied! ✅" : "Copy Link"}
                            </button>
                            <button
                              type="button"
                              className="btn-table-analytics"
                              onClick={() => router.push(`/analytics/${link.short_id}`)}
                            >
                              Analytics 📊
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .wrapper {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Outfit', sans-serif;
          position: relative;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
        }

        .background-glows {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          overflow: hidden;
          z-index: 1;
          pointer-events: none;
        }

        .glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
        }

        .glow-1 {
          top: -10%;
          left: -10%;
          background: #6366f1;
        }

        .glow-2 {
          bottom: 20%;
          right: -10%;
          background: #a855f7;
        }

        .container {
          max-width: 1000px;
          margin: 60px auto;
          padding: 0 25px;
          display: flex;
          flex-direction: column;
          gap: 35px;
          position: relative;
          z-index: 2;
          flex: 1;
        }

        .profile-header {
          text-align: center;
        }

        .profile-header h1 {
          font-size: 2.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 12px;
          letter-spacing: -1px;
        }

        .subtitle {
          font-size: 1.1rem;
          color: #9ca3af;
        }

        .card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
        }

        .info-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        .avatar-sec {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .avatar-large {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: #fff;
          font-weight: 800;
          font-size: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4);
        }

        .avatar-info h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text);
        }

        .badge-user {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #c084fc;
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid rgba(168, 85, 247, 0.3);
          padding: 4px 10px;
          border-radius: 99px;
          margin-top: 6px;
        }

        .stats-grid {
          display: flex;
          gap: 25px;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px 25px;
          border-radius: 16px;
          min-width: 150px;
        }

        .stat-num {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text);
        }

        .stat-label {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .links-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          gap: 20px;
        }

        .links-header h2 {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--text);
        }

        .search-bar-wrapper {
          position: relative;
          max-width: 320px;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 18px;
          color: #9ca3af;
        }

        .search-bar-wrapper input {
          width: 100%;
          padding: 12px 18px 12px 42px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          color: var(--text);
          outline: none;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .search-bar-wrapper input:focus {
          border-color: #a855f7;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
        }

        .loading-text {
          color: #9ca3af;
          text-align: center;
          padding: 20px;
        }

        .no-records {
          text-align: center;
          padding: 40px;
          color: #9ca3af;
        }

        /* Responsive Table */
        .table-responsive {
          width: 100%;
          overflow-x: auto;
        }

        .links-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .links-table th,
        .links-table td {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .links-table th {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9ca3af;
        }

        .links-table td {
          font-size: 0.9rem;
          color: #d1d5db;
        }

        .id-tag {
          font-family: monospace;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          color: #c084fc;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
        }

        .truncate {
          max-width: 250px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dim {
          color: #6b7280;
          font-style: italic;
        }

        .btn-table-copy {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.25);
          color: #c084fc;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-table-copy:hover {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
        }

        .btn-table-copy.copied {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.3);
          color: #4ade80;
        }

        .btn-table-analytics {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #818cf8;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-table-analytics:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
        }

        @media (max-width: 768px) {
          .info-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
          .stats-grid {
            width: 100%;
            justify-content: space-between;
          }
          .links-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .search-bar-wrapper {
            max-width: 100%;
          }
          .profile-header h1 {
            font-size: 2.1rem;
          }
          .card {
            padding: 25px 20px;
          }
        }
      `}</style>
    </div>
  );
}

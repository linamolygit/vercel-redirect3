import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserEmail(data.user.email);
            setUserName(data.user.name || null);
            setUserUsername(data.user.username || null);
          }
        }
      } catch (err) {
        console.error("Header auth fetch failed:", err);
      }
    };
    fetchUser();
  }, [router.pathname]);

  const handleSignout = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      setUserEmail(null);
      setUserName(null);
      setUserUsername(null);
      router.push("/login");
    } catch (err) {
      console.error("Signout failed:", err);
    }
  };

  return (
    <header>
      {/* Brand Logo */}
      <Link href="/">
        <a className="logo">
          <svg className="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="logo-text">LinkPika</span>
        </a>
      </Link>

      {/* Navigation Items (Centered or beside logo based on screen size) */}
      <nav className="nav-links">
        <Link href="/">
          <a className={`nav-item ${router.pathname === "/" ? "active" : ""}`}>Dashboard</a>
        </Link>
        <Link href="/fb-dark-post">
          <a className={`nav-item ${router.pathname === "/fb-dark-post" ? "active" : ""}`}>🚀 FB Dark Post</a>
        </Link>
        <Link href="/clickable-image">
          <a className={`nav-item ${router.pathname === "/clickable-image" ? "active" : ""}`}>Mockup Gen</a>
        </Link>
        <a
          href="/fb_play_mockups.html"
          className={`nav-item nav-item-play ${router.pathname === "/fb_play_mockups.html" ? "active" : ""}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="15" height="15">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z" />
          </svg>
          Mockup
        </a>
        <Link href="/analytics">
          <a className={`nav-item ${router.pathname === "/analytics" ? "active" : ""}`}>Analytics</a>
        </Link>
        <Link href="/pricing">
          <a className={`nav-item ${router.pathname === "/pricing" ? "active" : ""}`}>Pricing</a>
        </Link>
      </nav>

      {/* User Auth & Theme Section */}
      <div className="header-actions">
        {/* Facebook Account Setup Button */}
        <Link href="/fb-connect">
          <a className="fb-connect-btn" title="Facebook Account Setup & Token Manager">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span className="fb-btn-text">FB Connect</span>
          </a>
        </Link>

        {/* Theme Toggle Button (Sun/Moon variant) */}
        <label className="theme-switch main-theme-toggle" title="Toggle Theme">
          <input 
            type="checkbox" 
            id="themeToggle" 
            checked={isDarkMode}
            onChange={(e) => toggleTheme(e.target.checked)}
          />
          <span className="slider">
            {/* Sun icon (visible in light mode) */}
            <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {/* Moon icon (visible in dark mode) */}
            <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </span>
        </label>

        {userEmail ? (
          <div className="user-profile">
            <Link href="/profile">
              <a className="profile-badge-link" title="View Profile Dashboard">
                <span className="profile-badge">
                  <span className="user-text">{userName || userEmail.split('@')[0]}</span>
                </span>
              </a>
            </Link>
            <button onClick={handleSignout} className="btn-secondary" style={{ padding: '8px 12px', fontSize: '13px' }}>
              Logout
            </button>
          </div>
        ) : (
          <div className="guest-profile">
            <Link href="/login">
              <a className="btn-secondary" style={{ padding: '8px 16px' }}>Sign In</a>
            </Link>
            <Link href="/signup">
              <a className="btn-primary" style={{ padding: '8px 16px' }}>Sign Up</a>
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        header {
          height: 70px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 30px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-bottom: 1px solid var(--glass-border);
          box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-main);
        }

        .logo-icon {
          width: 24px;
          height: 24px;
          color: var(--primary);
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .nav-item {
          color: var(--text-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
        }

        .nav-item:hover {
          color: var(--text-main);
          background: var(--btn-hover);
        }

        .nav-item.active {
          color: var(--primary);
          background: rgba(0, 113, 227, 0.08); /* slight primary tint */
        }

        .nav-item-play {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(0, 113, 227, 0.08);
          border: 1px solid rgba(0, 113, 227, 0.25);
          color: var(--primary) !important;
        }

        .nav-item-play:hover {
          background: rgba(0, 113, 227, 0.15) !important;
          border-color: var(--primary) !important;
          color: var(--primary-hover) !important;
          box-shadow: 0 0 10px rgba(0, 113, 227, 0.2);
        }

        .nav-item-play svg {
          flex-shrink: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .fb-connect-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(24, 119, 242, 0.08);
          border: 1px solid rgba(24, 119, 242, 0.25);
          color: #1877f2;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .fb-connect-btn:hover {
          background: rgba(24, 119, 242, 0.16);
          box-shadow: 0 0 12px rgba(24, 119, 242, 0.25);
          transform: translateY(-1px);
        }

        .user-profile, .guest-profile {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile-badge-link {
          text-decoration: none;
        }

        .profile-badge {
          display: flex;
          align-items: center;
          background: var(--btn-hover);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          border: 1px solid var(--glass-border);
          transition: 0.2s;
        }
        .profile-badge:hover {
          border-color: var(--primary);
        }

        @media (max-width: 900px) {
          .nav-links {
            position: static;
            transform: none;
            gap: 10px;
          }
          .logo-text {
            display: none;
          }
        }
        
        @media (max-width: 600px) {
          header { padding: 0 15px; }
          .nav-links { display: none; } /* On very small screens, maybe need a hamburger, but keeping it simple for now */
        }
      `}</style>
    </header>
  );
}

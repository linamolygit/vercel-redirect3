import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userUsername, setUserUsername] = useState<string | null>(null);
  const [theme, setTheme] = useState("dark");
  const router = useRouter();

  useEffect(() => {
    // Initial theme load
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    if (savedTheme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }

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

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "light") {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  };

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
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand Logo */}
        <Link href="/">
          <a className="logo">
            <svg className="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="logo-text">LinkPika</span>
          </a>
        </Link>

        {/* Navigation Items */}
        <nav className="nav-links">
          <Link href="/">
            <a className={`nav-item ${router.pathname === "/" ? "active" : ""}`}>
              <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
              </svg>
              Dashboard
            </a>
          </Link>
          <Link href="/clickable-image">
            <a className={`nav-item ${router.pathname === "/clickable-image" ? "active" : ""}`}>
              <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              + Clickable Image
            </a>
          </Link>
          <Link href="/pricing">
            <a className={`nav-item ${router.pathname === "/pricing" ? "active" : ""}`}>
              <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pricing
            </a>
          </Link>
          <Link href="/contact">
            <a className={`nav-item ${router.pathname === "/contact" ? "active" : ""}`}>
              <svg className="nav-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact
            </a>
          </Link>
        </nav>

        {/* User Auth Section */}
        <div className="auth-section">
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Light/Dark Theme">
            {theme === "dark" ? (
              <svg className="theme-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="theme-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {userEmail ? (
            <div className="user-profile">
              <Link href="/profile">
                <a className="profile-badge-link" title="View Profile Dashboard">
                  <span className="profile-badge">
                    <svg className="badge-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="user-text">{userName || userEmail}</span>
                  </span>
                </a>
              </Link>
              <button onClick={handleSignout} className="btn-signout">
                Logout
              </button>
            </div>
          ) : (
            <div className="guest-profile">
              <span className="guest-badge">Guest Mode</span>
              <Link href="/login">
                <a className="btn-signin">Sign In</a>
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .navbar {
          width: 100%;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(7, 2, 21, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 15px 0;
        }

        .navbar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #f3f4f6;
        }

        .logo-icon {
          width: 28px;
          height: 28px;
          color: #a855f7;
          filter: drop-shadow(0 0 8px rgba(168, 85, 247, 0.5));
        }

        .logo-text {
          font-size: 1.4rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff 0%, #a855f7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 25px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #9ca3af;
          text-decoration: none;
          font-size: 0.95rem;
          font-weight: 600;
          transition: all 0.25s ease;
          padding: 6px 12px;
          border-radius: 8px;
        }

        .nav-item:hover {
          color: #f3f4f6;
          background: rgba(255, 255, 255, 0.03);
        }

        .nav-item.active {
          color: #c084fc;
          background: rgba(168, 85, 247, 0.08);
        }

        .nav-icon {
          width: 18px;
          height: 18px;
        }

        .auth-section {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .theme-toggle-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #9ca3af;
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-toggle-btn:hover {
          color: #f3f4f6;
          background: rgba(255, 255, 255, 0.08);
          transform: scale(1.05);
        }

        .theme-icon {
          width: 18px;
          height: 18px;
        }

        .user-profile,
        .guest-profile {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .profile-badge-link {
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .profile-badge-link:hover {
          transform: translateY(-1px);
        }

        .profile-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.2);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          color: #c084fc;
          max-width: 180px;
        }

        .badge-icon {
          width: 15px;
          height: 15px;
        }

        .user-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .guest-badge {
          font-size: 0.85rem;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.04);
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .btn-signout {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 600;
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
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          border: none;
          color: #fff;
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
        }

        .btn-signin:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(168, 85, 247, 0.45);
        }

        @media (max-width: 768px) {
          .navbar-container {
            flex-direction: column;
            gap: 15px;
            padding: 10px 15px;
          }

          .nav-links {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
          }

          .nav-item {
            font-size: 0.85rem;
            padding: 5px 10px;
          }

          .auth-section {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </header>
  );
}

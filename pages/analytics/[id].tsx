import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../../components/Header";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#06b6d4'];

const PLATFORM_ICONS: Record<string, string> = {
  Facebook: "https://www.google.com/s2/favicons?domain=facebook.com&sz=32",
  Instagram: "https://www.google.com/s2/favicons?domain=instagram.com&sz=32",
  Twitter: "https://www.google.com/s2/favicons?domain=twitter.com&sz=32",
  LinkedIn: "https://www.google.com/s2/favicons?domain=linkedin.com&sz=32",
  Google: "https://www.google.com/s2/favicons?domain=google.com&sz=32",
  YouTube: "https://www.google.com/s2/favicons?domain=youtube.com&sz=32",
  WhatsApp: "https://www.google.com/s2/favicons?domain=whatsapp.com&sz=32",
  Telegram: "https://www.google.com/s2/favicons?domain=telegram.org&sz=32",
  Direct: "",
};

function getFaviconUrl(referrer: string): string {
  if (!referrer) return "";
  try {
    const domain = new URL(referrer.startsWith("http") ? referrer : `https://${referrer}`).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

function getPlatformFavicon(platform: string, referrer?: string): string {
  if (PLATFORM_ICONS[platform] !== undefined) return PLATFORM_ICONS[platform] || "";
  return getFaviconUrl(platform);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(20,15,40,0.95)',
        border: '1px solid rgba(168,85,247,0.3)',
        borderRadius: '10px',
        padding: '10px 16px',
        color: '#f3f4f6',
        fontSize: '0.85rem',
      }}>
        <p style={{ margin: 0, color: '#9ca3af', marginBottom: '4px' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ margin: 0, color: p.color || '#a855f7', fontWeight: 700 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AnalyticsDashboard: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchAnalytics = async (shortId: string) => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`/api/analytics/${shortId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || "Failed to load analytics");
        return;
      }
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setSearchInput(id as string);
    fetchAnalytics(id as string);
  }, [id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const val = searchInput.trim();
    if (!val) return;
    // Extract short_id from full URL if pasted
    let shortId = val;
    try {
      if (val.includes("/")) {
        const parts = val.replace(/https?:\/\//, "").split("/");
        shortId = parts[parts.length - 1] || parts[parts.length - 2];
      }
    } catch {}
    router.push(`/analytics/${shortId}`);
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <p className="stat-label">{title}</p>
        <h2 className="stat-value">{value}</h2>
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="empty-state">
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#6b7280' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p>{message}</p>
    </div>
  );

  return (
    <div className="page-wrapper">
      <Head>
        <title>Analytics — {id || "Dashboard"} | WP Link Converter</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <Header />

      <div className="dashboard-layout">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-left">
            <Link href="/profile">
              <a className="btn-back">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </a>
            </Link>
            <div>
              <h1 className="page-title">
                Analytics
                {id && <span className="link-badge">/{id}</span>}
              </h1>
              <p className="page-subtitle">Detailed performance insights for your link</p>
            </div>
          </div>

          {/* Search Box */}
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="search-icon-svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Enter short ID or full URL..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="btn-search">Check Analytics</button>
          </form>
        </div>

        {/* Architecture Info Banner */}
        <div className="arch-banner">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#a855f7" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>How tracking works:</strong> Every click on your short link is intercepted server-side (SSR). The system captures IP, User-Agent, Referrer, Country (via Vercel/Cloudflare headers), Device type, Browser, OS and Platform — all before redirecting the visitor. Crawlers (Facebook, Google, etc.) are excluded from counts.
          </span>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="error-box">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <h3>Could not load analytics</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={() => id && fetchAnalytics(id as string)}>Retry</button>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stats-grid">
              <StatCard
                title="Total Clicks"
                value={data?.totalVisits ?? 0}
                color="purple"
                icon={
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                }
              />
              <StatCard
                title="Countries Reached"
                value={data?.topCountries?.length ?? 0}
                color="blue"
                icon={
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                }
              />
              <StatCard
                title="Platforms"
                value={data?.platforms?.length ?? 0}
                color="pink"
                icon={
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                }
              />
              <StatCard
                title="Top Device"
                value={data?.devices?.[0]?.device || "N/A"}
                color="green"
                icon={
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            {/* Clicks Over Time Chart */}
            <div className="chart-card full">
              <h3 className="chart-title">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Clicks Over Time
              </h3>
              {data?.visitsByDate?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.visitsByDate} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" name="Clicks" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4 }} activeDot={{ r: 6, fill: '#c084fc' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No click data yet. Share your link to start tracking!" />
              )}
            </div>

            {/* Two-col charts */}
            <div className="charts-row">
              {/* Top Countries */}
              <div className="chart-card">
                <h3 className="chart-title">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Top Countries
                </h3>
                {data?.topCountries?.length > 0 ? (
                  <div className="list-stats">
                    {data.topCountries.slice(0, 8).map((c: any, i: number) => {
                      const maxCount = data.topCountries[0]?.count || 1;
                      return (
                        <div className="list-item" key={i}>
                          <span className="list-item-label">
                            <span className="rank">#{i + 1}</span>
                            {c.country || "Unknown"}
                          </span>
                          <div className="list-item-bar-wrap">
                            <div className="list-item-bar" style={{ width: `${(c.count / maxCount) * 100}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                          <span className="list-item-count">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState message="No country data yet." />
                )}
              </div>

              {/* Platforms Pie */}
              <div className="chart-card">
                <h3 className="chart-title">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Traffic Sources
                </h3>
                {data?.platforms?.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={data.platforms} dataKey="count" nameKey="platform" cx="50%" cy="50%" outerRadius={75} paddingAngle={3}>
                          {data.platforms.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(20,15,40,0.95)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '8px', color: '#f3f4f6' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="platform-list">
                      {data.platforms.map((p: any, i: number) => (
                        <div key={i} className="platform-item">
                          {getPlatformFavicon(p.platform) ? (
                            <img src={getPlatformFavicon(p.platform)} width={18} height={18} alt={p.platform} style={{ borderRadius: '4px' }} onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                          )}
                          <span className="platform-name">{p.platform}</span>
                          <span className="platform-count">{p.count} clicks</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState message="No platform data yet." />
                )}
              </div>
            </div>

            {/* Referrers & Devices */}
            <div className="charts-row">
              {/* Referrers */}
              <div className="chart-card">
                <h3 className="chart-title">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Top Referrers
                </h3>
                {data?.referrers?.length > 0 ? (
                  <div className="referrer-list">
                    {data.referrers.map((r: any, i: number) => (
                      <div className="referrer-item" key={i}>
                        <div className="referrer-left">
                          {getFaviconUrl(r.referrer) ? (
                            <img src={getFaviconUrl(r.referrer)} width={16} height={16} alt="" style={{ borderRadius: '3px' }} onError={e => (e.currentTarget.style.display = 'none')} />
                          ) : (
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#6b7280" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3" />
                            </svg>
                          )}
                          <span className="referrer-name" title={r.referrer}>
                            {r.referrer.length > 40 ? r.referrer.slice(0, 40) + "…" : r.referrer}
                          </span>
                        </div>
                        <span className="referrer-count">{r.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No referrer data yet." />
                )}
              </div>

              {/* Devices */}
              <div className="chart-card">
                <h3 className="chart-title">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Devices & Browsers
                </h3>
                {data?.devices?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.devices} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis dataKey="device" type="category" tick={{ fill: '#9ca3af', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Clicks" radius={[0, 6, 6, 0]}>
                        {data.devices.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="No device data yet." />
                )}
              </div>
            </div>

            {/* Recent Visits Table */}
            {data?.recentVisits?.length > 0 && (
              <div className="chart-card full">
                <h3 className="chart-title">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Clicks
                </h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Country</th>
                        <th>Platform</th>
                        <th>Device</th>
                        <th>Referrer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentVisits.map((v: any, i: number) => (
                        <tr key={i}>
                          <td>{new Date(v.created_at).toLocaleString()}</td>
                          <td>{v.country || "Unknown"}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {getPlatformFavicon(v.platform) ? (
                                <img src={getPlatformFavicon(v.platform)} width={14} height={14} alt="" style={{ borderRadius: '3px' }} />
                              ) : null}
                              {v.platform || "Direct"}
                            </span>
                          </td>
                          <td>{v.device_type || "Desktop"}</td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {v.referrer ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {getFaviconUrl(v.referrer) && (
                                  <img src={getFaviconUrl(v.referrer)} width={14} height={14} alt="" style={{ borderRadius: '3px' }} />
                                )}
                                <span title={v.referrer}>{v.referrer.slice(0, 35)}{v.referrer.length > 35 ? "…" : ""}</span>
                              </span>
                            ) : "Direct"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        body { background: var(--bg); color: var(--text); margin: 0; }
        
        .page-wrapper {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Outfit', sans-serif;
        }

        .dashboard-layout {
          max-width: 1240px;
          margin: 0 auto;
          padding: 30px 24px 60px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          flex-wrap: wrap;
        }

        .page-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          background: var(--card-bg, rgba(255,255,255,0.05));
          border: 1px solid var(--card-border, rgba(255,255,255,0.1));
          border-radius: 10px;
          color: var(--text-muted, #9ca3af);
          font-weight: 600;
          text-decoration: none;
          font-size: 0.875rem;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-back:hover {
          color: var(--text);
          border-color: rgba(168,85,247,0.4);
        }

        .page-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .link-badge {
          background: rgba(168,85,247,0.12);
          border: 1px solid rgba(168,85,247,0.25);
          color: #c084fc;
          font-size: 1rem;
          padding: 2px 10px;
          border-radius: 8px;
          font-weight: 700;
        }

        .page-subtitle {
          margin: 4px 0 0;
          color: var(--text-muted, #9ca3af);
          font-size: 0.9rem;
        }

        /* Search */
        .search-form {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .search-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon-svg {
          position: absolute;
          left: 12px;
          color: #6b7280;
          pointer-events: none;
        }

        .search-input {
          background: var(--card-bg, rgba(255,255,255,0.05));
          border: 1px solid var(--card-border, rgba(255,255,255,0.1));
          color: var(--text);
          border-radius: 10px;
          padding: 10px 16px 10px 40px;
          font-size: 0.9rem;
          font-family: 'Outfit', sans-serif;
          width: 280px;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          border-color: rgba(168,85,247,0.5);
        }

        .search-input::placeholder { color: #6b7280; }

        .btn-search {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: #fff;
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-search:hover { opacity: 0.9; transform: translateY(-1px); }

        /* Architecture Banner */
        .arch-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(168,85,247,0.05);
          border: 1px solid rgba(168,85,247,0.15);
          border-radius: 12px;
          font-size: 0.85rem;
          color: var(--text-muted, #9ca3af);
          line-height: 1.5;
        }

        .arch-banner strong { color: var(--text); }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .stat-card {
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(255,255,255,0.08));
          border-radius: 16px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
        }

        .stat-card:hover { transform: translateY(-2px); }

        .stat-purple { border-color: rgba(168,85,247,0.25); background: rgba(168,85,247,0.06); }
        .stat-blue { border-color: rgba(99,102,241,0.25); background: rgba(99,102,241,0.06); }
        .stat-pink { border-color: rgba(236,72,153,0.25); background: rgba(236,72,153,0.06); }
        .stat-green { border-color: rgba(16,185,129,0.25); background: rgba(16,185,129,0.06); }

        .stat-purple .stat-icon { color: #c084fc; }
        .stat-blue .stat-icon { color: #818cf8; }
        .stat-pink .stat-icon { color: #f472b6; }
        .stat-green .stat-icon { color: #34d399; }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted, #9ca3af);
          margin: 0 0 4px;
          font-weight: 500;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text);
          margin: 0;
          line-height: 1;
        }

        /* Charts */
        .chart-card {
          background: var(--card-bg, rgba(255,255,255,0.04));
          border: 1px solid var(--card-border, rgba(255,255,255,0.08));
          border-radius: 18px;
          padding: 24px;
        }

        .chart-card.full { width: 100%; }

        .charts-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .chart-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 20px;
        }

        /* List Stats (Countries) */
        .list-stats { display: flex; flex-direction: column; gap: 10px; }

        .list-item {
          display: grid;
          grid-template-columns: 140px 1fr 40px;
          align-items: center;
          gap: 10px;
          font-size: 0.875rem;
        }

        .list-item-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank {
          font-size: 0.7rem;
          color: #6b7280;
          min-width: 22px;
        }

        .list-item-bar-wrap {
          background: rgba(255,255,255,0.05);
          border-radius: 99px;
          height: 6px;
          overflow: hidden;
        }

        .list-item-bar {
          height: 100%;
          border-radius: 99px;
          transition: width 0.5s ease;
        }

        .list-item-count {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted, #9ca3af);
          text-align: right;
        }

        /* Platform List */
        .platform-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }

        .platform-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
        }

        .platform-name { flex: 1; color: var(--text); }
        .platform-count { color: var(--text-muted, #9ca3af); font-weight: 700; font-size: 0.8rem; }

        /* Referrers */
        .referrer-list { display: flex; flex-direction: column; gap: 8px; }

        .referrer-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          gap: 10px;
        }

        .referrer-left { display: flex; align-items: center; gap: 8px; overflow: hidden; }
        .referrer-name { font-size: 0.8rem; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .referrer-count { font-size: 0.8rem; font-weight: 700; color: #a855f7; white-space: nowrap; }

        /* Table */
        .table-wrap { overflow-x: auto; }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .data-table th {
          padding: 10px 14px;
          text-align: left;
          color: var(--text-muted, #9ca3af);
          font-weight: 600;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .data-table td {
          padding: 10px 14px;
          color: var(--text);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .data-table tr:hover td { background: rgba(255,255,255,0.02); }
        .data-table tr:last-child td { border-bottom: none; }

        /* Loader */
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(168,85,247,0.15);
          border-left-color: #a855f7;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Error */
        .error-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 60px 20px;
          gap: 14px;
          text-align: center;
        }

        .error-box h3 { font-size: 1.4rem; color: var(--text); margin: 0; }
        .error-box p { color: #9ca3af; margin: 0; max-width: 380px; }

        .btn-retry {
          background: rgba(168,85,247,0.1);
          border: 1px solid rgba(168,85,247,0.3);
          color: #c084fc;
          padding: 9px 20px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all 0.2s;
        }

        .btn-retry:hover { background: rgba(168,85,247,0.2); }

        /* Empty State */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 0.9rem;
          text-align: center;
          min-height: 160px;
        }

        /* Light theme overrides */
        .light-theme .data-table th { border-bottom-color: rgba(0,0,0,0.08); }
        .light-theme .data-table td { border-bottom-color: rgba(0,0,0,0.04); }
        .light-theme .data-table tr:hover td { background: rgba(0,0,0,0.02); }
        .light-theme .list-item-bar-wrap { background: rgba(0,0,0,0.06); }
        .light-theme .platform-item, .light-theme .referrer-item { background: rgba(0,0,0,0.03); }

        /* Responsive */
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .charts-row { grid-template-columns: 1fr; }
          .page-header { flex-direction: column; }
          .search-form { width: 100%; }
          .search-input { width: 100%; }
        }

        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .page-header-left { flex-wrap: wrap; }
          .dashboard-layout { padding: 20px 14px 40px; gap: 16px; }
        }
      `}</style>
    </div>
  );
};

export default AnalyticsDashboard;

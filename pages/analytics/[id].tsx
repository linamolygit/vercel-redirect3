import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const AnalyticsDashboard: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/analytics/${id}`);
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [id, router]);

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
        <p>Loading Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h1>Error</h1>
        <p>{error}</p>
        <Link href="/profile"><a className="btn-back">Go Back</a></Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Analytics - {id} | WP Link Converter</title>
      </Head>
      <div className="dashboard-layout">
        <header className="dashboard-header">
          <Link href="/profile">
            <a className="btn-back">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </Link>
          <div className="header-title">
            <h1>Analytics for <span>/{id}</span></h1>
            <p>Detailed performance insights for your link</p>
          </div>
        </header>

        <div className="metrics-grid">
          <div className="metric-card hero-metric">
            <h3>Total Clicks</h3>
            <h2>{data?.totalVisits || 0}</h2>
            <div className="metric-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-card full-width">
            <h3>Clicks Over Time</h3>
            <div className="chart-wrapper">
              {data?.visitsByDate?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.visitsByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text)' }}
                      itemStyle={{ color: '#a855f7' }}
                    />
                    <Line type="monotone" dataKey="count" name="Clicks" stroke="url(#colorUv)" strokeWidth={3} dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#6366f1" />
                        <stop offset="95%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data">No data available yet</div>
              )}
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-card half-width">
              <h3>Top Platforms</h3>
              <div className="chart-wrapper">
                {data?.platforms?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.platforms}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="platform"
                      >
                        {data.platforms.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)', fontSize: '13px' }}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No data available yet</div>
                )}
              </div>
            </div>

            <div className="chart-card half-width">
              <h3>Top Devices</h3>
              <div className="chart-wrapper">
                {data?.devices?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.devices} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="device" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text)' }}
                      />
                      <Bar dataKey="count" name="Clicks" fill="#ec4899" radius={[0, 4, 4, 0]}>
                        {data.devices.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No data available yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="chart-row">
            <div className="chart-card half-width">
              <h3>Top Countries</h3>
              <div className="list-wrapper">
                {data?.topCountries?.length > 0 ? (
                  <ul className="stats-list">
                    {data.topCountries.map((c: any, i: number) => (
                      <li key={i}>
                        <span className="stat-label">
                          {c.country === "Unknown" ? (
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          ) : (
                            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          )}
                          {c.country}
                        </span>
                        <span className="stat-value">{c.count} clicks</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-data">No data available yet</div>
                )}
              </div>
            </div>

            <div className="chart-card half-width">
              <h3>Top Referrers</h3>
              <div className="list-wrapper">
                {data?.referrers?.length > 0 ? (
                  <ul className="stats-list">
                    {data.referrers.map((r: any, i: number) => (
                      <li key={i}>
                        <span className="stat-label">
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          {r.referrer}
                        </span>
                        <span className="stat-value">{r.count} clicks</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="no-data">No data available yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .dashboard-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .dashboard-header {
          display: flex;
          align-items: center;
          gap: 30px;
          margin-bottom: 40px;
        }

        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          color: var(--text-muted);
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .btn-back:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .header-title h1 {
          font-size: 2.2rem;
          margin: 0 0 6px 0;
          color: var(--text);
        }

        .header-title h1 span {
          color: #a855f7;
        }

        .header-title p {
          margin: 0;
          color: var(--text-muted);
          font-size: 1rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr;
          margin-bottom: 30px;
        }

        .metric-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 30px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .hero-metric {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%);
          border-color: rgba(168, 85, 247, 0.3);
        }

        .metric-card h3 {
          font-size: 1.1rem;
          color: var(--text-muted);
          margin: 0 0 10px 0;
          font-weight: 500;
        }

        .metric-card h2 {
          font-size: 3.5rem;
          font-weight: 800;
          color: var(--text);
          margin: 0;
          line-height: 1;
        }

        .metric-icon {
          position: absolute;
          right: 30px;
          top: 50%;
          transform: translateY(-50%);
          width: 80px;
          height: 80px;
          color: rgba(168, 85, 247, 0.2);
        }

        .charts-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .chart-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 768px) {
          .chart-row {
            grid-template-columns: 1fr;
          }
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
        }

        .chart-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          padding: 24px;
        }

        .chart-card h3 {
          margin: 0 0 20px 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: var(--text);
        }

        .chart-wrapper, .list-wrapper {
          width: 100%;
          min-height: 250px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .no-data {
          color: var(--text-muted);
          font-style: italic;
        }

        .stats-list {
          list-style: none;
          padding: 0;
          margin: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .stats-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: transform 0.2s;
        }
        
        .light-theme .stats-list li {
          background: rgba(0,0,0,0.02);
          border-color: rgba(0,0,0,0.05);
        }

        .stats-list li:hover {
          transform: translateX(4px);
          border-color: rgba(168, 85, 247, 0.3);
        }

        .stat-label {
          font-weight: 500;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-value {
          font-weight: 600;
          color: #a855f7;
          background: rgba(168, 85, 247, 0.1);
          padding: 4px 12px;
          border-radius: 99px;
          font-size: 0.9rem;
        }

        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 70vh;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-left-color: #a855f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        .light-theme .spinner {
          border-color: rgba(0,0,0,0.1);
          border-left-color: #a855f7;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .error-container {
          text-align: center;
          padding: 100px 20px;
        }

        .error-container h1 { color: #ef4444; }
      `}</style>
    </>
  );
};

export default AnalyticsDashboard;

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import Header from "../../components/Header";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'];

const GlobalAnalytics: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/analytics/global`);
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        if (!res.ok) throw new Error("Failed to load global analytics");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [router]);

  if (loading) {
    return (
      <div className="wrapper">
        <Header />
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Loading Global Analytics...</p>
        </div>
        <style jsx>{`
          .wrapper { min-height: 100vh; background: var(--bg); color: var(--text); }
          .loader-container { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 70vh; }
          .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-left-color: #a855f7; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
          .light-theme .spinner { border-color: rgba(0,0,0,0.1); border-left-color: #a855f7; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <Head>
        <title>Global Analytics | WP Link Converter</title>
      </Head>
      <Header />
      
      <div className="dashboard-layout">
        <header className="dashboard-header">
          <div className="header-title">
            <h1>Global <span>Analytics</span></h1>
            <p>Overall performance insights across all your links</p>
          </div>
        </header>

        <div className="metrics-grid">
          <div className="metric-card hero-metric">
            <h3>Total Lifetime Clicks</h3>
            <h2>{data?.totalVisits || 0}</h2>
            <div className="metric-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="metric-card secondary-metric">
            <h3>Active Links</h3>
            <h2>{data?.totalLinks || 0}</h2>
            <div className="metric-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-row">
            <div className="chart-card half-width">
              <h3>Top Performing Links</h3>
              <div className="chart-wrapper">
                {data?.topLinks?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.topLinks} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis dataKey="short_id" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text)' }}
                      />
                      <Bar dataKey="count" name="Clicks" fill="#a855f7" radius={[0, 4, 4, 0]}>
                        {data.topLinks.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No data available yet</div>
                )}
              </div>
            </div>

            <div className="chart-card half-width">
              <h3>Overall Top Platforms</h3>
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
          </div>
        </div>
      </div>

      <style jsx global>{`
        .wrapper {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Outfit', sans-serif;
        }

        .dashboard-layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .dashboard-header {
          margin-bottom: 40px;
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
          grid-template-columns: 1fr 1fr;
          gap: 24px;
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
        
        .secondary-metric {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
          border-color: rgba(16, 185, 129, 0.3);
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
        
        .secondary-metric .metric-icon {
          color: rgba(16, 185, 129, 0.2);
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
          .chart-row, .metrics-grid {
            grid-template-columns: 1fr;
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

        .chart-wrapper {
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
      `}</style>
    </div>
  );
};

export default GlobalAnalytics;

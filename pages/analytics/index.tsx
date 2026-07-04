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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading Global Analytics...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Head>
        <title>Global Analytics | LinkPika</title>
      </Head>
      <Header />
      
      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', flex: 1, width: '100%' }}>
        <header style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 10px 0', color: 'var(--text-main)' }}>
            Global <span style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Overall performance insights across all your links</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '30px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', borderColor: 'rgba(168, 85, 247, 0.3)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-muted)', margin: '0 0 10px 0', fontWeight: '600' }}>Total Lifetime Clicks</h3>
            <h2 style={{ fontSize: '56px', fontWeight: '800', color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>{data?.totalVisits || 0}</h2>
            <div style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', width: '80px', height: '80px', color: 'rgba(168, 85, 247, 0.2)' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '30px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--text-muted)', margin: '0 0 10px 0', fontWeight: '600' }}>Active Links</h3>
            <h2 style={{ fontSize: '56px', fontWeight: '800', color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>{data?.totalLinks || 0}</h2>
            <div style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', width: '80px', height: '80px', color: 'rgba(16, 185, 129, 0.2)' }}>
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 className="section-title">Top Performing Links</h3>
            <div style={{ width: '100%', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {data?.topLinks?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.topLinks} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="short_id" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 13 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(128,128,128,0.1)' }}
                      contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)', backdropFilter: 'blur(12px)' }}
                    />
                    <Bar dataKey="count" name="Clicks" fill="#a855f7" radius={[0, 4, 4, 0]}>
                      {data.topLinks.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No data available yet</div>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 className="section-title">Overall Top Platforms</h3>
            <div style={{ width: '100%', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      contentStyle={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)', backdropFilter: 'blur(12px)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)', fontSize: '13px' }}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No data available yet</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GlobalAnalytics;

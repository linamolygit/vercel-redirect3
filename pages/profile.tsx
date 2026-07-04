import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import EditLinkModal from "../components/EditLinkModal";

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
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        Loading Profile...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Head>
        <title>User Profile — LinkPika</title>
        <meta name="description" content="View and manage all your generated short links" />
      </Head>

      <Header />

      <main style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '30px', flex: 1, width: '100%' }}>
        <header style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', margin: '0 0 10px 0', background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            My Profile Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Manage your account details and generated social redirects.</p>
        </header>

        {/* User Card */}
        <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '30px', padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold' }}>
              {userName ? userName.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', color: 'var(--text-main)' }}>{userName || userEmail}</h2>
              {userUsername && <span style={{ color: 'var(--primary)', fontSize: '14px', display: 'block', marginTop: '4px' }}>@{userUsername}</span>}
              <span style={{ display: 'inline-block', fontSize: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '4px 12px', borderRadius: '12px', marginTop: '8px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                PRO Member
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '16px', minWidth: '160px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', display: 'block' }}>{links.length}</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Redirects Created</span>
            </div>
            <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '20px', borderRadius: '16px', minWidth: '160px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)', display: 'block' }}>Active</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>System Status</span>
            </div>
          </div>
        </div>

        {/* Redirects Datatable */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Your Redirect Links</h2>
            <div className="control-row" style={{ minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search links by title or URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loadingLinks ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading redirect list...</p>
          ) : filteredLinks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>No redirects found. Convert your first link on the homepage!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Short ID</th>
                    <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Original URL</th>
                    <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Custom Title</th>
                    <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Created</th>
                    <th style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => {
                    const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
                    const proto = typeof window !== "undefined" ? window.location.protocol : "http:";
                    const fullShortLink = `${proto}//${host}/${link.short_id}`;

                    return (
                      <tr key={link.id}>
                        <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                          <span style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 'bold' }}>{link.short_id}</span>
                        </td>
                        <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                          <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', fontSize: '14px' }} title={link.original_url}>
                            {link.original_url}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                          <div style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)', fontSize: '14px' }} title={link.custom_title || "N/A"}>
                            {link.custom_title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No custom title</span>}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)', fontSize: '14px' }}>
                          {new Date(link.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)' }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => copyToClipboard(fullShortLink, link.id)}
                            >
                              {copiedId === link.id ? "Copied!" : "Copy Link"}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setEditingLink(link)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ color: 'var(--primary)', borderColor: 'rgba(168, 85, 247, 0.3)' }}
                              onClick={() => router.push(`/analytics/${link.short_id}`)}
                            >
                              Analytics
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

      <EditLinkModal 
        isOpen={!!editingLink} 
        link={editingLink} 
        onClose={() => setEditingLink(null)} 
        onSuccess={(updatedLink) => {
          // Update in local state
          const newLinks = links.map(l => l.id === updatedLink.id ? updatedLink : l);
          setLinks(newLinks);
        }} 
      />
    </div>
  );
}

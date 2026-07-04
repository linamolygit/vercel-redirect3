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
            fetchHistory();
          } else {
            const localLinks = localStorage.getItem("guest_links");
            if (localLinks) setHistory(JSON.parse(localLinks));
          }
        } else {
          const localLinks = localStorage.getItem("guest_links");
          if (localLinks) setHistory(JSON.parse(localLinks));
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        const localLinks = localStorage.getItem("guest_links");
        if (localLinks) setHistory(JSON.parse(localLinks));
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

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

  const handleFetchMetadata = async () => {
    if (!wpUrl) {
      setErrorMessage("Please enter a WordPress Post URL first.");
      return;
    }
    setFetchingMeta(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/fetch-wp?url=${encodeURIComponent(wpUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error fetching WordPress details.");
      
      setCustomTitle(data.title || "");
      setCustomDesc(data.excerpt || "");
      setCustomImg(data.imageUrl || "");
      setWpPostPath(data.postPath || "");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to fetch WordPress details. Check if WPGraphQL is active.");
    } finally {
      setFetchingMeta(false);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl) {
      setErrorMessage("Please enter a WordPress Post URL.");
      return;
    }

    setConverting(true);
    setErrorMessage("");
    setResultUrl("");
    try {
      const res = await fetch("/api/create-redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: wpUrl,
          wpPostPath: wpPostPath,
          customTitle: customTitle,
          customDesc: customDesc,
          customImage: customImg,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error converting link.");

      setResultUrl(data.shortLink);
      
      if (userEmail) {
        fetchHistory();
      } else {
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
      setErrorMessage(err.message || "Failed to save link.");
    } finally {
      setConverting(false);
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const mockEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleImageUpload(mockEvent);
    }
  };

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
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Image upload failed.");

      setCustomImg(data.data.url);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "ImgBB upload error.");
    } finally {
      setUploadingImage(false);
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
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
        Loading session...
      </div>
    );
  }

  const filteredHistory = history.filter((link) => {
    const term = searchQuery.toLowerCase();
    return (
      link.short_id.toLowerCase().includes(term) ||
      link.original_url.toLowerCase().includes(term) ||
      (link.custom_title || "").toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Head>
        <title>Dashboard — LinkPika</title>
      </Head>

      <Header />

      {/* Studio Layout */}
      <div className="studio-layout">
        
        {/* Left Sidebar */}
        <aside className="sidebar glass-panel" style={{ margin: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              {userName ? userName.substring(0, 2).toUpperCase() : "GU"}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-main)' }}>{userName || "Guest User"}</h3>
              {userUsername ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{userUsername}</span>
              ) : (
                <span style={{ fontSize: '12px', background: 'var(--primary)', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>Limited Access</span>
              )}
            </div>
          </div>

          <div className="section-title">Redirect Links 🔗</div>
          <div className="control-row" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '32px' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No redirects generated yet.</p>
            ) : filteredHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>No matching redirects found.</p>
            ) : (
              filteredHistory.map((link) => {
                const host = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
                const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
                const fullShortLink = `${protocol}//${host}/${link.short_id}`;
                const isCopied = copiedId === link.id;

                return (
                  <div key={link.id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <strong style={{ color: 'var(--primary)' }}>{link.short_id}</strong>
                      <span>{new Date(link.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {link.custom_title || link.original_url}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      <button className="btn-secondary" style={{ flex: 1, padding: '6px' }} onClick={() => copyToClipboard(fullShortLink, link.id)}>
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                      <button className="btn-secondary" style={{ flex: 1, padding: '6px', color: 'var(--primary)' }} onClick={() => router.push(`/analytics/${link.short_id}`)}>
                        Stats
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="workspace">
          
          <div style={{ marginBottom: '30px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 10px 0', background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LinkPika Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
              Paste target link, customize preview details, upload custom featured image, and deploy instant server-side redirects.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '30px' }}>
            <form onSubmit={handleConvert} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="control-row">
                <label>WordPress Post URL</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="url"
                    placeholder="https://yourblog.com/my-awesome-post/"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn-secondary" onClick={handleFetchMetadata} disabled={fetchingMeta}>
                    {fetchingMeta ? "Fetching..." : "Auto Fetch Details"}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div style={{ background: 'rgba(255, 59, 48, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              <div style={{ border: '1px solid var(--glass-border)', padding: '24px', borderRadius: '16px', background: 'var(--glass-bg)' }}>
                <h3 className="section-title">Facebook OG Tags Override (Optional)</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                  <div className="control-row">
                    <label>Custom Title</label>
                    <input
                      type="text"
                      placeholder="Enter custom title for Facebook feed..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>

                  <div className="control-row">
                    <label>Custom Description</label>
                    <textarea
                      placeholder="Enter custom description..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      rows={2}
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '12px', color: 'var(--text-main)', outline: 'none', width: '100%', resize: 'vertical' }}
                    />
                  </div>

                  <div className="control-row">
                    <label>Custom Image</label>
                    <div 
                      style={{ 
                        border: '2px dashed var(--glass-border)', 
                        borderRadius: '16px', 
                        padding: '30px', 
                        textAlign: 'center', 
                        cursor: 'pointer',
                        background: isDragging ? 'var(--btn-hover)' : 'var(--input-bg)'
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("imageFile")?.click()}
                    >
                      <input type="file" id="imageFile" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                      {customImg ? (
                        <img src={customImg} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px' }} />
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>
                          {uploadingImage ? "Uploading..." : "Click to select or drag & drop an image"}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="url"
                        placeholder="Or enter image URL manually..."
                        value={customImg}
                        onChange={(e) => setCustomImg(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                    {uploadSuccess && <span style={{ color: 'var(--success)', fontSize: '13px', marginTop: '5px' }}>Image uploaded successfully! ✅</span>}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={converting} style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
                {converting ? "Generating Link... ⏳" : "Generate Short Link"}
              </button>
            </form>

            {resultUrl && (
              <div style={{ marginTop: '30px', animation: 'fadeIn 0.4s ease' }}>
                
                {/* Result Link */}
                <div style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.3)', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <label style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', display: 'block' }}>Success! Your Cloaked Link is Ready:</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" readOnly value={resultUrl} style={{ flex: 1 }} />
                    <button className="btn-primary" onClick={() => copyToClipboard(resultUrl)}>
                      {copiedResult ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Facebook Preview Box */}
                <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden', maxWidth: '500px', background: 'var(--card-bg)' }}>
                  <div style={{ padding: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>LP</div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-main)' }}>LinkPika Share Page</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Just now · 🌍</div>
                    </div>
                  </div>
                  <div style={{ padding: '0 12px 10px', fontSize: '14px', color: 'var(--text-main)' }}>Check this out!</div>
                  <div style={{ height: '260px', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {customImg ? (
                      <img src={customImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                    ) : (
                      <div style={{ color: 'var(--text-muted)' }}>No Image</div>
                    )}
                  </div>
                  <div style={{ padding: '12px', background: 'var(--glass-bg)', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {(() => { try { return new URL(wpUrl).hostname.toUpperCase(); } catch { return "YOURWEBSITE.COM"; } })()}
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-main)', marginBottom: '4px' }}>{customTitle || "Custom Title"}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {customDesc || "Click here to read the full story and learn more details."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Home;

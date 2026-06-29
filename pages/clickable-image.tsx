import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Sample Unsplash images for instant template loading
const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
];

export default function ClickableImage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Collage generator states
  const [images, setImages] = useState<string[]>(SAMPLE_PHOTOS);
  const [layout, setLayout] = useState("5-photos");
  const [gap, setGap] = useState(4);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayText, setOverlayText] = useState("+3");
  const [overlayOpacity, setOverlayOpacity] = useState(0.35);
  const [adjustments, setAdjustments] = useState([
    { zoom: 1.1, x: 0, y: 0 },
    { zoom: 1.0, x: 0, y: 0 },
    { zoom: 1.2, x: 0, y: 0 },
    { zoom: 1.0, x: 0, y: 0 },
    { zoom: 1.15, x: 0, y: 0 },
  ]);

  // Form states
  const [wpUrl, setWpUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [converting, setConverting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const router = useRouter();

  // Authentication check
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch("/api/auth/user");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserEmail(data.user.email);
            setUserName(data.user.name || null);
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoadingAuth(false);
      }
    };
    verifyUser();
  }, []);

  // Handle uploading local file slots
  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
    }
  };

  // Adjust crop sliders handler
  const handleCropChange = (index: number, key: "zoom" | "x" | "y", val: number) => {
    setAdjustments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  // Preset random overlays picker
  const handleRandomOverlayText = () => {
    const randoms = ["+2", "+3", "+4", "+5", "+6", "+8", "+9", "+12", "+15", "+18"];
    const text = randoms[Math.floor(Math.random() * randoms.length)];
    setOverlayText(text);
    setShowOverlay(true);
  };

  // Draw simulated Cover layout on Canvas
  const drawCoverImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    zoom: number,
    shiftX: number,
    shiftY: number
  ) => {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Cover math: get minimal scaling factor
    const r = Math.min(iw / dw, ih / dh);

    let sw = dw * r;
    let sh = dh * r;

    // Apply zoom ratio
    sw = sw / zoom;
    sh = sh / zoom;

    // Base coordinates to crop center
    let sx = (iw - sw) / 2;
    let sy = (ih - sh) / 2;

    // Offset shift limit calculations
    const maxShiftX = (iw - sw) / 2;
    const maxShiftY = (ih - sh) / 2;

    sx -= (shiftX / 100) * maxShiftX;
    sy -= (shiftY / 100) * maxShiftY;

    // Clamp coordinates boundaries
    sx = Math.max(0, Math.min(iw - sw, sx));
    sy = Math.max(0, Math.min(ih - sh, sy));

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  // Dynamic slot coordinates builder on 1200x630 grid
  const getSlotCoordinates = (layoutName: string, gapPx: number) => {
    const w = 1200;
    const h = 630;
    const coords = [];

    if (layoutName === "5-photos") {
      const r1h = Math.round((h - gapPx) * 0.6); // Top takes 60% height
      const r2h = h - gapPx - r1h;
      const r1w = Math.round((w - gapPx) / 2);
      coords.push({ x: 0, y: 0, w: r1w, h: r1h });
      coords.push({ x: r1w + gapPx, y: 0, w: w - r1w - gapPx, h: r1h });

      const r2w = Math.round((w - 2 * gapPx) / 3);
      coords.push({ x: 0, y: r1h + gapPx, w: r2w, h: r2h });
      coords.push({ x: r2w + gapPx, y: r1h + gapPx, w: r2w, h: r2h });
      coords.push({ x: 2 * r2w + 2 * gapPx, y: r1h + gapPx, w: w - 2 * r2w - 2 * gapPx, h: r2h });
    } else if (layoutName === "4-photos") {
      const r1h = Math.round((h - gapPx) / 2);
      const r2h = h - r1h - gapPx;
      const r1w = Math.round((w - gapPx) / 2);
      coords.push({ x: 0, y: 0, w: r1w, h: r1h });
      coords.push({ x: r1w + gapPx, y: 0, w: w - r1w - gapPx, h: r1h });
      coords.push({ x: 0, y: r1h + gapPx, w: r1w, h: r2h });
      coords.push({ x: r1w + gapPx, y: r1h + gapPx, w: w - r1w - gapPx, h: r2h });
    } else if (layoutName === "3-photos") {
      const lw = Math.round((w - gapPx) * 0.6); // 60% left
      const rw = w - lw - gapPx;
      const rh = Math.round((h - gapPx) / 2);
      coords.push({ x: 0, y: 0, w: lw, h: h });
      coords.push({ x: lw + gapPx, y: 0, w: rw, h: rh });
      coords.push({ x: lw + gapPx, y: rh + gapPx, w: rw, h: h - rh - gapPx });
    } else if (layoutName === "2-photos") {
      const r1w = Math.round((w - gapPx) / 2);
      coords.push({ x: 0, y: 0, w: r1w, h: h });
      coords.push({ x: r1w + gapPx, y: 0, w: w - r1w - gapPx, h: h });
    } else {
      coords.push({ x: 0, y: 0, w: w, h: h });
    }

    return coords;
  };

  // Compile final collage canvas asynchronously
  const generateCollageCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, 1200, 630);

    const coords = getSlotCoordinates(layout, gap);

    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      const imgUrl = images[i] || SAMPLE_PHOTOS[i];
      const adj = adjustments[i] || { zoom: 1, x: 0, y: 0 };

      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.onload = () => resolve(tempImg);
        tempImg.onerror = () => resolve(null);
        tempImg.src = imgUrl;
      });

      if (img) {
        drawCoverImage(ctx, img, coord.x, coord.y, coord.w, coord.h, adj.zoom, adj.x, adj.y);
      } else {
        ctx.fillStyle = "#374151";
        ctx.fillRect(coord.x, coord.y, coord.w, coord.h);
      }
    }

    // Draw overlay Text
    if (showOverlay && overlayText) {
      const lastCoord = coords[coords.length - 1];
      ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
      ctx.fillRect(lastCoord.x, lastCoord.y, lastCoord.w, lastCoord.h);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 84px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(overlayText, lastCoord.x + lastCoord.w / 2, lastCoord.y + lastCoord.h / 2);
    }

    return canvas;
  };

  // Export collage PNG image download trigger
  const handleDownload = async () => {
    setExporting(true);
    try {
      const canvas = await generateCollageCanvas();
      if (!canvas) throw new Error("Canvas render context failed");
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `facebook-collage-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      alert("Failed to render mockup: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Upload Collage to ImgBB and shorten redirect url
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl) {
      setErrorMessage("Please enter a destination URL");
      return;
    }
    setConverting(true);
    setResultUrl("");
    setErrorMessage("");

    try {
      const canvas = await generateCollageCanvas();
      if (!canvas) throw new Error("Could not draw canvas image context");

      // Convert canvas to blob payload
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      if (!blob) throw new Error("Collage compression export failed");

      const uploadData = new FormData();
      uploadData.append("image", blob, "collage.jpg");

      // Upload to ImgBB
      const uploadRes = await fetch("https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8", {
        method: "POST",
        body: uploadData,
      });

      if (!uploadRes.ok) throw new Error("ImgBB S3 hosting upload failed");

      const imgJson = await uploadRes.json();
      const uploadedImageUrl = imgJson.data.url;

      // Submit to DB creation endpoint
      const response = await fetch("/api/create-redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: wpUrl,
          customTitle: customTitle || "Interactive Photo Collage",
          customDesc: customDesc || "Click here to view more images on site.",
          customImage: uploadedImageUrl,
          userEmail: userEmail || null,
        }),
      });

      if (!response.ok) throw new Error("Redirect schema insertion transaction failed");

      const resJson = await response.json();
      const host = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
      const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
      setResultUrl(`${protocol}//${host}/${resJson.shortId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected transaction fault occurred.");
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preview elements compiler helper
  const renderImage = (idx: number) => {
    const imgUrl = images[idx] || SAMPLE_PHOTOS[idx];
    const adj = adjustments[idx] || { zoom: 1, x: 0, y: 0 };
    return (
      <div className="img-slot-inner">
        <img
          src={imgUrl}
          alt={`Preview image slot ${idx + 1}`}
          style={{
            transform: `translate(${adj.x}%, ${adj.y}%) scale(${adj.zoom})`,
          }}
        />
      </div>
    );
  };

  const renderOverlayText = () => {
    if (!showOverlay || !overlayText) return null;
    return (
      <div
        className="facebook-grid-overlay"
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
      >
        {overlayText}
      </div>
    );
  };

  return (
    <div className="wrapper">
      <Head>
        <title>+ Clickable Image Collage Mockups — LinkPika</title>
        <meta name="description" content="Generate beautiful standard aspect ratio Facebook photo collages with overlay click numbers." />
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
        {/* Left Side Controls Panel */}
        <aside className="dashboard-sidebar collage-sidebar">
          <div className="sidebar-header-title">
            <h2>Mockup Settings ⚙️</h2>
            <p>Select grid layouts, gap spacings, and apply overlays.</p>
          </div>

          <div className="sidebar-divider"></div>

          {/* Grid Layout Dropdown Selection */}
          <div className="input-group">
            <label htmlFor="layout">Collage Layout</label>
            <select id="layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
              <option value="5-photos">5 Photos Layout (2 Top, 3 Bottom)</option>
              <option value="4-photos">4 Photos Layout (2x2 Grid)</option>
              <option value="3-photos">3 Photos Layout (1 Left, 2 Stacked Right)</option>
              <option value="2-photos">2 Photos Layout (Side-by-side)</option>
              <option value="1-photo">1 Photo Layout (Full Card)</option>
            </select>
          </div>

          {/* Spacing Gaps Slider */}
          <div className="input-group">
            <div className="label-with-value">
              <label>Grid Gap Spacing</label>
              <span>{gap}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="12"
              value={gap}
              onChange={(e) => setGap(parseInt(e.target.value))}
            />
          </div>

          <div className="sidebar-divider"></div>

          {/* Overlay controls */}
          <div className="sidebar-section-title">Overlay Settings 🔠</div>
          
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="showOverlay"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
            />
            <label htmlFor="showOverlay" style={{ textTransform: "none", letterSpacing: "0px" }}>
              Enable Collage Number Overlay
            </label>
          </div>

          {showOverlay && (
            <>
              <div className="input-group">
                <label htmlFor="overlayText">Overlay Number Label</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    id="overlayText"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    placeholder="e.g. +3, +5"
                  />
                  <button type="button" className="btn-preset" onClick={handleRandomOverlayText}>
                    Random
                  </button>
                </div>
              </div>

              <div className="input-group">
                <div className="label-with-value">
                  <label>Background Opacity</label>
                  <span>{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                />
              </div>
            </>
          )}

          <div className="sidebar-divider"></div>

          {/* Photo uploaders & Cropping controls */}
          <div className="sidebar-section-title">Upload & Crop Layers 📷</div>

          {Array.from({ length: layout === "5-photos" ? 5 : layout === "4-photos" ? 4 : layout === "3-photos" ? 3 : layout === "2-photos" ? 2 : 1 }).map((_, i) => (
            <details key={i} className="details-crop-item">
              <summary>
                <span>Photo Slot {i + 1}</span>
                <span className="summary-indicator">⚙️</span>
              </summary>
              <div className="crop-controls-box">
                <div className="file-uploader-box">
                  <label className="btn-upload-file">
                    Upload Custom Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLocalUpload(e, i)}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div className="crop-slider-group">
                  <div className="crop-slider">
                    <div className="slider-label">Zoom ({adjustments[i]?.zoom.toFixed(2)}x)</div>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.05"
                      value={adjustments[i]?.zoom || 1}
                      onChange={(e) => handleCropChange(i, "zoom", parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="crop-slider">
                    <div className="slider-label">Horizontal Shift ({adjustments[i]?.x}%)</div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments[i]?.x || 0}
                      onChange={(e) => handleCropChange(i, "x", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="crop-slider">
                    <div className="slider-label">Vertical Shift ({adjustments[i]?.y}%)</div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={adjustments[i]?.y || 0}
                      onChange={(e) => handleCropChange(i, "y", parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </details>
          ))}
        </aside>

        {/* Center Main Live Mockup Preview & Form Panel */}
        <main className="dashboard-main-content">
          <section className="dashboard-hero">
            <h1>+ Clickable Image Collage Mockup</h1>
            <p>
              Generate high CTR Facebook image post layouts. Real visitors clicking the image will be redirected instantly, while spiders crawl the metadata.
            </p>
          </section>

          {/* Layout Preview Canvas */}
          <div className="preview-container">
            <label>Dynamic Live Preview (1200x630 Aspect Ratio Mockup) 📱</label>
            <div className="collage-preview-canvas-wrapper">
              {layout === "5-photos" && (
                <div className="collage-grid-layout" style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
                  <div className="collage-row" style={{ display: "flex", flex: 1.2, gap: `${gap}px` }}>
                    <div className="slot-wrapper">{renderImage(0)}</div>
                    <div className="slot-wrapper">{renderImage(1)}</div>
                  </div>
                  <div className="collage-row" style={{ display: "flex", flex: 0.8, gap: `${gap}px` }}>
                    <div className="slot-wrapper">{renderImage(2)}</div>
                    <div className="slot-wrapper">{renderImage(3)}</div>
                    <div className="slot-wrapper" style={{ position: "relative" }}>
                      {renderImage(4)}
                      {renderOverlayText()}
                    </div>
                  </div>
                </div>
              )}

              {layout === "4-photos" && (
                <div className="collage-grid-layout" style={{ display: "flex", flexDirection: "column", gap: `${gap}px` }}>
                  <div className="collage-row" style={{ display: "flex", flex: 1, gap: `${gap}px` }}>
                    <div className="slot-wrapper">{renderImage(0)}</div>
                    <div className="slot-wrapper">{renderImage(1)}</div>
                  </div>
                  <div className="collage-row" style={{ display: "flex", flex: 1, gap: `${gap}px` }}>
                    <div className="slot-wrapper">{renderImage(2)}</div>
                    <div className="slot-wrapper" style={{ position: "relative" }}>
                      {renderImage(3)}
                      {renderOverlayText()}
                    </div>
                  </div>
                </div>
              )}

              {layout === "3-photos" && (
                <div className="collage-grid-layout" style={{ display: "flex", gap: `${gap}px` }}>
                  <div className="slot-wrapper" style={{ flex: 1.2 }}>{renderImage(0)}</div>
                  <div className="collage-column" style={{ display: "flex", flexDirection: "column", flex: 0.8, gap: `${gap}px` }}>
                    <div className="slot-wrapper" style={{ flex: 1 }}>{renderImage(1)}</div>
                    <div className="slot-wrapper" style={{ flex: 1, position: "relative" }}>
                      {renderImage(2)}
                      {renderOverlayText()}
                    </div>
                  </div>
                </div>
              )}

              {layout === "2-photos" && (
                <div className="collage-grid-layout" style={{ display: "flex", gap: `${gap}px` }}>
                  <div className="slot-wrapper" style={{ flex: 1 }}>{renderImage(0)}</div>
                  <div className="slot-wrapper" style={{ flex: 1, position: "relative" }}>
                    {renderImage(1)}
                    {renderOverlayText()}
                  </div>
                </div>
              )}

              {layout === "1-photo" && (
                <div className="collage-grid-layout" style={{ position: "relative" }}>
                  <div className="slot-wrapper" style={{ width: "100%", height: "100%" }}>{renderImage(0)}</div>
                  {renderOverlayText()}
                </div>
              )}
            </div>
          </div>

          {/* Form & Save Configuration Card */}
          <div className="main-work-card">
            <form onSubmit={handleConvert} className="form-panel">
              <div className="input-group">
                <label htmlFor="wpUrl">Target Redirect URL (Affiliate / WordPress Link)</label>
                <input
                  type="url"
                  id="wpUrl"
                  placeholder="https://yourblog.com/landing-page-offer/"
                  value={wpUrl}
                  onChange={(e) => setWpUrl(e.target.value)}
                  required
                />
              </div>

              <div className="override-panel">
                <legend>Social Preview Overrides</legend>
                <div className="input-group">
                  <label htmlFor="customTitle">Meta Title</label>
                  <input
                    type="text"
                    id="customTitle"
                    placeholder="Enter short title for Facebook link card preview..."
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="customDesc">Meta Description</label>
                  <textarea
                    id="customDesc"
                    placeholder="Enter short description..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              {errorMessage && <div className="error-banner">⚠️ {errorMessage}</div>}

              <div className="action-button-row">
                <button type="button" className="btn-export-download" onClick={handleDownload} disabled={exporting}>
                  {exporting ? "Generating PNG... ⏳" : "Download collage image (PNG)"}
                </button>
                <button type="submit" className="btn-submit" disabled={converting}>
                  {converting ? "Processing and Uploading... ⏳" : "Convert & Create Redirect Link"}
                </button>
              </div>
            </form>

            {/* Generated Redirect Result Card */}
            {resultUrl && (
              <div className="result-section">
                <label>Generated Cloaked Short Redirect Link:</label>
                <div className="result-wrapper">
                  <div className="result-url">{resultUrl}</div>
                  <button
                    type="button"
                    className={`btn-copy ${copied ? "copied" : ""}`}
                    onClick={() => copyToClipboard(resultUrl)}
                  >
                    {copied ? "Copied! ✅" : "Copy Link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />

      <style jsx global>{`
        .collage-sidebar {
          max-height: calc(100vh - 70px);
          overflow-y: auto;
        }

        .sidebar-header-title h2 {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }

        .sidebar-header-title p {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .sidebar-section-title {
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .label-with-value {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .label-with-value span {
          font-size: 0.8rem;
          font-weight: 700;
          color: #a855f7;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 10px 0;
        }

        .checkbox-group input {
          width: 18px;
          height: 18px;
          accent-color: #a855f7;
          cursor: pointer;
        }

        .btn-preset {
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.25);
          color: #c084fc;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-preset:hover {
          background: rgba(168, 85, 247, 0.2);
        }

        /* Details summary tags for crop list */
        .details-crop-item {
          border: 1px solid var(--card-border);
          border-radius: 12px;
          background: var(--card-bg);
          overflow: hidden;
          margin-bottom: 8px;
        }

        .details-crop-item summary {
          padding: 12px 16px;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          cursor: pointer;
          user-select: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          list-style: none;
        }

        .details-crop-item summary::-webkit-details-marker {
          display: none;
        }

        .details-crop-item[open] summary {
          border-bottom: 1px solid var(--card-border);
          background: rgba(168, 85, 247, 0.05);
        }

        .crop-controls-box {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .file-uploader-box {
          text-align: center;
        }

        .btn-upload-file {
          display: block;
          width: 100%;
          background: var(--input-bg);
          border: 1px dashed var(--input-border);
          border-radius: 8px;
          padding: 10px;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-upload-file:hover {
          border-color: #a855f7;
          color: var(--text);
        }

        .crop-slider-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .crop-slider {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .slider-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .crop-slider input[type="range"] {
          width: 100%;
          accent-color: #a855f7;
        }

        /* 1200x630 aspect ratio Grid Preview Container */
        .collage-preview-canvas-wrapper {
          width: 100%;
          max-width: 720px;
          aspect-ratio: 1200 / 630;
          background: #111827;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--card-border);
        }

        .collage-grid-layout {
          width: 100%;
          height: 100%;
        }

        .collage-row {
          width: 100%;
        }

        .collage-column {
          height: 100%;
        }

        .slot-wrapper {
          flex: 1;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .img-slot-inner {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
        }

        .img-slot-inner img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform-origin: center;
        }

        /* Facebook Collage Number Overlay styling */
        .facebook-grid-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: clamp(2rem, 5vw, 4.5rem);
          font-weight: 800;
          font-family: sans-serif;
          pointer-events: none;
          z-index: 4;
        }

        /* Action Buttons Row styling */
        .action-button-row {
          display: flex;
          gap: 15px;
          margin-top: 10px;
        }

        .btn-export-download {
          flex: 0.8;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text);
          border-radius: 12px;
          padding: 16px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.25s ease;
        }

        :root.light-theme .btn-export-download {
          background: #e5e7eb;
          border-color: #cbd5e1;
        }

        .btn-export-download:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 768px) {
          .action-button-row {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}

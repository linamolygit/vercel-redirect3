import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";

interface ImageAdjustment {
  zoom: number;
  x: number;
  y: number;
  blur: number;
  rotate: number;
}

const DEFAULT_ADJ: ImageAdjustment = { zoom: 1.0, x: 0, y: 0, blur: 0, rotate: 0 };

export default function ClickableImage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Images state - empty slots by default
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [layout, setLayout] = useState("5-photos");
  const [gap, setGap] = useState(3);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayText, setOverlayText] = useState("+3");
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [adjustments, setAdjustments] = useState<ImageAdjustment[]>([
    { ...DEFAULT_ADJ }, { ...DEFAULT_ADJ }, { ...DEFAULT_ADJ }, { ...DEFAULT_ADJ }, { ...DEFAULT_ADJ },
  ]);

  // Edit modal state
  const [editingSlot, setEditingSlot] = useState<number | null>(null);

  // Form states
  const [wpUrl, setWpUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [converting, setConverting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resultUrl, setResultUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [collageImageUrl, setCollageImageUrl] = useState("");
  const [copiedImgUrl, setCopiedImgUrl] = useState(false);
  const [uploadingCollage, setUploadingCollage] = useState(false);

  // Drag state
  const [dragOver, setDragOver] = useState<number | null>(null);

  const router = useRouter();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const slotCount = layout === "5-photos" ? 5 : layout === "4-photos" ? 4 : layout === "3-photos" ? 3 : layout === "2-photos" ? 2 : 1;

  // Auth check
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

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
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

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
    }
  };

  // Crop change handler
  const handleCropChange = (index: number, key: keyof ImageAdjustment, val: number) => {
    setAdjustments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: val };
      return updated;
    });
  };

  // Random overlay text
  const handleRandomOverlay = () => {
    const opts = ["+2", "+3", "+4", "+5", "+6", "+7", "+8", "+9", "+10", "+12", "+15", "+18"];
    setOverlayText(opts[Math.floor(Math.random() * opts.length)]);
    setShowOverlay(true);
  };

  // Remove image from slot
  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      updated[index] = null;
      return updated;
    });
    setAdjustments((prev) => {
      const updated = [...prev];
      updated[index] = { ...DEFAULT_ADJ };
      return updated;
    });
  };

  // Draw cover image on canvas with rotation support
  const drawCoverImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    dx: number, dy: number, dw: number, dh: number,
    zoom: number, shiftX: number, shiftY: number, blur: number, rotate: number = 0
  ) => {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const r = Math.min(iw / dw, ih / dh);
    let sw = dw * r / zoom;
    let sh = dh * r / zoom;
    let sx = (iw - sw) / 2;
    let sy = (ih - sh) / 2;
    const maxShiftX = (iw - sw) / 2;
    const maxShiftY = (ih - sh) / 2;
    sx -= (shiftX / 100) * maxShiftX;
    sy -= (shiftY / 100) * maxShiftY;
    sx = Math.max(0, Math.min(iw - sw, sx));
    sy = Math.max(0, Math.min(ih - sh, sy));

    ctx.save();
    // Clip to slot area
    ctx.beginPath();
    ctx.rect(dx, dy, dw, dh);
    ctx.clip();

    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    }

    if (rotate !== 0) {
      const cx = dx + dw / 2;
      const cy = dy + dh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  };

  // Get slot coordinates for canvas
  const getSlotCoordinates = (layoutName: string, gapPx: number) => {
    const w = 1200;
    const h = 630;
    const coords: { x: number; y: number; w: number; h: number }[] = [];

    if (layoutName === "5-photos") {
      const r1h = Math.round((h - gapPx) * 0.6);
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
      const lw = Math.round((w - gapPx) * 0.6);
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

  // Generate canvas for export
  const generateCollageCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White canvas background for gaps between photos
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1200, 630);

    const coords = getSlotCoordinates(layout, gap);

    for (let i = 0; i < coords.length; i++) {
      const coord = coords[i];
      const imgUrl = images[i];
      const adj = adjustments[i] || DEFAULT_ADJ;

      if (!imgUrl) {
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(coord.x, coord.y, coord.w, coord.h);
        continue;
      }

      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = "anonymous";
        tempImg.onload = () => resolve(tempImg);
        tempImg.onerror = () => resolve(null);
        tempImg.src = imgUrl;
      });

      if (img) {
        drawCoverImage(ctx, img, coord.x, coord.y, coord.w, coord.h, adj.zoom, adj.x, adj.y, adj.blur, adj.rotate);
      } else {
        ctx.fillStyle = "#e5e7eb";
        ctx.fillRect(coord.x, coord.y, coord.w, coord.h);
      }
    }

    // Draw overlay on last slot
    if (showOverlay && overlayText) {
      const lastCoord = coords[coords.length - 1];
      ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
      ctx.fillRect(lastCoord.x, lastCoord.y, lastCoord.w, lastCoord.h);
      ctx.fillStyle = "#ffffff";
      // Smaller font size to match Facebook style
      const fontSize = Math.min(lastCoord.w, lastCoord.h) * 0.25;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(overlayText, lastCoord.x + lastCoord.w / 2, lastCoord.y + lastCoord.h / 2);
    }

    return canvas;
  };

  // Download compressed JPEG (high quality)
  const handleDownload = async () => {
    setExporting(true);
    try {
      const canvas = await generateCollageCanvas();
      if (!canvas) throw new Error("Canvas render failed");
      // Use JPEG at 0.88 quality for good compression without visible quality loss
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const link = document.createElement("a");
      link.download = `fb-collage-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Upload collage to ImgBB and get hosted URL
  const handleUploadCollage = async () => {
    setUploadingCollage(true);
    setCollageImageUrl("");
    setErrorMessage("");
    try {
      const canvas = await generateCollageCanvas();
      if (!canvas) throw new Error("Canvas render failed");
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
      });
      if (!blob) throw new Error("Compression failed");
      const fd = new FormData();
      fd.append("image", blob, "collage.jpg");
      const res = await fetch("https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8", {
        method: "POST", body: fd,
      });
      if (!res.ok) throw new Error("ImgBB upload failed");
      const data = await res.json();
      setCollageImageUrl(data.data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed");
    } finally {
      setUploadingCollage(false);
    }
  };

  // Fetch metadata from WordPress URL
  const handleFetchMetadata = async () => {
    if (!wpUrl) {
      setErrorMessage("Please enter a WordPress URL first.");
      return;
    }
    setFetchingMeta(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/fetch-wp?url=${encodeURIComponent(wpUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch WordPress details.");
      setCustomTitle(data.title || "");
      setCustomDesc(data.excerpt || "");
    } catch (err: any) {
      setErrorMessage(err.message || "Auto-fetch failed.");
    } finally {
      setFetchingMeta(false);
    }
  };

  const copyImgUrl = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedImgUrl(true);
    setTimeout(() => setCopiedImgUrl(false), 2000);
  };

  // Convert: upload collage to ImgBB then create redirect
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpUrl) {
      setErrorMessage("Please enter a WordPress Post URL");
      return;
    }
    setConverting(true);
    setResultUrl("");
    setErrorMessage("");

    try {
      // Use already-uploaded collage image URL if available, otherwise upload now
      let imageUrl = collageImageUrl;
      if (!imageUrl) {
        const canvas = await generateCollageCanvas();
        if (!canvas) throw new Error("Canvas render failed");
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88);
        });
        if (!blob) throw new Error("Image compression failed");
        const fd = new FormData();
        fd.append("image", blob, "collage.jpg");
        const uploadRes = await fetch("https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8", {
          method: "POST", body: fd,
        });
        if (!uploadRes.ok) throw new Error("ImgBB upload failed");
        const imgJson = await uploadRes.json();
        imageUrl = imgJson.data.url;
        setCollageImageUrl(imageUrl);
      }

      const response = await fetch("/api/create-redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalUrl: wpUrl,
          customTitle: customTitle || "Photo Collection",
          customDesc: customDesc || "Click to view more photos",
          customImage: imageUrl,
          userEmail: userEmail || null,
        }),
      });

      if (!response.ok) throw new Error("Redirect creation failed");

      const resJson = await response.json();
      const host = typeof window !== "undefined" ? window.location.host : "yourdomain.com";
      const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";
      setResultUrl(`${protocol}//${host}/${resJson.shortId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred");
    } finally {
      setConverting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render the visual preview grid
  const renderPreviewSlot = (idx: number, isLastSlot: boolean) => {
    const imgUrl = images[idx];
    const adj = adjustments[idx] || DEFAULT_ADJ;
    const hasImage = !!imgUrl;

    return (
      <div
        className={`preview-slot ${dragOver === idx ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={(e) => handleDrop(e, idx)}
        onClick={() => {
          if (!hasImage) {
            fileInputRefs.current[idx]?.click();
          }
        }}
      >
        {hasImage ? (
          <>
            <div className="slot-image-wrap">
              <img
                src={imgUrl}
                alt={`Photo ${idx + 1}`}
                style={{
                  transform: `translate(${adj.x * 0.5}%, ${adj.y * 0.5}%) scale(${adj.zoom}) rotate(${adj.rotate}deg)`,
                  filter: adj.blur > 0 ? `blur(${adj.blur}px)` : "none",
                }}
              />
            </div>
            {/* Edit pencil button */}
            <button
              className="slot-edit-btn"
              onClick={(e) => { e.stopPropagation(); setEditingSlot(idx); }}
              title="Edit image"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {/* Overlay on last slot */}
            {isLastSlot && showOverlay && overlayText && (
              <div
                className="slot-overlay"
                style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
              >
                <span className="overlay-number">{overlayText}</span>
              </div>
            )}
          </>
        ) : (
          <div className="slot-empty">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>Add Photo</span>
          </div>
        )}
        <input
          ref={(el) => { fileInputRefs.current[idx] = el; }}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFileUpload(e, idx)}
        />
      </div>
    );
  };

  return (
    <div className="wrapper">
      <Head>
        <title>Clickable Image — Facebook Collage Mockup Generator | LinkPika</title>
        <meta name="description" content="Create stunning Facebook multi-photo collage mockups with custom overlays. Generate 1200x630 OG images for maximum engagement." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <Header />

      <div className="ci-page">
        {/* Page Header */}
        <div className="ci-header">
          <h1>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Facebook Collage Mockup
          </h1>
          <p>Create multi-photo collage images that look exactly like Facebook photo posts. Perfect for clickbait CTR optimization.</p>
        </div>

        <div className="ci-body">
          {/* Left: Controls */}
          <div className="ci-controls">
            {/* Layout Selection */}
            <div className="ctrl-section">
              <div className="ctrl-label">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Layout
              </div>
              <select value={layout} onChange={(e) => setLayout(e.target.value)}>
                <option value="5-photos">5 Photos (2+3)</option>
                <option value="4-photos">4 Photos (2×2)</option>
                <option value="3-photos">3 Photos (1+2)</option>
                <option value="2-photos">2 Photos</option>
                <option value="1-photo">1 Photo</option>
              </select>
            </div>

            {/* Gap */}
            <div className="ctrl-section">
              <div className="ctrl-label-row">
                <div className="ctrl-label">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Gap
                </div>
                <span className="ctrl-value">{gap}px</span>
              </div>
              <input type="range" min="0" max="8" value={gap} onChange={(e) => setGap(parseInt(e.target.value))} />
            </div>

            {/* Overlay */}
            <div className="ctrl-section">
              <div className="ctrl-label">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Number Overlay
              </div>
              <div className="overlay-controls">
                <label className="toggle-wrap">
                  <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} />
                  <span className="toggle-slider"></span>
                </label>
                {showOverlay && (
                  <>
                    <input
                      type="text"
                      className="overlay-input"
                      value={overlayText}
                      onChange={(e) => setOverlayText(e.target.value)}
                      placeholder="+3"
                    />
                    <button type="button" className="btn-random" onClick={handleRandomOverlay} title="Random number">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              {showOverlay && (
                <div className="opacity-row">
                  <span className="mini-label">Opacity</span>
                  <input type="range" min="0.2" max="0.8" step="0.05" value={overlayOpacity} onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))} />
                  <span className="ctrl-value">{Math.round(overlayOpacity * 100)}%</span>
                </div>
              )}
            </div>

            {/* Image slots list */}
            <div className="ctrl-section">
              <div className="ctrl-label">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Photos ({slotCount})
              </div>
              <div className="photo-slots-list">
                {Array.from({ length: slotCount }).map((_, i) => (
                  <div key={i} className="photo-slot-item">
                    <div className="slot-thumb">
                      {images[i] ? (
                        <img src={images[i]!} alt={`Slot ${i + 1}`} />
                      ) : (
                        <div className="thumb-empty">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="slot-label">Photo {i + 1}</span>
                    <div className="slot-actions">
                      <button
                        className="slot-action-btn"
                        onClick={() => fileInputRefs.current[i]?.click()}
                        title="Upload"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </button>
                      {images[i] && (
                        <>
                          <button
                            className="slot-action-btn edit"
                            onClick={() => setEditingSlot(i)}
                            title="Edit"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            className="slot-action-btn delete"
                            onClick={() => removeImage(i)}
                            title="Remove"
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: Preview + Form */}
          <div className="ci-main">
            {/* Collage Preview */}
            <div className="preview-section">
              <div className="preview-label">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Live Preview
                <span className="badge">1200×630</span>
              </div>

              <div className="collage-preview">
                {/* 5-photo layout */}
                {layout === "5-photos" && (
                  <div className="grid-5">
                    <div className="grid-5-top">
                      {renderPreviewSlot(0, false)}
                      {renderPreviewSlot(1, false)}
                    </div>
                    <div className="grid-5-bottom">
                      {renderPreviewSlot(2, false)}
                      {renderPreviewSlot(3, false)}
                      {renderPreviewSlot(4, true)}
                    </div>
                  </div>
                )}

                {/* 4-photo layout */}
                {layout === "4-photos" && (
                  <div className="grid-4">
                    <div className="grid-4-row">
                      {renderPreviewSlot(0, false)}
                      {renderPreviewSlot(1, false)}
                    </div>
                    <div className="grid-4-row">
                      {renderPreviewSlot(2, false)}
                      {renderPreviewSlot(3, true)}
                    </div>
                  </div>
                )}

                {/* 3-photo layout */}
                {layout === "3-photos" && (
                  <div className="grid-3">
                    <div className="grid-3-left">
                      {renderPreviewSlot(0, false)}
                    </div>
                    <div className="grid-3-right">
                      {renderPreviewSlot(1, false)}
                      {renderPreviewSlot(2, true)}
                    </div>
                  </div>
                )}

                {/* 2-photo layout */}
                {layout === "2-photos" && (
                  <div className="grid-2">
                    {renderPreviewSlot(0, false)}
                    {renderPreviewSlot(1, true)}
                  </div>
                )}

                {/* 1-photo layout */}
                {layout === "1-photo" && (
                  <div className="grid-1">
                    {renderPreviewSlot(0, true)}
                  </div>
                )}
              </div>
            </div>

            {/* Export Actions */}
            <div className="actions-row">
              <button className="btn-download" onClick={handleDownload} disabled={exporting}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {exporting ? "Exporting..." : "Download Image"}
              </button>
              <button className="btn-upload-imgbb" onClick={handleUploadCollage} disabled={uploadingCollage}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploadingCollage ? "Uploading..." : "Upload to ImgBB"}
              </button>
            </div>

            {/* Hosted Image URL */}
            {collageImageUrl && (
              <div className="imgbb-result">
                <div className="imgbb-label">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Hosted Image URL
                </div>
                <div className="imgbb-url-row">
                  <span className="imgbb-url">{collageImageUrl}</span>
                  <button
                    className={`btn-copy-sm ${copiedImgUrl ? "copied" : ""}`}
                    onClick={() => copyImgUrl(collageImageUrl)}
                  >
                    {copiedImgUrl ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Redirect Form - Dashboard Style */}
            <div className="redirect-form-card">
              <form onSubmit={handleConvert}>
                {/* WordPress Post URL */}
                <div className="form-field">
                  <label>WordPress Post URL</label>
                  <div className="url-fetch-row">
                    <input
                      type="url"
                      placeholder="https://yourblog.com/my-awesome-post/"
                      value={wpUrl}
                      onChange={(e) => setWpUrl(e.target.value)}
                      required
                    />
                    <button type="button" className="btn-fetch" onClick={handleFetchMetadata} disabled={fetchingMeta}>
                      {fetchingMeta ? "Fetching..." : "Auto Fetch Details"}
                    </button>
                  </div>
                </div>

                {/* Facebook OG Tags Override */}
                <fieldset className="og-override-panel">
                  <legend>Facebook OG Tags Override (Optional)</legend>
                  <p className="og-hint">
                    Customize preview titles and descriptions to optimize your click-through rates (CTR) on social media platforms:
                  </p>

                  <div className="form-field">
                    <label>Custom Title</label>
                    <input
                      type="text"
                      placeholder="Enter custom title for Facebook feed..."
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Custom Description</label>
                    <textarea
                      placeholder="Enter custom description..."
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      rows={2}
                    />
                  </div>
                </fieldset>

                {errorMessage && (
                  <div className="error-msg">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errorMessage}
                  </div>
                )}

                <button type="submit" className="btn-convert" disabled={converting}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {converting ? "Processing..." : "Convert"}
                </button>
              </form>

              {/* Result */}
              {resultUrl && (
                <div className="result-box">
                  <div className="result-label">Generated Cloaked Link (Ready to share on social media):</div>
                  <div className="result-row">
                    <span className="result-url">{resultUrl}</span>
                    <button
                      className={`btn-copy ${copied ? "copied" : ""}`}
                      onClick={() => copyToClipboard(resultUrl)}
                    >
                      {copied ? (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingSlot !== null && images[editingSlot] && (
        <div className="modal-backdrop" onClick={() => setEditingSlot(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Photo {editingSlot + 1}
              </h3>
              <button className="modal-close" onClick={() => setEditingSlot(null)}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-preview">
              <img
                src={images[editingSlot]!}
                alt={`Editing photo ${editingSlot + 1}`}
                style={{
                  transform: `translate(${adjustments[editingSlot].x * 0.5}%, ${adjustments[editingSlot].y * 0.5}%) scale(${adjustments[editingSlot].zoom}) rotate(${adjustments[editingSlot].rotate}deg)`,
                  filter: adjustments[editingSlot].blur > 0 ? `blur(${adjustments[editingSlot].blur}px)` : "none",
                }}
              />
            </div>

            <div className="modal-controls">
              <div className="modal-ctrl">
                <div className="modal-ctrl-header">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  <span>Zoom</span>
                  <span className="ctrl-val">{adjustments[editingSlot].zoom.toFixed(2)}x</span>
                </div>
                <input type="range" min="1.0" max="3.0" step="0.05"
                  value={adjustments[editingSlot].zoom}
                  onChange={(e) => handleCropChange(editingSlot, "zoom", parseFloat(e.target.value))} />
              </div>

              <div className="modal-ctrl">
                <div className="modal-ctrl-header">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Horizontal</span>
                  <span className="ctrl-val">{adjustments[editingSlot].x}%</span>
                </div>
                <input type="range" min="-100" max="100"
                  value={adjustments[editingSlot].x}
                  onChange={(e) => handleCropChange(editingSlot, "x", parseInt(e.target.value))} />
              </div>

              <div className="modal-ctrl">
                <div className="modal-ctrl-header">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span>Vertical</span>
                  <span className="ctrl-val">{adjustments[editingSlot].y}%</span>
                </div>
                <input type="range" min="-100" max="100"
                  value={adjustments[editingSlot].y}
                  onChange={(e) => handleCropChange(editingSlot, "y", parseInt(e.target.value))} />
              </div>

              <div className="modal-ctrl">
                <div className="modal-ctrl-header">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Blur</span>
                  <span className="ctrl-val">{adjustments[editingSlot].blur}px</span>
                </div>
                <input type="range" min="0" max="20" step="1"
                  value={adjustments[editingSlot].blur}
                  onChange={(e) => handleCropChange(editingSlot, "blur", parseInt(e.target.value))} />
              </div>

              <div className="modal-ctrl">
                <div className="modal-ctrl-header">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Rotate</span>
                  <span className="ctrl-val">{adjustments[editingSlot].rotate}°</span>
                </div>
                <input type="range" min="-180" max="180" step="1"
                  value={adjustments[editingSlot].rotate}
                  onChange={(e) => handleCropChange(editingSlot, "rotate", parseInt(e.target.value))} />
              </div>

              <div className="modal-actions">
                <button className="btn-replace" onClick={() => { fileInputRefs.current[editingSlot]?.click(); }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Replace Photo
                </button>
                <button className="btn-reset" onClick={() => { handleCropChange(editingSlot, "zoom", 1); handleCropChange(editingSlot, "x", 0); handleCropChange(editingSlot, "y", 0); handleCropChange(editingSlot, "blur", 0); handleCropChange(editingSlot, "rotate", 0); }}>
                  Reset
                </button>
                <button className="btn-done" onClick={() => setEditingSlot(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <style jsx global>{`
        .ci-page {
          min-height: calc(100vh - 140px);
          padding: 24px 32px 48px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .ci-header {
          margin-bottom: 24px;
        }

        .ci-header h1 {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text);
          margin: 0 0 6px;
        }

        .ci-header p {
          font-size: 0.88rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }

        .ci-body {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        /* LEFT CONTROLS */
        .ci-controls {
          width: 280px;
          min-width: 280px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 16px;
          position: sticky;
          top: 80px;
        }

        .ctrl-section {
          padding: 12px 0;
          border-bottom: 1px solid var(--card-border);
        }

        .ctrl-section:last-child {
          border-bottom: none;
        }

        .ctrl-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .ctrl-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .ctrl-value {
          font-size: 0.75rem;
          font-weight: 700;
          color: #a855f7;
          min-width: 35px;
          text-align: right;
        }

        .ci-controls select {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text);
          cursor: pointer;
          outline: none;
          font-family: inherit;
        }

        .ci-controls select:focus {
          border-color: #a855f7;
        }

        .ci-controls input[type="range"] {
          width: 100%;
          accent-color: #a855f7;
          height: 4px;
        }

        /* Overlay controls */
        .overlay-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .overlay-input {
          width: 52px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text);
          text-align: center;
          outline: none;
          font-family: inherit;
        }

        .overlay-input:focus {
          border-color: #a855f7;
        }

        .btn-random {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 6px;
          color: #a855f7;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-random:hover {
          background: rgba(168, 85, 247, 0.2);
        }

        .opacity-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .mini-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          min-width: 42px;
        }

        .opacity-row input[type="range"] {
          flex: 1;
        }

        /* Toggle switch */
        .toggle-wrap {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          flex-shrink: 0;
        }

        .toggle-wrap input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          inset: 0;
          background: rgba(255,255,255,0.1);
          border-radius: 20px;
          transition: 0.3s;
        }

        .toggle-slider::before {
          content: "";
          position: absolute;
          height: 16px;
          width: 16px;
          left: 2px;
          bottom: 2px;
          background: #fff;
          border-radius: 50%;
          transition: 0.3s;
        }

        .toggle-wrap input:checked + .toggle-slider {
          background: #a855f7;
        }

        .toggle-wrap input:checked + .toggle-slider::before {
          transform: translateX(16px);
        }

        :root.light-theme .toggle-slider {
          background: #d1d5db;
        }

        /* Photo slots list in sidebar */
        .photo-slots-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .photo-slot-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .photo-slot-item:hover {
          background: rgba(168, 85, 247, 0.05);
        }

        .slot-thumb {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid var(--card-border);
        }

        .slot-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .thumb-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--input-bg);
          color: var(--text-muted);
        }

        .slot-label {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text);
        }

        .slot-actions {
          display: flex;
          gap: 4px;
        }

        .slot-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid var(--card-border);
          background: transparent;
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .slot-action-btn:hover {
          background: rgba(168, 85, 247, 0.1);
          color: #a855f7;
          border-color: rgba(168, 85, 247, 0.3);
        }

        .slot-action-btn.delete:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        /* MAIN CONTENT */
        .ci-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .preview-section {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 16px;
        }

        .preview-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }

        .badge {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          letter-spacing: 0;
        }

        /* COLLAGE PREVIEW - matches Facebook exactly */
        .collage-preview {
          width: 100%;
          aspect-ratio: 1200 / 630;
          border-radius: 8px;
          overflow: hidden;
          background: #1a1a1a;
          position: relative;
        }

        /* Grid Layouts */
        .grid-5 {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          gap: ${gap}px;
        }

        .grid-5-top {
          display: flex;
          flex: 1.2;
          gap: ${gap}px;
        }

        .grid-5-bottom {
          display: flex;
          flex: 0.8;
          gap: ${gap}px;
        }

        .grid-4 {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          gap: ${gap}px;
        }

        .grid-4-row {
          display: flex;
          flex: 1;
          gap: ${gap}px;
        }

        .grid-3 {
          display: flex;
          width: 100%;
          height: 100%;
          gap: ${gap}px;
        }

        .grid-3-left {
          flex: 1.2;
          display: flex;
        }

        .grid-3-right {
          flex: 0.8;
          display: flex;
          flex-direction: column;
          gap: ${gap}px;
        }

        .grid-2 {
          display: flex;
          width: 100%;
          height: 100%;
          gap: ${gap}px;
        }

        .grid-1 {
          display: flex;
          width: 100%;
          height: 100%;
        }

        /* Preview Slot */
        .preview-slot {
          flex: 1;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: outline 0.15s;
        }

        .preview-slot.drag-over {
          outline: 2px solid #a855f7;
          outline-offset: -2px;
        }

        .slot-image-wrap {
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        .slot-image-wrap img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform-origin: center;
        }

        .slot-empty {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(255,255,255,0.03);
          color: var(--text-muted);
          transition: background 0.2s;
        }

        .slot-empty span {
          font-size: 0.72rem;
          font-weight: 600;
        }

        .preview-slot:hover .slot-empty {
          background: rgba(168, 85, 247, 0.08);
          color: #a855f7;
        }

        /* Pencil edit button on slot */
        .slot-edit-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          border: none;
          border-radius: 6px;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 5;
        }

        .preview-slot:hover .slot-edit-btn {
          opacity: 1;
        }

        .slot-edit-btn:hover {
          background: rgba(168, 85, 247, 0.8);
        }

        /* Overlay on last slot */
        .slot-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          pointer-events: none;
        }

        .overlay-number {
          color: #ffffff;
          font-weight: 700;
          font-size: clamp(1.2rem, 3.5vw, 2.8rem);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }

        /* Actions Row */
        .actions-row {
          display: flex;
          gap: 10px;
        }

        .btn-download {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          padding: 12px 20px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          color: var(--text);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-download:hover {
          border-color: rgba(168, 85, 247, 0.4);
          background: rgba(168, 85, 247, 0.05);
        }

        .btn-download:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Redirect Form Card */
        .redirect-form-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 20px;
        }

        .form-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 16px;
        }

        .form-field {
          margin-bottom: 12px;
        }

        .form-field label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .form-field input,
        .form-field textarea {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--text);
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field textarea:focus {
          border-color: #a855f7;
        }

        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .error-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #ef4444;
          margin-bottom: 12px;
        }

        .btn-convert {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          background: var(--accent);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.92rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s;
        }

        .btn-convert:hover {
          opacity: 0.9;
        }

        .btn-convert:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Result box */
        .result-box {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--card-border);
        }

        .result-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #22c55e;
          margin-bottom: 8px;
        }

        .result-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .result-url {
          flex: 1;
          font-size: 0.85rem;
          font-weight: 500;
          color: #a855f7;
          word-break: break-all;
        }

        .btn-copy {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 6px;
          color: #a855f7;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }

        .btn-copy:hover {
          background: rgba(168, 85, 247, 0.2);
        }

        .btn-copy.copied {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        /* EDIT MODAL */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .edit-modal {
          background: var(--bg);
          border: 1px solid var(--card-border);
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--card-border);
        }

        .modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }

        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .modal-close:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.2);
        }

        .modal-preview {
          aspect-ratio: 16/10;
          overflow: hidden;
          position: relative;
          margin: 16px;
          border-radius: 12px;
          background: #1a1a1a;
        }

        .modal-preview img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform-origin: center;
        }

        .modal-controls {
          padding: 0 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .modal-ctrl {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-ctrl-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .ctrl-val {
          margin-left: auto;
          font-weight: 700;
          color: #a855f7;
          font-size: 0.75rem;
        }

        .modal-ctrl input[type="range"] {
          width: 100%;
          accent-color: #a855f7;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .btn-replace {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          color: var(--text);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .btn-replace:hover {
          border-color: #a855f7;
        }

        .btn-reset {
          padding: 8px 14px;
          background: transparent;
          border: 1px solid var(--card-border);
          border-radius: 8px;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
        }

        .btn-reset:hover {
          border-color: var(--text-muted);
        }

        .btn-done {
          margin-left: auto;
          padding: 8px 20px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.2s;
        }

        .btn-done:hover {
          opacity: 0.9;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .ci-body {
            flex-direction: column;
          }

          .ci-controls {
            width: 100%;
            min-width: 0;
            position: static;
          }

          .ci-page {
            padding: 16px;
          }

          .url-fetch-row {
            flex-direction: column;
          }

          .actions-row {
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .ci-header h1 {
            font-size: 1.2rem;
          }

          .edit-modal {
            max-width: 100%;
            border-radius: 16px;
          }

          .modal-actions {
            flex-wrap: wrap;
          }

          .overlay-number {
            font-size: 1.2rem !important;
          }
        }

        /* Upload to ImgBB button */
        .btn-upload-imgbb {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          padding: 12px 20px;
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.2);
          border-radius: 10px;
          color: #a855f7;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-upload-imgbb:hover {
          background: rgba(168, 85, 247, 0.15);
          border-color: rgba(168, 85, 247, 0.4);
        }

        .btn-upload-imgbb:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :root.light-theme .btn-upload-imgbb {
          background: rgba(139, 92, 246, 0.06);
          border-color: rgba(139, 92, 246, 0.2);
          color: #7c3aed;
        }

        /* Hosted Image URL result */
        .imgbb-result {
          background: rgba(34, 197, 94, 0.05);
          border: 1px solid rgba(34, 197, 94, 0.15);
          border-radius: 12px;
          padding: 12px 16px;
        }

        .imgbb-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #22c55e;
          margin-bottom: 8px;
        }

        .imgbb-url-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .imgbb-url {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
          color: #22c55e;
          word-break: break-all;
          font-family: monospace;
        }

        .btn-copy-sm {
          padding: 4px 10px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 6px;
          color: #22c55e;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
        }

        .btn-copy-sm:hover {
          background: rgba(34, 197, 94, 0.2);
        }

        .btn-copy-sm.copied {
          background: rgba(34, 197, 94, 0.15);
          color: #16a34a;
        }

        /* WordPress URL + Fetch row */
        .url-fetch-row {
          display: flex;
          gap: 8px;
        }

        .url-fetch-row input {
          flex: 1;
        }

        .btn-fetch {
          padding: 10px 16px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: opacity 0.2s;
        }

        .btn-fetch:hover {
          opacity: 0.9;
        }

        .btn-fetch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* OG Override Panel */
        .og-override-panel {
          border: 1px solid var(--card-border);
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
          background: rgba(168, 85, 247, 0.02);
        }

        .og-override-panel legend {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          padding: 0 8px;
        }

        .og-hint {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 4px 0 12px;
          line-height: 1.4;
        }

        .og-override-panel textarea {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--text);
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
          resize: vertical;
        }

        .og-override-panel textarea:focus {
          border-color: #a855f7;
        }

        :root.light-theme .og-override-panel {
          background: rgba(139, 92, 246, 0.03);
        }
      `}</style>
    </div>
  );
}

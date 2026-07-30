import React, { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Cropper from "react-cropper";
// MediaPipe FaceDetector — loaded dynamically (browser-only)
let mediapipeDetector: any = null;

interface ImageAdjustment {
  zoom: number;
  x: number;
  y: number;
  blur: number;
  rotate: number;
}

const DEFAULT_ADJ: ImageAdjustment = { zoom: 1.0, x: 0, y: 0, blur: 0, rotate: 0 };

// Get slot coordinates for canvas
function getSlotCoordinates(layoutName: string, gapPx: number) {
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
}

export default function ClickableImage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Images state - empty slots by default
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [originalImages, setOriginalImages] = useState<(string | null)[]>([null, null, null, null, null]);
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

  const [isCropping, setIsCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined);
  const [cropBlur, setCropBlur] = useState<number>(0);

  // When editingSlot changes to null, reset isCropping
  useEffect(() => {
    if (editingSlot === null) {
      setIsCropping(false);
    }
  }, [editingSlot]);

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
  const [isDraggingCustomImg, setIsDraggingCustomImg] = useState(false);
  const [uploadingCustomImg, setUploadingCustomImg] = useState(false);

  // Drag state
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Face detection state
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [detectingFace, setDetectingFace] = useState<number | null>(null);
  const [faceToast, setFaceToast] = useState<{ msg: string; type: "success" | "info" } | null>(null);

  // Keyboard Shortcuts Modal State
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const router = useRouter();
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cropperRef = useRef<any>(null);

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

  // Load Google MediaPipe FaceDetector model (browser-only, once on mount)
  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      try {
        // Dynamic import — never runs on the server (Next.js SSR safe)
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            // Google's short-range model — optimised for selfie/portrait images
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/short_range/float16/1/short_range.task",
            delegate: "GPU",
          },
          runningMode: "IMAGE", // static images, not video
          minDetectionConfidence: 0.4,
          minSuppressionThreshold: 0.3,
        });

        mediapipeDetector = detector;
        if (!cancelled) setFaceApiLoaded(true);
        console.info("[MediaPipe] FaceDetector ready");
      } catch (err) {
        console.warn("[MediaPipe] Model load failed:", err);
      }
    };
    loadModel();
    return () => { cancelled = true; };
  }, []);

  // Reusable Crop Apply function
  const applyCrop = () => {
    if (editingSlot === null) return;
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });
      if (croppedCanvas) {
        let dataUrl = croppedCanvas.toDataURL("image/jpeg", 0.92);
        if (cropBlur > 0) {
          const blurredCanvas = document.createElement("canvas");
          blurredCanvas.width = croppedCanvas.width;
          blurredCanvas.height = croppedCanvas.height;
          const bCtx = blurredCanvas.getContext("2d");
          if (bCtx) {
            bCtx.filter = `blur(${cropBlur}px)`;
            bCtx.drawImage(croppedCanvas, 0, 0);
            dataUrl = blurredCanvas.toDataURL("image/jpeg", 0.92);
          }
        }
        setImages((prev) => {
          const updated = [...prev];
          updated[editingSlot] = dataUrl;
          return updated;
        });

        setAdjustments((prev) => {
          const updated = [...prev];
          updated[editingSlot] = { ...DEFAULT_ADJ, blur: cropBlur };
          return updated;
        });
      }
    }
    setEditingSlot(null);
  };

  // Show & auto-dismiss the face toast
  const showFaceToast = (msg: string, type: "success" | "info" = "success") => {
    setFaceToast({ msg, type });
    setTimeout(() => setFaceToast(null), 3000);
  };

  /**
   * Auto-detect the human face in the image at `index` using Google MediaPipe
   * and AUTOMATICALLY CROP the image around the face to match the layout slot's
   * exact aspect ratio. This eliminates the need for manual cropping/positioning.
   */
  const autoFocusFace = async (index: number, imgUrl?: string) => {
    const url = imgUrl ?? images[index];
    if (!url) return;

    // Load detector on demand if not ready yet
    if (!mediapipeDetector) {
      try {
        const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        mediapipeDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/short_range/float16/1/short_range.task",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
          minDetectionConfidence: 0.4,
          minSuppressionThreshold: 0.3,
        });
        setFaceApiLoaded(true);
      } catch (e) {
        console.warn("[MediaPipe] On-demand load error:", e);
        showFaceToast("AI model load failed", "info");
        return;
      }
    }

    setDetectingFace(index);
    try {
      // Load the image into an HTMLImageElement so MediaPipe can process it
      const img = await new Promise<HTMLImageElement | null>((resolve) => {
        const el = new Image();
        el.crossOrigin = "anonymous";
        el.onload = () => resolve(el);
        el.onerror = () => resolve(null);
        el.src = url;
      });
      if (!img) { setDetectingFace(null); return; }

      // Run MediaPipe detection on the image element
      const result = mediapipeDetector.detect(img);
      const detections = result?.detections ?? [];

      if (detections.length === 0) {
        showFaceToast("No face found — showing full image", "info");
        setDetectingFace(null);
        return;
      }

      // Pick the largest bounding box (most prominent / closest face)
      const biggest = detections.reduce((best: any, d: any) => {
        const bW = d.boundingBox.width;
        const bH = d.boundingBox.height;
        const bestW = best.boundingBox.width;
        const bestH = best.boundingBox.height;
        return bW * bH > bestW * bestH ? d : best;
      });

      const box = biggest.boundingBox;
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Calculate target layout slot dimensions and aspect ratio
      const coords = getSlotCoordinates(layout, gap);
      const slot = coords[index];
      const slotW = slot ? slot.w : 600;
      const slotH = slot ? slot.h : 630;
      const slotAspect = slotW / slotH;

      // Face bounding box dimensions & center in image pixels
      const faceW = box.width * imgW;
      const faceH = box.height * imgH;
      const faceCX = (box.originX + box.width / 2) * imgW;
      const faceCY = (box.originY + box.height / 2) * imgW > imgH ? (box.originY + box.height / 2) * imgH : (box.originY + box.height / 2) * imgH;

      // Calculate crop box around face maintaining exact slotAspect
      // Target: face height ~40% of crop height for natural head + shoulder framing
      let cropH = faceH * 2.5;
      let cropW = cropH * slotAspect;

      if (cropW < faceW * 1.8) {
        cropW = faceW * 1.8;
        cropH = cropW / slotAspect;
      }

      // Clamp crop dimensions within original image size
      if (cropW > imgW) {
        cropW = imgW;
        cropH = cropW / slotAspect;
      }
      if (cropH > imgH) {
        cropH = imgH;
        cropW = cropH * slotAspect;
      }

      // Center crop box on (faceCX, faceCY)
      let cropX = faceCX - cropW / 2;
      let cropY = faceCY - cropH / 2;

      // Keep crop box within image boundaries [0, imgW - cropW] and [0, imgH - cropH]
      cropX = Math.max(0, Math.min(imgW - cropW, cropX));
      cropY = Math.max(0, Math.min(imgH - cropH, cropY));

      // Perform automatic physical crop using offscreen canvas
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(cropW);
      cropCanvas.height = Math.round(cropH);
      const ctx = cropCanvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(
          img,
          Math.round(cropX), Math.round(cropY), Math.round(cropW), Math.round(cropH),
          0, 0, Math.round(cropW), Math.round(cropH)
        );
        const croppedDataUrl = cropCanvas.toDataURL("image/jpeg", 0.92);

        // Update images state with the AI cropped image
        setImages((prev) => {
          const updated = [...prev];
          updated[index] = croppedDataUrl;
          return updated;
        });

        // Reset manual adjustments for this slot
        setAdjustments((prev) => {
          const updated = [...prev];
          updated[index] = { zoom: 1.0, x: 0, y: 0, blur: 0, rotate: 0 };
          return updated;
        });
      }

      const faceScore = biggest.categories?.[0]?.score;
      const scoreText = faceScore ? ` (${Math.round(faceScore * 100)}% confidence)` : "";
      showFaceToast(
        `✨ Auto-cropped around face${scoreText}!`,
        "success"
      );
    } catch (err) {
      console.warn("[MediaPipe] Detection error:", err);
      showFaceToast("Detection error — try manual adjust", "info");
    } finally {
      setDetectingFace(null);
    }
  };

  // Handle file upload — Auto-popup & AI face crop on add
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
      setImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
      setAdjustments((prev) => {
        const updated = [...prev];
        updated[index] = { ...DEFAULT_ADJ };
        return updated;
      });
      // Immediately open edit modal for this slot
      setEditingSlot(index);
      // Auto face-detect after state update
      setTimeout(() => autoFocusFace(index, url), 100);
    }
  };

  // Handle drag and drop — Auto-popup & AI face crop on drop
  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setOriginalImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
      setImages((prev) => {
        const updated = [...prev];
        updated[index] = url;
        return updated;
      });
      setAdjustments((prev) => {
        const updated = [...prev];
        updated[index] = { ...DEFAULT_ADJ };
        return updated;
      });
      // Immediately open edit modal for this slot
      setEditingSlot(index);
      // Auto face-detect after state update
      setTimeout(() => autoFocusFace(index, url), 100);
    }
  };

  // Long press & mouse handlers for slot interaction
  const handleSlotMouseDown = (idx: number) => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Long hold (>500ms) opens device photo picker
      fileInputRefs.current[idx]?.click();
    }, 500);
  };

  const handleSlotMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSlotClick = (idx: number, hasImage: boolean) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (!hasImage) {
      fileInputRefs.current[idx]?.click();
    } else {
      setEditingSlot(idx);
    }
  };

  // Global Keyboard Shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

      // Enter key inside crop popup applies crop
      if (e.key === "Enter" && editingSlot !== null) {
        e.preventDefault();
        applyCrop();
        return;
      }

      // Esc closes open modals
      if (e.key === "Escape") {
        if (editingSlot !== null) setEditingSlot(null);
        if (showShortcutsModal) setShowShortcutsModal(false);
        return;
      }

      if (isInput) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        const firstEmpty = images.findIndex((img) => !img);
        const targetIdx = firstEmpty !== -1 ? firstEmpty : 0;
        fileInputRefs.current[targetIdx]?.click();
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (editingSlot === null) {
          const firstWithImage = images.findIndex((img) => !!img);
          if (firstWithImage !== -1) setEditingSlot(firstWithImage);
        }
      } else if (e.key.toLowerCase() === "a") {
        e.preventDefault();
        const slotToCrop = editingSlot !== null ? editingSlot : images.findIndex((img) => !!img);
        if (slotToCrop !== -1 && images[slotToCrop]) {
          autoFocusFace(slotToCrop);
        }
      } else if (e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleConvert({ preventDefault: () => {} } as any);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingSlot, showShortcutsModal, images, cropBlur, cropAspect]);

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

  const handleCustomImageUpload = async (file: File) => {
    setUploadingCustomImg(true);
    setErrorMessage("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("https://api.imgbb.com/1/upload?key=7acb2b5955d0a1e35ba91e981a8d1da8", {
        method: "POST", body: fd
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error?.message || "Upload failed");
      setCollageImageUrl(data.data.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Upload error");
    } finally {
      setUploadingCustomImg(false);
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
        onMouseDown={() => handleSlotMouseDown(idx)}
        onMouseUp={handleSlotMouseUp}
        onTouchStart={() => handleSlotMouseDown(idx)}
        onTouchEnd={handleSlotMouseUp}
        onContextMenu={(e) => {
          e.preventDefault();
          if (hasImage) setEditingSlot(idx);
        }}
        onClick={() => handleSlotClick(idx, hasImage)}
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
            {/* Overlay on last slot */}
            {isLastSlot && showOverlay && overlayText && (
              <div
                className="slot-overlay"
                style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
              >
                <span className="overlay-number">{overlayText}</span>
              </div>
            )}
            {/* Face scanning badge */}
            {detectingFace === idx && (
              <div className="slot-scanning-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="spin-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Scanning face...
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
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" />
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

        <div className="studio-layout-2col">
          {/* Left: Controls */}
          <div className="sidebar glass-panel">
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
          <div className="workspace">
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

                  <div className="form-field">
                    <label>Custom Image (Drag & Drop or Upload)</label>
                    <div 
                      className={`dropzone ${isDraggingCustomImg ? "dragging" : ""} ${collageImageUrl ? "has-image" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingCustomImg(true); }}
                      onDragLeave={() => setIsDraggingCustomImg(false)}
                      onDrop={async (e) => {
                        e.preventDefault();
                        setIsDraggingCustomImg(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type.startsWith("image/")) {
                          await handleCustomImageUpload(file);
                        }
                      }}
                      onClick={() => document.getElementById("customImageFile")?.click()}
                    >
                      <input
                        type="file"
                        id="customImageFile"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) await handleCustomImageUpload(file);
                        }}
                        style={{ display: "none" }}
                      />
                      
                      {collageImageUrl ? (
                        <div className="dropzone-preview">
                          <img src={collageImageUrl} alt="Preview" className="img-preview" />
                          <div className="dropzone-overlay">
                            <svg className="upload-icon-small" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <div className="dropzone-prompt">
                          <svg className="upload-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {uploadingCustomImg ? (
                            <span>Uploading to ImgBB...</span>
                          ) : (
                            <span><strong>Choose a file</strong> or drag & drop here (ImgBB)</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="image-url-manual">
                      <span className="or-divider">Or enter URL manually:</span>
                      <input
                        type="url"
                        placeholder="https://yourblog.com/wp-content/uploads/photo.jpg"
                        value={collageImageUrl}
                        onChange={(e) => setCollageImageUrl(e.target.value)}
                      />
                    </div>
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

                <button type="submit" className="btn-primary" style={{width:"100%", padding:"16px", fontSize:"16px"}} disabled={converting}>
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

      {/* Adjust Framing Modal — 100% Exact match to fb_play_mockups.html */}
      {editingSlot !== null && images[editingSlot] && (() => {
        const coords = getSlotCoordinates(layout, gap);
        const slot = coords[editingSlot];
        const currentSlotAspect = slot ? slot.w / slot.h : 1;

        return (
          <div className="modal-backdrop" onClick={applyCrop}>
            <div className="modal-content-framing" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setEditingSlot(null)} title="Close">
                &times;
              </button>
              <h2>Adjust Framing (Photo {editingSlot + 1})</h2>

              {/* Top Control Bar: Ratio Presets + Tool Action Icons */}
              <div className="framing-toolbar">
                <div className="ratio-presets">
                  <button
                    type="button"
                    className={cropAspect === currentSlotAspect ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      setCropAspect(currentSlotAspect);
                      cropperRef.current?.cropper?.setAspectRatio(currentSlotAspect);
                    }}
                  >
                    Slot Ratio
                  </button>
                  <button
                    type="button"
                    className={cropAspect === undefined ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      setCropAspect(undefined);
                      cropperRef.current?.cropper?.setAspectRatio(NaN);
                    }}
                  >
                    Free
                  </button>
                  <button
                    type="button"
                    className={cropAspect === 1 ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      setCropAspect(1);
                      cropperRef.current?.cropper?.setAspectRatio(1);
                    }}
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    className={cropAspect === 16 / 9 ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      setCropAspect(16 / 9);
                      cropperRef.current?.cropper?.setAspectRatio(16 / 9);
                    }}
                  >
                    16:9
                  </button>
                  <button
                    type="button"
                    className={cropAspect === 9 / 16 ? "btn-primary" : "btn-secondary"}
                    onClick={() => {
                      setCropAspect(9 / 16);
                      cropperRef.current?.cropper?.setAspectRatio(9 / 16);
                    }}
                  >
                    9:16
                  </button>
                </div>

                <div className="tool-actions">
                  <button
                    type="button"
                    className="btn-secondary btn-tool-icon"
                    title="Zoom In"
                    onClick={() => cropperRef.current?.cropper?.zoom(0.1)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-tool-icon"
                    title="Zoom Out"
                    onClick={() => cropperRef.current?.cropper?.zoom(-0.1)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-tool-icon"
                    title="Rotate Left 45°"
                    onClick={() => cropperRef.current?.cropper?.rotate(-45)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-tool-icon"
                    title="Rotate Right 45°"
                    onClick={() => cropperRef.current?.cropper?.rotate(45)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-tool-icon"
                    title="Revert to Original"
                    onClick={() => {
                      const orig = originalImages[editingSlot] || images[editingSlot];
                      if (orig && cropperRef.current?.cropper) {
                        cropperRef.current.cropper.replace(orig);
                        cropperRef.current.cropper.reset();
                        setCropBlur(0);
                        const newImages = [...images];
                        newImages[editingSlot] = orig;
                        setImages(newImages);
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    title="Auto Detect & Crop Face"
                    disabled={detectingFace !== null}
                    onClick={() => autoFocusFace(editingSlot)}
                  >
                    {detectingFace === editingSlot ? "Cropping..." : "✂️ AI Crop Face"}
                  </button>
                </div>
              </div>

              {/* Blur Feature Slider */}
              <div className="crop-blur-row">
                <label>Blur Effect</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={cropBlur}
                  onChange={(e) => setCropBlur(parseInt(e.target.value))}
                />
                <span className="blur-val">{cropBlur}px</span>
              </div>

              {/* Image Cropper Workspace with REAL-TIME LIVE BLUR PREVIEW */}
              <div
                className="crop-container-box"
                style={{ filter: cropBlur > 0 ? `blur(${cropBlur}px)` : "none" }}
              >
                <Cropper
                  ref={cropperRef}
                  src={originalImages[editingSlot] || images[editingSlot]!}
                  style={{ width: "100%", height: "100%", background: "#000" }}
                  zoomTo={1}
                  viewMode={1}
                  aspectRatio={cropAspect !== undefined ? cropAspect : currentSlotAspect}
                  background={false}
                  responsive={true}
                  autoCropArea={1}
                  checkOrientation={false}
                  guides={true}
                />
              </div>

              {/* Bottom Actions Row */}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingSlot(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={applyCrop}
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Keyboard Shortcuts Button */}
      <button
        id="floatingShortcutsBtn"
        title="Keyboard Shortcuts (?)"
        onClick={() => setShowShortcutsModal(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <line x1="6" y1="8" x2="6.01" y2="8"></line>
          <line x1="10" y1="8" x2="10.01" y2="8"></line>
          <line x1="14" y1="8" x2="14.01" y2="8"></line>
          <line x1="18" y1="8" x2="18.01" y2="8"></line>
          <line x1="6" y1="12" x2="6.01" y2="12"></line>
          <line x1="10" y1="12" x2="10.01" y2="12"></line>
          <line x1="14" y1="12" x2="14.01" y2="12"></line>
          <line x1="18" y1="12" x2="18.01" y2="12"></line>
          <line x1="8" y1="16" x2="16" y2="16"></line>
        </svg>
      </button>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="modal-backdrop" onClick={() => setShowShortcutsModal(false)}>
          <div className="shortcuts-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShortcutsModal(false)} title="Close">
              &times;
            </button>
            <h2>Keyboard Shortcuts</h2>
            <div className="shortcut-grid">
              <div className="shortcut-item"><span>Open file picker / Add photo</span> <kbd>F</kbd></div>
              <div className="shortcut-item"><span>Open crop tool (Selected slot)</span> <kbd>C</kbd></div>
              <div className="shortcut-item"><span>Auto-magic AI face crop</span> <kbd>A</kbd></div>
              <div className="shortcut-item"><span>Apply Crop (In crop popup)</span> <kbd>Enter</kbd></div>
              <div className="shortcut-item"><span>Generate Redirect Link</span> <kbd>G</kbd></div>
              <div className="shortcut-item"><span>Close open modals</span> <kbd>Esc</kbd></div>
              <div className="shortcut-item"><span>Show Keyboard Shortcuts</span> <kbd>?</kbd></div>
              <div className="shortcut-item"><span>Crop image slot</span> <kbd>Right Click</kbd></div>
              <div className="shortcut-item"><span>Select photo from device</span> <kbd>Long Press</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Face detection toast notification */}
      {faceToast && (
        <div className={`face-toast face-toast-${faceToast.type}`}>
          {faceToast.type === "success" ? (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {faceToast.msg}
        </div>
      )}

      {/* Detecting face overlay badges on preview slots */}
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
          color: var(--text-main);
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
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 16px;
          position: sticky;
          top: 80px;
        }

        .ctrl-section {
          padding: 12px 0;
          border-bottom: 1px solid var(--glass-border);
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
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-main);
          cursor: pointer;
          outline: none;
          font-family: inherit;
        }

        .ci-controls select:focus {
          border-color: var(--primary);
        }

        .ci-controls input[type="range"] {
          width: 100%;
          accent-color: var(--primary);
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
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
          text-align: center;
          outline: none;
          font-family: inherit;
        }

        .overlay-input:focus {
          border-color: var(--primary);
        }

        .btn-random {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: rgba(0, 113, 227, 0.12);
          border: 1px solid rgba(0, 113, 227, 0.25);
          border-radius: 6px;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-random:hover {
          background: rgba(0, 113, 227, 0.22);
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
          background: var(--primary);
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
          border: 1px solid var(--glass-border);
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
          color: var(--text-main);
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
          border: 1px solid var(--glass-border);
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
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
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
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          color: var(--text-main);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-download:hover {
          border-color: rgba(0, 113, 227, 0.4);
          background: rgba(0, 113, 227, 0.05);
        }

        .btn-download:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Redirect Form Card */
        .redirect-form-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
        }

        .form-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-main);
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
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--text-main);
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-field input:focus,
        .form-field textarea:focus {
          border-color: var(--primary);
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
          border-top: 1px solid var(--glass-border);
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
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px 12px;
        }

        .btn-fetch {
          padding: 8px 16px;
          background: rgba(52, 199, 89, 0.14);
          border: 1px solid rgba(52, 199, 89, 0.35);
          border-radius: 8px;
          color: #34c759;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .btn-fetch:hover:not(:disabled) {
          background: rgba(52, 199, 89, 0.24);
          border-color: #34c759;
          transform: translateY(-1px);
        }

        .btn-fetch:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .dropzone {
          border: 2px dashed var(--glass-border);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          background: var(--input-bg);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dropzone:hover,
        .dropzone.dragging {
          border-color: var(--primary);
          background: rgba(0, 113, 227, 0.15);
        }

        .dropzone-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 113, 227, 0.25);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
        }

        .result-url {
          flex: 1;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--primary);
          word-break: break-all;
        }

        .btn-copy {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(0, 113, 227, 0.12);
          border: 1px solid rgba(0, 113, 227, 0.25);
          border-radius: 6px;
          color: var(--primary);
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

         /* ── Adjust Framing Modal (100% exact match to fb_play_mockups.html) ── */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content-framing {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--glass-shadow);
          padding: 24px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          color: var(--text-main);
          position: relative;
        }

        .modal-content-framing h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 16px;
          color: var(--text-main);
          letter-spacing: -0.5px;
        }

        .modal-close {
          position: absolute;
          top: 20px;
          right: 20px;
          background: transparent;
          border: none;
          font-size: 24px;
          line-height: 1;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }

        .modal-close:hover {
          color: var(--danger);
        }

        .framing-toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
        }

        .ratio-presets,
        .tool-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn-primary {
          background: var(--primary);
          color: #ffffff;
          border: none;
          border-radius: var(--radius-sm);
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary:hover {
          background: var(--primary-hover);
        }

        .btn-secondary {
          background: var(--btn-hover);
          color: var(--text-main);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover:not(:disabled) {
          border-color: var(--primary);
          color: var(--primary);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-tool-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          padding: 0;
        }

        .crop-blur-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding: 10px 14px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
        }

        .crop-blur-row label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .crop-blur-row input[type="range"] {
          flex: 1;
          accent-color: var(--primary);
        }

        .blur-val {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary);
          min-width: 36px;
          text-align: right;
        }

        .crop-container-box {
          width: 100%;
          height: 50vh;
          background: #000000;
          margin-bottom: 20px;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* ── Auto Focus Face button ── */
        .btn-face-detect {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, rgba(0, 113, 227, 0.12), rgba(0, 113, 227, 0.06));
          border: 1px solid rgba(0, 113, 227, 0.35);
          border-radius: 8px;
          color: var(--primary);
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }

        .btn-face-detect::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0, 113, 227, 0.2), rgba(0, 113, 227, 0.1));
          opacity: 0;
          transition: opacity 0.2s;
        }

        .btn-face-detect:hover:not(:disabled)::before {
          opacity: 1;
        }

        .btn-face-detect:hover:not(:disabled) {
          border-color: var(--primary-hover);
          box-shadow: 0 0 12px rgba(0, 113, 227, 0.25);
          color: var(--primary-hover);
          transform: translateY(-1px);
        }

        .btn-face-detect:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-face-detect.detecting {
          animation: face-pulse 1.4s ease-in-out infinite;
        }

        @keyframes face-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0, 113, 227, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(0, 113, 227, 0); }
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ── Floating Shortcuts Button ── */
        #floatingShortcutsBtn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 999;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
          color: var(--text-main);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        #floatingShortcutsBtn:hover {
          background: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          transform: scale(1.1);
        }

        /* ── Keyboard Shortcuts Modal ── */
        .shortcuts-modal-content {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--glass-shadow);
          padding: 24px;
          width: 100%;
          max-width: 500px;
          color: var(--text-main);
          position: relative;
        }

        .shortcuts-modal-content h2 {
          margin-top: 0;
          margin-bottom: 20px;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
          font-size: 14px;
          color: var(--text-main);
        }

        .shortcut-item kbd {
          background: var(--bg-main);
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2);
          color: var(--primary);
          display: inline-block;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 5px 9px;
          white-space: nowrap;
        }

        /* ── Face detection toast ── */
        .face-toast {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: inherit;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          animation: toast-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          pointer-events: none;
        }

        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .face-toast-success {
          background: rgba(16, 185, 129, 0.14);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
        }

        .face-toast-info {
          background: rgba(0, 113, 227, 0.12);
          border: 1px solid rgba(0, 113, 227, 0.3);
          color: var(--primary);
        }

        /* ── Slot "scanning" badge overlay ── */
        .slot-scanning-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          backdrop-filter: blur(6px);
          pointer-events: none;
          z-index: 10;
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
          background: rgba(0, 113, 227, 0.08);
          border: 1px solid rgba(0, 113, 227, 0.25);
          border-radius: 10px;
          color: var(--primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-upload-imgbb:hover {
          background: rgba(0, 113, 227, 0.15);
          border-color: var(--primary);
        }

        .btn-upload-imgbb:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        :root.light-theme .btn-upload-imgbb {
          background: rgba(0, 113, 227, 0.06);
          border-color: rgba(0, 113, 227, 0.2);
          color: var(--primary);
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
          border: 1px solid var(--glass-border);
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
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 16px;
          margin: 16px 0;
          background: rgba(168, 85, 247, 0.02);
        }

        .og-override-panel legend {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-main);
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
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--text-main);
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

        /* Dropzone Styles */
        .dropzone {
          border: 2px dashed var(--glass-border);
          border-radius: 12px;
          background: rgba(168, 85, 247, 0.02);
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          overflow: hidden;
          position: relative;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
        }

        .dropzone:hover, .dropzone.dragging {
          border-color: #a855f7;
          background: rgba(168, 85, 247, 0.08);
        }

        .dropzone-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.85rem;
          padding: 20px;
        }

        .upload-icon {
          width: 36px;
          height: 36px;
          color: #a855f7;
        }

        .dropzone-preview {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .img-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          max-height: 200px;
        }

        .dropzone-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          opacity: 0;
          transition: opacity 0.2s;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .dropzone:hover .dropzone-overlay {
          opacity: 1;
        }

        .btn-crop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
        }

        .btn-crop:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

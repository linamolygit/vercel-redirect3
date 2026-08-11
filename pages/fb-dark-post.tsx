import type { NextPage } from "next";
import Head from "next/head";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  Rocket,
  Smile,
  Image as ImageIcon,
  X,
  Globe,
  Layers,
  CheckCircle2,
  AlertCircle,
  Zap,
  Play,
  Upload,
  Calendar,
  FileText,
  Lock,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Share2,
  Sliders,
  Clock,
  Copy,
} from "lucide-react";


// Layout Presets
interface LayoutOption {
  id: string;
  name: string;
  slots: number;
  icon: React.ReactNode;
}

const LAYOUT_PRESETS: LayoutOption[] = [
  {
    id: "5-photos-2-3-top",
    name: "5 Photos (Top 2 + Bottom 3)",
    slots: 5,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="21" height="20" rx="2" fill="#94a3b8" />
        <rect x="25" y="2" width="21" height="20" rx="2" fill="#94a3b8" />
        <rect x="2" y="24" width="13" height="22" rx="2" fill="#94a3b8" />
        <rect x="17" y="24" width="14" height="22" rx="2" fill="#94a3b8" />
        <rect x="33" y="24" width="13" height="22" rx="2" fill="#475569" />
      </svg>
    ),
  },
  {
    id: "5-photos-2-3",
    name: "5 Photos (Left 2 + Right 3)",
    slots: 5,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="21" height="21" rx="2" fill="#94a3b8" />
        <rect x="2" y="25" width="21" height="21" rx="2" fill="#94a3b8" />
        <rect x="25" y="2" width="21" height="13" rx="2" fill="#94a3b8" />
        <rect x="25" y="17" width="21" height="14" rx="2" fill="#94a3b8" />
        <rect x="25" y="33" width="21" height="13" rx="2" fill="#475569" />
      </svg>
    ),
  },
  {
    id: "4-photos",
    name: "4 Photos (2x2 Grid)",
    slots: 4,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="21" height="21" rx="2" fill="#94a3b8" />
        <rect x="25" y="2" width="21" height="21" rx="2" fill="#94a3b8" />
        <rect x="2" y="25" width="21" height="21" rx="2" fill="#94a3b8" />
        <rect x="25" y="25" width="21" height="21" rx="2" fill="#475569" />
      </svg>
    ),
  },
  {
    id: "3-photos-top",
    name: "3 Photos (Top 1 + Bottom 2)",
    slots: 3,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="2" y="2" width="44" height="22" rx="2" fill="#94a3b8" />
        <rect x="2" y="26" width="21" height="20" rx="2" fill="#94a3b8" />
        <rect x="25" y="26" width="21" height="20" rx="2" fill="#475569" />
      </svg>
    ),
  },
  {
    id: "1-photo",
    name: "Single Square Photo (1:1)",
    slots: 1,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="4" fill="#94a3b8" />
      </svg>
    ),
  },
  {
    id: "video-card",
    name: "Play Button Overlay",
    slots: 1,
    icon: (
      <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="4" fill="#475569" />
        <circle cx="24" cy="24" r="10" fill="#ffffff" opacity="0.9" />
        <polygon points="21,18 30,24 21,30" fill="#0f1117" />
      </svg>
    ),
  },
];

const EXTENSION_ZIP_URL =
  "https://github.com/linamolygit/FbVirall-V2-Extension-Powered-by-Metus-Engine-/archive/refs/heads/main.zip";

// ========== EXTENSION HELPERS ==========
const isExtensionAvailable = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 900);

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "FBVIRALL_EXTENSION_INSTALLED") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve(true);
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "FBVIRALL_PING" }, "*");
  });
};

const extensionFetch = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    const handler = (e: MessageEvent) => {
      if (e.data?.type === "EX_FETCH_RESPONSE" && e.data.requestId === requestId) {
        window.removeEventListener("message", handler);
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data);
        }
      }
    };

    window.addEventListener("message", handler);

    window.postMessage(
      {
        type: "EX_FETCH",
        requestId,
        url,
        method: options.method || "GET",
        headers: options.headers || {},
        body: options.body,
      },
      "*"
    );

    // 35s timeout
    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Extension fetch timeout (35s)"));
    }, 35000);
  });
};

// ========== FORCE STORY GENERATION VIA PAUSED AD ==========
const forceStoryGenerationViaPausedAd = async (
  creativeId: string,
  adAccountId: string,
  userAccessToken: string,
  hasExt: boolean
): Promise<string | null> => {
  const FB_BASE = "https://graph.facebook.com/v19.0";
  const adAccPath = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

  try {
    console.log("Forcing story generation: Step A - Creating PAUSED Campaign...");
    const campaignBody = {
      name: `OneCard_Campaign_Temp_${Date.now()}`,
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: [],
      access_token: userAccessToken,
    };

    let campRes: any;
    if (hasExt) {
      campRes = await extensionFetch(`${FB_BASE}/${adAccPath}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignBody),
      });
    } else {
      const r = await fetch(`${FB_BASE}/${adAccPath}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignBody),
      });
      campRes = { ok: r.ok, data: await r.json() };
    }

    const campaignId = campRes.data?.id;
    if (!campaignId) {
      console.warn("Forcing story: Campaign creation failed:", campRes.data?.error?.message || campRes.error);
      return null;
    }

    console.log("Forcing story: Step B - Creating PAUSED AdSet...");
    const adsetBody = {
      name: `OneCard_Adset_Temp_${Date.now()}`,
      campaign_id: campaignId,
      status: "PAUSED",
      billing_event: "IMPRESSIONS",
      optimization_goal: "LINK_CLICKS",
      bid_amount: 100,
      daily_budget: 1000,
      targeting: { geo_locations: { countries: ["IN"] } },
      access_token: userAccessToken,
    };

    let adsetRes: any;
    if (hasExt) {
      adsetRes = await extensionFetch(`${FB_BASE}/${adAccPath}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetBody),
      });
    } else {
      const r = await fetch(`${FB_BASE}/${adAccPath}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adsetBody),
      });
      adsetRes = { ok: r.ok, data: await r.json() };
    }

    const adsetId = adsetRes.data?.id;
    if (!adsetId) {
      console.warn("Forcing story: AdSet creation failed:", adsetRes.data?.error?.message || adsetRes.error);
      return null;
    }

    console.log("Forcing story: Step C - Creating PAUSED Ad with creative_id =", creativeId);
    const adBody = {
      name: `OneCard_Ad_Temp_${Date.now()}`,
      adset_id: adsetId,
      creative: { creative_id: creativeId },
      status: "PAUSED",
      access_token: userAccessToken,
    };

    let adRes: any;
    if (hasExt) {
      adRes = await extensionFetch(`${FB_BASE}/${adAccPath}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adBody),
      });
    } else {
      const r = await fetch(`${FB_BASE}/${adAccPath}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adBody),
      });
      adRes = { ok: r.ok, data: await r.json() };
    }

    const adId = adRes.data?.id;
    console.log("Forcing story: PAUSED Ad created =", adId || "failed");

    // Wait 3 seconds for Meta to link story
    await new Promise((r) => setTimeout(r, 3000));

    // Step D: Re-fetch creative & ad fields
    const storyUrl = `${FB_BASE}/${creativeId}?fields=effective_object_story_id,object_story_id&access_token=${userAccessToken}`;
    let finalRes: any;
    if (hasExt) {
      finalRes = await extensionFetch(storyUrl);
    } else {
      const r = await fetch(storyUrl);
      finalRes = { data: await r.json() };
    }

    let foundStory = finalRes.data?.effective_object_story_id || finalRes.data?.object_story_id || null;

    if (!foundStory && adId) {
      const adStoryUrl = `${FB_BASE}/${adId}?fields=effective_object_story_id,creative{effective_object_story_id,object_story_id}&access_token=${userAccessToken}`;
      let adStoryRes: any;
      if (hasExt) {
        adStoryRes = await extensionFetch(adStoryUrl);
      } else {
        const r = await fetch(adStoryUrl);
        adStoryRes = { data: await r.json() };
      }
      foundStory =
        adStoryRes.data?.effective_object_story_id ||
        adStoryRes.data?.creative?.effective_object_story_id ||
        adStoryRes.data?.creative?.object_story_id ||
        null;
    }

    console.log("Forcing story: Final storyId result =", foundStory);
    return foundStory;
  } catch (err: any) {
    console.warn("Forcing story exception:", err?.message || err);
    return null;
  }
};

// ========== ENGINE 1 via EXTENSION ==========
const runEngine1ViaExtension = async (params: {
  imageBase64: string;
  pageId: string;
  adAccountId: string;
  destinationUrl: string;
  caption: string;
  displayUrl: string;
  userAccessToken: string;
}) => {
  const {
    imageBase64,
    pageId,
    adAccountId,
    destinationUrl,
    caption,
    displayUrl,
    userAccessToken,
  } = params;

  const FB_BASE = "https://graph.facebook.com/v19.0";
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // ── Step 1: Upload image → image_hash ────────────────────────────────
  console.log("Engine 1 (Ext): Uploading image to Ad Account...");

  const formBody = new URLSearchParams();
  formBody.append("bytes", cleanBase64);
  formBody.append("access_token", userAccessToken);

  const uploadRes = await extensionFetch(`${FB_BASE}/${adAccountId}/adimages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!uploadRes.ok || !uploadRes.data?.images) {
    throw new Error(
      "Image upload failed: " + JSON.stringify(uploadRes.data || uploadRes.error || "Unknown")
    );
  }

  const imagesData = uploadRes.data.images;
  const hashKey = Object.keys(imagesData)[0];
  const imageHash = imagesData[hashKey]?.hash;

  if (!imageHash) {
    throw new Error("No image_hash received from Ad Account");
  }

  console.log("Engine 1 (Ext): Got image_hash =", imageHash);

  // ── Step 2: Create Ad Creative ───────────────────────────────────────
  console.log("Engine 1 (Ext): Creating Ad Creative...");

  const creativePayload = {
    name: `OneCard_${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link: destinationUrl.trim(),
        message: caption || "",
        call_to_action: { type: "LEARN_MORE" },
        caption: displayUrl || "facebook.com",
      },
    },
    access_token: userAccessToken,
  };

  const creativeRes = await extensionFetch(`${FB_BASE}/${adAccountId}/adcreatives`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(creativePayload),
  });

  if (!creativeRes.ok || !creativeRes.data?.id) {
    const errMsg =
      creativeRes.data?.error?.message ||
      JSON.stringify(creativeRes.data || creativeRes.error || "Unknown error");
    throw new Error("Ad Creative creation failed: " + errMsg);
  }

  const creativeId = creativeRes.data.id;
  console.log("Engine 1 (Ext): Creative created =", creativeId);

  // ── Step 3: Get effective_object_story_id (polling + Paused Ad fallback) ───
  let storyId: string | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000));
    }

    const storyRes = await extensionFetch(
      `${FB_BASE}/${creativeId}?fields=effective_object_story_id,object_story_id,status&access_token=${userAccessToken}`
    );

    storyId =
      storyRes.data?.effective_object_story_id ||
      storyRes.data?.object_story_id ||
      null;

    console.log(`Engine 1 (Ext) Story fetch attempt ${attempt + 1}:`, storyId || storyRes.data?.status || "pending");

    if (storyId) break;
  }

  // Fallback: If storyId is still null, create a PAUSED Ad to force Facebook story generation
  if (!storyId) {
    console.log("Engine 1 (Ext): storyId null after 6 attempts → triggering Paused Ad fallback...");
    storyId = await forceStoryGenerationViaPausedAd(creativeId, adAccountId, userAccessToken, true);
  }

  if (!storyId) {
    throw new Error(
      `Ad Creative created (ID: ${creativeId}) but effective_object_story_id is not ready yet. ` +
        `Wait 20–30s and check Ads Manager → Account → Creatives, or try publishing again.`
    );
  }

  console.log("Engine 1 (Ext) SUCCESS → storyId =", storyId);

  return {
    success: true,
    postId: storyId,
    postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
    creativeId,
    engine: "Meta Ad Creative via Extension (Engine 1)",
  };
};

// ========== ENGINE 1 WITH MANUAL HASH ==========
const runEngine1WithManualHash = async (params: {
  imageHash: string;
  pageId: string;
  adAccountId: string;
  destinationUrl: string;
  caption: string;
  displayUrl: string;
  userAccessToken: string;
}) => {
  const {
    imageHash,
    pageId,
    adAccountId,
    destinationUrl,
    caption,
    displayUrl,
    userAccessToken,
  } = params;

  const FB_BASE = "https://graph.facebook.com/v19.0";

  console.log("Engine 1 (Manual Hash): Creating Ad Creative with hash =", imageHash);

  const creativePayload = {
    name: `OneCard_${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link: destinationUrl.trim(),
        message: caption || "",
        call_to_action: { type: "LEARN_MORE" },
        caption: displayUrl || "facebook.com",
      },
    },
    access_token: userAccessToken,
  };

  // Prefer Extension if available
  const hasExt = await isExtensionAvailable();
  let creativeRes: any;

  if (hasExt) {
    creativeRes = await extensionFetch(`${FB_BASE}/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creativePayload),
    });
  } else {
    const r = await fetch(`${FB_BASE}/${adAccountId}/adcreatives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creativePayload),
    });
    creativeRes = { ok: r.ok, data: await r.json(), status: r.status };
  }

  if (!creativeRes.ok || !creativeRes.data?.id) {
    const errMsg =
      creativeRes.data?.error?.message ||
      JSON.stringify(creativeRes.data || creativeRes.error || "Unknown");
    throw new Error("Ad Creative failed: " + errMsg);
  }

  const creativeId = creativeRes.data.id;
  console.log("Engine 1 (Manual Hash): Creative =", creativeId);

  // Get story ID (polling + Paused Ad fallback)
  let storyId: string | null = null;
  for (let i = 0; i < 6; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));

    const storyUrl = `${FB_BASE}/${creativeId}?fields=effective_object_story_id,object_story_id,status&access_token=${userAccessToken}`;
    let storyRes: any;

    if (hasExt) {
      storyRes = await extensionFetch(storyUrl);
    } else {
      const r = await fetch(storyUrl);
      storyRes = { data: await r.json() };
    }

    storyId =
      storyRes.data?.effective_object_story_id ||
      storyRes.data?.object_story_id ||
      null;

    console.log(`Engine 1 (Manual Hash) Story fetch attempt ${i + 1}:`, storyId || storyRes.data?.status || "pending");

    if (storyId) break;
  }

  // Fallback: If storyId is still null, create a PAUSED Ad to force Facebook story generation
  if (!storyId) {
    console.log("Engine 1 (Manual Hash): storyId null after 6 attempts → triggering Paused Ad fallback...");
    storyId = await forceStoryGenerationViaPausedAd(creativeId, adAccountId, userAccessToken, hasExt);
  }

  if (!storyId) {
    throw new Error(
      `Ad Creative created (ID: ${creativeId}) but effective_object_story_id is not ready yet. ` +
        `Wait 20–30s and check Ads Manager → Account → Creatives, or try publishing again with the same Image Hash.`
    );
  }

  console.log("Engine 1 (Manual Hash) SUCCESS →", storyId);

  return {
    success: true,
    postId: storyId,
    postUrl: `https://www.facebook.com/${storyId.replace("_", "/posts/")}`,
    creativeId,
    engine: "Manual Image Hash One Card (Engine 1)",
  };
};

const FbDarkPost: NextPage = () => {
  // Form State
  const [fbPages, setFbPages] = useState<{ id: string; name: string; access_token: string; picture?: string }[]>([]);
  const [fbAdAccounts, setFbAdAccounts] = useState<{ id: string; name: string }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedPageToken, setSelectedPageToken] = useState("");
  const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
  const [userAccessToken, setUserAccessToken] = useState("");

  const [message, setMessage] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [displayUrl, setDisplayUrl] = useState("facebook.com");
  const [fakeMore, setFakeMore] = useState(true);
  const [fakeCount, setFakeCount] = useState(() => Math.floor(Math.random() * (23 - 5 + 1)) + 5);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");

  // Canvas Mode: Multi-Collage vs Single Custom Image Mode
  const [singleImageMode, setSingleImageMode] = useState(false);
  const [singleImageSrc, setSingleImageSrc] = useState<string | null>(null);

  // Images & Canvas state
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null]);
  const [activeLayout, setActiveLayout] = useState("5-photos-2-3-top");

  // Extension & Posting states
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);
  const [extUser, setExtUser] = useState<{ id: string; name: string; profilePic?: string } | null>(null);

  // Manual Image Hash state & FB Image URL
  const [manualImageHash, setManualImageHash] = useState("");
  const [useManualHash, setUseManualHash] = useState(false);
  const [fbImageUrl, setFbImageUrl] = useState("");

  const handleLoadFbImageToCanvas = async () => {
    if (!fbImageUrl) return;

    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(fbImageUrl.trim())}`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setSingleImageSrc(proxyUrl);
        setSingleImageMode(true);
        showToast("Image canvas pe load ho gayi!", "success");
      };
      img.onerror = () => {
        showToast(
          "Image load fail (CORS/URL expired). Image Hash se post karo, ya image download karke local file upload karo.",
          "error"
        );
      };
      img.src = proxyUrl;
    } catch (err: any) {
      showToast(err.message || "Failed to load FB image", "error");
    }
  };

  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ postId: string; postUrl: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const bulkFileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch Image & Sequential Interval Processing States
  const [placementDelay, setPlacementDelay] = useState<number>(200);
  const [isBatchFilling, setIsBatchFilling] = useState<boolean>(false);
  const [activeFillingSlot, setActiveFillingSlot] = useState<number | null>(null);


  // Drag-and-Drop Slot Swap States
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);

  const handleSwapSlots = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || isNaN(fromIdx) || isNaN(toIdx)) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[fromIdx];
      copy[fromIdx] = copy[toIdx];
      copy[toIdx] = temp;
      return copy;
    });
    showToast(`Swapped photo Slot ${fromIdx + 1} ↔ Slot ${toIdx + 1}!`, "success");
  };


  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Batch Image Selection & Sequential Interval Auto-Filling
  const handleBatchFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).slice(0, 5); // Max 5 slots
    setIsBatchFilling(true);

    // Auto-adjust layout to match uploaded image count
    if (fileList.length === 5) {
      setActiveLayout("5-photos-2-3-top");
    } else if (fileList.length === 4) {
      setActiveLayout("4-photos");
    } else if (fileList.length === 3) {
      setActiveLayout("3-photos-top");
    } else if (fileList.length === 1) {
      setActiveLayout("1-photo");
    }

    // Read all selected files to Data URLs
    const loadedDataUrls: string[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.readAsDataURL(fileList[i]);
      });
      loadedDataUrls.push(url);
    }

    // Sequential Slot Placement with Timing Interval Delay
    setImages((prev) => {
      const reset = [...prev];
      for (let i = 0; i < 5; i++) reset[i] = null;
      return reset;
    });

    for (let i = 0; i < loadedDataUrls.length; i++) {
      setActiveFillingSlot(i);
      await new Promise((resolve) => setTimeout(resolve, placementDelay));
      setImages((prev) => {
        const copy = [...prev];
        copy[i] = loadedDataUrls[i];
        return copy;
      });
    }

    setActiveFillingSlot(null);
    setIsBatchFilling(false);
    showToast(`Batch imported ${loadedDataUrls.length} photos with ${placementDelay}ms interval fill!`, "success");
  };


  // LocalStorage Auto-Cache for Message, Destination URL, Display URL & FB Token
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cachedMsg = localStorage.getItem("fb_dark_post_message");
      const cachedDest = localStorage.getItem("fb_dark_post_dest_url");
      const cachedDisp = localStorage.getItem("fb_dark_post_disp_url");
      const cachedToken = localStorage.getItem("fb_access_token");

      if (cachedMsg) setMessage(cachedMsg);
      if (cachedDest) setDestinationUrl(cachedDest);
      if (cachedDisp) setDisplayUrl(cachedDisp);

      // FAST PATH: Instant hydration from localStorage browser cache (0ms wait)
      const cachedAccStr = localStorage.getItem("fb_cached_accounts");
      if (cachedAccStr) {
        try {
          const accData = JSON.parse(cachedAccStr);
          if (accData.fbUser) setExtUser(accData.fbUser);
          if (accData.pages?.length > 0) {
            setFbPages(accData.pages);
            setSelectedPageId(accData.pages[0].id);
            setSelectedPageToken(accData.pages[0].access_token);
          }
          if (accData.adAccounts?.length > 0) {
            setFbAdAccounts(accData.adAccounts);
            setSelectedAdAccountId(accData.adAccounts[0].id);
          }
          console.log("FB Dark Post: Loaded accounts INSTANTLY from browser localStorage!");
        } catch (e) {
          console.warn("Failed to parse cached accounts:", e);
        }
      }

      if (cachedToken) {
        setUserAccessToken(cachedToken);
        const cachedCookie = localStorage.getItem("fb_raw_cookie") || "";
        
        // Background sync to refresh cached accounts
        fetch(`/api/fb-accounts?token=${encodeURIComponent(cachedToken)}&cookie=${encodeURIComponent(cachedCookie)}`)
          .then((r) => r.json())
          .then((accData) => {
            if (accData.success) {
              localStorage.setItem("fb_cached_accounts", JSON.stringify(accData));
              if (accData.fbUser) setExtUser(accData.fbUser);
              if (accData.pages?.length > 0) {
                setFbPages(accData.pages);
                setSelectedPageId((prev) => prev || accData.pages[0].id);
                setSelectedPageToken((prev) => prev || accData.pages[0].access_token);
              }
              if (accData.adAccounts?.length > 0) {
                setFbAdAccounts(accData.adAccounts);
                setSelectedAdAccountId((prev) => prev || accData.adAccounts[0].id);
              }
            }
          })
          .catch((err) => console.warn("FB Accounts background sync error:", err));
      } else {
        // Fallback: check logged-in DB user
        fetch("/api/auth/user")
          .then((r) => r.json())
          .then((userData) => {
            const dbToken = userData?.user?.fbAccessToken;
            const dbCookie = userData?.user?.fbCookie;
            if (dbToken) {
              setUserAccessToken(dbToken);
              localStorage.setItem("fb_access_token", dbToken);
              if (dbCookie) localStorage.setItem("fb_raw_cookie", dbCookie);

              fetch(`/api/fb-accounts?token=${encodeURIComponent(dbToken)}&cookie=${encodeURIComponent(dbCookie || "")}`)
                .then((r) => r.json())
                .then((accData) => {
                  if (accData.success) {
                    localStorage.setItem("fb_cached_accounts", JSON.stringify(accData));
                    if (accData.fbUser) setExtUser(accData.fbUser);
                    if (accData.pages?.length > 0) {
                      setFbPages(accData.pages);
                      setSelectedPageId((prev) => prev || accData.pages[0].id);
                      setSelectedPageToken((prev) => prev || accData.pages[0].access_token);
                    }
                    if (accData.adAccounts?.length > 0) {
                      setFbAdAccounts(accData.adAccounts);
                      setSelectedAdAccountId((prev) => prev || accData.adAccounts[0].id);
                    }
                  }
                })
                .catch((err) => console.warn("DB FB Accounts fetch error:", err));
            }
          })
          .catch((err) => console.warn("Auth user fetch error:", err));
      }
    }
  }, []);



  const handleMessageChange = (val: string) => {
    setMessage(val);
    if (typeof window !== "undefined") localStorage.setItem("fb_dark_post_message", val);
  };

  const handleDestUrlChange = (val: string) => {
    setDestinationUrl(val);
    if (typeof window !== "undefined") localStorage.setItem("fb_dark_post_dest_url", val);
  };

  const handleDispUrlChange = (val: string) => {
    setDisplayUrl(val);
    if (typeof window !== "undefined") localStorage.setItem("fb_dark_post_disp_url", val);
  };

  // Extension listener
  useEffect(() => {
    const handleMsg = (event: MessageEvent) => {
      if (event.source !== window) return;
      const { type, data } = event.data || {};

      if (type === "FBVIRALL_EXTENSION_INSTALLED" || event.data?.metus === true) {
        setIsExtensionInstalled(true);
        window.postMessage({ type: "FBVIRALL_FETCH_TOKEN", requestId: "dark_post_init" }, "*");
      }

      if (type === "FBVIRALL_EXTENSION_RESPONSE" && data?.accessToken) {
        setUserAccessToken(data.accessToken);
        if (data.user) setExtUser(data.user);

        const rawCookie = data.cookieString || localStorage.getItem("fb_raw_cookie") || "";
        if (data.cookieString) localStorage.setItem("fb_raw_cookie", data.cookieString);
        localStorage.setItem("fb_access_token", data.accessToken);

        fetch(`/api/fb-accounts?token=${encodeURIComponent(data.accessToken)}&cookie=${encodeURIComponent(rawCookie)}`)
          .then((r) => r.json())
          .then((accData) => {
            if (!accData.success && accData.error) {
              setErrorMessage(`FB Accounts Error: ${accData.error}`);
            }
            if (accData.success) {
              localStorage.setItem("fb_cached_accounts", JSON.stringify(accData));
              if (accData.fbUser) setExtUser(accData.fbUser);
              if (accData.pages?.length > 0) {
                setFbPages(accData.pages);
                setSelectedPageId((prev) => prev || accData.pages[0].id);
                setSelectedPageToken((prev) => prev || accData.pages[0].access_token);
              }
              if (accData.adAccounts?.length > 0) {
                setFbAdAccounts(accData.adAccounts);
                setSelectedAdAccountId((prev) => prev || accData.adAccounts[0].id);
              }
            }
          })
          .catch((err) => console.warn("FB Accounts fetch error:", err));
      }
    };

    window.addEventListener("message", handleMsg);
    window.postMessage({ type: "FBVIRALL_PING" }, "*");
    return () => window.removeEventListener("message", handleMsg);
  }, []);


  // Multi-Image Upload Handler
  const handleImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImgs = [...images];
      newImgs[index] = e.target?.result as string;
      setImages(newImgs);
    };
    reader.readAsDataURL(file);
  };

  // Single Image Upload Handler
  const handleSingleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSingleImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Delete Photo from slot
  const handleDeletePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImgs = [...images];
    newImgs[index] = null;
    setImages(newImgs);
  };

  // Generate 1200x1080 Canvas Buffer (Wider horizontal aspect ratio)
  const generateCollage = useCallback(async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Single Custom Image Mode Override
    if (singleImageMode) {
      if (singleImageSrc) {
        const img = await new Promise<HTMLImageElement | null>((res) => {
          const image = new Image();
          if (singleImageSrc.startsWith("http")) {
            image.crossOrigin = "anonymous";
          }
          image.onload = () => res(image);
          image.onerror = () => res(null);
          image.src = singleImageSrc;
        });
        if (img) {
          ctx.drawImage(img, 0, 0, W, H);
        } else {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, W, H);
      }
      return canvas.toDataURL("image/jpeg", 0.92);
    }

    // Multi-Collage Mode
    const gap = 4;
    let coords: { x: number; y: number; w: number; h: number }[] = [];

    if (activeLayout === "5-photos-2-3-top") {
      const topW = (W - gap) / 2;
      const topH = (H - gap) / 2;
      const botW = (W - gap * 2) / 3;
      const botH = (H - gap) / 2;
      coords = [
        { x: 0, y: 0, w: topW, h: topH },
        { x: topW + gap, y: 0, w: topW, h: topH },
        { x: 0, y: topH + gap, w: botW, h: botH },
        { x: botW + gap, y: topH + gap, w: botW, h: botH },
        { x: (botW + gap) * 2, y: topH + gap, w: botW, h: botH },
      ];
    } else if (activeLayout === "5-photos-2-3") {
      const leftW = (W - gap) / 2;
      const leftH = (H - gap) / 2;
      const rightW = (W - gap) / 2;
      const rightH = (H - gap * 2) / 3;
      coords = [
        { x: 0, y: 0, w: leftW, h: leftH },
        { x: 0, y: leftH + gap, w: leftW, h: leftH },
        { x: leftW + gap, y: 0, w: rightW, h: rightH },
        { x: leftW + gap, y: rightH + gap, w: rightW, h: rightH },
        { x: leftW + gap, y: (rightH + gap) * 2, w: rightW, h: rightH },
      ];
    } else if (activeLayout === "4-photos") {
      const w = (W - gap) / 2;
      const h = (H - gap) / 2;
      coords = [
        { x: 0, y: 0, w, h },
        { x: w + gap, y: 0, w, h },
        { x: 0, y: h + gap, w, h },
        { x: w + gap, y: h + gap, w, h },
      ];
    } else if (activeLayout === "3-photos-top") {
      const topH = (H - gap) / 2;
      const botW = (W - gap) / 2;
      const botH = (H - gap) / 2;
      coords = [
        { x: 0, y: 0, w: W, h: topH },
        { x: 0, y: topH + gap, w: botW, h: botH },
        { x: botW + gap, y: topH + gap, w: botW, h: botH },
      ];
    } else {
      coords = [{ x: 0, y: 0, w: W, h: H }];
    }

    for (let i = 0; i < coords.length; i++) {
      const c = coords[i];
      const imgUrl = images[i];
      if (imgUrl) {
        const img = await new Promise<HTMLImageElement | null>((res) => {
          const image = new Image();
          if (imgUrl.startsWith("http")) {
            image.crossOrigin = "anonymous";
          }
          image.onload = () => res(image);
          image.onerror = () => res(null);
          image.src = imgUrl;
        });

        if (img) {
          const imgAspect = img.width / img.height;
          const slotAspect = c.w / c.h;
          let renderW = c.w;
          let renderH = c.h;
          let offsetX = 0;
          let offsetY = 0;

          if (imgAspect > slotAspect) {
            renderW = c.h * imgAspect;
            offsetX = (c.w - renderW) / 2;
          } else {
            renderH = c.w / imgAspect;
            offsetY = (c.h - renderH) / 2;
          }

          ctx.save();
          ctx.beginPath();
          ctx.rect(c.x, c.y, c.w, c.h);
          ctx.clip();
          ctx.drawImage(img, c.x + offsetX, c.y + offsetY, renderW, renderH);
          ctx.restore();
        } else {
          ctx.fillStyle = "#e2e8f0";
          ctx.fillRect(c.x, c.y, c.w, c.h);
        }
      } else {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(c.x, c.y, c.w, c.h);
      }
    }

    // Draw Overlay Badge (+9 or Play button)
    const lastSlot = coords[coords.length - 1];
    if (fakeMore && lastSlot) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(lastSlot.x, lastSlot.y, lastSlot.w, lastSlot.h);

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(lastSlot.w * 0.25)}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`+${fakeCount}`, lastSlot.x + lastSlot.w / 2, lastSlot.y + lastSlot.h / 2);
    } else if (activeLayout === "video-card") {
      // Draw bottom 20% dark gradient overlay
      const botOverlayH = H * 0.2;
      const grad = ctx.createLinearGradient(0, H - botOverlayH, 0, H);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.65)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - botOverlayH, W, botOverlayH);

      // Centered Facebook Play Button
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 65, 0, Math.PI * 2);
      ctx.fill();

      // Facebook Play Icon path: M7 4v16c0 1.5 1.6 2.5 3 1.7l12-8c1.3-.9 1.3-2.6 0-3.5l-12-8C8.6 1.4 7 2.4 7 4z
      const p = new Path2D("M7 4v16c0 1.5 1.6 2.5 3 1.7l12-8c1.3-.9 1.3-2.6 0-3.5l-12-8C8.6 1.4 7 2.4 7 4z");
      ctx.save();
      ctx.translate(W / 2 - 30, H / 2 - 32);
      ctx.scale(2.6, 2.6);
      ctx.fillStyle = "#ffffff";
      ctx.fill(p);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke(p);
      ctx.restore();
    }

    return canvas.toDataURL("image/jpeg", 0.92);
  }, [images, activeLayout, fakeMore, fakeCount, singleImageMode, singleImageSrc]);


  const handleRunPost = async () => {
    // ── Validation ──────────────────────────────────────────────────────
    if (!userAccessToken) {
      setErrorMessage("Please enter your Facebook Access Token or install the Extension.");
      return;
    }
    if (!selectedPageId) {
      setErrorMessage("Please select a Facebook Page.");
      return;
    }
    if (!destinationUrl.trim()) {
      setErrorMessage("Please enter a Destination URL.");
      return;
    }

    // ── Manual Image Hash path (highest priority for 1:1 One Card) ──
    if (useManualHash && manualImageHash.length >= 16) {
      if (!selectedAdAccountId) {
        setErrorMessage("Ad Account select karo (Manual Hash ke liye zaroori hai).");
        setPosting(false);
        return;
      }
      if (!selectedPageId) {
        setErrorMessage("Facebook Page select karo.");
        setPosting(false);
        return;
      }
      if (!destinationUrl.trim()) {
        setErrorMessage("Destination URL daalo.");
        setPosting(false);
        return;
      }

      try {
        setPosting(true);
        setErrorMessage("");
        setPostResult(null);

        const result = await runEngine1WithManualHash({
          imageHash: manualImageHash,
          pageId: selectedPageId,
          adAccountId: selectedAdAccountId,
          destinationUrl: destinationUrl.trim(),
          caption: message.trim(),
          displayUrl: displayUrl.trim() || "facebook.com",
          userAccessToken,
        });

        setPostResult({ postId: result.postId, postUrl: result.postUrl });
        showToast("1:1 One Card posted via Image Hash!", "success");
      } catch (err: any) {
        setErrorMessage(err.message || "Manual hash post failed");
        showToast(err.message || "Failed", "error");
      } finally {
        setPosting(false);
      }
      return; // stop — baaki Engine 1/2 mat chalao
    }

    setPosting(true);
    setErrorMessage("");
    setPostResult(null);

    try {
      // ── Generate Canvas ───────────────────────────────────────────────
      const dataUrl = await generateCollage();
      if (!dataUrl) {
        throw new Error("Failed to generate canvas image");
      }

      const rawCookie =
        typeof window !== "undefined" ? localStorage.getItem("fb_raw_cookie") || "" : "";

      // ── Try Engine 1 via Extension first ──────────────────────────────
      const hasExt = await isExtensionAvailable();

      if (hasExt && selectedAdAccountId && userAccessToken) {
        try {
          console.log("→ Trying Engine 1 via Extension...");

          const result = await runEngine1ViaExtension({
            imageBase64: dataUrl,
            pageId: selectedPageId,
            adAccountId: selectedAdAccountId,
            destinationUrl: destinationUrl.trim(),
            caption: message.trim(),
            displayUrl: displayUrl.trim() || "facebook.com",
            userAccessToken,
          });

          setPostResult({
            postId: result.postId,
            postUrl: result.postUrl,
          });
          showToast("Posted successfully via Extension Engine 1!", "success");
          setPosting(false);
          return; // SUCCESS — stop here
        } catch (extErr: any) {
          console.warn("Extension Engine 1 failed:", extErr?.message || extErr);
          // Fall through to normal backend flow
        }
      } else {
        console.log("Extension not available or no Ad Account → using backend");
      }

      // ── FALLBACK: Normal backend flow (Bridge Link + /api/fb-post) ────

      // Step A: Upload canvas to ImgBB (for bridge link OG)
      let imageUrl = "";
      try {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const formData = new FormData();
        formData.append("image", base64Data);

        const IMGBB_KEY =
          process.env.NEXT_PUBLIC_IMGBB_API_KEY || "7acb2b5955d0a1e35ba91e981a8d1da8";

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
          method: "POST",
          body: formData,
        });

        const imgbbData = await imgbbRes.json();
        if (imgbbRes.ok && imgbbData?.data?.url) {
          imageUrl = imgbbData.data.url;
        }
      } catch (imgbbErr) {
        console.warn("ImgBB upload failed:", imgbbErr);
      }

      // Step B: Bridge Link logic
      let effectiveBridgeLink = destinationUrl.trim();
      let effectiveDisplayUrl = displayUrl.trim() || "facebook.com";

      if (imageUrl) {
        try {
          const parsedUrl = new URL(destinationUrl.trim());
          const pathParts = parsedUrl.pathname.replace(/^\//, "").split("/");
          const shortId = pathParts[0];

          const isSaasBridgeLink =
            parsedUrl.hostname.includes("fbvirall") ||
            parsedUrl.hostname.includes("vercel.app") ||
            parsedUrl.hostname === window.location.hostname;

          if (shortId && isSaasBridgeLink) {
            // Case A: Already a bridge link → update OG image
            console.log(`Bridge Link [A]: Updating OG for shortId=${shortId}`);
            await fetch("/api/update-redirect-og", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ shortId, ogImageUrl: imageUrl }),
            });
          } else {
            // Case B: External URL → create new bridge link
            console.log("Bridge Link [B]: Creating new bridge link");
            effectiveDisplayUrl = parsedUrl.hostname.replace("www.", "");

            const createRes = await fetch("/api/create-redirect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                originalUrl: destinationUrl.trim(),
                customImage: imageUrl,
              }),
            });
            const createData = await createRes.json();

            if (createData.shortLink && createData.shortId) {
              effectiveBridgeLink = createData.shortLink;

              await fetch("/api/update-redirect-og", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  shortId: createData.shortId,
                  ogImageUrl: imageUrl,
                }),
              });
            }
          }

          // Fire-and-forget scrape (non-blocking)
          fetch("/api/force-fb-scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: effectiveBridgeLink }),
          }).catch(() => {});
        } catch (parseErr) {
          console.warn("Bridge Link parse error:", parseErr);
        }
      }

      // Step C: Call backend /api/fb-post
      const postRes = await fetch("/api/fb-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAccessToken,
          pageId: selectedPageId,
          pageAccessToken: selectedPageToken,
          adAccountId: selectedAdAccountId,
          base64Image: dataUrl,
          imageUrl,
          destinationUrl: effectiveBridgeLink,
          caption: message.trim() || "Click to view full album...",
          displayUrl: effectiveDisplayUrl,
          scheduledTime: schedule ? scheduledTime : undefined,
          saveAsDraft,
          rawCookie,
        }),
      });

      const postData = await postRes.json();

      if (!postRes.ok || !postData.success) {
        const fullErr = postData.hint
          ? `${postData.error}\n💡 Hint: ${postData.hint}`
          : postData.error || "Facebook post failed.";
        throw new Error(fullErr);
      }

      setPostResult({
        postId: postData.postId,
        postUrl: postData.postUrl,
      });
      showToast("Posted to Facebook successfully!", "success");
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      showToast(err.message || "Post failed.", "error");
    } finally {
      setPosting(false);
    }
  };


  const activePageObj = fbPages.find((p) => p.id === selectedPageId);

  return (
    <div className="dark-post-wrapper">
      <Head>
        <title>Post to Facebook (One Card V2) — LinkPika</title>
        <meta name="description" content="Create 1:1 Square Facebook One Card Ads & Dark Posts with Fake Album Badges." />
      </Head>

      <Header />

      <main className="main-content">
        {/* Main Page Title Header */}
        <div className="page-title-banner">
          <div className="banner-left">
            <h1 className="main-heading">
              <Rocket className="heading-icon" size={28} />
              <span>Post to Facebook (One Card V2)</span>
            </h1>
            <p className="sub-heading">
              Create 1:1 Square Facebook Clickable Album Posts using Meta Ad Creative Engine.
            </p>
          </div>

          <div className="banner-right">
            {isExtensionInstalled ? (
              <div className="ext-badge connected">
                <Zap size={15} />
                <span>Extension Active {extUser ? `(${extUser.name})` : ""}</span>
              </div>
            ) : (
              <a
                href={EXTENSION_ZIP_URL}
                target="_blank"
                rel="noreferrer"
                className="ext-badge install"
                title="Download Extension ZIP"
              >
                <Zap size={15} />
                <span>Get Chrome Extension</span>
              </a>
            )}
          </div>
        </div>

        <div className="dark-post-container">
          {/* ─── LEFT CONTROL FORM SIDEBAR ─────────────────────────────────── */}
          <aside className="control-sidebar">
            {/* User Profile Connection Header */}
            {extUser && (
              <div className="fb-user-header-badge">
                {extUser.profilePic ? (
                  <img src={extUser.profilePic} alt={extUser.name} className="fb-user-avatar-sm" />
                ) : (
                  <div className="fb-user-initial">{extUser.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="fb-user-info-text">
                  <div className="fb-user-name">{extUser.name}</div>
                  <div className="fb-user-status">● Connected via Extension / Token</div>
                </div>
              </div>
            )}

            {/* Facebook Pages Native Select Dropdown */}
            <div className="form-group">
              <label className="input-label">
                <Share2 size={14} /> Facebook Pages
              </label>
              <div className="select-wrapper">
                <select
                  value={selectedPageId}
                  onChange={(e) => {
                    setSelectedPageId(e.target.value);
                    const pg = fbPages.find((p) => p.id === e.target.value);
                    if (pg) setSelectedPageToken(pg.access_token);
                  }}
                >
                  {fbPages.length === 0 ? (
                    <option value="">-- No Facebook Page Connected --</option>
                  ) : (
                    fbPages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Facebook Pages Rich Card List */}
            {fbPages.length > 0 && (
              <div className="form-group">
                <div className="pages-selector-grid">
                  {fbPages.map((p) => {
                    const isSelected = selectedPageId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`page-select-card ${isSelected ? "active" : ""}`}
                        onClick={() => {
                          setSelectedPageId(p.id);
                          setSelectedPageToken(p.access_token);
                        }}
                      >
                        {p.picture ? (
                          <img src={p.picture} alt={p.name} className="page-card-avatar" />
                        ) : (
                          <div className="page-card-initial">{p.name.charAt(0).toUpperCase()}</div>
                        )}
                        <div className="page-card-info">
                          <div className="page-card-title">{p.name}</div>
                          <div className="page-card-id">ID: {p.id}</div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="selected-check" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



            {/* Ad Accounts Selector */}
            <div className="form-group">
              <label className="input-label">
                <Layers size={14} /> Ad Accounts
              </label>
              <div className="select-wrapper">
                <select
                  value={selectedAdAccountId}
                  onChange={(e) => setSelectedAdAccountId(e.target.value)}
                >
                  {fbAdAccounts.length === 0 ? (
                    <option value="">-- No Ad Account Connected --</option>
                  ) : (
                    fbAdAccounts.map((a) => {
                      const displayId = a.id.startsWith("act_") ? a.id : `act_${a.id}`;
                      return (
                        <option key={a.id} value={a.id}>
                          {a.name || "Ad Account"} — {displayId}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
              {selectedAdAccountId && (
                <small className="selected-ad-hint">
                  Selected: {selectedAdAccountId.startsWith("act_") ? selectedAdAccountId : `act_${selectedAdAccountId}`}
                </small>
              )}
            </div>

            {/* Message / Caption Textarea (Auto-Cached) */}
            <div className="form-group">
              <label className="input-label">
                <FileText size={14} /> Message :
              </label>
              <div className="textarea-container">
                <textarea
                  rows={3}
                  placeholder="Write something..."
                  value={message}
                  onChange={(e) => handleMessageChange(e.target.value)}
                />
                <button type="button" className="emoji-icon-btn" title="Add Emoji">
                  <Smile size={16} />
                </button>
              </div>
            </div>

            {/* ─── MANUAL IMAGE HASH & FB IMAGE URL (One Card) ─────────── */}
            <div className="manual-hash-card">
              <div className="hash-header">
                <h4>1:1 Square One Card — Manual Hash / FB Image</h4>
                <label className="hash-toggle">
                  <input
                    type="checkbox"
                    checked={useManualHash}
                    onChange={(e) => setUseManualHash(e.target.checked)}
                  />
                  <span>Use Manual Hash / FB Image</span>
                </label>
              </div>

              {useManualHash && (
                <>
                  <div className="hash-steps">
                    <p><strong>Option A — Image Hash (Post ke liye zaroori):</strong></p>
                    <ol>
                      <li>
                        Open{" "}
                        <a
                          href="https://business.facebook.com/asset_library/business_creatives/"
                          target="_blank"
                          rel="noreferrer"
                          className="hash-link"
                        >
                          Media Library ↗
                        </a>
                      </li>
                      <li>Upload 1:1 image → Image details → copy <strong>Image Hash</strong></li>
                    </ol>

                    <p style={{ marginTop: 12 }}><strong>Option B — Facebook Image URL (Canvas Preview):</strong></p>
                    <ol>
                      <li>Media Library me image open karo</li>
                      <li>Image pe right-click → Copy image address (scontent...fbcdn.net URL)</li>
                      <li>Neeche paste karo → canvas pe load ho jayegi</li>
                    </ol>
                  </div>

                  {/* Option B: FB Image URL */}
                  <div className="form-group">
                    <label className="input-label">Facebook Image URL (scontent... / fbcdn)</label>
                    <input
                      type="text"
                      placeholder="https://scontent....fbcdn.net/v/t39.99422-6/...."
                      value={fbImageUrl}
                      onChange={(e) => setFbImageUrl(e.target.value.trim())}
                    />
                    <button
                      type="button"
                      className="btn-load-fb-image"
                      onClick={handleLoadFbImageToCanvas}
                      disabled={!fbImageUrl}
                    >
                      Load image to Canvas
                    </button>
                  </div>

                  {/* Option A: Image Hash */}
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label className="input-label">Image Hash (post ke liye zaroori)</label>
                    <input
                      type="text"
                      placeholder="e.g. 534d15a4029a206c1cf01c3ac7a954b4"
                      value={manualImageHash}
                      onChange={(e) => setManualImageHash(e.target.value.trim())}
                    />
                    <small className="hint">
                      URL sirf canvas preview ke liye hai. 1:1 One Card post ke liye <strong>Image Hash</strong> hi chahiye (usi Ad Account ki Media Library se).
                    </small>
                  </div>
                </>
              )}
            </div>

            {/* Destination URL (Auto-Cached) */}
            <div className="form-group">
              <label className="input-label">
                <Globe size={14} /> Destination URL :
              </label>
              <input
                type="url"
                placeholder="Your target website"
                value={destinationUrl}
                onChange={(e) => handleDestUrlChange(e.target.value)}
              />
            </div>

            {/* Display URL (Auto-Cached) */}
            <div className="form-group">
              <label className="input-label">
                <Globe size={14} /> Display URL :
              </label>
              <input
                type="text"
                placeholder="facebook.com"
                value={displayUrl}
                onChange={(e) => handleDispUrlChange(e.target.value)}
              />
            </div>

            {/* Fake More Toggle (Disabled when Single Image Mode is ON) */}
            {!singleImageMode && (
              <>
                <div className="form-group row-group">
                  <label className="input-label">
                    <Sparkles size={14} /> Fake more
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={fakeMore}
                      onChange={(e) => setFakeMore(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {fakeMore && (
                  <div className="form-group fake-count-group">
                    <div className="fake-count-wrapper">
                      <input
                        type="number"
                        min={5}
                        max={23}
                        value={fakeCount}
                        onChange={(e) => setFakeCount(parseInt(e.target.value) || 9)}
                      />
                      <button
                        type="button"
                        className="btn-random-count"
                        title="Randomize Fake Count (+5 to +23)"
                        onClick={() => setFakeCount(Math.floor(Math.random() * (23 - 5 + 1)) + 5)}
                      >
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>
                )}

              </>
            )}

            {/* Save as draft Checkbox (Bigger & Prominent) */}
            <div className="form-group row-group-checkbox big-checkbox-group">
              <label className="checkbox-container-big">
                <input
                  type="checkbox"
                  checked={saveAsDraft}
                  onChange={(e) => setSaveAsDraft(e.target.checked)}
                  className="big-checkbox"
                />
                <span>Save as draft</span>
              </label>
            </div>

            {/* Schedule Toggle & Date Picker */}
            <div className="form-group row-group">
              <label className="input-label">
                <Calendar size={14} /> Schedule :
              </label>
              <label className="toggle-switch red-toggle">
                <input
                  type="checkbox"
                  checked={schedule}
                  onChange={(e) => setSchedule(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {schedule && (
              <div className="form-group">
                <label className="input-label">
                  <Clock size={14} /> Schedule Date & Time :
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="schedule-datetime-input"
                />
              </div>
            )}

            {/* Access Token Field (Auto-Filled by Extension) */}
            <div className="form-group">
              <label className="input-label">
                <Lock size={14} /> User Access Token :
              </label>
              <div className="token-input-wrapper">
                <input
                  type="text"
                  placeholder="EAABwzLixnjY... (Extension Auto-Synced)"
                  value={userAccessToken}
                  onChange={(e) => setUserAccessToken(e.target.value)}
                />
                {userAccessToken && (
                  <span className="token-status-pill" title="Token Synced">
                    <CheckCircle2 size={13} /> Synced
                  </span>
                )}
              </div>
            </div>

            {/* Error Message Display */}
            {errorMessage && (
              <div className="error-box">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Post Result */}
            {postResult && (
              <div className="success-box">
                <CheckCircle2 size={18} className="success-icon" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="success-title">✅ Unpublished Dark Post Created!</div>
                  <div className="post-url-text">{postResult.postUrl}</div>
                  <div className="success-actions">
                    <button
                      className="btn-copy-link"
                      onClick={() => {
                        navigator.clipboard.writeText(postResult.postUrl);
                        showToast("Copied Dark Post Link! Paste in FB Groups for instant redirection card.", "success");
                      }}
                    >
                      <Copy size={13} />
                      <span>Copy Link</span>
                    </button>
                    <a href={postResult.postUrl} target="_blank" rel="noreferrer" className="btn-view-post">
                      View Post <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="share-tip">
                    💡 <strong>Pro Tip:</strong> Paste this link in FB Groups. Meta will generate a clickable card that redirects visitors directly to your target link!
                  </div>
                </div>
              </div>
            )}


            {/* PUBLISH POST Action Button */}
            <button
              className="btn-run-post"
              onClick={handleRunPost}
              disabled={posting}
            >
              <Rocket size={18} />
              <span>{posting ? "PUBLISHING POST..." : "PUBLISH POST"}</span>
            </button>

          </aside>

          {/* ─── RIGHT MAIN COLLAGE CANVAS & PREVIEW AREA ─────────────────── */}
          <section className="preview-main">
            {/* Top Facebook Feed Page Header Card */}
            <div className="page-header-card">
              {activePageObj?.picture ? (
                <img src={activePageObj.picture} alt={activePageObj.name} className="page-avatar-img" />
              ) : (
                <div className="page-avatar">
                  {activePageObj?.name ? activePageObj.name.charAt(0).toUpperCase() : "FB"}
                </div>
              )}
              <div className="page-meta">
                <div className="page-title">
                  {activePageObj?.name || "Select Facebook Page"}
                </div>
                <div className="page-id">
                  {activePageObj?.id || "Connect Extension & Login to FB"}
                </div>
              </div>
            </div>


            {/* Interactive Canvas Card */}
            <div className="canvas-card">
              {/* Canvas Header Bar with Batch Import & Single Image Mode Toggle */}
              <div className="canvas-header-bar">
                <div className="canvas-header-title">
                  <Sliders size={15} />
                  <span>Canvas Preview</span>
                </div>



                <div className="canvas-toggle-mode">
                  <span className="mode-label">Single Custom Image Mode</span>
                  <label className="toggle-switch small-toggle">
                    <input
                      type="checkbox"
                      checked={singleImageMode}
                      onChange={(e) => setSingleImageMode(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {singleImageMode ? (
                /* SINGLE CUSTOM IMAGE MODE DISPLAY */
                <div
                  className="single-image-canvas"
                  onClick={() => singleFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={singleFileInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => e.target.files?.[0] && handleSingleImageUpload(e.target.files[0])}
                  />

                  {singleImageSrc ? (
                    <>
                      <img src={singleImageSrc} alt="Custom Clickable Image" className="single-canvas-img" />
                      <button
                        className="btn-delete-slot"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSingleImageSrc(null);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="single-placeholder">
                      <ImageIcon size={48} className="upload-icon-lg" />
                      <span className="placeholder-title">Upload Custom Clickable Image</span>
                      <span className="placeholder-sub">Select image created from Clickable Image Generator page</span>
                    </div>
                  )}
                </div>
              ) : (
                /* MULTI-PHOTO COLLAGE DISPLAY */
                <div className={`grid-canvas-layout layout-${activeLayout}`}>
                  {[0, 1, 2, 3, 4]
                    .slice(0, LAYOUT_PRESETS.find((l) => l.id === activeLayout)?.slots || 5)
                    .map((idx, index, array) => {
                      const isLast = index === array.length - 1;
                      const hasImage = !!images[idx];
                      const isAnimatingSlot = activeFillingSlot === idx;

                      return (
                        <div
                          key={idx}
                          draggable={hasImage}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", idx.toString());
                            setDraggedSlotIndex(idx);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            setDragOverSlotIndex(idx);
                          }}
                          onDragLeave={() => setDragOverSlotIndex(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                            handleSwapSlots(sourceIdx, idx);
                            setDraggedSlotIndex(null);
                            setDragOverSlotIndex(null);
                          }}
                          className={`grid-slot slot-${idx} ${isAnimatingSlot ? "filling-active-pulse" : ""} ${
                            draggedSlotIndex === idx ? "dragging-source" : ""
                          } ${dragOverSlotIndex === idx && draggedSlotIndex !== idx ? "drag-target-over" : ""}`}
                          onClick={() => fileInputRefs.current[idx]?.click()}
                        >

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            ref={(el) => (fileInputRefs.current[idx] = el)}
                            style={{ display: "none" }}
                            onChange={(e) => {
                              if (!e.target.files || e.target.files.length === 0) return;
                              if (e.target.files.length > 1) {
                                handleBatchFilesUpload(e.target.files);
                              } else {
                                handleImageUpload(idx, e.target.files[0]);
                              }
                            }}
                          />


                          {hasImage ? (
                            <>
                              <img src={images[idx]!} alt={`Slot ${idx + 1}`} className="slot-img" />
                              <button
                                className="btn-delete-slot"
                                onClick={(e) => handleDeletePhoto(idx, e)}
                                title="Delete photo"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="slot-placeholder">
                              <span>{isLast && fakeMore ? `Ctrl +${fakeCount} v` : "Ctrl + v"}</span>
                            </div>
                          )}

                          {/* Top floating Add Photos button */}
                          <button
                            className="btn-add-photos-top"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRefs.current[idx]?.click();
                            }}
                          >
                            <ImageIcon size={14} />
                            <span>Add Photos</span>
                          </button>

                          {/* Fake More +9 Badge Overlay on Last Slot */}
                          {isLast && fakeMore && (
                            <div className="fake-more-overlay">
                              <span>+{fakeCount}</span>
                            </div>
                          )}

                          {/* Video Play Overlay with Bottom 20% Gradient and Exact FB Play Button */}
                          {activeLayout === "video-card" && (
                            <div className="video-card-overlay">
                              <div className="video-bottom-gradient"></div>
                              <div className="play-button" id="playButtonUI">
                                <svg viewBox="0 0 24 24">
                                  <path
                                    d="M7 4v16c0 1.5 1.6 2.5 3 1.7l12-8c1.3-.9 1.3-2.6 0-3.5l-12-8C8.6 1.4 7 2.4 7 4z"
                                    fill="currentColor"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Bottom Display URL strip attached directly */}
              <div className="display-url-strip">{displayUrl || "facebook.com"}</div>
            </div>


            {/* Grid Layouts Selector Card (Hidden in Single Image Mode) */}
            {!singleImageMode && (
              <div className="layout-picker-card">
                <h3>Select Collage Layout</h3>
                <div className="layouts-grid">
                  {LAYOUT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      className={`layout-card ${activeLayout === preset.id ? "active" : ""}`}
                      onClick={() => setActiveLayout(preset.id)}
                    >
                      <div className="layout-icon">{preset.icon}</div>
                      <span className="layout-name">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />

      {/* Toast Notification */}
      {toast && (
        <div className={`dark-toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      <style jsx>{`
        .dark-post-wrapper {
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-main);
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: background 0.3s, color 0.3s;
        }

        .main-content {
          flex: 1;
          padding: 24px 20px 40px;
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        /* Banner Header */
        .page-title-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          padding: 20px 24px;
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          border: 1px solid var(--glass-border);
          box-shadow: var(--glass-shadow);
        }

        .main-heading {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 10px;
          letter-spacing: -0.4px;
        }

        .main-heading :global(.heading-icon) {
          color: var(--primary);
        }

        .sub-heading {
          margin: 4px 0 0 0;
          font-size: 0.83rem;
          color: var(--text-muted);
        }

        .ext-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
        }

        .ext-badge.connected {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border: 1px solid #86efac;
        }

        .ext-badge.install {
          background: rgba(0, 113, 227, 0.08);
          color: var(--primary);
          border: 1px solid rgba(0, 113, 227, 0.3);
        }

        .ext-badge.install:hover {
          background: rgba(0, 113, 227, 0.15);
        }

        .dark-post-container {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 24px;
          align-items: start;
        }

        /* ─── SIDEBAR FORM ─────────────────────────────────────────────── */
        .control-sidebar {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          padding: 24px;
          box-shadow: var(--glass-shadow);
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Metus.vn FB User Header Badge & Page Selector Grid */
        .fb-user-header-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm);
        }

        .fb-user-avatar-sm {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 1px solid var(--primary);
        }

        .fb-user-initial {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fb-user-name {
          font-weight: 700;
          font-size: 0.88rem;
          color: var(--text-main);
        }

        .fb-user-status {
          font-size: 0.72rem;
          color: #22c55e;
          font-weight: 600;
        }

        .no-pages-alert {
          font-size: 0.78rem;
          color: var(--text-muted);
          background: var(--input-bg);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--glass-border);
        }

        .pages-selector-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 2px;
        }

        .page-select-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-select-card:hover {
          border-color: var(--primary);
        }

        .page-select-card.active {
          border-color: var(--primary);
          background: rgba(0, 113, 227, 0.1);
        }

        .page-card-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }

        .page-card-initial {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-size: 0.78rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-card-info {
          flex: 1;
          min-width: 0;
        }

        .page-card-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .page-card-id {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        .page-select-card :global(.selected-check) {
          color: var(--primary);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }


        .input-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .select-wrapper select,
        .form-group input[type="text"],
        .form-group input[type="url"],
        .form-group input[type="number"],
        .schedule-datetime-input,
        .textarea-container textarea {
          width: 100%;
          box-sizing: border-box;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          font-size: 0.88rem;
          color: var(--text-main);
          outline: none;
          transition: all 0.2s;
        }

        .select-wrapper select:focus,
        .form-group input:focus,
        .textarea-container textarea:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.12);
        }

        .token-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .token-status-pill {
          position: absolute;
          right: 8px;
          background: #dcfce7;
          color: #15803d;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .textarea-container {
          position: relative;
        }

        .emoji-icon-btn {
          position: absolute;
          right: 10px;
          bottom: 10px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .emoji-icon-btn:hover {
          color: var(--primary);
        }

        .fake-count-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .fake-count-wrapper input {
          flex: 1;
        }

        .btn-random-count {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          color: var(--text-main);
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-random-count:hover {
          border-color: var(--primary);
          color: var(--primary);
          transform: rotate(180deg);
        }

        .row-group {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }


        /* Toggle Switch */
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch.small-toggle {
          width: 36px;
          height: 20px;
        }

        .toggle-switch.small-toggle .toggle-slider:before {
          height: 14px;
          width: 14px;
          left: 3px;
          bottom: 3px;
        }

        .toggle-switch.small-toggle input:checked + .toggle-slider:before {
          transform: translateX(16px);
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--track-bg);
          transition: 0.3s;
          border-radius: 24px;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: var(--success);
        }

        .toggle-switch.red-toggle input:checked + .toggle-slider {
          background-color: var(--danger);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        /* Prominent Big Checkbox */
        .big-checkbox-group {
          padding: 8px 0;
        }

        .checkbox-container-big {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-main);
        }

        .big-checkbox {
          width: 20px;
          height: 20px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        /* RUN POST Button */
        .btn-run-post {
          width: 100%;
          padding: 14px;
          border-radius: var(--radius-md);
          border: none;
          background: var(--primary);
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 113, 227, 0.35);
          transition: transform 0.15s, opacity 0.15s;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-run-post:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .btn-run-post:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-box {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .success-box {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.3);
          color: var(--text-main);
          padding: 14px;
          border-radius: var(--radius-sm);
          font-size: 0.82rem;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .success-box :global(.success-icon) {
          color: #22c55e;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .success-title {
          font-weight: 800;
          font-size: 0.9rem;
          color: #22c55e;
        }

        .post-url-text {
          font-family: monospace;
          font-size: 0.76rem;
          word-break: break-all;
          background: var(--input-bg);
          padding: 4px 8px;
          border-radius: 4px;
          color: var(--text-muted);
          border: 1px solid var(--glass-border);
        }

        .success-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 2px;
        }

        .btn-copy-link {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.2s;
        }

        .btn-copy-link:hover {
          opacity: 0.9;
        }

        .btn-view-post {
          color: var(--primary);
          font-weight: 700;
          font-size: 0.78rem;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .share-tip {
          font-size: 0.73rem;
          color: var(--text-muted);
          line-height: 1.35;
          margin-top: 4px;
        }


        /* ─── PREVIEW MAIN ─────────────────────────────────────────────── */
        .preview-main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .page-header-card {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          box-shadow: var(--glass-shadow);
          border: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .page-avatar-img {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--primary);
        }

        .page-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 700;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }


        .page-title {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-main);
        }

        .page-id {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* Canvas Card */
        .canvas-card {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--glass-shadow);
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .canvas-header-bar {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--glass-border);
          gap: 12px;
          flex-wrap: wrap;
        }

        .canvas-header-title {
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .batch-controls-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-batch-import {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          background: var(--primary);
          color: white;
          border: none;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
          box-shadow: 0 2px 10px rgba(0, 113, 227, 0.25);
        }

        .btn-batch-import:hover {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .btn-batch-import:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .delay-chips-row {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--input-bg);
          padding: 3px 6px;
          border-radius: 20px;
          border: 1px solid var(--glass-border);
        }

        .delay-title {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-right: 2px;
        }

        .delay-chip {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 0.72rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .delay-chip:hover {
          color: var(--text-main);
        }

        .delay-chip.active {
          background: var(--primary);
          color: white;
        }

        /* Pulsing Glow Animation during Sequential Filling */
        .grid-slot.filling-active-pulse {
          box-shadow: 0 0 0 3px var(--primary), 0 0 20px rgba(0, 113, 227, 0.6);
          z-index: 10;
          animation: slotPulse 0.4s infinite alternate;
        }

        /* Drag and Drop Slot Swap Styles */
        .grid-slot.dragging-source {
          opacity: 0.4;
          transform: scale(0.96);
          border: 2px dashed var(--primary);
        }

        .grid-slot.drag-target-over {
          box-shadow: 0 0 0 3px #22c55e, 0 0 20px rgba(34, 197, 94, 0.6);
          transform: scale(1.02);
          z-index: 20;
        }

        @keyframes slotPulse {
          0% { opacity: 0.7; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }



        .canvas-toggle-mode {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mode-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        /* Single Custom Image Canvas */
        .single-image-canvas {
          width: 100%;
          max-width: 540px;
          height: 540px;
          background: var(--input-bg);
          border: 2px dashed var(--input-border);
          border-radius: 8px 8px 0 0;
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: border-color 0.2s;
        }

        .single-image-canvas:hover {
          border-color: var(--primary);
        }

        .single-canvas-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .single-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          text-align: center;
          padding: 20px;
        }

        .placeholder-title {
          font-weight: 700;
          font-size: 1.05rem;
          color: var(--text-main);
        }

        .placeholder-sub {
          font-size: 0.82rem;
          color: var(--text-muted);
          max-width: 320px;
        }

        /* White 2px Border Gaps Between Slots */
        .grid-canvas-layout {
          width: 100%;
          max-width: 540px;
          height: 540px;
          background: #ffffff;
          display: grid;
          gap: 2px;
          position: relative;
          border-radius: 8px 8px 0 0;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px var(--glass-border);
        }


        /* Layout Grid variations */
        .layout-5-photos-2-3-top {
          grid-template-columns: repeat(6, 1fr);
          grid-template-rows: 1fr 1fr;
        }
        .layout-5-photos-2-3-top .slot-0 { grid-column: span 3; grid-row: 1; }
        .layout-5-photos-2-3-top .slot-1 { grid-column: span 3; grid-row: 1; }
        .layout-5-photos-2-3-top .slot-2 { grid-column: span 2; grid-row: 2; }
        .layout-5-photos-2-3-top .slot-3 { grid-column: span 2; grid-row: 2; }
        .layout-5-photos-2-3-top .slot-4 { grid-column: span 2; grid-row: 2; }

        .layout-5-photos-2-3 {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: repeat(6, 1fr);
        }
        .layout-5-photos-2-3 .slot-0 { grid-column: 1; grid-row: span 3; }
        .layout-5-photos-2-3 .slot-1 { grid-column: 1; grid-row: span 3; }
        .layout-5-photos-2-3 .slot-2 { grid-column: 2; grid-row: span 2; }
        .layout-5-photos-2-3 .slot-3 { grid-column: 2; grid-row: span 2; }
        .layout-5-photos-2-3 .slot-4 { grid-column: 2; grid-row: span 2; }

        .layout-4-photos {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }

        .layout-3-photos-top {
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
        }
        .layout-3-photos-top .slot-0 { grid-column: span 2; grid-row: 1; }

        .layout-1-photo,
        .layout-video-card {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr;
        }

        .grid-slot {
          position: relative;
          background: #cbd5e1;
          cursor: pointer;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .slot-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .slot-placeholder {
          color: #ffffff;
          font-weight: 700;
          font-size: 1.4rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
          user-select: none;
        }

        .btn-add-photos-top {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 6px;
          color: #0f1117;
        }

        .grid-slot:hover .btn-add-photos-top {
          opacity: 1;
        }

        .btn-delete-slot {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          border: none;
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
          z-index: 10;
        }

        .btn-delete-slot:hover {
          background: #ef4444;
        }

        .btn-load-fb-image {
          margin-top: 8px;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--glass-border);
          background: var(--btn-hover);
          color: var(--text-main);
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-load-fb-image:hover:not(:disabled) {
          background: var(--primary);
          color: #fff;
        }
        .btn-load-fb-image:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .selected-ad-hint {
          display: block;
          margin-top: 6px;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-weight: 600;
        }

        .fake-more-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          font-size: 2.2rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        /* Facebook Exact Video Card Overlay */
        .video-card-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-bottom-gradient {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20%;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0) 100%);
        }

        .play-button {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 65px;
          height: 65px;
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 3px solid rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: all 0.2s;
        }

        .play-button svg {
          width: 45%;
          height: 45%;
          color: white;
          fill: white;
          transition: fill 0.2s, transform 0.2s;
          transform: translateX(-2%);
          overflow: visible;
        }

        .display-url-strip {
          width: 100%;
          max-width: 540px;
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-top: none;
          padding: 10px 14px;
          border-radius: 0 0 8px 8px;
          font-size: 0.78rem;
          color: var(--text-muted);
          text-align: left;
          box-sizing: border-box;
          margin-top: -3px;
        }

        /* Layout Picker Card */
        .layout-picker-card {
          background: var(--glass-bg);
          backdrop-filter: var(--blur);
          -webkit-backdrop-filter: var(--blur);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--glass-shadow);
          border: 1px solid var(--glass-border);
        }

        .layout-picker-card h3 {
          margin: 0 0 14px 0;
          font-size: 0.95rem;
          color: var(--text-main);
        }

        .layouts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 14px;
        }

        .layout-card {
          background: var(--input-bg);
          border: 2px solid var(--input-border);
          border-radius: var(--radius-sm);
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-main);
        }

        .layout-card:hover {
          border-color: var(--primary);
        }

        .layout-card.active {
          border-color: var(--primary);
          background: rgba(0, 113, 227, 0.1);
        }


        .layout-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          text-align: center;
        }

        .dark-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 0.88rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dark-toast.success { background: #22c55e; }
        .dark-toast.error { background: #ef4444; }

        .manual-hash-card {
          background: var(--input-bg);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 16px;
        }

        .hash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .hash-header h4 {
          margin: 0;
          font-size: 0.95rem;
          font-weight: 700;
        }

        .hash-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .hash-steps {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.45;
          margin-bottom: 12px;
        }

        .hash-steps ol {
          margin: 6px 0 0 18px;
          padding: 0;
        }

        .hash-steps li {
          margin-bottom: 4px;
        }

        .hash-link {
          color: var(--primary);
          font-weight: 700;
          text-decoration: none;
        }

        .hash-link:hover {
          text-decoration: underline;
        }

        .hint {
          display: block;
          margin-top: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 900px) {
          .dark-post-container {
            grid-template-columns: 1fr;
          }
          .page-title-banner {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default FbDarkPost;

import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { Folder, FileText, Upload, Download } from "lucide-react";
import JSZip from "jszip";
import { useClientDetails } from "@/modules/cx/hooks/useClientDetails";
import FilePreviewModal from "@/modules/cx/components/FilePreviewModal";

const CATEGORY_ORDER = ["passport", "education", "marriage", "finance", "other"];

const CATEGORY_LABELS = {
  passport: "Passport",
  education: "10th / 12th Marksheet",
  marriage: "Marriage Documents",
  finance: "Finance Documents",
  other: "Other Documents",
};

const DEFAULT_PLACEHOLDER_DOCS = [
  { name: "Passport", category: "passport", status: "Pending" },
  { name: "10th Marksheet", category: "education", status: "Pending" },
  { name: "12th Marksheet", category: "education", status: "Pending" },
  { name: "Marriage Photo 1", category: "marriage", status: "Pending" },
  { name: "Finance Photo", category: "finance", status: "Pending" },
];

function detectType(name = "", fileUrl = "") {
  const value = `${name} ${fileUrl}`.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg)/.test(value)) return "image";
  if (/\.(pdf)/.test(value)) return "pdf";
  if (/\.(mp4|mov|webm|m4v)/.test(value)) return "video";
  return "unsupported";
}

function detectCategory(name = "") {
  const key = String(name).toLowerCase();
  if (key.includes("passport")) return "passport";
  if (key.includes("10th") || key.includes("12th") || key.includes("marksheet")) return "education";
  if (key.includes("marriage")) return "marriage";
  if (key.includes("finance") || key.includes("bank") || key.includes("itr")) return "finance";
  return "other";
}

function sanitizeFilename(value = "file") {
  return String(value).replace(/[^\w.-]+/g, "_");
}

async function compressImageBlob(blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const compressed = await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result || blob), "image/jpeg", 0.72);
    });
    return compressed;
  } catch {
    return blob;
  }
}

export default function ClientFolderDetailsPage({ params: routeParams }) {
  const [, routeParamMatch] = useRoute("/backend/client-folders/:clientId");
  const clientId = routeParams?.clientId || routeParamMatch?.clientId;
  const { client, timeline, isLoading } = useClientDetails(clientId);

  const [selectedCategory, setSelectedCategory] = useState("passport");
  const [previewIndex, setPreviewIndex] = useState(null);
  const [extraDocs, setExtraDocs] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKey, setNewCategoryKey] = useState("");

  const categoryStorageKey = useMemo(
    () => `client_folder_categories_${clientId || "unknown"}`,
    [clientId],
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(categoryStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setCustomCategories(parsed);
    } catch {
      // ignore storage parsing errors
    }
  }, [categoryStorageKey]);

  useEffect(() => {
    localStorage.setItem(categoryStorageKey, JSON.stringify(customCategories));
  }, [categoryStorageKey, customCategories]);
  const [isDownloadingOriginal, setIsDownloadingOriginal] = useState(false);
  const [isDownloadingCompressed, setIsDownloadingCompressed] = useState(false);

  const mergedDocs = useMemo(() => {
    const actualDocs = (client?.documents || []).map((doc) => ({
      id: doc.id || `doc-${doc.name}`,
      name: doc.name,
      status: doc.status || "Pending",
      uploadedAt: doc.uploadedAt || "-",
      fileUrl: doc.fileUrl || "",
      fileType: doc.fileType || detectType(doc.name, doc.fileUrl),
      category: detectCategory(doc.name),
      source: "uploaded",
    }));

    const placeholders = DEFAULT_PLACEHOLDER_DOCS.map((doc, idx) => ({
      id: `placeholder-${idx}-${doc.name}`,
      name: doc.name,
      status: doc.status,
      uploadedAt: "-",
      fileUrl: "",
      fileType: "unsupported",
      category: doc.category,
      source: "required",
    }));

    const withDedup = [...actualDocs];
    placeholders.forEach((placeholder) => {
      const exists = actualDocs.some((doc) => doc.name.toLowerCase() === placeholder.name.toLowerCase());
      if (!exists) withDedup.push(placeholder);
    });

    return [...withDedup, ...extraDocs];
  }, [client?.documents, extraDocs]);

  const categories = useMemo(() => [...CATEGORY_ORDER, ...customCategories], [customCategories]);

  const labelMap = useMemo(() => {
    const map = { ...CATEGORY_LABELS };
    customCategories.forEach((key) => {
      map[key] = key
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    });
    return map;
  }, [customCategories]);

  const grouped = useMemo(() => {
    const map = { passport: [], education: [], marriage: [], finance: [], other: [] };
    customCategories.forEach((key) => {
      map[key] = [];
    });
    mergedDocs.forEach((doc) => {
      const category = doc.category || "other";
      map[category] = map[category] || [];
      map[category].push(doc);
    });
    return map;
  }, [mergedDocs, customCategories]);

  const categoryDocs = grouped[selectedCategory] || [];
  const previewDoc = previewIndex !== null ? categoryDocs[previewIndex] : null;

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);
    const newDoc = {
      id: `local-${Date.now()}`,
      name: file.name,
      status: "Uploaded",
      uploadedAt: new Date().toISOString().slice(0, 10),
      fileUrl,
      fileType: detectType(file.name, fileUrl),
      category: selectedCategory,
      source: "uploaded",
    };
    setExtraDocs((prev) => [newDoc, ...prev]);
    event.target.value = "";
  };

  const handleCreateCategory = (event) => {
    event.preventDefault();
    const label = String(newCategoryName || "").trim();
    if (!label) return;

    const key = String(newCategoryKey || label)
      .trim()
      .toLowerCase()
      .replace(/[^\w]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!key) return;
    if (CATEGORY_ORDER.includes(key) || customCategories.includes(key)) return;

    setCustomCategories((prev) => [...prev, key]);
    setSelectedCategory(key);
    setNewCategoryName("");
    setNewCategoryKey("");
  };

  const downloadZip = async (compressMode) => {
    if (!mergedDocs.length) return;
    if (compressMode === "compressed") setIsDownloadingCompressed(true);
    else setIsDownloadingOriginal(true);

    try {
      const zip = new JSZip();
      const root = zip.folder(sanitizeFilename(client.id || "client"));
      for (const doc of mergedDocs) {
        if (!doc.fileUrl) continue;
        const categoryFolder = root.folder(sanitizeFilename(doc.category || "other"));
        const extensionFromType =
          doc.fileType === "pdf" ? ".pdf" : doc.fileType === "image" ? ".jpg" : doc.fileType === "video" ? ".mp4" : "";
        const baseName = sanitizeFilename(doc.name || "document");
        const filename = baseName.includes(".") ? baseName : `${baseName}${extensionFromType}`;

        try {
          const response = await fetch(doc.fileUrl);
          const sourceBlob = await response.blob();
          const finalBlob =
            compressMode === "compressed" && doc.fileType === "image" ? await compressImageBlob(sourceBlob) : sourceBlob;
          categoryFolder.file(filename, finalBlob);
        } catch {
          categoryFolder.file(`${filename}.txt`, "File could not be fetched for zipping.");
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${sanitizeFilename(client.id || "client")}-${compressMode}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsDownloadingOriginal(false);
      setIsDownloadingCompressed(false);
    }
  };

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading client folder...</div>;
  if (!client) return <div className="p-6 text-sm text-rose-600">Client folder not found.</div>;

  return (
    <div className="space-y-5 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-900">{client.name} - Client Folder</h1>
        <p className="mt-1 text-sm text-slate-600">Client ID: {client.id}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">Country: {client.country || "-"}</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">Stage: {client.stage || "-"}</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">Visa Category: {client.info?.visaType || "-"}</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">Timeline Events: {(timeline || []).length}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="px-2 pb-2 text-xs font-semibold uppercase text-slate-500">Folder Structure</p>
          <div className="space-y-1">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm ${
                  selectedCategory === category ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  {labelMap[category] || category}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{(grouped[category] || []).length}</span>
              </button>
            ))}
          </div>
          <form onSubmit={handleCreateCategory} className="mt-3 space-y-2 border-t border-slate-200 pt-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Create Folder</p>
            <input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Folder Name (e.g. Medical)"
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
            />
            <input
              value={newCategoryKey}
              onChange={(e) => setNewCategoryKey(e.target.value)}
              placeholder="Optional key (e.g. medical_docs)"
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Add Folder
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{labelMap[selectedCategory] || selectedCategory}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isDownloadingOriginal}
                onClick={() => downloadZip("original")}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isDownloadingOriginal ? "Preparing..." : "Download Original ZIP"}
              </button>
              <button
                type="button"
                disabled={isDownloadingCompressed}
                onClick={() => downloadZip("compressed")}
                className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isDownloadingCompressed ? "Compressing..." : "Download Compressed ZIP"}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                <Upload className="h-4 w-4" />
                Upload File
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            {categoryDocs.map((doc, idx) => (
              <div key={doc.id} className="grid gap-2 rounded-md border border-slate-100 p-3 text-sm md:grid-cols-[2fr_1fr_1fr_auto]">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900">{doc.name}</span>
                </div>
                <p className="text-slate-600">{doc.status}</p>
                <p className="text-slate-500">{doc.uploadedAt}</p>
                <button
                  type="button"
                  disabled={!doc.fileUrl}
                  onClick={() => setPreviewIndex(idx)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Open
                </button>
              </div>
            ))}
            {categoryDocs.length === 0 ? <p className="text-sm text-slate-500">No files in this folder.</p> : null}
          </div>
        </div>
      </div>

      <FilePreviewModal
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        fileUrl={previewDoc?.fileUrl || ""}
        fileType={previewDoc?.fileType || "unsupported"}
        fileName={previewDoc?.name || ""}
        onPrev={previewIndex > 0 ? () => setPreviewIndex((prev) => prev - 1) : undefined}
        onNext={previewIndex !== null && previewIndex < categoryDocs.length - 1 ? () => setPreviewIndex((prev) => prev + 1) : undefined}
      />
    </div>
  );
}

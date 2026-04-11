import { useEffect, useState } from "react";
import { Download, ExternalLink, FileQuestion, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileType,
  fileName,
  onPrev,
  onNext,
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && onPrev) onPrev();
      if (event.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, onPrev, onNext]);

  useEffect(() => {
    setIsLoaded(false);
  }, [fileUrl, fileType, isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 md:p-6"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative flex h-[95vh] w-full max-w-7xl animate-in fade-in zoom-in-95 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/85 px-4 py-3 backdrop-blur md:px-6">
          <p className="max-w-[55%] truncate text-sm font-medium text-slate-100 md:text-base">{fileName || "File preview"}</p>
          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName}
              className="rounded-md border border-slate-600 p-2 text-slate-200 transition hover:bg-slate-800"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-600 p-2 text-slate-200 transition hover:bg-slate-800"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-600 p-2 text-slate-200 transition hover:bg-slate-800"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1">
          {!isLoaded ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-slate-200" />
            </div>
          ) : null}

          <div className="flex h-full items-center justify-center p-4 md:p-8">
            {fileType === "image" ? (
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-full max-w-full rounded-md object-contain"
                onLoad={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)}
              />
            ) : null}

            {fileType === "pdf" ? (
              <iframe
                src={fileUrl}
                className="h-full w-full rounded-md bg-white"
                title={fileName || "PDF Preview"}
                onLoad={() => setIsLoaded(true)}
              />
            ) : null}

            {fileType === "video" ? (
              <video
                controls
                className="max-h-full max-w-full rounded-md"
                onLoadedData={() => setIsLoaded(true)}
                onError={() => setIsLoaded(true)}
              >
                <source src={fileUrl} />
              </video>
            ) : null}

            {!["image", "pdf", "video"].includes(fileType) ? (
              <div className="text-center text-slate-300">
                <FileQuestion className="mx-auto mb-2 h-12 w-12 text-slate-400" />
                <p className="text-lg font-medium">Preview not available for this file type.</p>
                <p className="text-sm text-slate-400">Use download or open in new tab.</p>
              </div>
            ) : null}
          </div>

          {onPrev ? (
            <button
              type="button"
              onClick={onPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/65"
              aria-label="Previous file"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          {onNext ? (
            <button
              type="button"
              onClick={onNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/65"
              aria-label="Next file"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

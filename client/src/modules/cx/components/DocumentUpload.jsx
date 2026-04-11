import { useState } from "react";
import { useUploadDocument } from "../hooks/useUploadDocument";

export default function DocumentUpload({ clientId }) {
  const [documentName, setDocumentName] = useState("");
  const [file, setFile] = useState(null);
  const uploadMutation = useUploadDocument(clientId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!documentName || !file) return;
    await uploadMutation.mutateAsync({ documentName, file });
    setDocumentName("");
    setFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Upload Document</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="Document name"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={uploadMutation.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}

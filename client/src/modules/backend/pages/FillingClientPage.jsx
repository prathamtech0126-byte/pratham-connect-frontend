import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import ClientTabs from "@/modules/cx/components/ClientTabs";
import ClientTimeline from "@/modules/cx/components/ClientTimeline";
import { useClientDetails } from "@/modules/cx/hooks/useClientDetails";
import FilePreviewModal from "@/modules/cx/components/FilePreviewModal";

function ClientInfoTab({ client }) {
  const info = client?.info || {};
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Personal</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{client?.name}</p>
        <p className="text-sm text-slate-600">{info.email || "-"}</p>
        <p className="text-sm text-slate-600">{info.phone || "-"}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Visa Details</p>
        <p className="mt-2 text-sm text-slate-800">Type: {info.visaType || "-"}</p>
        <p className="text-sm text-slate-600">Passport: {info.passportNo || "-"}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Payment</p>
        <p className="mt-2 text-sm text-slate-800">Initial: Rs.{info.initialPayment || 0}</p>
        <p className="text-sm text-slate-600">Before Visa: Rs.{info.beforeVisaPayment || 0}</p>
        <p className="text-sm text-slate-600">After Visa: Rs.{info.afterVisaPayment || 0}</p>
        <p className="text-sm text-slate-600">Total: Rs.{info.totalPayment || 0}</p>
      </div>
    </div>
  );
}

function ProductDetailsTab({ client }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Product Details</h3>
      <div className="space-y-2">
        {(client?.products || []).map((product) => (
          <div key={product.name} className="flex items-center justify-between rounded-md border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{product.name}</p>
              {product.opted && product.details ? <p className="text-xs text-slate-500">{product.details}</p> : null}
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                product.opted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {product.opted ? "Opted" : "Not Opted"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const getFileType = (doc) => {
  if (doc?.fileType) return doc.fileType;
  const value = String(doc?.fileUrl || doc?.name || "").toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(value)) return "image";
  if (/\.(pdf)$/.test(value)) return "pdf";
  if (/\.(mp4|mov|webm|m4v)$/.test(value)) return "video";
  return "unsupported";
};

function DocumentsTab({ client }) {
  const [reviewStatuses, setReviewStatuses] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(null);

  const documents = useMemo(() => client?.documents || [], [client?.documents]);

  useEffect(() => {
    const mapped = {};
    documents.forEach((doc) => {
      const status = String(doc.status || "Pending").toLowerCase();
      if (status.includes("verif") || status.includes("approv")) mapped[doc.id] = "Approved";
      else if (status.includes("reject")) mapped[doc.id] = "Rejected";
      else mapped[doc.id] = "Pending";
    });
    setReviewStatuses(mapped);
  }, [documents]);

  const activeFile = selectedIndex !== null ? documents[selectedIndex] : null;

  const updateStatus = (docId, value) => {
    setReviewStatuses((prev) => ({ ...prev, [docId]: value }));
  };

  const getStatusClasses = (value) => {
    if (value === "Approved") return "bg-emerald-100 text-emerald-700";
    if (value === "Rejected") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Client Uploaded Documents</h3>
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <div key={doc.id} className="grid gap-3 rounded-md border border-slate-100 p-3 text-sm md:grid-cols-[2fr_1fr_1fr_2fr]">
              <p className="font-medium text-slate-900">{doc.name}</p>
              <p className="text-slate-500">{doc.uploadedAt}</p>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(reviewStatuses[doc.id])}`}>
                {reviewStatuses[doc.id] || "Pending"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(doc.id, "Approved")}
                  className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(doc.id, "Rejected")}
                  className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIndex(idx)}
                  className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
          {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No uploaded documents found for this client.</p>
          ) : null}
        </div>
      </div>
      <FilePreviewModal
        isOpen={selectedIndex !== null}
        onClose={() => setSelectedIndex(null)}
        fileUrl={activeFile?.fileUrl || ""}
        fileType={getFileType(activeFile)}
        fileName={activeFile?.name || ""}
        onPrev={selectedIndex > 0 ? () => setSelectedIndex((prev) => prev - 1) : undefined}
        onNext={selectedIndex !== null && selectedIndex < documents.length - 1 ? () => setSelectedIndex((prev) => prev + 1) : undefined}
      />
    </>
  );
}

export default function FillingClientPage({ params: routeParams }) {
  const [, paramsFromBackendRoute] = useRoute("/backend/clients/:id/filling");
  const clientId = routeParams?.id || paramsFromBackendRoute?.id;
  const [activeTab, setActiveTab] = useState("client-info");
  const { client, timeline, isLoading } = useClientDetails(clientId);

  if (isLoading) return <div className="p-6 text-sm text-slate-500">Loading filling client data...</div>;
  if (!client) return <div className="p-6 text-sm text-rose-600">Client not found.</div>;

  const tabs = [
    { key: "client-info", label: "Client Info", content: <ClientInfoTab client={client} /> },
    { key: "product-details", label: "Product Details", content: <ProductDetailsTab client={client} /> },
    { key: "documents", label: "Documents", content: <DocumentsTab client={client} /> },
  ];

  return (
    <div className="space-y-5 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-900">Filling Client - {client.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Stage: {client.stage}</p>
        <div className="mt-4">
          <ClientTimeline events={timeline} />
        </div>
      </div>

      <ClientTabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />
    </div>
  );
}

import { useState } from "react";
import { useRoute } from "wouter";
import ClientTabs from "../components/ClientTabs";
import ClientTimeline from "../components/ClientTimeline";
import DocumentUpload from "../components/DocumentUpload";
import Checklist from "../components/Checklist";
import { useClientDetails } from "../hooks/useClientDetails";

function InfoTab({ client }) {
  const info = client?.info || {};
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Personal Details</p>
        <p className="mt-2 text-sm text-slate-800">{client?.name}</p>
        <p className="text-sm text-slate-600">{info.email}</p>
        <p className="text-sm text-slate-600">{info.phone}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Visa Details</p>
        <p className="mt-2 text-sm text-slate-800">Type: {info.visaType || "-"}</p>
        <p className="text-sm text-slate-600">Passport: {info.passportNo || "-"}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs uppercase text-slate-500">Payment Details</p>
        <p className="mt-2 text-sm text-slate-800">Initial: Rs.{info.initialPayment || 0}</p>
        <p className="text-sm text-slate-600">Before Visa: Rs.{info.beforeVisaPayment || 0}</p>
        <p className="text-sm text-slate-600">After Visa: Rs.{info.afterVisaPayment || 0}</p>
      </div>
    </div>
  );
}

function ProductsTab({ client }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="space-y-2">
        {(client?.products || []).map((product) => (
          <div key={product.name} className="flex items-start justify-between gap-4 rounded-md border border-slate-100 p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{product.name}</p>
              {product.opted ? <p className="text-xs text-slate-500">{product.details || "Details available"}</p> : null}
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

function DocumentsTab({ client }) {
  return (
    <div className="space-y-4">
      <DocumentUpload clientId={client?.id} />
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Uploaded Documents</h3>
        <div className="space-y-2">
          {(client?.documents || []).map((doc) => (
            <div key={doc.id} className="grid grid-cols-3 rounded-md border border-slate-100 p-3 text-sm">
              <p className="text-slate-800">{doc.name}</p>
              <p className="text-slate-600">{doc.status}</p>
              <p className="text-slate-500">{doc.uploadedAt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientDetailsPage() {
  const [, params] = useRoute("/cx/clients/:id");
  const clientId = params?.id;
  const [activeTab, setActiveTab] = useState("info");
  const { client, timeline, isLoading } = useClientDetails(clientId);

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading client details...</div>;
  }
  if (!client) {
    return <div className="p-6 text-sm text-rose-600">Client not found.</div>;
  }

  const tabs = [
    { key: "info", label: "Info", content: <InfoTab client={client} /> },
    { key: "products", label: "Products", content: <ProductsTab client={client} /> },
    { key: "documents", label: "Documents", content: <DocumentsTab client={client} /> },
    { key: "checklist", label: "Checklist", content: <Checklist items={client.checklist || []} /> },
  ];

  return (
    <div className="space-y-5 p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{client.name}</h1>
            <p className="text-sm text-slate-500">Status: {client.status || "Active"}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{client.stage}</span>
        </div>
        <ClientTimeline events={timeline} />
      </div>

      <ClientTabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />
    </div>
  );
}

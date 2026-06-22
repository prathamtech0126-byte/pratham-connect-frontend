import BackendClients from "@/pages/Bakend Team/Backend Team/BK_Clients";

/**
 * CX Team client list — same rich Visa-Case table as the Backend Team, but CX
 * users may only change the Documentation status (not Filing / Submission etc.).
 * Driven by the shared DUMMY_BACKEND_CLIENTS data via the BackendClients table.
 */
export default function CxClients() {
  return <BackendClients title="My Clients" breadcrumbLabel="CX Team" statusScope="documentation" defaultPageSize={20} />;
}

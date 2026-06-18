import BackendClients from "@/pages/Bakend Team/Backend Team/BK_Clients";

/**
 * Binding Team client list — same rich Visa-Case table as the Backend & CX
 * teams, driven by the shared DUMMY_BACKEND_CLIENTS data so all three stay in
 * sync. Status scope is currently full ("all"); restrict it here if binding
 * should only move cases through specific stages.
 */
export default function BtClients() {
  return <BackendClients title="My Clients" breadcrumbLabel="Binding Team" statusScope="all" defaultPageSize={500} />;
}

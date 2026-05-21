import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { CounsellorTechSupport } from "./CounsellorTechSupport";
import { AdminTechSupport } from "./AdminTechSupport";
import { ITSupportKanbanDashboard } from "./ITSupportKanbanDashboard";

const adminLikeRoles = ["superadmin", "manager", "director"] as const;

export default function TechSupportPage() {
  const { user } = useAuth();
  const isAdminView = !!user?.role && adminLikeRoles.includes(user.role as (typeof adminLikeRoles)[number]);
  const isTechSupportAgent = user?.role === "tech_support";

  if (isTechSupportAgent) {
    return <ITSupportKanbanDashboard />;
  }

  return (
    <PageWrapper
      title="Tech Support"
      breadcrumbs={[{ label: "Tech Support" }]}
    >
      {isAdminView ? <AdminTechSupport /> : <CounsellorTechSupport />}
    </PageWrapper>
  );
}

import { cn } from "@/lib/utils";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

interface PageWrapperProps {
  title: string | React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ title, breadcrumbs, actions, children, className }: PageWrapperProps) {
  return (
    <div className={cn("space-y-6 animate-in fade-in-50 duration-500 print:space-y-4", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="space-y-5">
          <h1 className="text-header text-foreground">{title}</h1>
          {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      <div className="min-h-[calc(100vh-200px)] print:min-h-0">
        {children}
      </div>
    </div>
  );
}


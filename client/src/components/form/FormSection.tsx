import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, className, children }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className="text-lg font-medium leading-none tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Separator />
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 pt-2">
        {children}
      </div>
    </div>
  );
}

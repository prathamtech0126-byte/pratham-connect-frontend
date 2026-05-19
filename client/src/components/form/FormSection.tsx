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
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#1A2B3B]">{title}</h2>
        {description && (
          <p className="text-gray-500 font-medium">{description}</p>
        )}
      </div>
      <div className="border-b border-gray-100 pb-2" />
      <div className="pt-4">
        {children}
      </div>
    </div>
  );
}

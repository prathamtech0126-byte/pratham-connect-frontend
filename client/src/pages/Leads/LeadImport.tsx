import { useState, useRef } from "react";
import { Link } from "wouter";
import { PageWrapper } from "@/layout/PageWrapper";
import { useAuth } from "@/context/auth-context";
import { canUseCsvImportExport } from "@/lib/lead-permissions";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ImportResult {
  created: number;
  failed: number;
  errors?: { row: number; message: string }[];
}

export default function LeadImport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user || !canUseCsvImportExport(user.role)) {
    return <Redirect to="/" />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    if (chosen) {
      const isCsv =
        chosen.name.toLowerCase().endsWith(".csv") ||
        chosen.type === "text/csv" ||
        chosen.type === "application/csv";
      if (!isCsv) {
        toast({
          title: "Invalid file",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        setFile(null);
        return;
      }
      setFile(chosen);
      setResult(null);
    } else {
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No file", description: "Select a CSV file first.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setResult(null);
    try {
      // Simulate API: POST /api/leads/import with file
      await new Promise((r) => setTimeout(r, 1500));
      const simulated: ImportResult = {
        created: 3,
        failed: 1,
        errors: [{ row: 2, message: "Invalid email format" }],
      };
      setResult(simulated);
      toast({
        title: "Import complete",
        description: `${simulated.created} created, ${simulated.failed} failed.`,
      });
    } catch {
      toast({
        title: "Import failed",
        description: "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <PageWrapper
      title="Import leads"
      breadcrumbs={[
        { label: "Leads", href: "/leads" },
        { label: "Import" },
      ]}
    >
      <div className="max-w-2xl space-y-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload CSV
            </CardTitle>
            <CardDescription>
              Upload a CSV file with columns: name, email, phone, source. Only .csv files are accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,application/csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground file:transition-colors hover:file:bg-primary/90"
              />
              <div className="flex gap-2 shrink-0">
                <Button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? "Importing…" : "Upload"}
                </Button>
                {(file || result) && (
                  <Button variant="outline" onClick={handleReset} disabled={isUploading}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Import result</CardTitle>
              <CardDescription>Summary of the import. Fix errors and re-upload if needed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium">Created: {result.created}</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium">Failed: {result.failed}</span>
                  </div>
                )}
              </div>
              {result.errors && result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Errors by row</p>
                  <ul className="rounded-lg border border-border/60 divide-y divide-border/60 text-sm">
                    {result.errors.map((err, i) => (
                      <li key={i} className="px-3 py-2 flex justify-between gap-4">
                        <span className="text-muted-foreground">Row {err.row}</span>
                        <span className="text-destructive font-medium">{err.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="pt-2">
                <Link href="/leads">
                  <Button variant="default" className="gap-2">
                    View leads
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

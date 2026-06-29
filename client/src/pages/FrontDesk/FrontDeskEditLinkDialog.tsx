import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Link2, Loader2, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { frontDeskApi, EditLinkRecord } from "@/api/frontdesk.api";
import { resolveEditUrl } from "@/lib/edit-link-url";
import { LinkExpiryCountdown } from "@/components/LinkExpiryCountdown";

interface Props {
  leadId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FrontDeskEditLinkDialog({ leadId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [createdExpiresAt, setCreatedExpiresAt] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["frontdesk-edit-links", leadId],
    queryFn: () => frontDeskApi.getEditLinks(leadId),
    enabled: open,
  });

  const links = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => frontDeskApi.createEditLink(leadId),
    onSuccess: (res) => {
      const url = resolveEditUrl(res.editUrl, res.token);
      setCreatedUrl(url);
      setCreatedExpiresAt(res.expiresAt);
      qc.invalidateQueries({ queryKey: ["frontdesk-edit-links", leadId] });
      toast({ title: "Edit link created", description: "Share this link with the client." });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create link",
        description: err?.response?.data?.message ?? "Please try again",
        variant: "destructive",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (tokenId: number) => frontDeskApi.revokeEditLink(leadId, tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["frontdesk-edit-links", leadId] });
      toast({ title: "Edit link revoked" });
    },
    onError: (err: any) => {
      toast({
        title: "Failed to revoke link",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    },
  });

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url);
    toast({ title: "Link copied to clipboard" });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCreatedUrl(null);
      setCreatedExpiresAt(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Client edit link
          </DialogTitle>
          <DialogDescription>
            Generate a time-limited link so the client can update their registration details.
            Creating a new link revokes any previous active links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {createdUrl && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">New link</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-start">
                  <div className="rounded-md border border-orange-300 bg-white p-2">
                    <QRCodeSVG value={createdUrl} size={120} level="M" />
                  </div>
                  <p className="text-xs font-medium text-slate-600">Scan to update</p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm break-all text-slate-800">{createdUrl}</p>
                  {createdExpiresAt && (
                    <p className="text-xs text-slate-500">
                      Expires {format(new Date(createdExpiresAt), "d MMM yyyy, HH:mm")} (
                      <LinkExpiryCountdown expiresAt={createdExpiresAt} />)
                    </p>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => copyUrl(createdUrl)}>
                    <Copy className="h-4 w-4" /> Copy link
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full gap-1.5"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {createMutation.isPending ? "Creating…" : "Create new edit link"}
          </Button>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active links</p>
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-slate-500">No active edit links.</p>
            ) : (
              <ul className="space-y-2">
                {links.map((link: EditLinkRecord) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0 text-sm">
                      <p className="text-slate-700">
                        Expires {format(new Date(link.expiresAt), "d MMM, HH:mm")}
                      </p>
                      <p className="text-xs text-slate-500">
                        <LinkExpiryCountdown expiresAt={link.expiresAt} /> remaining
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(link.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useCallback, useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { frontDeskApi, FrontDeskLeadDetail } from "@/api/frontdesk.api";
import { resolveEditUrl } from "@/lib/edit-link-url";
import {
  restoreBrowserPrintChrome,
  setPrintClientMode,
  setPrintLayout,
  triggerPrint,
} from "@/lib/print-page";
import FrontDeskLeadPrintSheet from "./FrontDeskLeadPrintSheet";

interface PrintEditLink {
  url: string;
  expiresAt: string;
}

interface PrintPayload {
  lead: FrontDeskLeadDetail;
  editLink: PrintEditLink | null;
}

function isEditLinkBlocked(lead: FrontDeskLeadDetail): boolean {
  return (
    lead.assignmentStatus === "converted" ||
    lead.assignmentStatus === "dropped" ||
    lead.progressStatus === "junk"
  );
}

async function fetchEditLinkForPrint(lead: FrontDeskLeadDetail): Promise<PrintEditLink | null> {
  if (isEditLinkBlocked(lead)) return null;
  try {
    const link = await frontDeskApi.createEditLink(lead.id);
    return {
      url: resolveEditUrl(link.editUrl, link.token),
      expiresAt: link.expiresAt,
    };
  } catch {
    return null;
  }
}

export function usePrintClientLead() {
  const { toast } = useToast();
  const [printPayload, setPrintPayload] = useState<PrintPayload | null>(null);
  const [printingId, setPrintingId] = useState<number | null>(null);

  const reset = useCallback(() => {
    setPrintPayload(null);
    setPrintingId(null);
    setPrintLayout(null);
    setPrintClientMode(false);
    restoreBrowserPrintChrome();
  }, []);

  useEffect(() => {
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, [reset]);

  const printClient = useCallback(
    async (leadId: number, existing?: FrontDeskLeadDetail) => {
      setPrintingId(leadId);
      try {
        setPrintLayout("portrait");
        setPrintClientMode(true);

        const detail = existing ?? (await frontDeskApi.getLeadDetail(leadId)).data;
        const editLink = await fetchEditLinkForPrint(detail);
        flushSync(() => setPrintPayload({ lead: detail, editLink }));
        await triggerPrint(undefined, { suppressBrowserChrome: true });
      } catch {
        reset();
        toast({ title: "Print failed", variant: "destructive" });
      }
    },
    [reset, toast],
  );

  const printPortal =
    printPayload &&
    createPortal(
      <div id="front-desk-client-print" aria-hidden="true">
        <FrontDeskLeadPrintSheet lead={printPayload.lead} editLink={printPayload.editLink} />
      </div>,
      document.body,
    );

  return { printClient, printingId, printPortal };
}

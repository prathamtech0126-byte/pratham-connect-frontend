let savedDocumentTitle: string | null = null;

/** Hide browser print header/footer chrome (title, URL, date in margins). */
export function suppressBrowserPrintChrome() {
  if (savedDocumentTitle === null) {
    savedDocumentTitle = document.title;
    document.title = " ";
  }
}

export function restoreBrowserPrintChrome() {
  if (savedDocumentTitle !== null) {
    document.title = savedDocumentTitle;
    savedDocumentTitle = null;
  }
}

/** Trigger browser print after optional async prep (e.g. loading all table rows). */
export async function triggerPrint(
  prepare?: () => void | Promise<void>,
  options?: { suppressBrowserChrome?: boolean },
) {
  await prepare?.();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await waitForPrintImages();

  const suppressChrome = options?.suppressBrowserChrome ?? false;
  if (suppressChrome) {
    suppressBrowserPrintChrome();
    window.addEventListener("afterprint", restoreBrowserPrintChrome, { once: true });
  }

  window.print();
}

/** Wait for images inside the print container to finish loading. */
export function waitForPrintImages(containerId = "front-desk-client-print"): Promise<void> {
  return new Promise((resolve) => {
    const container = document.getElementById(containerId);
    const imgs = container ? Array.from(container.querySelectorAll("img")) : [];
    if (imgs.length === 0) {
      resolve();
      return;
    }
    let done = 0;
    const finish = () => {
      done += 1;
      if (done >= imgs.length) resolve();
    };
    imgs.forEach((img) => {
      if (img.complete) finish();
      else {
        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
      }
    });
  });
}

export function onAfterPrint(callback: () => void) {
  window.addEventListener("afterprint", callback, { once: true });
}

export function setPrintLayout(mode: "landscape" | "portrait" | null) {
  document.body.classList.remove("print-landscape", "print-portrait");
  if (mode) document.body.classList.add(`print-${mode}`);
}

export function setPrintClientMode(enabled: boolean) {
  document.body.classList.toggle("print-client-only", enabled);
}

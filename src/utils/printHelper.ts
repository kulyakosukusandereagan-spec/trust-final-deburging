// Unified Thermal & Document Print Helper for Browser iFrame Sandbox & Standalone Modes

export interface PrintOptions {
  showPreviewModal?: boolean;
}

export const executePrintHtml = (
  htmlContent: string, 
  title: string = 'Print Document', 
  options: PrintOptions = { showPreviewModal: false }
) => {
  // Primary Method: Isolated Hidden Iframe Print
  // This guarantees the parent window DOM (#root, POS terminal, dashboard layout)
  // NEVER changes size, resizes, hides elements, or suffers layout shifts.
  try {
    let printIframe = document.getElementById('junub-silent-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'junub-silent-print-iframe';
      printIframe.setAttribute('style', 'position: fixed; right: -9999px; bottom: -9999px; width: 0px; height: 0px; border: none; visibility: hidden; pointer-events: none;');
      printIframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(printIframe);
    }

    const iframeWin = printIframe.contentWindow;
    const iframeDoc = printIframe.contentDocument || iframeWin?.document;

    if (iframeDoc && iframeWin) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Trigger focus & print inside the isolated iframe without touching parent DOM
      setTimeout(() => {
        try {
          iframeWin.focus();
          iframeWin.print();
        } catch (printErr) {
          console.warn("Iframe print error, attempting popup window fallback:", printErr);
          fallbackPopupWindow(htmlContent, title, options);
        }
      }, 300);

      if (!options.showPreviewModal) {
        return;
      }
    }
  } catch (err) {
    console.warn("Silent iframe initialization error:", err);
    fallbackPopupWindow(htmlContent, title, options);
  }

  if (options.showPreviewModal) {
    renderPreviewModal(htmlContent, title);
  }
};

function fallbackPopupWindow(htmlContent: string, title: string, options: PrintOptions) {
  try {
    const pWin = window.open('', '_blank', 'width=900,height=750,scrollbars=yes,resizable=yes');
    if (pWin) {
      pWin.document.open();
      pWin.document.write(htmlContent);
      pWin.document.close();
      setTimeout(() => {
        try {
          pWin.focus();
          pWin.print();
        } catch (e) {}
      }, 350);
      return;
    }
  } catch (e) {}

  if (options.showPreviewModal) {
    renderPreviewModal(htmlContent, title);
  }
}

function renderPreviewModal(htmlContent: string, title: string) {
  let modalOverlay = document.getElementById('junub-print-modal-overlay');
  if (modalOverlay) {
    modalOverlay.remove();
  }

  modalOverlay = document.createElement('div');
  modalOverlay.id = 'junub-print-modal-overlay';
  modalOverlay.className = 'junub-no-print';
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.inset = '0';
  modalOverlay.style.zIndex = '999999';
  modalOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0.85)';
  modalOverlay.style.backdropFilter = 'blur(6px)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.flexDirection = 'column';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.padding = '16px';

  modalOverlay.innerHTML = `
    <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4); max-width: 750px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid #cbd5e1;">
      <div style="padding: 14px 20px; background: #0f172a; color: white; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 22px;">🖨️</span>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; font-family: system-ui, sans-serif; color: white;">${title}</h3>
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: system-ui, sans-serif;">Print Output Document Preview</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="junub-modal-download-btn" style="background: #0284c7; color: white; font-weight: 800; padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
            📄 Download PDF File
          </button>
          <button id="junub-modal-print-btn" style="background: #10b981; color: white; font-weight: 800; padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
            🖨️ Print / Save as PDF
          </button>
          <button id="junub-modal-close-btn" style="background: #334155; color: #f1f5f9; font-weight: bold; padding: 8px 14px; border-radius: 10px; border: none; cursor: pointer; font-size: 12px;">
            ✖ Close
          </button>
        </div>
      </div>
      <div style="flex: 1; overflow-y: auto; padding: 20px; background: #f8fafc; display: flex; justify-content: center;">
        <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); width: 100%; max-width: 650px; border: 1px solid #e2e8f0; color: black; font-family: system-ui, sans-serif;">
          ${htmlContent}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const printBtn = document.getElementById('junub-modal-print-btn');
  const downloadBtn = document.getElementById('junub-modal-download-btn');
  const closeBtn = document.getElementById('junub-modal-close-btn');

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      try {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_');
        a.download = `${sanitizedTitle}_${new Date().toISOString().substring(0,10)}.pdf.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn("Download error:", e);
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      try {
        let printIframe = document.getElementById('junub-silent-print-iframe') as HTMLIFrameElement;
        if (printIframe && printIframe.contentWindow) {
          printIframe.contentWindow.focus();
          printIframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch (e) {}
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const el = document.getElementById('junub-print-modal-overlay');
      if (el) el.remove();
    });
  }
}






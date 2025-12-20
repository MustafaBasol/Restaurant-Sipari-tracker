type OpenPrintWindowOptions = {
  title?: string;
};

export const openPrintWindow = (htmlBody: string, options: OpenPrintWindowOptions = {}) => {
  const title = options.title ?? 'Print';

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Pop-up blocked: unable to open print window.');
  }

  const doc = printWindow.document;
  doc.open();
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      @media print {
        body { margin: 0; }
      }
      body {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
          "Courier New", monospace;
        padding: 16px;
        color: #111;
      }
      .ticket {
        white-space: pre-wrap;
        font-size: 12px;
        line-height: 1.35;
      }
      .muted { color: #666; }
      hr { border: 0; border-top: 1px solid #ddd; margin: 10px 0; }
    </style>
  </head>
  <body>
    ${htmlBody}
    <script>
      window.focus();
      window.print();
      window.onafterprint = () => window.close();
      setTimeout(() => { try { window.print(); } catch (e) {} }, 250);
    </script>
  </body>
</html>`);
  doc.close();
};

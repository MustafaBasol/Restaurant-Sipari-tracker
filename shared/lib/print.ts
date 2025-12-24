type OpenPrintWindowOptions = {
  title?: string;
};

export const openPrintWindow = (htmlBody: string, options: OpenPrintWindowOptions = {}) => {
  const title = options.title ?? 'Print';

  // Yeni sekme/popup açmadan yazdır: gizli iframe ile.
  // Bu, buton tıklayınca "boş sekme" sorununu ortadan kaldırır.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  const token =
    (globalThis.crypto as any)?.randomUUID?.() ??
    `print_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const html = `<!doctype html>
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
      (function () {
        const token = ${JSON.stringify(token)};
        const notify = (type) => {
          try { parent.postMessage({ __kitchorifyPrint: true, token, type }, '*'); } catch (e) {}
        };

        window.onafterprint = () => notify('afterprint');

        // Bazı tarayıcılarda ilk print çağrısı bazen atlanabiliyor;
        // küçük bir gecikmeyle bir kez daha deniyoruz.
        const doPrint = () => {
          try {
            window.focus();
            window.print();
            setTimeout(() => { try { window.print(); } catch (e) {} }, 250);
          } catch (e) {
            notify('error');
          }
        };

        if (document.readyState === 'complete') doPrint();
        else window.addEventListener('load', doPrint, { once: true });
      })();
    </script>
  </body>
</html>`;


  const cleanup = () => {
    window.removeEventListener('message', onMessage);
    iframe.remove();
  };

  const onMessage = (event: MessageEvent) => {
    const data: any = event.data;
    if (!data || data.__kitchorifyPrint !== true || data.token !== token) return;
    if (event.source !== iframe.contentWindow) return;
    if (data.type === 'afterprint' || data.type === 'error') cleanup();
  };

  window.addEventListener('message', onMessage);
  document.body.appendChild(iframe);

  // srcdoc senkron olarak yazılır; yine de güvenli olmak için yüklenmemişse fallback temizliği.
  iframe.srcdoc = html;
  setTimeout(() => {
    // Kullanıcı yazdırma dialogunu hiç açamazsa DOM'da kalmasın.
    if (document.body.contains(iframe)) cleanup();
  }, 60_000);
};

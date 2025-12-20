type PrintJobType = 'receipt' | 'kitchen';

type PrintClientOptions = {
  serverUrl?: string;
};

export const sendToPrintServer = async (
  jobType: PrintJobType,
  content: string,
  options: PrintClientOptions = {},
): Promise<void> => {
  const serverUrl = options.serverUrl ?? import.meta.env.VITE_PRINT_SERVER_URL;
  if (!serverUrl) {
    throw new Error('VITE_PRINT_SERVER_URL is not set');
  }

  const url = `${String(serverUrl).replace(/\/$/, '')}/api/print`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobType, content }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Print server error (${resp.status}): ${text || resp.statusText}`);
  }

  const data = await resp.json().catch(() => null);
  if (!data?.ok) {
    throw new Error('Print server responded with ok=false');
  }
};

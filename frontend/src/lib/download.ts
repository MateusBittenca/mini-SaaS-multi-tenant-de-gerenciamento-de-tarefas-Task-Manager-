import api from './api';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadExport(
  path: string,
  params: Record<string, string | undefined>
) {
  const response = await api.get(path, {
    params,
    responseType: 'blob',
  });

  const disposition = response.headers['content-disposition'] as string | undefined;
  const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch
    ? decodeURIComponent(filenameMatch[1])
    : `export.${params.format ?? 'csv'}`;

  downloadBlob(response.data as Blob, filename);
}

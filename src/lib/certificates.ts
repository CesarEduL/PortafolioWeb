/** Convierte enlace de Google Drive (view) a URL embebible en iframe (preview). */
export function toDrivePreviewUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}

/** URL para abrir el documento en pestaña nueva (view original o la misma URL). */
export function toDriveViewUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/view`;
  }
  return url;
}

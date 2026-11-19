/** Opens an absolute HTTP(S) URL without exposing the host window. */
export const openExternalUrl = (address: string): void => {
  let url: URL;
  try {
    url = new URL(address.trim());
  } catch {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  const opened = window.open(url.href, '_blank', 'noopener,noreferrer');
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // Some browsers restrict access to the returned WindowProxy.
    }
  }
};

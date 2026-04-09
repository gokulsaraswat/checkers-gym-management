export const registerAppServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    const publicUrl = process.env.PUBLIC_URL || '';
    const serviceWorkerUrl = `${publicUrl}/service-worker.js`;

    navigator.serviceWorker.register(serviceWorkerUrl).catch(() => {
      // Keep the UI resilient even if service worker registration fails.
    });
  });
};

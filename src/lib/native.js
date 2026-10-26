// Thin wrappers so the same code runs in the browser and inside Capacitor.
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

export async function tap() {
  if (!isNative) return;
  try { const { Haptics, ImpactStyle } = await import('@capacitor/haptics'); await Haptics.impact({ style: ImpactStyle.Light }); } catch { /* unsupported */ }
}

export async function share({ title, text, url }) {
  try {
    if (isNative) { const { Share } = await import('@capacitor/share'); return await Share.share({ title, text, url }); }
    if (navigator.share) return await navigator.share({ title, text, url });
    await navigator.clipboard?.writeText(url);
    return { copied: true };
  } catch { return null; }
}

export async function currentPosition() {
  if (isNative) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const p = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
    return { lat: p.coords.latitude, lng: p.coords.longitude };
  }
  return new Promise((res, rej) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { timeout: 10000 })
      : rej(new Error('Location unavailable')),
  );
}

/** Reverse-geocode to a pincode using OpenStreetMap Nominatim (no key needed). */
export async function pincodeFromPosition({ lat, lng }) {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { Accept: 'application/json' } });
  const j = await r.json();
  return { pincode: j.address?.postcode?.replace(/\s/g, '') || '', area: j.address?.suburb || j.address?.neighbourhood || j.address?.city_district || '', full: j.display_name || '' };
}

export async function initNative(navigate) {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
  } catch { /* ignore */ }
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => (canGoBack ? navigate(-1) : App.exitApp()));
  } catch { /* ignore */ }
}

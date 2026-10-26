const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

export const money = (n) => inr.format(Math.round(n || 0));
export const money2 = (n) => inr2.format(n || 0);
export const pct = (price, mrp) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

export function dateTime(ts) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
export function time(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}
export const uid = (p = '') => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();

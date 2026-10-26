// Single place to rebrand and tune the business rules.
export const brand = {
  name: 'BuildRun',
  tagline: 'Building materials, delivered in about an hour.',
  city: 'Bengaluru',
  supportPhone: import.meta.env?.VITE_SUPPORT_PHONE || '+919000000000',
  supportEmail: import.meta.env?.VITE_SUPPORT_EMAIL || 'support@example.com',
  legalName: 'BuildRun Retail Pvt. Ltd.',
  gstin: '29XXXXXXXXXXXZX',
  address: 'Bengaluru, Karnataka, India',
};

export const rules = {
  currency: 'INR',
  minOrder: 0, // no minimum order value
  freeDeliveryAbove: 999,
  deliveryFee: 49,
  heavyItemFee: 10, // per heavy unit (bags, sheets) for loading/unloading
  handlingFee: 9,
  gstRate: 0.18, // prices are GST-inclusive; used for invoice breakup
  cancelWindowMin: 10, // customers may cancel within N minutes of placing
  returnWindowHours: 24, // after delivery
  etaMin: 60,
  etaMax: 120,
  scheduledSlots: ['8 – 10 AM', '10 AM – 12 PM', '12 – 2 PM', '2 – 4 PM', '4 – 6 PM', '6 – 8 PM'],
  // COD only for these pincodes (empty = everywhere we deliver)
  codPincodes: [],
};

// Serviceable pincodes. Edit freely.
const ranges = [[560001, 560110]];
const excluded = new Set([560088, 560089, 560101, 560104, 560107, 560109]);
export const serviceablePincodes = new Set(
  ranges.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i))).filter((p) => !excluded.has(+p)),
);

export const coupons = [
  { code: 'FIRSTBUILD', title: '10% off your first order', type: 'percent', value: 10, max: 300, minCart: 499, firstOrderOnly: true },
  { code: 'SITE200', title: '₹200 off on orders above ₹4,999', type: 'flat', value: 200, minCart: 4999 },
  { code: 'FREEDEL', title: 'Free delivery, no minimum', type: 'freeDelivery', minCart: 0 },
];

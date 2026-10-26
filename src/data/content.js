import { brand, rules } from '../config.js';

export const faqs = [
  {
    group: 'Ordering & delivery',
    items: [
      ['How fast is delivery?', `Most orders arrive in ${rules.etaMin}–${rules.etaMax} minutes. The exact estimate depends on your pincode and how busy our stores are, and it is shown before you pay.`],
      ['Where do you deliver?', `We deliver across ${brand.city}. Enter your pincode on the home screen and we’ll tell you instantly if we serve your site.`],
      ['Is there a minimum order?', `No. Order a single switch or a truckload of cement. Delivery is free above ₹${rules.freeDeliveryAbove}; below that a small fee applies.`],
      ['Can I schedule a delivery?', 'Yes. At checkout choose “Schedule” and pick a day and a two-hour slot that suits your site.'],
      ['Do you unload heavy items?', `Yes. Bags, boards and other heavy items are unloaded at your gate. A loading charge of ₹${rules.heavyItemFee} per heavy unit is shown in your bill.`],
      ['Can I change or cancel my order?', `You can cancel from the order screen within ${rules.cancelWindowMin} minutes of placing it. After that, call support and we’ll do our best.`],
      ['How do I track my order?', 'Open Orders. You’ll see each step live: confirmed, packed, out for delivery and delivered, along with your delivery partner’s details.'],
    ],
  },
  {
    group: 'Payments',
    items: [
      ['Which payment methods are accepted?', 'UPI (GPay, PhonePe, Paytm and others), debit and credit cards, net banking, wallets, and cash or UPI on delivery in eligible areas.'],
      ['Do I get a GST invoice?', 'Yes. Every order has a downloadable GST invoice. Add your GSTIN under Account → Business details to claim input credit.'],
      ['What is BuildRun Credit?', 'Credit in your wallet from refunds of cash orders and from promotions. Apply it at checkout to pay part or all of an order.'],
    ],
  },
  {
    group: 'Returns & refunds',
    items: [
      ['What can I return?', `Damaged, defective or wrong items can be returned within ${rules.returnWindowHours} hours of delivery, unused and in original packaging.`],
      ['What can’t be returned?', 'Cut-to-size boards, tinted or mixed paints, epoxy grouts in custom shades, and anything marked “Non-returnable” on its product page. Extra quantity ordered by mistake isn’t eligible either.'],
      ['When will I get my refund?', 'Online payments go back to the original method: 1–2 business days for UPI and wallets, 3–7 for cards. Cash payments are refunded as BuildRun Credit instantly.'],
    ],
  },
  {
    group: 'Bulk & business',
    items: [
      ['Do you offer bulk pricing?', 'Yes. Use “Bulk quote” from the Account tab, share your list and site location, and our team will call you with a quote, usually within an hour.'],
      ['Can multiple people on my team order?', 'Save several site addresses to one account and share login with your site supervisor. Team accounts are coming soon.'],
    ],
  },
];

export const policies = {
  terms: {
    title: 'Terms of Service',
    body: [
      ['Using the service', `These terms govern your use of the ${brand.name} website and apps operated by ${brand.legalName}. By placing an order you agree to them.`],
      ['Accounts', 'You sign in with your mobile number. Keep your device secure; you are responsible for orders placed from your account.'],
      ['Pricing & availability', 'Prices include GST and may change without notice. If an item becomes unavailable after you order, we will refund it or offer an alternative of equal or higher value with your consent.'],
      ['Delivery', 'Delivery estimates are indicative. Someone must be available at the site to receive and verify the goods. Unloading is at ground level / gate unless agreed otherwise.'],
      ['Cancellations', `Orders can be cancelled in the app within ${rules.cancelWindowMin} minutes of being placed.`],
      ['Liability', 'Products carry their manufacturer’s warranty. Our liability is limited to the value of the order concerned.'],
      ['Governing law', `These terms are governed by the laws of India and subject to the courts of ${brand.city}.`],
    ],
  },
  refund: {
    title: 'Return & Refund Policy',
    body: [
      ['Return window', `Report damaged, defective, incorrect or missing items within ${rules.returnWindowHours} hours of delivery from the order screen. Items must be unused, in original packaging.`],
      ['Not eligible', 'Cut-to-size materials, tinted/mixed paints, custom-shade grouts, items marked non-returnable, and surplus quantity ordered in excess.'],
      ['Pickup & inspection', 'We arrange a pickup and inspect the item. Approved refunds are processed the same day.'],
      ['How refunds are paid', 'Prepaid and UPI-on-delivery orders: back to the original payment method. Cash-on-delivery orders: BuildRun Credit to your wallet, usable on any future order.'],
      ['Timelines', 'UPI & wallets 1–2 business days; cards & net banking 3–7 business days; BuildRun Credit instantly.'],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      ['What we collect', 'Your name, mobile number, email (optional), delivery addresses, GSTIN (optional), order history and approximate location when you allow it.'],
      ['Why', 'To deliver orders, send status updates, prevent fraud, issue invoices and improve the service.'],
      ['Payments', 'Card and UPI details are handled by our PCI-DSS compliant payment partner. We never store card numbers.'],
      ['Sharing', 'Only with delivery partners (name, phone, address for your order), payment processors, and authorities when legally required. We do not sell your data.'],
      ['Your choices', 'You can edit or delete addresses at any time, and request account deletion from Account → Help.'],
      ['Contact', `Write to ${brand.supportEmail} for any privacy request.`],
    ],
  },
  shipping: {
    title: 'Delivery Policy',
    body: [
      ['Coverage', `Serviceable pincodes across ${brand.city}. Check yours on the home screen.`],
      ['Timing', `Express: typically ${rules.etaMin}–${rules.etaMax} minutes, 7 AM – 10 PM. Scheduled: choose a two-hour slot up to 7 days ahead.`],
      ['Charges', `Free above ₹${rules.freeDeliveryAbove}; ₹${rules.deliveryFee} below. A handling fee of ₹${rules.handlingFee} per order and ₹${rules.heavyItemFee} per heavy unit apply.`],
    ],
  },
};

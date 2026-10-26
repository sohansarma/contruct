// Minimal i18n: English + Hindi for the app chrome and main flows.
// Add a language by adding a key to `dict`; missing strings fall back to English.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const dict = {
  en: { 'calc.promo': 'Estimate cement, putty, paint, tile adhesive and wire for your area, then add it all to cart.' },
  hi: {
    'Home': 'होम', 'Categories': 'कैटेगरी', 'Orders': 'ऑर्डर', 'Account': 'अकाउंट', 'Sign in': 'साइन इन',
    'Set location': 'लोकेशन चुनें', 'Not serviceable': 'डिलीवरी उपलब्ध नहीं', 'Delivering across': 'डिलीवरी पूरे',
    'Delivery location': 'डिलीवरी लोकेशन', 'Use current location': 'मौजूदा लोकेशन इस्तेमाल करें', 'Fastest way to check delivery': 'डिलीवरी जाँचने का सबसे तेज़ तरीका', 'Check': 'जाँचें', 'or': 'या',
    'Site running short?': 'साइट पर सामान कम पड़ गया?', 'We’ll be there within the hour.': 'हम एक घंटे में पहुँचेंगे।',
    'hero.sub': 'सीमेंट, प्लाईवुड, पेंट, इलेक्ट्रिकल, प्लंबिंग और हार्डवेयर—भरोसेमंद ब्रांड, सीधे आपकी साइट पर।',
    'search.placeholder': 'खोजें: सीमेंट, वायर, 18 mm प्लाई…', 'Check delivery to your site': 'अपनी साइट पर डिलीवरी जाँचें',
    'Shop by category': 'कैटेगरी से खरीदें', 'See all': 'सभी देखें', 'Offers': 'ऑफ़र', 'Bestsellers': 'बेस्टसेलर', 'All categories': 'सभी कैटेगरी',
    'Buying for a big project?': 'बड़े प्रोजेक्ट के लिए खरीद रहे हैं?', 'Get a bulk quote': 'बल्क कोटेशन लें', 'Bulk quote': 'बल्क कोटेशन',
    'Add': 'जोड़ें', 'Choose': 'चुनें', 'Add to cart': 'कार्ट में जोड़ें', 'Go to cart': 'कार्ट पर जाएँ', 'View cart': 'कार्ट देखें', 'Out of stock': 'स्टॉक में नहीं',
    'Choose option': 'विकल्प चुनें', 'Details': 'विवरण', 'You may also need': 'आपको ये भी चाहिए हो सकता है', 'Inclusive of all taxes': 'सभी टैक्स सहित',
    'Cart': 'कार्ट', 'Clear': 'हटाएँ', 'Your cart is empty': 'आपका कार्ट खाली है', 'Start shopping': 'खरीदारी शुरू करें', 'Apply coupon': 'कूपन लगाएँ',
    'Bill details': 'बिल विवरण', 'Item total': 'सामान का कुल', 'Delivery fee': 'डिलीवरी शुल्क', 'Handling fee': 'हैंडलिंग शुल्क', 'Loading & unloading': 'लोडिंग और अनलोडिंग', 'To pay': 'भुगतान राशि', 'FREE': 'मुफ़्त',
    'Proceed to checkout': 'चेकआउट करें', 'Sign in to checkout': 'चेकआउट के लिए साइन इन करें', 'Checkout': 'चेकआउट',
    'Deliver to': 'डिलीवरी पता', 'Delivery time': 'डिलीवरी का समय', 'Schedule': 'शेड्यूल करें', 'Payment': 'भुगतान', 'Place order': 'ऑर्डर करें', 'Pay': 'भुगतान करें', 'Pay on delivery': 'डिलीवरी पर भुगतान',
    'Order placed': 'ऑर्डर हो गया', 'Confirmed': 'कन्फ़र्म', 'Packed at store': 'स्टोर पर पैक', 'Out for delivery': 'डिलीवरी के लिए निकला', 'Delivered': 'डिलीवर हो गया', 'Cancelled': 'रद्द',
    'Cancel order': 'ऑर्डर रद्द करें', 'Return items': 'सामान वापस करें', 'Help': 'मदद', 'Reorder': 'फिर से ऑर्डर करें', 'GST invoice': 'GST इनवॉइस', 'No orders yet': 'अभी कोई ऑर्डर नहीं',
    'Log in or sign up': 'लॉग इन या साइन अप', 'Continue': 'आगे बढ़ें', 'Enter code': 'कोड डालें', 'Mobile number': 'मोबाइल नंबर',
    'Your orders': 'आपके ऑर्डर', 'Saved addresses': 'सेव किए पते', 'Profile & GST details': 'प्रोफ़ाइल और GST विवरण', 'Help & FAQs': 'मदद और सवाल', 'Call support': 'सपोर्ट को कॉल करें', 'Log out': 'लॉग आउट', 'Language': 'भाषा', 'Deals of the week': 'इस हफ़्ते के ऑफ़र', 'New arrivals': 'नए प्रोडक्ट', 'How much do I need?': 'कितना सामान चाहिए?', 'calc.promo': 'अपने क्षेत्रफल के हिसाब से सीमेंट, पुट्टी, पेंट, टाइल एडहेसिव और वायर का अनुमान लगाएँ और कार्ट में जोड़ें।', 'Material calculator': 'मटेरियल कैलकुलेटर',
  },
};

export const LANGS = [['en', 'English'], ['hi', 'हिन्दी']];

const Ctx = createContext({ lang: 'en', t: (s) => s, setLang: () => {} });
export const useI18n = () => useContext(Ctx);

const initial = () => {
  try {
    const saved = localStorage.getItem('br:lang');
    if (saved && dict[saved]) return saved;
  } catch { /* ignore */ }
  return location.pathname.startsWith('/hi') ? 'hi' : 'en';
};

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initial);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback((l) => { setLangState(l); try { localStorage.setItem('br:lang', l); } catch { /* ignore */ } }, []);
  const t = useCallback((s) => dict[lang]?.[s] ?? dict.en[s] ?? s, [lang]);
  return <Ctx.Provider value={{ lang, t, setLang }}>{children}</Ctx.Provider>;
}

export const _dict = dict;

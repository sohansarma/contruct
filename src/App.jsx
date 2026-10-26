import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { CartBar, Footer, Header, RequireAuth, TabBar, Toast } from './components/ui.jsx';
import { Categories, Category, Home, NotFound, Product, Search } from './pages/Shop.jsx';
import { Cart, Checkout } from './pages/Checkout.jsx';
import { Invoice, OrderDetail, Orders } from './pages/Orders.jsx';
import { About, Account, Addresses, Admin, Bulk, Help, Login, Policy, PriceList, Profile, WalletPage } from './pages/Account.jsx';
import { initNative } from './lib/native.js';
import { brand } from './config.js';

const auth = (el) => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => { initNative(navigate); }, [navigate]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!pathname.startsWith('/price-list')) document.title = `${brand.name} · Building materials, delivered in an hour`;
  }, [pathname]);

  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/c/:id" element={<Category />} />
          <Route path="/p/:id" element={<Product />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={auth(<Checkout />)} />
          <Route path="/orders" element={auth(<Orders />)} />
          <Route path="/orders/:id" element={auth(<OrderDetail />)} />
          <Route path="/orders/:id/invoice" element={auth(<Invoice />)} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/profile" element={auth(<Profile />)} />
          <Route path="/account/addresses" element={auth(<Addresses />)} />
          <Route path="/account/wallet" element={auth(<WalletPage />)} />
          <Route path="/bulk" element={<Bulk />} />
          <Route path="/help" element={<Help />} />
          <Route path="/policy/:id" element={<Policy />} />
          <Route path="/about" element={<About />} />
          <Route path="/price-list" element={<PriceList />} />
          <Route path="/price-list/:id" element={<PriceList />} />
          <Route path="/admin" element={auth(<Admin />)} />
          <Route path="/hi/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartBar />
      <TabBar />
      <Toast />
    </div>
  );
}

import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { Loading } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { OrdersProvider } from './context/OrdersContext.jsx';
import { ForgotPasswordPage, LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import MenuPage from './pages/menu/MenuPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';
import SubscriptionPage from './pages/subscription/SubscriptionPage.jsx';
import { isRestricted } from './lib/billing.js';

// Com a assinatura suspensa só existem Pedidos (para concluir os em andamento) e Assinatura.
const RESTRICTED_PATHS = ['/pedidos', '/assinatura'];

function Protected() {
  const { store, booting } = useAuth();
  const { pathname } = useLocation();
  if (booting) return <div className="min-h-dvh"><Loading /></div>;
  if (!store) return <Navigate to="/login" replace />;
  if (isRestricted(store.access) && !RESTRICTED_PATHS.includes(pathname)) return <Navigate to="/assinatura" replace />;
  return <OrdersProvider><AppShell /></OrdersProvider>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
      <Route element={<Protected />}>
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/resumo" element={<SummaryPage />} />
        <Route path="/cardapio" element={<MenuPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="/assinatura" element={<SubscriptionPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/pedidos" replace />} />
    </Routes>
  );
}

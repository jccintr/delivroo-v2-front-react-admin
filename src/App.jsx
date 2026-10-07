import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import { Loading } from './components/ui.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { OrdersProvider } from './context/OrdersContext.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import MenuPage from './pages/menu/MenuPage.jsx';
import SettingsPage from './pages/settings/SettingsPage.jsx';

function Protected() {
  const { store, booting } = useAuth();
  if (booting) return <div className="min-h-dvh"><Loading /></div>;
  if (!store) return <Navigate to="/login" replace />;
  return <OrdersProvider><AppShell /></OrdersProvider>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route element={<Protected />}>
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/resumo" element={<SummaryPage />} />
        <Route path="/cardapio" element={<MenuPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/pedidos" replace />} />
    </Routes>
  );
}

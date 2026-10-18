import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import AppShell from '../layout/AppShell';

const SplashPage = lazy(() => import('../pages/splash/page'));
const LoginPage = lazy(() => import('../pages/login/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

// Telas novas
const OrdensPage = lazy(() => import('../features/ordens/OrdensPage'));
const NovaOrdemPage = lazy(() => import('../features/ordens/NovaOrdemPage'));
const ClientesPage = lazy(() => import('../features/clientes/ClientesPage'));
const ClienteDetalhePage = lazy(() => import('../features/clientes/ClienteDetalhePage'));

// Telas da versão anterior (serão renovadas aos poucos)
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const AgendaPage = lazy(() => import('../pages/agenda/page'));
const ServicosPage = lazy(() => import('../pages/servicos/page'));
const FinanceiroPage = lazy(() => import('../pages/financeiro/page'));
const ComprasPage = lazy(() => import('../pages/compras/page'));
const RelatoriosPage = lazy(() => import('../pages/relatorios/page'));
const DisparosPage = lazy(() => import('../pages/disparos/page'));
const ConfiguracoesPage = lazy(() => import('../pages/configuracoes/page'));
const DebugExportPage = lazy(() => import('../pages/debug-export/page'));
const DebugResetPage = lazy(() => import('../pages/debug-reset/page'));
const DebugServerPage = lazy(() => import('../pages/debug-server/page'));

const routes: RouteObject[] = [
  { path: '/', element: <SplashPage /> },
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/ordens', element: <OrdensPage /> },
      { path: '/ordens/nova', element: <NovaOrdemPage /> },
      { path: '/ordens/:id/editar', element: <NovaOrdemPage /> },
      { path: '/ordens/entregues', element: <Navigate to="/ordens?aba=Retirado" replace /> },
      { path: '/clientes', element: <ClientesPage /> },
      { path: '/clientes/:id', element: <ClienteDetalhePage /> },
      { path: '/agenda', element: <AgendaPage /> },
      { path: '/servicos', element: <ServicosPage /> },
      { path: '/compras', element: <ComprasPage /> },
      { path: '/financeiro', element: <FinanceiroPage /> },
      { path: '/relatorios', element: <RelatoriosPage /> },
      { path: '/disparos', element: <DisparosPage /> },
      { path: '/configuracoes', element: <ConfiguracoesPage /> },
      { path: '/debug-export', element: <DebugExportPage /> },
      { path: '/debug-reset', element: <DebugResetPage /> },
      { path: '/debug-server', element: <DebugServerPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export default routes;

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/home/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const SplashPage = lazy(() => import('../pages/splash/page'));
const LoginPage = lazy(() => import('../pages/login/page'));
const OrdensPage = lazy(() => import('../pages/ordens/page'));
const ClientesPage = lazy(() => import('../pages/clientes/page'));
const ServicosPage = lazy(() => import('../pages/servicos/page'));
const FinanceiroPage = lazy(() => import('../pages/financeiro/page'));
const RelatoriosPage = lazy(() => import('../pages/relatorios/page'));
const DisparosPage = lazy(() => import('../pages/disparos/page'));
const ConfiguracoesPage = lazy(() => import('../pages/configuracoes/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <SplashPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/ordens',
    element: <OrdensPage />,
  },
  {
    path: '/clientes',
    element: <ClientesPage />,
  },
  {
    path: '/servicos',
    element: <ServicosPage />,
  },
  {
    path: '/financeiro',
    element: <FinanceiroPage />,
  },
  {
    path: '/relatorios',
    element: <RelatoriosPage />,
  },
  {
    path: '/disparos',
    element: <DisparosPage />,
  },
  {
    path: '/configuracoes',
    element: <ConfiguracoesPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export default routes;

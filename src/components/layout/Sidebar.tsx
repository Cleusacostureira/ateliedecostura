import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useCompanyLogo } from '../../lib/useCompanyLogo';
import OfflineBanner from '../OfflineBanner';

export default function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/dashboard', icon: 'ri-dashboard-line', label: 'Dashboard' },
    { path: '/ordens', icon: 'ri-file-list-3-line', label: 'Ordens de Serviço' },
    { path: '/clientes', icon: 'ri-user-line', label: 'Clientes' },
    { path: '/servicos', icon: 'ri-scissors-line', label: 'Serviços' },
    { path: '/financeiro', icon: 'ri-wallet-line', label: 'Financeiro' },
    { path: '/relatorios', icon: 'ri-bar-chart-line', label: 'Relatórios' },
    { path: '/disparos', icon: 'ri-message-3-line', label: 'Disparos' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <MobileLogo />
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
        >
          <i className={`${isMobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'} text-2xl w-6 h-6 flex items-center justify-center`}></i>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 lg:w-56 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-6 border-b border-gray-200 flex items-center justify-center">
          <div className="w-full">
            <SidebarLogo />
            <div className="mt-2">
              <OfflineBanner />
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                location.pathname === item.path
                  ? 'bg-rose-50 text-rose-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <i className={`${item.icon} text-xl w-5 h-5 flex items-center justify-center`}></i>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link 
            to="/configuracoes"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap cursor-pointer w-full ${
              location.pathname === '/configuracoes'
                ? 'bg-rose-50 text-rose-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <i className="ri-settings-3-line text-xl w-5 h-5 flex items-center justify-center"></i>
            <span className="text-sm font-medium">Configurações</span>
          </Link>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 w-full transition-all whitespace-nowrap cursor-pointer mt-1">
            <i className="ri-logout-box-line text-xl w-5 h-5 flex items-center justify-center"></i>
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLogo() {
  const logo = useCompanyLogo();
  const src = logo || '/assets/cleusa-logo.png';
  return (
    <img
      src={src}
      key={src}
      alt="Cleusa Ateliê de Costura"
      className="h-24 w-auto"
      style={{ background: 'transparent' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/assets/cleusa-logo.svg'; }}
    />
  );
}

function MobileLogo() {
  const logo = useCompanyLogo();
  const src = logo || '/assets/cleusa-logo.png';
  return (
    <img
      src={src}
      key={src}
      alt="Cleusa Ateliê de Costura"
      className="h-12 w-auto"
      style={{ background: 'transparent' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/assets/cleusa-logo.svg'; }}
    />
  );
}

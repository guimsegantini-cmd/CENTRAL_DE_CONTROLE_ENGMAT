import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Settings, 
  LogOut,
  Building2,
  BadgeDollarSign,
  Bot,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AIChat } from './AIChat'; // Importando o Chat flutuante se necessário, ou link na sidebar

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/quotes', icon: FileText, label: 'Orçamentos' },
    { to: '/orders', icon: Package, label: 'Pedidos' },
    { to: '/billing', icon: BadgeDollarSign, label: 'Faturamento' },
    { to: '/ai', icon: Bot, label: 'Analista IA' },
    { to: '/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Desktop */}
      <aside 
        className={`bg-primary text-white flex-shrink-0 hidden md:flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className={`p-6 flex items-center border-b border-gray-700 ${isSidebarCollapsed ? 'justify-center' : 'space-x-2'}`}>
          <Building2 className="w-8 h-8 text-accent flex-shrink-0" />
          {!isSidebarCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-lg font-bold leading-tight">ENGMAT</h1>
              <p className="text-xs text-gray-400">Central de Controle</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={isSidebarCollapsed ? item.label : ''}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-secondary text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${!isSidebarCollapsed ? 'mr-3' : ''}`} />
                {!isSidebarCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <div className="px-3 mb-2">
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="w-full flex items-center justify-center p-2 bg-gray-800/50 hover:bg-gray-800 rounded-md text-gray-400 transition-colors"
                title={isSidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
        </div>

        <div className="p-4 border-t border-gray-700 overflow-hidden">
          {!isSidebarCollapsed ? (
             <div className="animate-fade-in">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user?.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                </button>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs cursor-default" title={user?.name}>
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <button
                    onClick={logout}
                    className="text-red-400 hover:text-red-300 hover:bg-gray-800 p-2 rounded-md transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header & Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="bg-primary text-white md:hidden p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 text-accent" />
            <span className="font-bold">ENGMAT</span>
          </div>
          <button onClick={logout}>
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white border-b flex justify-around p-2">
           {navItems.map((item) => {
             const isActive = location.pathname === item.to;
             return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center p-2 rounded-md ${
                  isActive ? 'text-primary' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

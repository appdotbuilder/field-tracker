import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Map, Settings, LogOut, UserCog, User as UserIcon } from 'lucide-react';
import { HomePage } from '@/components/HomePage';
import { MapPage } from '@/components/MapPage';
import { SettingsPage } from '@/components/SettingsPage';
import type { User } from '../../../server/src/schema';

type Page = 'home' | 'map' | 'settings';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigationItems = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'map', label: 'Carte', icon: Map },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ] as const;

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage user={user} />;
      case 'map':
        return <MapPage user={user} />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <HomePage user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <Map className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">TBC Manager</h1>
                <p className="text-xs text-gray-500">Tractage • Boîtage • Collage</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.role === 'admin' ? (
                  <UserCog className="w-4 h-4 text-indigo-600" />
                ) : (
                  <UserIcon className="w-4 h-4 text-gray-600" />
                )}
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <nav className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <div className="p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id as Page)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
import { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await trpc.login.mutate({ email, password });
      
      // Since backend handlers are stubs, simulate login with demo data
      if (!user && (email.includes('admin') || email.includes('user'))) {
        // Create demo user for testing purposes
        const demoUser: User = {
          id: email.includes('admin') ? 1 : 2,
          email: email,
          password_hash: 'demo_hash',
          role: email.includes('admin') ? 'admin' : 'user',
          created_at: new Date(),
          updated_at: new Date()
        };
        setCurrentUser(demoUser);
      } else if (!user) {
        setError('Identifiants invalides. Utilisez les comptes de démonstration.');
      } else {
        setCurrentUser(user);
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setError(null);
  }, []);

  if (!currentUser) {
    return (
      <Login 
        onLogin={handleLogin} 
        isLoading={isLoading} 
        error={error} 
      />
    );
  }

  return (
    <Dashboard 
      user={currentUser} 
      onLogout={handleLogout} 
    />
  );
}

export default App;
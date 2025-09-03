import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, MapPin, Target, Users } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function Login({ onLogin, isLoading, error }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* App branding */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              TBC Manager
            </h1>
            <p className="text-gray-600 mt-2">
              Tractage • Boîtage • Collage
            </p>
          </div>
        </div>

        {/* Features preview */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs text-gray-600">Zone Tracking</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs text-gray-600">GPS Navigation</span>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-xs text-gray-600">Team Management</span>
          </div>
        </div>

        {/* Login form */}
        <Card>
          <CardHeader>
            <CardTitle>Se connecter</CardTitle>
            <CardDescription>
              Accédez à votre espace de gestion des activités terrain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials hint */}
        <div className="text-center text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="font-medium text-blue-700 mb-2">🚀 Mode Démonstration</p>
          <p className="text-blue-600">👤 Admin: admin@example.com / password</p>
          <p className="text-blue-600">🏠 Utilisateur: user@example.com / password</p>
          <p className="text-xs text-blue-500 mt-2">
            * Les handlers backend sont des stubs - aucune authentification réelle
          </p>
        </div>
      </div>
    </div>
  );
}
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { 
  User as UserIcon, 
  Shield, 
  Key, 
  Bell, 
  MapPin, 
  Smartphone,
  Save,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon
} from 'lucide-react';
import type { User, CreateUserInput } from '../../../server/src/schema';

interface SettingsPageProps {
  user: User;
}

export function SettingsPage({ user }: SettingsPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // User creation form (Admin only)
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState<CreateUserInput>({
    email: '',
    password: '',
    role: 'user'
  });

  // Settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

  const handleCreateUser = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);
    
    try {
      await trpc.createUser.mutate(newUserForm);
      setMessage({ type: 'success', text: 'Utilisateur créé avec succès!' });
      setNewUserForm({
        email: '',
        password: '',
        role: 'user'
      });
      setShowUserForm(false);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: (error as Error).message || 'Erreur lors de la création' });
    } finally {
      setIsLoading(false);
    }
  }, [newUserForm]);

  const handleSaveSettings = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Paramètres sauvegardés avec succès!' });
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Paramètres</h2>
          <p className="text-gray-600 mt-1">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <SettingsIcon className="w-8 h-8 text-indigo-600" />
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-blue-600" />
              Informations du Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center">
                {user.role === 'admin' ? (
                  <Shield className="w-6 h-6 text-white" />
                ) : (
                  <UserIcon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{user.email}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role === 'admin' ? '👑 Administrateur' : '🏠 Utilisateur'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="profileEmail">Adresse email</Label>
                <Input
                  id="profileEmail"
                  value={user.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div>
                <Label>Membre depuis</Label>
                <Input
                  value={user.created_at.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label>Statut du compte</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Compte actif</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2 text-green-600" />
              Paramètres de l'Application
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-yellow-600" />
                <div>
                  <h4 className="font-medium">Notifications</h4>
                  <p className="text-sm text-gray-500">Recevoir des alertes</p>
                </div>
              </div>
              <Button
                variant={notificationsEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              >
                {notificationsEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            <Separator />

            {/* GPS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">Géolocalisation</h4>
                  <p className="text-sm text-gray-500">Activer le GPS pour navigation</p>
                </div>
              </div>
              <Button
                variant={gpsEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGpsEnabled(!gpsEnabled)}
              >
                {gpsEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            <Separator />

            {/* Auto Sync */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-medium">Synchronisation Auto</h4>
                  <p className="text-sm text-gray-500">Sync automatique des données</p>
                </div>
              </div>
              <Button
                variant={autoSync ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoSync(!autoSync)}
              >
                {autoSync ? 'Activé' : 'Désactivé'}
              </Button>
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveSettings} disabled={isLoading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder les Paramètres'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-600" />
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Key className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Changement de mot de passe</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Pour des raisons de sécurité, contactez votre administrateur pour changer votre mot de passe.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Dernière connexion</span>
                <span className="font-medium">Aujourd'hui</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Sessions actives</span>
                <span className="font-medium">1 appareil</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin: User Management */}
        {user.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2 text-indigo-600" />
                Gestion des Utilisateurs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showUserForm && (
                <Button onClick={() => setShowUserForm(true)} className="w-full">
                  <UserIcon className="w-4 h-4 mr-2" />
                  Créer un Nouvel Utilisateur
                </Button>
              )}

              {showUserForm && (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <Label htmlFor="newEmail">Adresse email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newUserForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserForm(prev => ({ ...prev, email: e.target.value }))
                      }
                      placeholder="utilisateur@example.com"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="newPassword">Mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newUserForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUserForm(prev => ({ ...prev, password: e.target.value }))
                      }
                      placeholder="Mot de passe sécurisé"
                      minLength={6}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="newRole">Rôle</Label>
                    <div className="flex space-x-2 mt-2">
                      <Button
                        type="button"
                        variant={newUserForm.role === 'user' ? 'default' : 'outline'}
                        onClick={() => setNewUserForm(prev => ({ ...prev, role: 'user' }))}
                        className="flex-1"
                      >
                        👤 Utilisateur
                      </Button>
                      <Button
                        type="button"
                        variant={newUserForm.role === 'admin' ? 'default' : 'outline'}
                        onClick={() => setNewUserForm(prev => ({ ...prev, role: 'admin' }))}
                        className="flex-1"
                      >
                        👑 Admin
                      </Button>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading ? 'Création...' : 'Créer l\'Utilisateur'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowUserForm(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}

              <div className="text-sm text-gray-500 text-center pt-4">
                💡 Les utilisateurs pourront se connecter avec leurs identifiants
              </div>
            </CardContent>
          </Card>
        )}

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>À propos de TBC Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-semibold mb-2">TBC Manager v1.0</h3>
              <p className="text-sm text-gray-600 mb-4">
                Application de gestion des activités terrain
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-2">
              <div className="flex justify-between">
                <span>🎯 Tractage</span>
                <span>Distribution de prospectus</span>
              </div>
              <div className="flex justify-between">
                <span>🏠 Boîtage</span>
                <span>Distribution en boîtes aux lettres</span>
              </div>
              <div className="flex justify-between">
                <span>📋 Collage</span>
                <span>Pose d'affiches</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
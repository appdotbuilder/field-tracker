import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { 
  MapPin, 
  Target, 
  Clock, 
  CheckCircle,
  TrendingUp,
  Users,
  Map as MapIcon
} from 'lucide-react';
import type { User, ZoneAssignment, PoiTask } from '../../../server/src/schema';

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [poiTasks, setPoiTasks] = useState<PoiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    try {
      const [userAssignments, userPoiTasks] = await Promise.all([
        trpc.getUserAssignments.query({ userId: user.id }),
        trpc.getUserPoiTasks.query({ userId: user.id })
      ]);
      
      setAssignments(userAssignments);
      setPoiTasks(userPoiTasks);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assigned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'assigned':
        return 'Assigné';
      default:
        return status;
    }
  };

  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const completedPoiTasks = poiTasks.filter(t => t.status === 'completed').length;
  const totalAssignments = assignments.length;
  const totalPoiTasks = poiTasks.length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Bonjour, {user.email.split('@')[0]} ! 👋
            </h2>
            <p className="text-indigo-100">
              {user.role === 'admin' 
                ? 'Gérez vos zones et points d\'intérêt depuis l\'interface d\'administration'
                : 'Consultez vos missions et suivez votre progression'
              }
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {user.role === 'admin' ? '👑 Administrateur' : '🏠 Utilisateur'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Zones Assignées</p>
                <p className="text-2xl font-bold text-gray-900">{totalAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Zones Terminées</p>
                <p className="text-2xl font-bold text-gray-900">{completedAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">POI Assignés</p>
                <p className="text-2xl font-bold text-gray-900">{totalPoiTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">POI Terminés</p>
                <p className="text-2xl font-bold text-gray-900">{completedPoiTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Mes Zones (Tractage/Boîtage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune zone assignée pour le moment</p>
                <p className="text-sm">Contactez votre administrateur</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment: ZoneAssignment) => (
                  <div key={assignment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Zone #{assignment.zone_id}</h4>
                      <Badge className={getStatusColor(assignment.status)}>
                        {getStatusLabel(assignment.status)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        Assigné le {assignment.assigned_at.toLocaleDateString()}
                      </div>
                      {assignment.status === 'in_progress' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progression</span>
                            <span>{assignment.progress_houses} maisons</span>
                          </div>
                          <Progress value={Math.min(100, assignment.progress_houses)} />
                        </div>
                      )}
                      {assignment.completed_at && (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminé le {assignment.completed_at.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* POI Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-purple-600" />
              Mes Points d'Intérêt (Collage)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {poiTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun point d'intérêt assigné</p>
                <p className="text-sm">Contactez votre administrateur</p>
              </div>
            ) : (
              <div className="space-y-4">
                {poiTasks.map((task: PoiTask) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">POI #{task.poi_id}</h4>
                      <Badge className={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        Assigné le {task.assigned_at.toLocaleDateString()}
                      </div>
                      {task.completed_at && (
                        <div className="flex items-center text-sm text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Terminé le {task.completed_at.toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button className="flex items-center">
              <MapIcon className="w-4 h-4 mr-2" />
              Voir la Carte
            </Button>
            {user.role === 'admin' && (
              <>
                <Button variant="outline" className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Gérer les Utilisateurs
                </Button>
                <Button variant="outline" className="flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Créer une Zone
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { 
  Map as MapIcon, 
  Plus, 
  MapPin, 
  Target, 
  Navigation, 
  Save,
  Edit,
  CheckCircle
} from 'lucide-react';
import type { 
  User, 
  Zone, 
  PointOfInterest, 
  ZoneAssignment, 
  PoiTask,
  CreateZoneInput,
  CreatePoiInput
} from '../../../server/src/schema';

interface MapPageProps {
  user: User;
}

export function MapPage({ user }: MapPageProps) {
  // State management
  const [zones, setZones] = useState<Zone[]>([]);
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [assignments, setAssignments] = useState<ZoneAssignment[]>([]);
  const [poiTasks, setPoiTasks] = useState<PoiTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'map' | 'zones' | 'pois'>('map');
  
  // Admin form states
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [showPoiForm, setShowPoiForm] = useState(false);
  const [zoneForm, setZoneForm] = useState<CreateZoneInput>({
    name: '',
    description: null,
    geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
    estimated_houses: 0,
    created_by: user.id
  });
  const [poiForm, setPoiForm] = useState<CreatePoiInput>({
    name: '',
    description: null,
    latitude: 0,
    longitude: 0,
    poi_type: 'billboard',
    created_by: user.id
  });

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [allZones, allPois, userAssignments, userPoiTasks] = await Promise.all([
        trpc.getZones.query(),
        trpc.getPois.query(),
        user.role === 'user' ? trpc.getUserAssignments.query({ userId: user.id }) : Promise.resolve([]),
        user.role === 'user' ? trpc.getUserPoiTasks.query({ userId: user.id }) : Promise.resolve([])
      ]);

      setZones(allZones);
      setPois(allPois);
      if (user.role === 'user') {
        setAssignments(userAssignments as ZoneAssignment[]);
        setPoiTasks(userPoiTasks as PoiTask[]);
      }
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Admin functions
  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newZone = await trpc.createZone.mutate(zoneForm);
      setZones(prev => [...prev, newZone]);
      setZoneForm({
        name: '',
        description: null,
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 0,
        created_by: user.id
      });
      setShowZoneForm(false);
    } catch (error) {
      console.error('Failed to create zone:', error);
    }
  };

  const handleCreatePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPoi = await trpc.createPoi.mutate(poiForm);
      setPois(prev => [...prev, newPoi]);
      setPoiForm({
        name: '',
        description: null,
        latitude: 0,
        longitude: 0,
        poi_type: 'billboard',
        created_by: user.id
      });
      setShowPoiForm(false);
    } catch (error) {
      console.error('Failed to create POI:', error);
    }
  };

  // User functions
  const handleUpdateProgress = async (assignmentId: number, progressHouses: number) => {
    try {
      await trpc.updateProgress.mutate({
        assignment_id: assignmentId,
        progress_houses: progressHouses
      });
      await loadData(); // Reload data to get updated progress
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleCompleteZone = async (assignmentId: number) => {
    try {
      await trpc.completeZone.mutate({ assignment_id: assignmentId });
      await loadData(); // Reload data to get updated status
    } catch (error) {
      console.error('Failed to complete zone:', error);
    }
  };

  const handleCompletePoiTask = async (taskId: number) => {
    try {
      await trpc.completePoiTask.mutate({ task_id: taskId });
      await loadData(); // Reload data to get updated status
    } catch (error) {
      console.error('Failed to complete POI task:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Carte Interactive</h2>
          <p className="text-gray-600 mt-1">
            {user.role === 'admin' 
              ? 'Gérez les zones et points d\'intérêt' 
              : 'Consultez vos missions et naviguez vers les points'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant={currentView === 'map' ? 'default' : 'outline'}
            onClick={() => setCurrentView('map')}
          >
            <MapIcon className="w-4 h-4 mr-2" />
            Carte
          </Button>
          <Button
            variant={currentView === 'zones' ? 'default' : 'outline'}
            onClick={() => setCurrentView('zones')}
          >
            <Target className="w-4 h-4 mr-2" />
            Zones
          </Button>
          <Button
            variant={currentView === 'pois' ? 'default' : 'outline'}
            onClick={() => setCurrentView('pois')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Points d'Intérêt
          </Button>
        </div>
      </div>

      {/* Map Placeholder */}
      {currentView === 'map' && (
        <Card>
          <CardContent className="p-0">
            <div className="h-96 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Carte Interactive</h3>
                <p className="text-gray-600 max-w-md">
                  La carte interactive sera intégrée ici avec Leaflet/OpenStreetMap.
                  Elle affichera la localisation en temps réel, les zones et points d'intérêt.
                </p>
                <div className="mt-4 flex justify-center space-x-4">
                  <div className="flex items-center text-sm">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    Zones ({zones.length})
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    POIs ({pois.length})
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    Ma position
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Zones View */}
      {currentView === 'zones' && (
        <div className="space-y-6">
          {user.role === 'admin' && (
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Gestion des Zones</h3>
              <Button onClick={() => setShowZoneForm(!showZoneForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une Zone
              </Button>
            </div>
          )}

          {/* Zone Creation Form (Admin only) */}
          {user.role === 'admin' && showZoneForm && (
            <Card>
              <CardHeader>
                <CardTitle>Créer une Nouvelle Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateZone} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zoneName">Nom de la zone</Label>
                      <Input
                        id="zoneName"
                        value={zoneForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setZoneForm(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Secteur Centre-ville"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="estimatedHouses">Maisons estimées</Label>
                      <Input
                        id="estimatedHouses"
                        type="number"
                        value={zoneForm.estimated_houses}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setZoneForm(prev => ({ ...prev, estimated_houses: parseInt(e.target.value) || 0 }))
                        }
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="zoneDescription">Description (optionnel)</Label>
                    <Textarea
                      id="zoneDescription"
                      value={zoneForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setZoneForm(prev => ({ ...prev, description: e.target.value || null }))
                      }
                      placeholder="Description de la zone..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      Créer la Zone
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowZoneForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Zones List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {zones.map((zone: Zone) => {
              const assignment = assignments.find(a => a.zone_id === zone.id);
              
              return (
                <Card key={zone.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{zone.name}</CardTitle>
                      {assignment && (
                        <Badge className={getStatusColor(assignment.status)}>
                          {getStatusLabel(assignment.status)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {zone.description && (
                      <p className="text-sm text-gray-600">{zone.description}</p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Target className="w-4 h-4 mr-1" />
                      {zone.estimated_houses} maisons estimées
                    </div>

                    {assignment && assignment.status === 'in_progress' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progression</span>
                          <span>{assignment.progress_houses} / {zone.estimated_houses}</span>
                        </div>
                        <Progress 
                          value={Math.min(100, (assignment.progress_houses / zone.estimated_houses) * 100)}
                        />
                        
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder="Maisons visitées"
                            min="0"
                            max={zone.estimated_houses}
                            className="flex-1"
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                const value = parseInt(target.value);
                                if (!isNaN(value)) {
                                  handleUpdateProgress(assignment.id, value);
                                  target.value = '';
                                }
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleCompleteZone(assignment.id)}
                            variant="outline"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {user.role === 'admin' && (
                      <div className="flex space-x-2 pt-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button variant="outline" size="sm">
                          <Navigation className="w-4 h-4 mr-1" />
                          Voir sur Carte
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {zones.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune zone créée</h3>
              <p className="text-gray-600">
                {user.role === 'admin' 
                  ? 'Commencez par créer votre première zone de distribution'
                  : 'Les zones seront créées par votre administrateur'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* POIs View */}
      {currentView === 'pois' && (
        <div className="space-y-6">
          {user.role === 'admin' && (
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Gestion des Points d'Intérêt</h3>
              <Button onClick={() => setShowPoiForm(!showPoiForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un POI
              </Button>
            </div>
          )}

          {/* POI Creation Form (Admin only) */}
          {user.role === 'admin' && showPoiForm && (
            <Card>
              <CardHeader>
                <CardTitle>Créer un Nouveau Point d'Intérêt</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreatePoi} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="poiName">Nom du POI</Label>
                      <Input
                        id="poiName"
                        value={poiForm.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPoiForm(prev => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Panneau Place de la République"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="poiType">Type</Label>
                      <Select 
                        value={poiForm.poi_type || 'billboard'} 
                        onValueChange={(value: 'billboard' | 'wall' | 'other') =>
                          setPoiForm(prev => ({ ...prev, poi_type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="billboard">Panneau publicitaire</SelectItem>
                          <SelectItem value="wall">Mur</SelectItem>
                          <SelectItem value="other">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={poiForm.latitude}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPoiForm(prev => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="48.8566"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={poiForm.longitude}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPoiForm(prev => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="2.3522"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="poiDescription">Description (optionnel)</Label>
                    <Textarea
                      id="poiDescription"
                      value={poiForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setPoiForm(prev => ({ ...prev, description: e.target.value || null }))
                      }
                      placeholder="Description du point d'intérêt..."
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">
                      <Save className="w-4 h-4 mr-2" />
                      Créer le POI
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowPoiForm(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* POIs List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pois.map((poi: PointOfInterest) => {
              const task = poiTasks.find(t => t.poi_id === poi.id);
              
              return (
                <Card key={poi.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{poi.name}</CardTitle>
                      {task && (
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {poi.description && (
                      <p className="text-sm text-gray-600">{poi.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                      </div>
                      
                      <Badge variant="outline">
                        {poi.poi_type === 'billboard' ? '📋 Panneau' : 
                         poi.poi_type === 'wall' ? '🧱 Mur' : '📍 Autre'}
                      </Badge>
                    </div>

                    {task && task.status === 'assigned' && (
                      <Button
                        onClick={() => handleCompletePoiTask(task.id)}
                        className="w-full"
                        size="sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Marquer comme Terminé
                      </Button>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Navigation className="w-4 h-4 mr-1" />
                        Naviguer
                      </Button>
                      {user.role === 'admin' && (
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {pois.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun point d'intérêt créé</h3>
              <p className="text-gray-600">
                {user.role === 'admin' 
                  ? 'Commencez par créer votre premier point d\'intérêt'
                  : 'Les points d\'intérêt seront créés par votre administrateur'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
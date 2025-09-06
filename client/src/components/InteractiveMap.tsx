import { useState, useCallback, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  useMapEvents 
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import type { 
  User, 
  Zone, 
  PointOfInterest
} from '../../../server/src/schema';

// Fix for default markers in react-leaflet
try {
  delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  console.log('✅ Leaflet default icon fix applied successfully');
} catch (error) {
  console.error('❌ Failed to apply Leaflet icon fix:', error);
}

interface InteractiveMapProps {
  user: User;
  zones: Zone[];
  pois: PointOfInterest[];
  isLoading: boolean;
  onZoneGeometryUpdate: (geometry: string) => void;
  onPoiLocationUpdate: (latitude: number, longitude: number) => void;
}

// Component to handle map initialization and size validation
function MapInitializer() {
  const map = useMapEvents({});

  useEffect(() => {
    console.log('🗺️ Map instance created successfully:', map);
    // Force container size validation after mount
    const timer = setTimeout(() => {
      map.invalidateSize();
      console.log('🔄 Map size invalidated and recalculated');
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// Component to handle user location
function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMapEvents({
    locationfound(e) {
      console.log('📍 Geolocation successful:', e.latlng);
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
    locationerror(e) {
      console.error('❌ Geolocation failed:', e.message);
    },
  });

  useEffect(() => {
    console.log('🌍 Starting geolocation...');
    map.locate({
      watch: true,
      enableHighAccuracy: true
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position}>
      <Popup>
        <div className="text-center">
          <strong>📍 Votre position</strong>
          <br />
          <small>
            {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          </small>
        </div>
      </Popup>
    </Marker>
  );
}

// Get POI type icon
const getPoiTypeIcon = (poiType: string) => {
  switch (poiType) {
    case 'billboard':
      return '📋';
    case 'wall':
      return '🧱';
    case 'other':
    default:
      return '📍';
  }
};

export function InteractiveMap({ 
  user, 
  zones, 
  pois, 
  isLoading,
  onZoneGeometryUpdate,
  onPoiLocationUpdate
}: InteractiveMapProps) {
  // Default center: Paris coordinates
  const defaultCenter: [number, number] = [48.8566, 2.3522];
  
  // State for error handling - must be declared at top level
  const [mapError, setMapError] = useState<string | null>(null);
  
  useEffect(() => {
    console.log('🗺️ InteractiveMap component mounted');
    console.log('📊 Map data:', { 
      zonesCount: zones.length, 
      poisCount: pois.length, 
      userRole: user.role,
      isLoading 
    });
    
    // Debug Leaflet and CSS loading
    console.log('🔍 Leaflet version:', L.version);
    console.log('🎨 Leaflet CSS check:', {
      leafletCSS: !!document.querySelector('link[href*="leaflet.css"], style[data-leaflet]'),
      leafletDrawCSS: !!document.querySelector('link[href*="leaflet.draw.css"], style[data-leaflet-draw]'),
      mapContainerInDOM: !!document.querySelector('.leaflet-container')
    });
  }, [zones.length, pois.length, user.role, isLoading]);

  // Use error boundary for map rendering
  useEffect(() => {
    const checkMapRender = () => {
      setTimeout(() => {
        const mapElement = document.querySelector('.leaflet-container');
        if (!mapElement) {
          setMapError('Map container not found in DOM');
          console.error('❌ Leaflet container not rendered');
        } else {
          console.log('✅ Map container found in DOM');
          setMapError(null);
        }
      }, 1000);
    };

    checkMapRender();
  }, []);

  const handleCreated = useCallback((e: L.DrawEvents.Created) => {
    const { layerType, layer } = e;
    
    if (layerType === 'polygon') {
      // Extract GeoJSON geometry for zone
      const geoJSON = layer.toGeoJSON();
      const geometryString = JSON.stringify(geoJSON.geometry);
      onZoneGeometryUpdate(geometryString);
    } else if (layerType === 'marker' && 'getLatLng' in layer) {
      // Extract coordinates for POI
      const latlng = (layer as L.Marker).getLatLng();
      onPoiLocationUpdate(latlng.lat, latlng.lng);
    }
  }, [onZoneGeometryUpdate, onPoiLocationUpdate]);

  // Parse zone geometry and convert to LatLng coordinates
  const parseZoneCoordinates = useCallback((geometry: string): [number, number][] => {
    try {
      const geom = JSON.parse(geometry);
      if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        // Convert [lng, lat] to [lat, lng] for Leaflet
        return geom.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
      }
    } catch (error) {
      console.error('Failed to parse zone geometry:', error);
    }
    return [];
  }, []);

  if (isLoading) {
    return (
      <div className="h-96 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center animate-pulse">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-200 rounded-full"></div>
          <p className="text-gray-600">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (mapError && process.env.NODE_ENV === 'development') {
    return (
      <div className="h-96 bg-red-50 border-2 border-red-200 rounded-lg flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-red-600 text-2xl mb-2">⚠️</div>
          <h3 className="font-semibold text-red-800 mb-2">Map Rendering Issue</h3>
          <p className="text-red-600 text-sm mb-3">{mapError}</p>
          <div className="text-xs text-red-500 space-y-1">
            <div>Leaflet version: {L.version}</div>
            <div>Zones: {zones.length} | POIs: {pois.length}</div>
            <div>Check browser console for detailed logs</div>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Debug overlay - visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          className="absolute top-2 left-2 z-[1000] bg-yellow-400 text-black px-2 py-1 rounded text-xs font-mono border-2 border-black"
          style={{ zIndex: 1000 }}
        >
          🗺️ Map Container Active
          <br />
          Zones: {zones.length} | POIs: {pois.length}
          <br />
          Role: {user.role}
        </div>
      )}
      
      <MapContainer
        center={defaultCenter}
        zoom={12}
        className="h-96 w-full rounded-lg leaflet-container"
        style={{ 
          zIndex: 1,
          minHeight: '384px', // Ensure explicit height
          width: '100%',
          height: '384px',
          display: 'block', // Ensure it's visible
          position: 'relative'
        }}
        whenReady={() => {
          console.log('✅ MapContainer successfully mounted and ready');
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            loading: () => console.log('🔄 Tiles loading...'),
            load: () => console.log('✅ Tiles loaded successfully'),
            tileerror: (e) => console.error('❌ Tile loading error:', e),
          }}
        />

      {/* Map initialization and size validation */}
      <MapInitializer />

      {/* User location marker */}
      <LocationMarker />

      {/* Display existing zones */}
      {zones.map((zone: Zone) => {
        const coordinates = parseZoneCoordinates(zone.geometry);
        if (coordinates.length === 0) return null;

        return (
          <Polygon
            key={zone.id}
            positions={coordinates}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#93C5FD',
              fillOpacity: 0.3,
              weight: 2
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-blue-900">{zone.name}</h3>
                {zone.description && (
                  <p className="text-sm text-gray-600 mt-1">{zone.description}</p>
                )}
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span>🏠 {zone.estimated_houses} maisons estimées</span>
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}

      {/* Display existing POIs */}
      {pois.map((poi: PointOfInterest) => (
        <Marker
          key={poi.id}
          position={[poi.latitude, poi.longitude]}
          icon={L.divIcon({
            html: `<div style="
              background: #EF4444; 
              color: white; 
              width: 32px; 
              height: 32px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              border-radius: 50%; 
              font-size: 16px;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${getPoiTypeIcon(poi.poi_type)}</div>`,
            className: 'custom-poi-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          })}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-red-900">{poi.name}</h3>
              {poi.description && (
                <p className="text-sm text-gray-600 mt-1">{poi.description}</p>
              )}
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-500">
                  📍 {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                </div>
                <div className="text-xs">
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {poi.poi_type === 'billboard' ? 'Panneau' : 
                     poi.poi_type === 'wall' ? 'Mur' : 'Autre'}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Admin drawing tools */}
      {user.role === 'admin' && (
        <FeatureGroup>
          <EditControl
            position="topright"
            onCreated={handleCreated}
            draw={{
              polygon: {
                allowIntersection: false,
                drawError: {
                  color: '#e1e100',
                  message: '<strong>Erreur!</strong> Les zones ne peuvent pas se chevaucher!'
                },
                shapeOptions: {
                  color: '#3B82F6',
                  fillColor: '#93C5FD',
                  fillOpacity: 0.3,
                  weight: 2
                }
              },
              marker: {
                icon: L.divIcon({
                  html: `<div style="
                    background: #EF4444; 
                    color: white; 
                    width: 32px; 
                    height: 32px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    border-radius: 50%; 
                    font-size: 16px;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                  ">📍</div>`,
                  className: 'custom-poi-icon',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                })
              },
              rectangle: false,
              circle: false,
              circlemarker: false,
              polyline: false
            }}
            edit={{
              edit: false,
              remove: false
            }}
          />
        </FeatureGroup>
      )}
    </MapContainer>
    </div>
  );
}
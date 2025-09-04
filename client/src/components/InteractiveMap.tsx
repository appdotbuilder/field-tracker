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
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  user: User;
  zones: Zone[];
  pois: PointOfInterest[];
  isLoading: boolean;
  onZoneGeometryUpdate: (geometry: string) => void;
  onPoiLocationUpdate: (latitude: number, longitude: number) => void;
}

// Component to handle user location
function LocationMarker() {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
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

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      className="h-96 w-full rounded-lg"
      style={{ zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

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
  );
}
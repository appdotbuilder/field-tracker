import { db } from '../db';
import { zonesTable, usersTable } from '../db/schema';
import { type CreateZoneInput, type Zone } from '../schema';
import { eq } from 'drizzle-orm';

// Helper function to validate GeoJSON geometry
const validateGeoJSONGeometry = (geometry: string): boolean => {
  try {
    const parsed = JSON.parse(geometry);
    
    // Check if it has required GeoJSON properties
    if (!parsed.type || !parsed.coordinates) {
      return false;
    }
    
    // For zones, we expect Polygon type
    if (parsed.type !== 'Polygon') {
      return false;
    }
    
    // Basic validation of coordinates structure
    if (!Array.isArray(parsed.coordinates) || parsed.coordinates.length === 0) {
      return false;
    }
    
    // Each coordinate ring should be an array of coordinate pairs
    for (const ring of parsed.coordinates) {
      if (!Array.isArray(ring) || ring.length < 4) { // Polygon ring needs at least 4 points
        return false;
      }
      
      for (const coord of ring) {
        if (!Array.isArray(coord) || coord.length < 2 || 
            typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
          return false;
        }
      }
    }
    
    return true;
  } catch {
    return false;
  }
};

export const createZone = async (input: CreateZoneInput): Promise<Zone> => {
  try {
    // Validate that the creating user exists and has admin role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'admin') {
      throw new Error('Only admin users can create zones');
    }

    // Validate GeoJSON geometry format
    if (!validateGeoJSONGeometry(input.geometry)) {
      throw new Error('Invalid GeoJSON geometry format. Expected a valid Polygon geometry.');
    }

    // Insert zone record
    const result = await db.insert(zonesTable)
      .values({
        name: input.name,
        description: input.description,
        geometry: input.geometry,
        estimated_houses: input.estimated_houses,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const zone = result[0];
    return zone;
  } catch (error) {
    console.error('Zone creation failed:', error);
    throw error;
  }
};
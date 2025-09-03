import { db } from '../db';
import { poisTable } from '../db/schema';
import { sql } from 'drizzle-orm';
import { type PointOfInterest } from '../schema';

export async function getNearbyPois(latitude: number, longitude: number, radiusKm: number = 5): Promise<PointOfInterest[]> {
  try {
    // Use a subquery approach to calculate distance and filter
    const results = await db.execute(sql`
      SELECT 
        id,
        name,
        description,
        latitude,
        longitude,
        poi_type,
        created_by,
        created_at,
        updated_at,
        distance_km
      FROM (
        SELECT 
          id,
          name,
          description,
          latitude,
          longitude,
          poi_type,
          created_by,
          created_at,
          updated_at,
          6371 * acos(
            cos(radians(${latitude})) * 
            cos(radians(CAST(latitude AS DOUBLE PRECISION))) * 
            cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${longitude})) + 
            sin(radians(${latitude})) * 
            sin(radians(CAST(latitude AS DOUBLE PRECISION)))
          ) AS distance_km
        FROM pois
      ) AS poi_distances
      WHERE distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
    `);

    // Convert numeric fields back to numbers and return proper PointOfInterest objects
    return results.rows.map((result: any) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      latitude: parseFloat(result.latitude),
      longitude: parseFloat(result.longitude),
      poi_type: result.poi_type,
      created_by: result.created_by,
      created_at: new Date(result.created_at),
      updated_at: new Date(result.updated_at)
    }));
  } catch (error) {
    console.error('Failed to fetch nearby POIs:', error);
    throw error;
  }
}
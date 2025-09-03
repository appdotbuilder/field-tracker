import { db } from '../db';
import { poiTasksTable, poisTable } from '../db/schema';
import { type PoiTask, type PointOfInterest } from '../schema';
import { eq } from 'drizzle-orm';

// Extended type that includes POI information for display purposes
export type PoiTaskWithPoi = PoiTask & {
  poi: PointOfInterest;
};

export async function getUserPoiTasks(userId: number): Promise<PoiTaskWithPoi[]> {
  try {
    // Join POI tasks with POI information for display purposes
    const results = await db.select()
      .from(poiTasksTable)
      .innerJoin(poisTable, eq(poiTasksTable.poi_id, poisTable.id))
      .where(eq(poiTasksTable.user_id, userId))
      .execute();

    // Map results to include POI task data with POI details
    return results.map(result => ({
      id: result.poi_tasks.id,
      poi_id: result.poi_tasks.poi_id,
      user_id: result.poi_tasks.user_id,
      status: result.poi_tasks.status,
      assigned_at: result.poi_tasks.assigned_at,
      completed_at: result.poi_tasks.completed_at,
      // Include POI information for navigation and display
      poi: {
        id: result.pois.id,
        name: result.pois.name,
        description: result.pois.description,
        latitude: parseFloat(result.pois.latitude), // Convert numeric to number
        longitude: parseFloat(result.pois.longitude), // Convert numeric to number
        poi_type: result.pois.poi_type,
        created_by: result.pois.created_by,
        created_at: result.pois.created_at,
        updated_at: result.pois.updated_at
      }
    }));
  } catch (error) {
    console.error('Failed to fetch user POI tasks:', error);
    throw error;
  }
}
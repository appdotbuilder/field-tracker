import { type CreatePoiInput, type PointOfInterest } from '../schema';

export async function createPoi(input: CreatePoiInput): Promise<PointOfInterest> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new point of interest for poster pasting.
    // Should validate that the creating user has admin role
    // Should validate latitude/longitude coordinates
    return Promise.resolve({
        id: 0, // Placeholder ID
        name: input.name,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
        poi_type: input.poi_type,
        created_by: input.created_by,
        created_at: new Date(),
        updated_at: new Date()
    } as PointOfInterest);
}
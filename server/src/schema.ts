import { z } from 'zod';

// User role enum
export const userRoleSchema = z.enum(['admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  role: userRoleSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Zone schema for leaflet distribution areas
export const zoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  geometry: z.string(), // GeoJSON polygon as string
  estimated_houses: z.number().int().nonnegative(),
  created_by: z.number(), // Foreign key to user
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Zone = z.infer<typeof zoneSchema>;

// Point of Interest schema for poster pasting locations
export const poiSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  poi_type: z.enum(['billboard', 'wall', 'other']),
  created_by: z.number(), // Foreign key to user
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PointOfInterest = z.infer<typeof poiSchema>;

// Zone assignment schema for tracking user work
export const zoneAssignmentSchema = z.object({
  id: z.number(),
  zone_id: z.number(),
  user_id: z.number(),
  status: z.enum(['assigned', 'in_progress', 'completed']),
  progress_houses: z.number().int().nonnegative(),
  assigned_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type ZoneAssignment = z.infer<typeof zoneAssignmentSchema>;

// POI task schema for poster pasting tasks
export const poiTaskSchema = z.object({
  id: z.number(),
  poi_id: z.number(),
  user_id: z.number(),
  status: z.enum(['assigned', 'completed']),
  assigned_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable()
});

export type PoiTask = z.infer<typeof poiTaskSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: userRoleSchema.default('user')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const createZoneInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  geometry: z.string(), // GeoJSON polygon
  estimated_houses: z.number().int().nonnegative(),
  created_by: z.number()
});

export type CreateZoneInput = z.infer<typeof createZoneInputSchema>;

export const createPoiInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  poi_type: z.enum(['billboard', 'wall', 'other']),
  created_by: z.number()
});

export type CreatePoiInput = z.infer<typeof createPoiInputSchema>;

export const assignZoneInputSchema = z.object({
  zone_id: z.number(),
  user_id: z.number()
});

export type AssignZoneInput = z.infer<typeof assignZoneInputSchema>;

export const updateProgressInputSchema = z.object({
  assignment_id: z.number(),
  progress_houses: z.number().int().nonnegative()
});

export type UpdateProgressInput = z.infer<typeof updateProgressInputSchema>;

export const completeZoneInputSchema = z.object({
  assignment_id: z.number()
});

export type CompleteZoneInput = z.infer<typeof completeZoneInputSchema>;

export const completePoiTaskInputSchema = z.object({
  task_id: z.number()
});

export type CompletePoiTaskInput = z.infer<typeof completePoiTaskInputSchema>;

// Update schemas
export const updateZoneInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  geometry: z.string().optional(),
  estimated_houses: z.number().int().nonnegative().optional()
});

export type UpdateZoneInput = z.infer<typeof updateZoneInputSchema>;

export const updatePoiInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  poi_type: z.enum(['billboard', 'wall', 'other']).optional()
});

export type UpdatePoiInput = z.infer<typeof updatePoiInputSchema>;
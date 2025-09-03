import { serial, text, pgTable, timestamp, integer, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['assigned', 'in_progress', 'completed']);
export const taskStatusEnum = pgEnum('task_status', ['assigned', 'completed']);
export const poiTypeEnum = pgEnum('poi_type', ['billboard', 'wall', 'other']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Zones table for leaflet distribution areas
export const zonesTable = pgTable('zones', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  geometry: text('geometry').notNull(), // GeoJSON polygon as string
  estimated_houses: integer('estimated_houses').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Points of Interest table for poster pasting locations
export const poisTable = pgTable('pois', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  poi_type: poiTypeEnum('poi_type').notNull(),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Zone assignments table for tracking user work on zones
export const zoneAssignmentsTable = pgTable('zone_assignments', {
  id: serial('id').primaryKey(),
  zone_id: integer('zone_id').notNull().references(() => zonesTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  status: assignmentStatusEnum('status').notNull().default('assigned'),
  progress_houses: integer('progress_houses').notNull().default(0),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at') // Nullable
});

// POI tasks table for poster pasting tasks
export const poiTasksTable = pgTable('poi_tasks', {
  id: serial('id').primaryKey(),
  poi_id: integer('poi_id').notNull().references(() => poisTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  status: taskStatusEnum('status').notNull().default('assigned'),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at') // Nullable
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdZones: many(zonesTable),
  createdPois: many(poisTable),
  zoneAssignments: many(zoneAssignmentsTable),
  poiTasks: many(poiTasksTable)
}));

export const zonesRelations = relations(zonesTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [zonesTable.created_by],
    references: [usersTable.id]
  }),
  assignments: many(zoneAssignmentsTable)
}));

export const poisRelations = relations(poisTable, ({ one, many }) => ({
  createdBy: one(usersTable, {
    fields: [poisTable.created_by],
    references: [usersTable.id]
  }),
  tasks: many(poiTasksTable)
}));

export const zoneAssignmentsRelations = relations(zoneAssignmentsTable, ({ one }) => ({
  zone: one(zonesTable, {
    fields: [zoneAssignmentsTable.zone_id],
    references: [zonesTable.id]
  }),
  user: one(usersTable, {
    fields: [zoneAssignmentsTable.user_id],
    references: [usersTable.id]
  })
}));

export const poiTasksRelations = relations(poiTasksTable, ({ one }) => ({
  poi: one(poisTable, {
    fields: [poiTasksTable.poi_id],
    references: [poisTable.id]
  }),
  user: one(usersTable, {
    fields: [poiTasksTable.user_id],
    references: [usersTable.id]
  })
}));

// Export all tables for query building
export const tables = {
  users: usersTable,
  zones: zonesTable,
  pois: poisTable,
  zoneAssignments: zoneAssignmentsTable,
  poiTasks: poiTasksTable
};
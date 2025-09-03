import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  loginInputSchema,
  createZoneInputSchema,
  updateZoneInputSchema,
  createPoiInputSchema,
  updatePoiInputSchema,
  assignZoneInputSchema,
  updateProgressInputSchema,
  completeZoneInputSchema,
  completePoiTaskInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createZone } from './handlers/create_zone';
import { getZones } from './handlers/get_zones';
import { updateZone } from './handlers/update_zone';
import { createPoi } from './handlers/create_poi';
import { getPois } from './handlers/get_pois';
import { updatePoi } from './handlers/update_poi';
import { assignZone } from './handlers/assign_zone';
import { getUserAssignments } from './handlers/get_user_assignments';
import { updateProgress } from './handlers/update_progress';
import { completeZone } from './handlers/complete_zone';
import { getUserPoiTasks } from './handlers/get_user_poi_tasks';
import { completePoiTask } from './handlers/complete_poi_task';
import { getNearbyPois } from './handlers/get_nearby_pois';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  // Zone management (admin functions)
  createZone: publicProcedure
    .input(createZoneInputSchema)
    .mutation(({ input }) => createZone(input)),

  getZones: publicProcedure
    .query(() => getZones()),

  updateZone: publicProcedure
    .input(updateZoneInputSchema)
    .mutation(({ input }) => updateZone(input)),

  // POI management (admin functions)
  createPoi: publicProcedure
    .input(createPoiInputSchema)
    .mutation(({ input }) => createPoi(input)),

  getPois: publicProcedure
    .query(() => getPois()),

  updatePoi: publicProcedure
    .input(updatePoiInputSchema)
    .mutation(({ input }) => updatePoi(input)),

  // Zone assignments (user functions)
  assignZone: publicProcedure
    .input(assignZoneInputSchema)
    .mutation(({ input }) => assignZone(input)),

  getUserAssignments: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserAssignments(input.userId)),

  updateProgress: publicProcedure
    .input(updateProgressInputSchema)
    .mutation(({ input }) => updateProgress(input)),

  completeZone: publicProcedure
    .input(completeZoneInputSchema)
    .mutation(({ input }) => completeZone(input)),

  // POI tasks (user functions)
  getUserPoiTasks: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserPoiTasks(input.userId)),

  completePoiTask: publicProcedure
    .input(completePoiTaskInputSchema)
    .mutation(({ input }) => completePoiTask(input)),

  // Location-based queries
  getNearbyPois: publicProcedure
    .input(z.object({
      latitude: z.number(),
      longitude: z.number(),
      radiusKm: z.number().default(5)
    }))
    .query(({ input }) => getNearbyPois(input.latitude, input.longitude, input.radiusKm)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
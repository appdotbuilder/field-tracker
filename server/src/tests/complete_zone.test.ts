import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable, zoneAssignmentsTable } from '../db/schema';
import { type CompleteZoneInput } from '../schema';
import { completeZone } from '../handlers/complete_zone';
import { eq } from 'drizzle-orm';

describe('completeZone', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a zone assignment', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A zone for testing',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Create test assignment
    const assignmentResult = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user.id,
        status: 'in_progress',
        progress_houses: 50
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    const input: CompleteZoneInput = {
      assignment_id: assignment.id
    };

    const result = await completeZone(input);

    // Verify the result
    expect(result.id).toEqual(assignment.id);
    expect(result.status).toEqual('completed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.zone_id).toEqual(zone.id);
    expect(result.user_id).toEqual(user.id);
    expect(result.progress_houses).toEqual(50);
  });

  it('should save completed status to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A zone for testing',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Create test assignment
    const assignmentResult = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user.id,
        status: 'assigned',
        progress_houses: 0
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    const input: CompleteZoneInput = {
      assignment_id: assignment.id
    };

    await completeZone(input);

    // Verify in database
    const updatedAssignments = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.id, assignment.id))
      .execute();

    expect(updatedAssignments).toHaveLength(1);
    const updatedAssignment = updatedAssignments[0];
    expect(updatedAssignment.status).toEqual('completed');
    expect(updatedAssignment.completed_at).toBeInstanceOf(Date);
    expect(updatedAssignment.completed_at).not.toBeNull();
  });

  it('should throw error for non-existent assignment', async () => {
    const input: CompleteZoneInput = {
      assignment_id: 999
    };

    await expect(completeZone(input)).rejects.toThrow(/assignment not found/i);
  });

  it('should throw error for already completed assignment', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A zone for testing',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Create already completed assignment
    const assignmentResult = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user.id,
        status: 'completed',
        progress_houses: 100,
        completed_at: new Date()
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    const input: CompleteZoneInput = {
      assignment_id: assignment.id
    };

    await expect(completeZone(input)).rejects.toThrow(/already completed/i);
  });

  it('should preserve progress_houses when completing assignment', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A zone for testing',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 150,
        created_by: user.id
      })
      .returning()
      .execute();

    const zone = zoneResult[0];

    // Create assignment with specific progress
    const assignmentResult = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: zone.id,
        user_id: user.id,
        status: 'in_progress',
        progress_houses: 75
      })
      .returning()
      .execute();

    const assignment = assignmentResult[0];

    const input: CompleteZoneInput = {
      assignment_id: assignment.id
    };

    const result = await completeZone(input);

    // Verify progress is preserved
    expect(result.progress_houses).toEqual(75);
    expect(result.status).toEqual('completed');
  });
});
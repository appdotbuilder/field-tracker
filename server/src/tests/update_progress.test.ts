import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, zonesTable, zoneAssignmentsTable } from '../db/schema';
import { type UpdateProgressInput } from '../schema';
import { updateProgress } from '../handlers/update_progress';
import { eq } from 'drizzle-orm';

describe('updateProgress', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testZoneId: number;
  let testAssignmentId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test zone
    const zoneResult = await db.insert(zonesTable)
      .values({
        name: 'Test Zone',
        description: 'A zone for testing',
        geometry: '{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}',
        estimated_houses: 100,
        created_by: testUserId
      })
      .returning()
      .execute();
    testZoneId = zoneResult[0].id;

    // Create test zone assignment
    const assignmentResult = await db.insert(zoneAssignmentsTable)
      .values({
        zone_id: testZoneId,
        user_id: testUserId,
        status: 'assigned',
        progress_houses: 0
      })
      .returning()
      .execute();
    testAssignmentId = assignmentResult[0].id;
  });

  const testInput: UpdateProgressInput = {
    assignment_id: 0, // Will be set in tests
    progress_houses: 25
  };

  it('should update progress for an existing assignment', async () => {
    const input = { ...testInput, assignment_id: testAssignmentId };
    
    const result = await updateProgress(input);

    expect(result.id).toEqual(testAssignmentId);
    expect(result.zone_id).toEqual(testZoneId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.progress_houses).toEqual(25);
    expect(result.status).toEqual('in_progress'); // Should change from 'assigned'
    expect(result.assigned_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
  });

  it('should save progress updates to database', async () => {
    const input = { ...testInput, assignment_id: testAssignmentId };
    
    await updateProgress(input);

    // Verify the update was persisted
    const assignments = await db.select()
      .from(zoneAssignmentsTable)
      .where(eq(zoneAssignmentsTable.id, testAssignmentId))
      .execute();

    expect(assignments).toHaveLength(1);
    expect(assignments[0].progress_houses).toEqual(25);
    expect(assignments[0].status).toEqual('in_progress');
  });

  it('should automatically change status from assigned to in_progress', async () => {
    const input = { ...testInput, assignment_id: testAssignmentId };
    
    const result = await updateProgress(input);

    expect(result.status).toEqual('in_progress');
  });

  it('should preserve existing status if not assigned', async () => {
    // First set assignment to in_progress
    await db.update(zoneAssignmentsTable)
      .set({ status: 'in_progress' })
      .where(eq(zoneAssignmentsTable.id, testAssignmentId))
      .execute();

    const input = { ...testInput, assignment_id: testAssignmentId, progress_houses: 50 };
    
    const result = await updateProgress(input);

    expect(result.status).toEqual('in_progress'); // Should remain in_progress
    expect(result.progress_houses).toEqual(50);
  });

  it('should handle completed status appropriately', async () => {
    // Set assignment to completed
    await db.update(zoneAssignmentsTable)
      .set({ status: 'completed', completed_at: new Date() })
      .where(eq(zoneAssignmentsTable.id, testAssignmentId))
      .execute();

    const input = { ...testInput, assignment_id: testAssignmentId, progress_houses: 75 };
    
    const result = await updateProgress(input);

    expect(result.status).toEqual('completed'); // Should remain completed
    expect(result.progress_houses).toEqual(75);
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should allow progress to increase', async () => {
    // First update to 25 houses
    await updateProgress({ assignment_id: testAssignmentId, progress_houses: 25 });

    // Then update to 50 houses
    const result = await updateProgress({ assignment_id: testAssignmentId, progress_houses: 50 });

    expect(result.progress_houses).toEqual(50);
  });

  it('should allow progress to decrease', async () => {
    // First set progress to 50
    await db.update(zoneAssignmentsTable)
      .set({ progress_houses: 50 })
      .where(eq(zoneAssignmentsTable.id, testAssignmentId))
      .execute();

    // Then decrease to 30
    const result = await updateProgress({ assignment_id: testAssignmentId, progress_houses: 30 });

    expect(result.progress_houses).toEqual(30);
  });

  it('should handle zero progress', async () => {
    const input = { assignment_id: testAssignmentId, progress_houses: 0 };
    
    const result = await updateProgress(input);

    expect(result.progress_houses).toEqual(0);
    expect(result.status).toEqual('in_progress'); // Still changes from assigned
  });

  it('should throw error for non-existent assignment', async () => {
    const input = { assignment_id: 99999, progress_houses: 25 };
    
    await expect(updateProgress(input)).rejects.toThrow(/assignment not found/i);
  });

  it('should handle large progress values', async () => {
    const input = { assignment_id: testAssignmentId, progress_houses: 999 };
    
    const result = await updateProgress(input);

    expect(result.progress_houses).toEqual(999);
  });
});
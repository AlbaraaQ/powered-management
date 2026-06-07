import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits, branches, users, visitPhotos, shortages } from '@/db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createVisitSchema = z.object({
  branchId: z.number(),
  assignmentId: z.number().optional(),
  checkInLat: z.string().optional(),
  checkInLng: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const branchId = searchParams.get('branchId');
    const representativeId = searchParams.get('representativeId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const conditions = [];

    // Role-based filtering
    if (user.role === 'representative') {
      conditions.push(eq(visits.representativeId, user.id));
    } else if (user.role === 'client') {
      // Clients see visits to their branches
      const clientBranches = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.clientId, user.id));
      
      const branchIds = clientBranches.map((b) => b.id);
      if (branchIds.length > 0) {
        conditions.push(sql`${visits.branchId} IN (${sql.join(branchIds, sql`, `)})`);
      } else {
        return NextResponse.json({ visits: [] });
      }
    }

    if (branchId) {
      conditions.push(eq(visits.branchId, parseInt(branchId)));
    }

    if (representativeId) {
      conditions.push(eq(visits.representativeId, parseInt(representativeId)));
    }

    if (status) {
      conditions.push(eq(visits.status, status as 'pending' | 'in_progress' | 'completed' | 'cancelled'));
    }

    if (startDate) {
      conditions.push(gte(visits.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(visits.createdAt, new Date(endDate)));
    }

    let query = db
      .select({
        id: visits.id,
        representativeId: visits.representativeId,
        branchId: visits.branchId,
        checkInTime: visits.checkInTime,
        checkOutTime: visits.checkOutTime,
        checkInLat: visits.checkInLat,
        checkInLng: visits.checkInLng,
        checkOutLat: visits.checkOutLat,
        checkOutLng: visits.checkOutLng,
        status: visits.status,
        notes: visits.notes,
        createdAt: visits.createdAt,
        branchName: branches.name,
        branchNameAr: branches.nameAr,
        representativeName: users.name,
      })
      .from(visits)
      .leftJoin(branches, eq(visits.branchId, branches.id))
      .leftJoin(users, eq(visits.representativeId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query.orderBy(desc(visits.createdAt)).limit(100);

    return NextResponse.json({ visits: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get visits error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['representative', 'admin', 'supervisor']);

    const body = await request.json();
    const validation = createVisitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify branch exists
    const branch = await db.select().from(branches).where(eq(branches.id, data.branchId)).limit(1);
    if (branch.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Create visit with check-in
    const newVisit = await db
      .insert(visits)
      .values({
        representativeId: user.id,
        branchId: data.branchId,
        assignmentId: data.assignmentId,
        checkInTime: new Date(),
        checkInLat: data.checkInLat,
        checkInLng: data.checkInLng,
        status: 'in_progress',
        notes: data.notes,
      })
      .returning();

    return NextResponse.json({ visit: newVisit[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create visit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

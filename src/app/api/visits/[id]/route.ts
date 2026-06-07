import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits, visitPhotos, shortages, branches, users, notifications } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateVisitSchema = z.object({
  checkOutLat: z.string().optional(),
  checkOutLng: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();

    const { id } = await context.params;
    const visitId = parseInt(id);

    const visit = await db
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
        branchAddress: branches.address,
        representativeName: users.name,
      })
      .from(visits)
      .leftJoin(branches, eq(visits.branchId, branches.id))
      .leftJoin(users, eq(visits.representativeId, users.id))
      .where(eq(visits.id, visitId))
      .limit(1);

    if (visit.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const photos = await db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visitId));
    const visitShortages = await db.select().from(shortages).where(eq(shortages.visitId, visitId));

    return NextResponse.json({
      visit: visit[0],
      photos,
      shortages: visitShortages,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get visit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAuth(['representative', 'admin', 'supervisor']);

    const { id } = await context.params;
    const visitId = parseInt(id);

    const body = await request.json();
    const validation = updateVisitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const currentVisit = existing[0];

    const updateData: Record<string, unknown> = {
      ...validation.data,
      updatedAt: new Date(),
    };

    if (validation.data.status === 'completed' && !currentVisit.checkOutTime) {
      updateData.checkOutTime = new Date();
    }

    const updated = await db
      .update(visits)
      .set(updateData)
      .where(eq(visits.id, visitId))
      .returning();

    // Send notifications when visit is completed
    if (validation.data.status === 'completed' && currentVisit.status !== 'completed') {
      const branchInfo = await db
        .select({
          id: branches.id,
          name: branches.name,
          nameAr: branches.nameAr,
          clientId: branches.clientId,
        })
        .from(branches)
        .where(eq(branches.id, currentVisit.branchId))
        .limit(1);

      const repInfo = await db
        .select({ id: users.id, name: users.name, nameAr: users.nameAr, role: users.role, active: users.active })
        .from(users)
        .where(eq(users.id, currentVisit.representativeId))
        .limit(1);

      const adminsAndSupervisors = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.active, true), eq(users.role, 'admin')));

      const supervisors = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.active, true), eq(users.role, 'supervisor')));

      const recipients = new Set<number>();
      adminsAndSupervisors.forEach((u) => recipients.add(u.id));
      supervisors.forEach((u) => recipients.add(u.id));
      if (branchInfo[0]?.clientId) recipients.add(branchInfo[0].clientId);

      const branchName = branchInfo[0]?.nameAr || branchInfo[0]?.name || 'Branch';
      const repName = repInfo[0]?.nameAr || repInfo[0]?.name || 'Representative';

      if (recipients.size > 0) {
        await db.insert(notifications).values(
          Array.from(recipients)
            .filter((userId) => userId !== currentUser.id)
            .map((userId) => ({
              userId,
              type: 'success' as const,
              title: `Visit completed - ${branchInfo[0]?.name || 'Branch'}`,
              titleAr: `تمت الزيارة - ${branchName}`,
              message: `${repInfo[0]?.name || 'Representative'} completed the branch visit successfully.`,
              messageAr: `قام ${repName} بإكمال زيارة الفرع بنجاح.`,
              link: '/dashboard/visits',
            }))
        );
      }
    }

    return NextResponse.json({ visit: updated[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update visit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

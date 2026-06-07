import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyAssignments, branches, users, visits, notifications } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createAssignmentSchema = z.object({
  representativeId: z.number(),
  branchId: z.number(),
  assignmentDate: z.string(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    const representativeId = searchParams.get('representativeId');

    const conditions = [];

    // Role-based filtering
    if (user.role === 'representative') {
      conditions.push(eq(dailyAssignments.representativeId, user.id));
    } else if (representativeId) {
      conditions.push(eq(dailyAssignments.representativeId, parseInt(representativeId)));
    }

    if (date) {
      conditions.push(eq(dailyAssignments.assignmentDate, date));
    }

    let query = db
      .select({
        id: dailyAssignments.id,
        representativeId: dailyAssignments.representativeId,
        branchId: dailyAssignments.branchId,
        assignmentDate: dailyAssignments.assignmentDate,
        notes: dailyAssignments.notes,
        createdAt: dailyAssignments.createdAt,
        branchName: branches.name,
        branchNameAr: branches.nameAr,
        branchAddress: branches.address,
        branchLat: branches.latitude,
        branchLng: branches.longitude,
        representativeName: users.name,
      })
      .from(dailyAssignments)
      .leftJoin(branches, eq(dailyAssignments.branchId, branches.id))
      .leftJoin(users, eq(dailyAssignments.representativeId, users.id));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query.orderBy(desc(dailyAssignments.assignmentDate));

    // Get visit status for each assignment
    const assignmentsWithStatus = await Promise.all(
      result.map(async (assignment) => {
        // Parse the assignment date properly
        const dateStr = typeof assignment.assignmentDate === 'string' 
          ? assignment.assignmentDate 
          : assignment.assignmentDate;
        
        const [year, month, day] = dateStr.split('-').map(Number);
        const todayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
        const todayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

        const visit = await db
          .select()
          .from(visits)
          .where(
            and(
              eq(visits.branchId, assignment.branchId),
              eq(visits.representativeId, assignment.representativeId),
              gte(visits.createdAt, todayStart),
              lte(visits.createdAt, todayEnd)
            )
          )
          .limit(1);

        return {
          ...assignment,
          visitStatus: visit.length > 0 ? visit[0].status : 'pending',
          visitId: visit.length > 0 ? visit[0].id : null,
        };
      })
    );

    return NextResponse.json({ assignments: assignmentsWithStatus });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get assignments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'supervisor']);

    const body = await request.json();
    const validation = createAssignmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify representative exists
    const rep = await db
      .select()
      .from(users)
      .where(and(eq(users.id, data.representativeId), eq(users.role, 'representative')))
      .limit(1);

    if (rep.length === 0) {
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    // Verify branch exists
    const branch = await db.select().from(branches).where(eq(branches.id, data.branchId)).limit(1);
    if (branch.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Create assignment
    const newAssignment = await db
      .insert(dailyAssignments)
      .values({
        representativeId: data.representativeId,
        branchId: data.branchId,
        assignmentDate: data.assignmentDate,
        notes: data.notes,
      })
      .returning();

    // Send notification to the representative
    const branchName = branch[0].name;
    const branchNameAr = branch[0].nameAr;
    
    await db.insert(notifications).values({
      userId: data.representativeId,
      type: 'info',
      title: `New Assignment: ${branchName}`,
      titleAr: `تعيين جديد: ${branchNameAr || branchName}`,
      message: `You have been assigned to visit ${branchName} on ${data.assignmentDate}`,
      messageAr: `تم تعيينك لزيارة ${branchNameAr || branchName} بتاريخ ${data.assignmentDate}`,
      link: '/dashboard/assignments',
    });

    return NextResponse.json({ assignment: newAssignment[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create assignment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

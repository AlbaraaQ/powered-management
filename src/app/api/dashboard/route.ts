import { NextResponse } from 'next/server';
import { db } from '@/db';
import { visits, branches, users, shortages, dailyAssignments } from '@/db/schema';
import { eq, and, gte, lte, count, sql, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';

function getTodayRange() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
}

export async function GET() {
  try {
    const user = await requireAuth();
    const { today, tomorrow } = getTodayRange();

    // For representatives - return their assignments and visits
    if (user.role === 'representative') {
      const todayStr = today.toISOString().split('T')[0];
      
      const assignments = await db
        .select({
          id: dailyAssignments.id,
          branchId: dailyAssignments.branchId,
          branchName: branches.name,
          branchNameAr: branches.nameAr,
          branchAddress: branches.address,
        })
        .from(dailyAssignments)
        .leftJoin(branches, eq(dailyAssignments.branchId, branches.id))
        .where(
          and(
            eq(dailyAssignments.representativeId, user.id),
            eq(dailyAssignments.assignmentDate, todayStr)
          )
        );

      const myVisits = await db
        .select()
        .from(visits)
        .where(
          and(
            eq(visits.representativeId, user.id),
            gte(visits.createdAt, today),
            lte(visits.createdAt, tomorrow)
          )
        );

      const completedCount = myVisits.filter(v => v.status === 'completed').length;

      return NextResponse.json({
        role: 'representative',
        stats: {
          todayAssignments: assignments.length,
          completedVisits: completedCount,
          pendingVisits: assignments.length - completedCount,
        },
        assignments,
        visits: myVisits,
      });
    }

    // For clients - return their branches and visits
    if (user.role === 'client') {
      const clientBranches = await db
        .select()
        .from(branches)
        .where(eq(branches.clientId, user.id));

      const branchIds = clientBranches.map(b => b.id);
      
      let clientVisits: typeof visits.$inferSelect[] = [];
      let shortagesCount = 0;
      
      if (branchIds.length > 0) {
        clientVisits = await db
          .select()
          .from(visits)
          .where(
            and(
              sql`${visits.branchId} IN (${sql.join(branchIds, sql`, `)})`,
              gte(visits.createdAt, today),
              lte(visits.createdAt, tomorrow)
            )
          );

        const shortagesResult = await db
          .select({ count: count() })
          .from(shortages)
          .innerJoin(visits, eq(shortages.visitId, visits.id))
          .where(
            and(
              sql`${visits.branchId} IN (${sql.join(branchIds, sql`, `)})`,
              gte(visits.createdAt, today),
              lte(visits.createdAt, tomorrow)
            )
          );
        
        shortagesCount = shortagesResult[0]?.count || 0;
      }

      const completedVisits = clientVisits.filter(v => v.status === 'completed').length;

      return NextResponse.json({
        role: 'client',
        stats: {
          totalBranches: clientBranches.length,
          todayVisits: clientVisits.length,
          completedVisits,
          shortages: shortagesCount,
        },
        branches: clientBranches,
      });
    }

    // For admin/supervisor - full dashboard
    // Today's visits count
    const todayVisits = await db
      .select({ count: count() })
      .from(visits)
      .where(and(gte(visits.createdAt, today), lte(visits.createdAt, tomorrow)));

    // Completed visits today
    const completedToday = await db
      .select({ count: count() })
      .from(visits)
      .where(
        and(
          gte(visits.createdAt, today),
          lte(visits.createdAt, tomorrow),
          eq(visits.status, 'completed')
        )
      );

    // Total active branches
    const totalBranches = await db
      .select({ count: count() })
      .from(branches)
      .where(eq(branches.active, true));

    // Covered branches today (branches with completed visits)
    const coveredBranches = await db
      .select({ branchId: visits.branchId })
      .from(visits)
      .where(
        and(
          gte(visits.createdAt, today),
          lte(visits.createdAt, tomorrow),
          eq(visits.status, 'completed')
        )
      )
      .groupBy(visits.branchId);

    // Active representatives
    const activeReps = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, 'representative'), eq(users.active, true)));

    // Total shortages today
    const todayShortages = await db
      .select({ count: count() })
      .from(shortages)
      .innerJoin(visits, eq(shortages.visitId, visits.id))
      .where(and(gte(visits.createdAt, today), lte(visits.createdAt, tomorrow)));

    // Recent visits with details
    const recentVisits = await db
      .select({
        id: visits.id,
        status: visits.status,
        checkInTime: visits.checkInTime,
        checkOutTime: visits.checkOutTime,
        branchName: branches.name,
        branchNameAr: branches.nameAr,
        representativeName: users.name,
      })
      .from(visits)
      .leftJoin(branches, eq(visits.branchId, branches.id))
      .leftJoin(users, eq(visits.representativeId, users.id))
      .orderBy(desc(visits.createdAt))
      .limit(10);

    // Visits by status
    const visitsByStatus = await db
      .select({
        status: visits.status,
        count: count(),
      })
      .from(visits)
      .where(and(gte(visits.createdAt, today), lte(visits.createdAt, tomorrow)))
      .groupBy(visits.status);

    // Weekly data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayVisits = await db
        .select({ count: count() })
        .from(visits)
        .where(and(gte(visits.createdAt, dayStart), lte(visits.createdAt, dayEnd)));

      const dayCompleted = await db
        .select({ count: count() })
        .from(visits)
        .where(
          and(
            gte(visits.createdAt, dayStart),
            lte(visits.createdAt, dayEnd),
            eq(visits.status, 'completed')
          )
        );

      weeklyData.push({
        date: dayStart.toISOString().split('T')[0],
        total: dayVisits[0]?.count || 0,
        completed: dayCompleted[0]?.count || 0,
      });
    }

    return NextResponse.json({
      role: user.role,
      stats: {
        todayVisits: todayVisits[0]?.count || 0,
        completedToday: completedToday[0]?.count || 0,
        totalBranches: totalBranches[0]?.count || 0,
        coveredBranches: coveredBranches.length,
        activeReps: activeReps[0]?.count || 0,
        todayShortages: todayShortages[0]?.count || 0,
      },
      recentVisits,
      visitsByStatus,
      weeklyData,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

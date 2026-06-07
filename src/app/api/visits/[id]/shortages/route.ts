import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits, shortages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const addShortageSchema = z.object({
  productName: z.string().max(255).optional().default(''),
  productNameAr: z.string().max(255).optional().default(''),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();

    const { id } = await context.params;
    const visitId = parseInt(id);

    const visitShortages = await db
      .select()
      .from(shortages)
      .where(eq(shortages.visitId, visitId));

    return NextResponse.json({ shortages: visitShortages });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get shortages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['representative', 'admin', 'supervisor']);

    const { id } = await context.params;
    const visitId = parseInt(id);

    const body = await request.json();
    const validation = addShortageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const resolvedProductName = validation.data.productName || validation.data.productNameAr;
    if (!resolvedProductName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    // Verify visit exists
    const visit = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
    if (visit.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const newShortage = await db
      .insert(shortages)
      .values({
        visitId,
        productName: resolvedProductName,
        productNameAr: validation.data.productNameAr || null,
        notes: null,
      })
      .returning();

    return NextResponse.json({ shortage: newShortage[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Add shortage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

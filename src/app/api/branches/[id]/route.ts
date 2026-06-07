import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { branches } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateBranchSchema = z.object({
  name: z.string().max(255).optional(),
  nameAr: z.string().optional(),
  address: z.string().optional(),
  addressAr: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  clientId: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();

    const { id } = await context.params;
    const branchId = parseInt(id);

    const branch = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    if (branch.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json({ branch: branch[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin', 'supervisor']);

    const { id } = await context.params;
    const branchId = parseInt(id);

    const body = await request.json();
    const validation = updateBranchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const existing = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const currentBranch = existing[0];
    const resolvedName = validation.data.name || validation.data.nameAr || currentBranch.name || currentBranch.nameAr || `Branch ${branchId}`;

    const updated = await db
      .update(branches)
      .set({ ...validation.data, name: resolvedName, updatedAt: new Date() })
      .where(eq(branches.id, branchId))
      .returning();

    return NextResponse.json({ branch: updated[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin']);

    const { id } = await context.params;
    const branchId = parseInt(id);

    const existing = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    await db.update(branches).set({ active: false, updatedAt: new Date() }).where(eq(branches.id, branchId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

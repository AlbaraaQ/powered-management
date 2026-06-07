import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { branches, users } from '@/db/schema';
import { eq, desc, and, or, ilike } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createBranchSchema = z.object({
  name: z.string().max(255).optional().default(''),
  nameAr: z.string().optional().default(''),
  address: z.string().optional(),
  addressAr: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  clientId: z.number().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const active = searchParams.get('active');
    const clientId = searchParams.get('clientId');

    let query = db.select({
      id: branches.id,
      name: branches.name,
      nameAr: branches.nameAr,
      address: branches.address,
      addressAr: branches.addressAr,
      latitude: branches.latitude,
      longitude: branches.longitude,
      clientId: branches.clientId,
      contactName: branches.contactName,
      contactPhone: branches.contactPhone,
      active: branches.active,
      createdAt: branches.createdAt,
    }).from(branches);

    const conditions = [];

    if (user.role === 'client') {
      conditions.push(eq(branches.clientId, user.id));
    } else if (clientId) {
      conditions.push(eq(branches.clientId, parseInt(clientId)));
    }

    if (active !== null && active !== undefined) {
      conditions.push(eq(branches.active, active === 'true'));
    }

    if (search) {
      conditions.push(
        or(
          ilike(branches.name, `%${search}%`),
          ilike(branches.nameAr, `%${search}%`),
          ilike(branches.address, `%${search}%`),
          ilike(branches.addressAr, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query.orderBy(desc(branches.createdAt));

    return NextResponse.json({ branches: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get branches error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin', 'supervisor']);

    const body = await request.json();
    const validation = createBranchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const resolvedName = data.name || data.nameAr || data.contactName || `Branch ${Date.now()}`;

    if (data.clientId) {
      const client = await db
        .select()
        .from(users)
        .where(and(eq(users.id, data.clientId), eq(users.role, 'client')))
        .limit(1);

      if (client.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }
    }

    const newBranch = await db
      .insert(branches)
      .values({
        ...data,
        name: resolvedName,
        nameAr: data.nameAr || null,
      })
      .returning();

    return NextResponse.json({ branch: newBranch[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Create branch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

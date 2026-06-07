import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { requireAuth, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const updateUserSchema = z.object({
  username: z.string().min(3).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().max(255).optional(),
  nameAr: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'supervisor', 'representative', 'client']).optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAuth();

    const { id } = await context.params;
    const userId = parseInt(id);

    if (!['admin', 'supervisor'].includes(currentUser.role) && currentUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        nameAr: users.nameAr,
        phone: users.phone,
        role: users.role,
        active: users.active,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: user[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const currentUser = await requireAuth();

    const { id } = await context.params;
    const userId = parseInt(id);

    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.role !== 'admin') {
      delete data.role;
      delete data.active;
      delete data.username;
    }

    if (data.username || data.email) {
      const conflicts = await db
        .select()
        .from(users)
        .where(
          or(
            data.username ? eq(users.username, data.username) : undefined,
            data.email ? eq(users.email, data.email) : undefined
          )
        );

      const conflicting = conflicts.filter((u) => u.id !== userId);
      if (conflicting.length > 0) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 409 }
        );
      }
    }

    const currentRecord = existing[0];
    const resolvedName = data.name || data.nameAr || currentRecord.name || currentRecord.nameAr || currentRecord.username;

    const updateData: Record<string, unknown> = {
      ...data,
      name: resolvedName,
      updatedAt: new Date(),
    };

    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        nameAr: users.nameAr,
        phone: users.phone,
        role: users.role,
        active: users.active,
      });

    return NextResponse.json({ user: updated[0] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['admin']);

    const { id } = await context.params;
    const userId = parseInt(id);

    const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.update(users).set({ active: false, updatedAt: new Date() }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

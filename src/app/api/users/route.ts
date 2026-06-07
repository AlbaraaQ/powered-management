import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, desc, and, or, ilike } from 'drizzle-orm';
import { requireAuth, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  username: z.string().min(3).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(255).optional().default(''),
  nameAr: z.string().max(255).optional().default(''),
  phone: z.string().optional(),
  role: z.enum(['admin', 'supervisor', 'representative', 'client']),
  active: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth(['admin', 'supervisor']);

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    let query = db.select({
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
    }).from(users);

    const conditions = [];

    if (role) {
      conditions.push(eq(users.role, role as 'admin' | 'supervisor' | 'representative' | 'client'));
    }

    if (active !== null && active !== undefined) {
      conditions.push(eq(users.active, active === 'true'));
    }

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.nameAr, `%${search}%`),
          ilike(users.username, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const result = await query.orderBy(desc(users.createdAt));

    return NextResponse.json({ users: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { username, email, password, name, nameAr, phone, role, active } = validation.data;
    const resolvedName = name || nameAr || username;
    const resolvedNameAr = nameAr || null;

    const existing = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        name: resolvedName,
        nameAr: resolvedNameAr,
        phone,
        role,
        active,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        name: users.name,
        nameAr: users.nameAr,
        phone: users.phone,
        role: users.role,
        active: users.active,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ user: newUser[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

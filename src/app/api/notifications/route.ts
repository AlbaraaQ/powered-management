import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createNotificationSchema = z.object({
  userId: z.number().optional(),
  type: z.enum(['info', 'success', 'warning', 'error']).optional().default('info'),
  title: z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  message: z.string().min(1),
  messageAr: z.string().optional(),
  link: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCountResult = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.read, false)));

    return NextResponse.json({
      notifications: userNotifications,
      unreadCount: unreadCountResult[0]?.count || 0,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(['admin', 'supervisor']);

    const body = await request.json();
    const validation = createNotificationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    // If userId is specified, send to that user, otherwise send to all users
    if (data.userId) {
      await db.insert(notifications).values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        titleAr: data.titleAr,
        message: data.message,
        messageAr: data.messageAr,
        link: data.link,
      });
    } else {
      // Send to all active users
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.active, true));

      const notificationValues = allUsers.map((u) => ({
        userId: u.id,
        type: data.type as 'info' | 'success' | 'warning' | 'error',
        title: data.title,
        titleAr: data.titleAr,
        message: data.message,
        messageAr: data.messageAr,
        link: data.link,
      }));

      if (notificationValues.length > 0) {
        await db.insert(notifications).values(notificationValues);
      }
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

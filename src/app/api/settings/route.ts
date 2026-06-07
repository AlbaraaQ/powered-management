import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string(),
      value: z.string(),
      description: z.string().optional(),
      category: z.string().optional(),
    })
  ),
});

export async function GET() {
  try {
    await requireAuth(['admin']);

    const allSettings = await db.select().from(settings);

    // Group by category
    const grouped = allSettings.reduce((acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(setting);
      return acc;
    }, {} as Record<string, typeof allSettings>);

    return NextResponse.json({ settings: allSettings, grouped });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(['admin']);

    const body = await request.json();
    const validation = updateSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { settings: settingsData } = validation.data;

    for (const setting of settingsData) {
      // Determine category based on key prefix
      let category = setting.category || 'general';
      if (setting.key.startsWith('ai_')) {
        category = 'ai';
      } else if (setting.key.startsWith('visit')) {
        category = 'visits';
      }

      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({
            value: setting.value,
            description: setting.description,
            category: category,
            updatedAt: new Date(),
          })
          .where(eq(settings.key, setting.key));
      } else {
        await db.insert(settings).values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          category: category,
        });
      }
    }

    const updatedSettings = await db.select().from(settings);

    return NextResponse.json({ settings: updatedSettings, success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

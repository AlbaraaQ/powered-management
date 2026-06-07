import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visits, visitPhotos } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

const addPhotoSchema = z.object({
  photoUrl: z.string().min(1),
  photoType: z.enum(['shelf', 'display', 'other']).optional().default('other'),
  caption: z.string().max(255).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth();

    const { id } = await context.params;
    const visitId = parseInt(id);

    const photos = await db
      .select()
      .from(visitPhotos)
      .where(eq(visitPhotos.visitId, visitId));

    return NextResponse.json({ photos });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Get photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAuth(['representative', 'admin', 'supervisor']);

    const { id } = await context.params;
    const visitId = parseInt(id);

    // Verify visit exists
    const visit = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
    if (visit.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check max photos (2)
    const existingPhotos = await db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visitId));
    if (existingPhotos.length >= 2) {
      return NextResponse.json({ error: 'Maximum 2 photos allowed per visit' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';

    let photoUrl = '';
    let photoType: 'shelf' | 'display' | 'other' = 'other';
    let caption = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      photoType = (formData.get('photoType') as 'shelf' | 'display' | 'other' | null) || 'other';
      caption = (formData.get('caption') as string | null) || '';

      if (!file) {
        return NextResponse.json({ error: 'Photo file is required' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'Image size must be 5MB or less' }, { status: 400 });
      }

      const ext = path.extname(file.name || '.jpg') || '.jpg';
      const fileName = `visit-${visitId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'visits');
      const filePath = path.join(uploadDir, fileName);

      await mkdir(uploadDir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      photoUrl = `/uploads/visits/${fileName}`;
    } else {
      const body = await request.json();
      const validation = addPhotoSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: validation.error.issues },
          { status: 400 }
        );
      }

      photoUrl = validation.data.photoUrl;
      photoType = validation.data.photoType;
      caption = validation.data.caption || '';
    }

    const newPhoto = await db
      .insert(visitPhotos)
      .values({
        visitId,
        photoUrl,
        photoType,
        caption: caption || null,
      })
      .returning();

    return NextResponse.json({ photo: newPhoto[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Add photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { db } from '@/db';
import { visits, visitPhotos, branches } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const uploadSchema = z.object({
  photoData: z.string().min(1), // base64 data URL
  photoType: z.enum(['shelf', 'display', 'other']).optional().default('other'),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(['representative', 'admin', 'supervisor']);
    const { id } = await context.params;
    const visitId = parseInt(id);

    const validation = uploadSchema.safeParse({
      photoData: request.headers.get('x-photo-data') || '',
      photoType: request.headers.get('x-photo-type') || 'other',
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    // Verify visit exists
    const visit = await db
      .select({
        id: visits.id,
        representativeId: visits.representativeId,
        branchId: visits.branchId,
        status: visits.status,
      })
      .from(visits)
      .where(eq(visits.id, visitId))
      .limit(1);

    if (visit.length === 0) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check if user can edit this visit
    if (user.role === 'representative' && visit[0].representativeId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check max photos (2)
    const existingPhotos = await db.select().from(visitPhotos).where(eq(visitPhotos.visitId, visitId));
    if (existingPhotos.length >= 2) {
      return NextResponse.json({ error: 'Maximum 2 photos allowed per visit' }, { status: 400 });
    }

    // Save photo file
    let photoUrl = '';
    const timestamp = Date.now();
    const photoType = validation.data.photoType || 'other';
    
    try {
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'photos');
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      // Extract base64 data
      const base64Data = validation.data.photoData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `photo_${visitId}_${timestamp}_${photoType}.jpg`;
      const filePath = join(uploadDir, fileName);

      writeFileSync(filePath, buffer);
      photoUrl = `/uploads/photos/${fileName}`;
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      // Fallback: store as base64 data URL in database
      photoUrl = validation.data.photoData;
    }

    // Get visit details for logging
    const branch = await db
      .select({ name: branches.name, nameAr: branches.nameAr })
      .from(branches)
      .where(eq(branches.id, visit[0].branchId))
      .limit(1);

    const newPhoto = await db
      .insert(visitPhotos)
      .values({
        visitId,
        photoUrl,
        photoType: photoType as 'shelf' | 'display' | 'other',
        caption: branch.length > 0 ? (branch[0].nameAr || branch[0].name) : undefined,
      })
      .returning({
        id: visitPhotos.id,
        visitId: visitPhotos.visitId,
        photoUrl: visitPhotos.photoUrl,
        photoType: visitPhotos.photoType,
        caption: visitPhotos.caption,
        createdAt: visitPhotos.createdAt,
      });

    return NextResponse.json({ photo: newPhoto[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Upload photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

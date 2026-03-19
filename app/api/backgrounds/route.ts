import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { background_images } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const images = await db.select().from(background_images).orderBy(desc(background_images.createdAt));
        return NextResponse.json(images);
    } catch (error) {
        console.error('Failed to fetch backgrounds:', error);
        return NextResponse.json({ error: 'Failed to fetch backgrounds' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, data } = body;

        if (!name || !data) {
            return NextResponse.json({ error: 'Name and Data are required' }, { status: 400 });
        }

        const [newImage] = await db.insert(background_images).values({
            name,
            data,
        }).returning();

        return NextResponse.json({ success: true, image: newImage });
    } catch (error) {
        console.error('Failed to upload background:', error);
        return NextResponse.json({ error: 'Failed to upload background' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await db.delete(background_images).where(eq(background_images.id, parseInt(id)));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete background' }, { status: 500 });
    }
}

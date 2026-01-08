import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const result = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
        if (result.length === 0) {
            return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
        }
        return NextResponse.json(result[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch permit' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        await db.delete(permits).where(eq(permits.id, id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete permit' }, { status: 500 });
    }
}

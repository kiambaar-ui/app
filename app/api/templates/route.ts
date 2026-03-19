import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const allTemplates = await db.select().from(templates);
        return NextResponse.json({ success: true, data: allTemplates });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, data, fieldMappings } = body;

        if (!name || !data) {
            return NextResponse.json({ success: false, error: 'Name and Data are required' }, { status: 400 });
        }

        await db.insert(templates).values({
            name,
            data,
            fieldMappings: fieldMappings ? JSON.stringify(fieldMappings) : null,
        });

        return NextResponse.json({ success: true, message: 'Template registered successfully' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

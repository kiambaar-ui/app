import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { templates } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
        const templateId = parseInt(id);
        if (isNaN(templateId)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        const body = await request.json();
        const { mappingConfig, fieldMappings } = body;

        const updateData: any = {};
        if (mappingConfig !== undefined) {
            updateData.mappingConfig = typeof mappingConfig === 'string' ? mappingConfig : JSON.stringify(mappingConfig);
        }
        if (fieldMappings !== undefined) {
            updateData.fieldMappings = typeof fieldMappings === 'string' ? fieldMappings : JSON.stringify(fieldMappings);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: 'No data provided to update' }, { status: 400 });
        }

        await db.update(templates)
            .set(updateData)
            .where(eq(templates.id, templateId));

        return NextResponse.json({ success: true, message: 'Mapping configuration updated' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    try {
        const templateId = parseInt(id);
        if (isNaN(templateId)) {
            return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
        }

        await db.delete(templates).where(eq(templates.id, templateId));
        return NextResponse.json({ success: true, message: 'Template deleted' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

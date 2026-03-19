import { db } from '@/lib/db';
import { permits, background_images } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import React from 'react';
import { Metadata } from 'next';
import PermitView from './PermitView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Permit Details',
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function PermitPage({ params }: PageProps) {
    const { id } = await params;
    
    let permit = null;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
        const results = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
        permit = results[0];
    } else {
        const serialNum = parseInt(id);
        if (!isNaN(serialNum)) {
            const results = await db.select().from(permits).where(eq(permits.serialNumber, serialNum)).limit(1);
            permit = results[0];
        }
    }

    if (!permit) {
        notFound();
    }

    let initialBackground = null;
    if (permit.backgroundId) {
        const bgResults = await db.select().from(background_images).where(eq(background_images.id, permit.backgroundId)).limit(1);
        if (bgResults.length > 0) {
            initialBackground = bgResults[0].data;
        }
    }

    return <PermitView data={permit} serialNumber={permit.serialNumber!} initialBackground={initialBackground} />;
}

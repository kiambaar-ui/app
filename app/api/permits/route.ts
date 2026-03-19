import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permits, templates } from '@/lib/schema';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
    try {
        const allPermits = await db.select().from(permits).orderBy(desc(permits.createdAt));
        // Wait, rowId is internal to sqlite, drizzle pg doesn't have it by default unless serial.
        // In schema I defined id as text. I didn't define a serial ID or created_at.
        // Original app used "ORDER BY rowid DESC".
        // I should probably add a created_at or just order by insertion if I had a serial.
        // Let's modify schema to include `createdAt` or use `id` if uuid is time-ordered (it's random).

        // For now, let's just fetch all. I should probably add a timestamp to schema to match "latest first" behavior.
        // However, correcting the schema now requires migration steps if I was running a real DB.
        // Since I am just writing code, I will update schema to include `createdAt`.

        // But wait, the task is to replicate. 
        // Let's assume for now we list them. I'll stick to simple select.
        // Actually, I can use `orderBy(desc(permits.issueDate))` potentially?

        return NextResponse.json(allPermits);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch permits' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Get count to determine next serial number (simplistic fallback if sequence not adjusted)
        const lastPermit = await db.select().from(permits).orderBy(desc(permits.serialNumber)).limit(1);
        const nextSerial = lastPermit.length > 0 ? (lastPermit[0].serialNumber || 599) + 1 : 600;

        const id = randomUUID().substring(0, 12);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
        const verifyUrl = `${appUrl}/verify-liquor-permit/${nextSerial}`;

        // Extract metadata fields
        const metadata: Record<string, string> = {};
        for (const [key, value] of formData.entries()) {
            if (key.startsWith('metadata_')) {
                metadata[key.replace('metadata_', '')] = value as string;
            }
        }

        // Extract data
        const permitData: any = {
            id,
            businessName: formData.get('businessName') as string,
            businessId: formData.get('businessId') as string,
            addressPoBox: formData.get('addressPoBox') as string,
            phone: formData.get('phone') as string,
            subcounty: formData.get('subcounty') as string,
            ward: formData.get('ward') as string,
            market: formData.get('market') as string,
            plotNo: formData.get('plotNo') as string,
            activity: formData.get('activity') as string,
            amount: formData.get('amount') as string,
            amountInWords: formData.get('amountInWords') as string,
            issueDateIso: (formData.get('issueDateIso') && !isNaN(new Date(formData.get('issueDateIso') as string).getTime())) ? new Date(formData.get('issueDateIso') as string) : null,
            expiryDate: formData.get('expiryDate') as string || '',
            expiryDateIso: (formData.get('expiryDateIso') && !isNaN(new Date(formData.get('expiryDateIso') as string).getTime())) ? new Date(formData.get('expiryDateIso') as string) : null,
            status: formData.get('status') as string || 'Valid',
            ownerName: formData.get('ownerName') as string,
            ownerEmail: formData.get('ownerEmail') as string,
            ownerPhone: formData.get('ownerPhone') as string,
            paidForYear: formData.get('paidForYear') as string || new Date().getFullYear().toString(),
            renewalStatus: formData.get('renewalStatus') as string || 'New',
            templateName: formData.get('templateName') as string || 'Liquor Permit Template',
            backgroundId: formData.get('backgroundId') ? parseInt(formData.get('backgroundId') as string) : null,
            metadata: JSON.stringify(metadata),
        };

        // If we want to force the serialNumber to follow our logic:
        permitData.serialNumber = nextSerial;

        await db.insert(permits).values(permitData);

        // Redirect to home or specific permit view
        return NextResponse.redirect(new URL(`/permit/${nextSerial}`, request.url), 303);
    } catch (error) {
        console.error('Error creating permit:', error);
        return NextResponse.json({ error: 'Failed to create permit' }, { status: 500 });
    }
}

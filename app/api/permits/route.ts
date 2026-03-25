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
        const contentType = request.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        let rawData: Record<string, any> = {};

        if (isJson) {
            rawData = await request.json();
        } else {
            const formData = await request.formData();
            formData.forEach((value, key) => { rawData[key] = value; });
        }

        // Determine next serial number
        let nextSerial;
        if (rawData.serialNumber) {
            nextSerial = parseInt(rawData.serialNumber);
            if (isNaN(nextSerial)) {
                return NextResponse.json({ error: 'Serial number must be a valid number' }, { status: 400 });
            }
            // Verify uniqueness
            const exists = await db.select().from(permits).where(eq(permits.serialNumber, nextSerial)).limit(1);
            if (exists.length > 0) {
                return NextResponse.json({ error: 'Serial number already in use' }, { status: 400 });
            }
        } else {
            const lastPermit = await db.select().from(permits).orderBy(desc(permits.serialNumber)).limit(1);
            nextSerial = lastPermit.length > 0 ? (lastPermit[0].serialNumber || 599) + 1 : 600;
        }

        const id = randomUUID().substring(0, 12);

        // Extract data defensively against both JSON strings and FormData strings
        const permitData: any = {
            id,
            serialNumber: nextSerial,
            licenseNumber: rawData.licenseNumber || '',
            businessName: rawData.businessName || '',
            businessId: rawData.businessId || '',
            addressPoBox: rawData.addressPoBox || '',
            phone: rawData.phone || '',
            subcounty: rawData.subcounty || '',
            ward: rawData.ward || '',
            market: rawData.market || '',
            plotNo: rawData.plotNo || '',
            activity: rawData.activity || '',
            amount: rawData.amount || '',
            amountInWords: rawData.amountInWords || '',
            issueDate: rawData.issueDate || rawData.issueDateIso || '',
            issueDateIso: (rawData.issueDateIso && !isNaN(new Date(rawData.issueDateIso).getTime())) ? new Date(rawData.issueDateIso) : null,
            expiryDate: rawData.expiryDate || rawData.expiryDateIso || '',
            expiryDateIso: (rawData.expiryDateIso && !isNaN(new Date(rawData.expiryDateIso).getTime())) ? new Date(rawData.expiryDateIso) : null,
            status: rawData.status || 'Valid',
            ownerName: rawData.ownerName || '',
            ownerEmail: rawData.ownerEmail || '',
            ownerPhone: rawData.ownerPhone || '',
            paidForYear: rawData.paidForYear || new Date().getFullYear().toString(),
            renewalStatus: rawData.renewalStatus || 'New',
            templateName: rawData.templateName || 'Liquor Permit Template',
            backgroundId: rawData.backgroundId ? parseInt(rawData.backgroundId) : null,
            operatingHours: rawData.metadata_operatingHours || rawData.operatingHours || '',
            receiptNo: rawData.metadata_receiptNo || rawData.receiptNo || '',
            road: rawData.metadata_road || rawData.road || '',
            issuedBy: rawData.metadata_issuedBy || rawData.issuedBy || 'Bernad Kariuki -Chair',
            txDate: rawData.txDate || rawData.issueDate || '',
            mode: rawData.mode || 'M-Pesa',
        };

        if (isJson && permitData.txDate && permitData.txDate.includes('T')) {
            // Clean up ISO txDate if passed from JSON
            permitData.txDate = permitData.txDate.split('T')[0];
        }

        await db.insert(permits).values(permitData);

        if (isJson) {
            return NextResponse.json({ success: true, serialNumber: nextSerial });
        } else {
            // Redirect to home or specific permit view
            return NextResponse.redirect(new URL(`/permit/${nextSerial}`, request.url), 303);
        }
    } catch (error) {
        console.error('Error creating permit:', error);
        return NextResponse.json({ error: 'Failed to create permit' }, { status: 500 });
    }
}

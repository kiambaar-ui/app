import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { getSession } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    // Download backup as JSON
    try {
        const allPermits = await db.select().from(permits).orderBy(desc(permits.createdAt));
        const data = JSON.stringify(allPermits, null, 2);
        const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;

        const headers = new Headers();
        headers.set('Content-Type', 'application/json');
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);

        return new NextResponse(data, {
            status: 200,
            headers
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let data = body;

        // Support wrapped format { filename, data: [...] } or raw array [...]
        if (!Array.isArray(body) && body.data && Array.isArray(body.data)) {
            data = body.data;
        }

        if (!Array.isArray(data)) {
            return NextResponse.json({ success: false, error: 'Invalid backup format' }, { status: 400 });
        }

        let successes = 0;
        let errors = 0;

        // Process each permit from the backup
        for (const item of data) {
            try {
                // Prepare the values object, cleaning up any missing fields or types
                const valuesToUpsert: any = {
                    id: item.id,
                    businessName: item.businessName ?? '',
                    businessId: item.businessId ?? '',
                    addressPoBox: item.addressPoBox ?? '',
                    phone: item.phone ?? '',
                    subcounty: item.subcounty ?? '',
                    ward: item.ward ?? '',
                    market: item.market ?? '',
                    plotNo: item.plotNo ?? '',
                    activity: item.activity ?? '',
                    amount: item.amount ?? '',
                    amountInWords: item.amountInWords ?? '',
                    issueDate: item.issueDate ?? '',
                    expiryDate: item.expiryDate ?? '',
                    status: item.status ?? '',
                    // Handle ISO dates: Use explicit ISO if present, otherwise try to parse the text date
                    issueDateIso: item.issueDateIso ? new Date(item.issueDateIso) : (item.issueDate ? new Date(item.issueDate) : null),
                    expiryDateIso: item.expiryDateIso ? new Date(item.expiryDateIso) : (item.expiryDate ? new Date(item.expiryDate) : null),
                    createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
                };

                // Validate the parsed dates (if they became Invalid Date, set to null)
                if (valuesToUpsert.issueDateIso && isNaN(valuesToUpsert.issueDateIso.getTime())) valuesToUpsert.issueDateIso = null;
                if (valuesToUpsert.expiryDateIso && isNaN(valuesToUpsert.expiryDateIso.getTime())) valuesToUpsert.expiryDateIso = null;

                // Upsert: Try to Insert, if ID conflicts, Update all fields
                await db.insert(permits)
                    .values(valuesToUpsert)
                    .onConflictDoUpdate({
                        target: permits.id,
                        set: valuesToUpsert
                    });

                successes++;
            } catch (err) {
                console.error(`Failed to restore item ${item.id}:`, err);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Restored ${successes} items. Failed: ${errors}`,
            stats: { successes, errors }
        });

    } catch (error) {
        console.error('Restore error:', error);
        return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 });
    }
}

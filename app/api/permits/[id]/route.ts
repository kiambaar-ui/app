import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    try {
        const body = await request.json();

        const updateData: Record<string, any> = {
            businessName: body.businessName,
            licenseNumber: body.licenseNumber,
            businessId: body.businessId,
            addressPoBox: body.addressPoBox,
            phone: body.phone,
            subcounty: body.subcounty,
            ward: body.ward,
            market: body.market,
            plotNo: body.plotNo,
            activity: body.activity,
            amount: body.amount,
            amountInWords: body.amountInWords,
            issueDate: body.issueDate,
            issueDateIso: body.issueDateIso ? new Date(body.issueDateIso) : undefined,
            expiryDate: body.expiryDate,
            expiryDateIso: body.expiryDateIso ? new Date(body.expiryDateIso) : undefined,
            status: body.status,
            ownerName: body.ownerName,
            ownerEmail: body.ownerEmail,
            ownerPhone: body.ownerPhone,
            paidForYear: body.paidForYear,
            renewalStatus: body.renewalStatus,
            templateName: body.templateName,
            backgroundId: body.backgroundId,
            // Permit-certificate specific columns
            operatingHours: body.operatingHours,
            receiptNo: body.receiptNo,
            road: body.road,
            issuedBy: body.issuedBy,
            txDate: body.txDate,
            mode: body.mode,
            serialNumber: body.serialNumber !== undefined ? parseInt(body.serialNumber) : undefined,
        };

        // Remove undefined fields to avoid overwriting with nulls unless intended
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

        let serialNum: number | null = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);

        let targetIdCol: any;
        let targetIdVal: any;

        if (isUUID) {
            targetIdCol = permits.id;
            targetIdVal = rawId;
        } else {
            const parsedSerial = parseInt(rawId);
            if (!isNaN(parsedSerial)) {
                targetIdCol = permits.serialNumber;
                targetIdVal = parsedSerial;
            } else {
                return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
            }
        }

        // Check for serial number collision if attempting to change it
        if (updateData.serialNumber !== undefined) {
            const exists = await db.select().from(permits).where(eq(permits.serialNumber, updateData.serialNumber)).limit(1);
            if (exists.length > 0) {
                const conflictIdentifier = isUUID ? exists[0].id : exists[0].serialNumber;
                if (conflictIdentifier !== targetIdVal) {
                    return NextResponse.json({ error: 'Serial number already in use' }, { status: 400 });
                }
            }
        }

        await db.update(permits).set(updateData).where(eq(targetIdCol, targetIdVal));
        serialNum = updateData.serialNumber || targetIdVal;

        // Revalidate cached pages so the verify page reflects the update immediately
        if (serialNum) {
            revalidatePath(`/verify-liquor-permit/${serialNum}`);
            revalidatePath(`/permit/${serialNum}`);
        }
        revalidatePath('/'); // Dashboard

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update permit:', error);
        return NextResponse.json({ error: 'Failed to update permit' }, { status: 500 });
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

import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PermitPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const result = await db.select().from(permits).where(eq(permits.id, id)).limit(1);

    if (result.length === 0) {
        notFound();
    }

    const permit = result[0];

    // Logic to determine status
    let actualStatus = permit.status;
    let statusColor = '#28a745'; // Green

    if (permit.expiryDateIso) {
        const expiry = new Date(permit.expiryDateIso);
        const now = new Date();
        if (now > expiry) {
            actualStatus = 'Expired';
            statusColor = '#dc3545'; // Red
        }
    } else if (permit.expiryDate) {
        // Fallback to trying to parse string if ISO missing (legacy)
        try {
            const expiry = new Date(permit.expiryDate);
            if (!isNaN(expiry.getTime()) && new Date() > expiry) {
                actualStatus = 'Expired';
                statusColor = '#dc3545';
            }
        } catch (e) { }
    }

    // Override color if explicitly suspended (based on logic in qr2.py default logic seems to prioritize expiry? 
    // qr2.py logic: try check expiry -> status = Expired or Active. Except-catch: use permit status.
    // It overrides "Suspended" if it's not expired? That seems odd in the python code.
    // "actual_status = 'Active' or 'Expired'" based on date. 
    // If date parsing fails, it falls back to DB status.
    // So if I set "Suspended" but date works, it says "Active"? That might be a bug in original or intended "Valid until expired".
    // I'll stick to: If expired -> Expired. Else -> DB Status.

    if (actualStatus !== 'Expired' && permit.status === 'Suspended') {
        actualStatus = 'Suspended';
        statusColor = '#dc3545'; // Red (or maybe orange/warning?) qr2 uses red for suspend too?
    }

    // qr2.py uses #28a745 for Active, #dc3545 for else.

    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">COUNTY GOVERNMENT OF MURANG&apos;A</h1>
                    <h2 className="text-2xl font-semibold text-gray-700 mt-2">Liquor Permit Verification</h2>
                </div>

                <div className="space-y-3 text-gray-700">
                    {[
                        { label: 'Business Name/ Owner', value: permit.businessName },
                        { label: 'Business ID No', value: permit.businessId },
                        { label: 'Address P.O. Box', value: permit.addressPoBox },
                        { label: 'Phone No.', value: permit.phone },
                        { label: 'Subcounty', value: permit.subcounty },
                        { label: 'Ward', value: permit.ward },
                        { label: 'Market', value: permit.market },
                        { label: 'Plot No', value: permit.plotNo },
                        { label: 'Activity/Business/Profession or Occupation of', value: permit.activity },
                        { label: 'Permit Amount Paid', value: permit.amount },
                        { label: 'Kshs in words', value: permit.amountInWords },
                        { label: 'Date of issue', value: permit.issueDate },
                        { label: 'Expiry Date', value: permit.expiryDate },
                    ].map((item, idx) => (
                        <p key={idx}>
                            <span className="font-semibold">{item.label}:</span> {item.value}
                        </p>
                    ))}

                    <p className="mt-4 text-green-600 font-bold text-lg">
                        <span className="font-semibold text-[#28a745] flex-shrink-0">Status:</span> {actualStatus}
                    </p>
                </div>
            </div>
        </div>
    );
}

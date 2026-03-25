import { db } from '@/lib/db';
import { permits } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import React from 'react';
import { Metadata } from 'next';
import styles from './VerificationPage.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Permit Verification',
    icons: {
        icon: 'https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png',
        shortcut: 'https://eservices.muranga.go.ke/images/favicon/favicon-32x32.png',
    },
};


interface PageProps {
    params: Promise<{ id: string }>;
}

function formatDate(dateStr: string | null) {
    if (!dateStr) return 'N/A';
    try {
        const cleanDateStr = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
        const parts = cleanDateStr.split('-');

        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${day.toString().padStart(2, '0')} ${months[month - 1]} ${year}`;
            }
        }

        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
        }

        return dateStr;
    } catch (e) {
        return dateStr;
    }
}

export default async function VerifyPermitPage({ params }: PageProps) {
    const { id } = await params;

    let permit = null;
    const serialNum = parseInt(id);

    if (!isNaN(serialNum)) {
        const results = await db.select().from(permits).where(eq(permits.serialNumber, serialNum)).limit(1);
        permit = results[0];
    }

    if (!permit) {
        // Try UUID lookup
        const results = await db.select().from(permits).where(eq(permits.id, id)).limit(1);
        permit = results[0];
    }

    if (!permit) {
        return notFound();
    }

    const data = permit;
    const isExpired = data.expiryDateIso ? new Date(data.expiryDateIso) < new Date() : false;

    // Clean and format amount: strip "Ksh"/"KES" prefix, then format with commas
    let rawAmount = (data.amount || '').replace(/ksh|kes/gi, '').trim();
    // Try to parse as number and format with commas
    const numAmount = parseFloat(rawAmount.replace(/,/g, ''));
    const displayAmount = !isNaN(numAmount)
        ? `Ksh ${numAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `Ksh ${rawAmount}`;

    // Strip *** decorators that the permit template adds (e.g. "***Twenty Thousand***")
    const displayAmountInWords = (data.amountInWords || '').replace(/\*+/g, '').trim();

    return (
        <div className={styles.pageBody}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.h1}>COUNTY GOVERNMENT OF MURANG&#39;A</h1>
                    <h1 className={styles.h1}>Liquor Permit Verification</h1>
                </div>

                <p className={styles.p}><strong className={styles.lpStrongLabel}>Business Name:</strong> {data.businessName}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>License Number:</strong> {data.licenseNumber || 'N/A'}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Business ID No:</strong> LLP:{data.serialNumber}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Phone No.:</strong> {data.phone}</p>

                <p className={styles.sectionTitle}>Business Owner</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Owner Name:</strong> {data.ownerName}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Owner Email:</strong> {data.ownerEmail}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Owner Phone:</strong> {data.ownerPhone}</p>

                <p className={styles.sectionTitle}>Location Details</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Address P.O. Box:</strong> {data.addressPoBox || 'N/A'}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Subcounty:</strong> {data.subcounty}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Ward:</strong> {data.ward}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Market:</strong> {data.market || ''}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Plot No:</strong> {data.plotNo || 'N/A'}</p>

                <p className={styles.sectionTitle}>Permit Details</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Activity/Business/Profession:</strong> {data.activity}{data.operatingHours ? ` operating time ${data.operatingHours}` : ''}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Permit Amount Paid:</strong> {displayAmount}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Kshs in words:</strong> {displayAmountInWords}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Date of issue:</strong> {formatDate(data.issueDate)}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Expiry Date:</strong> {formatDate(data.expiryDate)}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Paid For Year:</strong> {data.paidForYear}</p>
                <p className={styles.p}><strong className={styles.lpStrongLabel}>Renewal:</strong> {data.renewalStatus}</p>

                {isExpired ? (
                    <div className={`${styles.statusBadge} ${styles.statusExpired}`}>
                        ⚠ This License was VALID for {data.paidForYear} but is now EXPIRED
                    </div>
                ) : (
                    <div className={`${styles.statusBadge} ${styles.statusValid}`}>
                        ✓ This License is VALID for {data.paidForYear}
                    </div>
                )}
            </div>
        </div>
    );
}

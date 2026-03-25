import { db } from '@/lib/db';
import { background_images } from '@/lib/schema';
import React from 'react';
import { Metadata } from 'next';
import PermitView from '../[id]/PermitView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Create New Permit',
};

export default async function NewPermitPage() {
    // We fetch available backgrounds to optionally pass them in, but PermitView handles fetching now anyway.
    // For a new permit, we start with completely blank default data.

    // Add default values for the new fields

    const emptyPermit = {
        serialNumber: 'new', // This triggers POST mode inside PermitView
        businessName: '',
        businessId: '',
        addressPoBox: '',
        phone: '',
        subcounty: '',
        ward: '',
        market: '',
        plotNo: '',
        activity: '',
        amount: '',
        amountInWords: '',
        issueDate: '',
        expiryDate: '',
        status: 'Valid',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        paidForYear: new Date().getFullYear().toString(),
        renewalStatus: 'New',
        operatingHours: '',
        receiptNo: '',
        road: '',
        issuedBy: 'Bernad Kariuki -Chair',
        txDate: '',
        mode: 'M-Pesa',
        backgroundId: null
    };

    return <PermitView data={emptyPermit} serialNumber="new" initialBackground={null} />;
}

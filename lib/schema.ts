import { pgTable, text, timestamp, serial, boolean } from 'drizzle-orm/pg-core';

export const permits = pgTable('permits', {
    id: text('id').primaryKey(),
    businessName: text('businessName'),
    businessId: text('businessId'),
    addressPoBox: text('addressPoBox'),
    phone: text('phone'),
    subcounty: text('subcounty'),
    ward: text('ward'),
    market: text('market'),
    plotNo: text('plotNo'),
    activity: text('activity'),
    amount: text('amount'),
    amountInWords: text('amountInWords'),
    issueDate: text('issueDate'),
    issueDateIso: timestamp('issueDateIso'),
    expiryDate: text('expiryDate'),
    expiryDateIso: timestamp('expiryDateIso'),
    status: text('status'),
    createdAt: timestamp('created_at').defaultNow(),
});

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    username: text('username').unique().notNull(),
    password: text('password').notNull(),
    role: text('role').default('user'),
    status: text('status').default('active'),
    permissions: text('permissions'), // JSON string of allowed modules
    mustChangePassword: boolean('mustChangePassword').default(true),
    createdAt: timestamp('created_at').defaultNow(),
});

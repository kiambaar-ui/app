import { pgTable, text, timestamp, serial, boolean, integer } from 'drizzle-orm/pg-core';

export const permits = pgTable('permits', {
    id: text('id').primaryKey(),
    serialNumber: integer('serialNumber'), // Changed from serial to integer to allow safe push
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
    ownerName: text('ownerName'),
    ownerEmail: text('ownerEmail'),
    ownerPhone: text('ownerPhone'),
    paidForYear: text('paidForYear'),
    renewalStatus: text('renewalStatus'),
    templateName: text('templateName'),
    backgroundId: integer('backgroundId'), // ID of the selected background image
    metadata: text('metadata'), // JSON string of extra fields for generic templates
    createdAt: timestamp('created_at').defaultNow(),
});

export const background_images = pgTable('background_images', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    data: text('data').notNull(), // Base64 data URL
    createdAt: timestamp('created_at').defaultNow(),
});

export const templates = pgTable('templates', {
    id: serial('id').primaryKey(),
    name: text('name').unique().notNull(),
    data: text('data').notNull(), // Base64 or URL
    fieldMappings: text('fieldMappings'), // Raw JSON from Studio
    mappingConfig: text('mappingConfig'), // User-defined mapping [pdfField -> permitField or custom]
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

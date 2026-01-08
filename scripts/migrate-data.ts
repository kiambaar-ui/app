import sqlite3 from 'sqlite3';
import { db } from '../lib/db';
import { permits } from '../lib/schema';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { sql } from '@vercel/postgres';

dotenv.config({ path: '.env.local' });

const SQLITE_DB_PATH = path.resolve(__dirname, '../../permits.db');

async function migrate() {
    console.log(`Reading from SQLite DB at: ${SQLITE_DB_PATH}`);

    if (!process.env.POSTGRES_URL) {
        console.error('Error: POSTGRES_URL is not set. Please set it in .env.local');
        process.exit(1);
    }

    const sqlite = new sqlite3.Database(SQLITE_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error opening SQLite database:', err.message);
            process.exit(1);
        }
    });

    sqlite.all('SELECT * FROM permits', async (err, rows: any[]) => {
        if (err) {
            console.error('Error reading from SQLite:', err);
            process.exit(1);
        }

        console.log(`Found ${rows.length} records in SQLite.`);

        for (const row of rows) {
            try {
                // Map SQLite columns to Postgres schema
                // SQLite columns based on main.py: 
                // id, businessName, businessId, addressPoBox, phone, subcounty, ward, market, plotNo, activity, amount, amountInWords, issueDate, expiryDate, status

                await db.insert(permits).values({
                    id: row.id,
                    businessName: row.businessName,
                    businessId: row.businessId,
                    addressPoBox: row.addressPoBox,
                    phone: row.phone,
                    subcounty: row.subcounty,
                    ward: row.ward,
                    market: row.market,
                    plotNo: row.plotNo,
                    activity: row.activity,
                    amount: row.amount,
                    amountInWords: row.amountInWords,
                    issueDate: row.issueDate,
                    expiryDate: row.expiryDate,
                    status: row.status,
                    // createdAt will be defaultNow()
                }).onConflictDoNothing(); // Prevent duplicates if run multiple times

                console.log(`Migrated permit: ${row.id}`);
            } catch (e) {
                console.error(`Failed to migrate permit ${row.id}:`, e);
            }
        }

        console.log('Migration complete.');
        sqlite.close();
        process.exit(0);
    });
}

migrate();

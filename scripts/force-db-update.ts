import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function forceUpdate() {
    try {
        console.log('Adding issueDateIso column...');
        await sql`ALTER TABLE permits ADD COLUMN IF NOT EXISTS "issueDateIso" timestamp;`;

        console.log('Adding expiryDateIso column...');
        await sql`ALTER TABLE permits ADD COLUMN IF NOT EXISTS "expiryDateIso" timestamp;`;

        console.log('Columns added successfully.');
    } catch (err) {
        console.error('Error updating DB:', err);
    }
}

forceUpdate();

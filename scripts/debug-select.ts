import { db } from '../lib/db';
import { permits, users } from '../lib/schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env' });

async function debug() {
    console.log('Debugging SELECT query...');

    try {
        console.log('1. Querying users (this should work)...');
        const userResult = await db.select().from(users).where(eq(users.username, 'admin')).limit(1);
        console.log('User Result:', userResult);

        console.log('2. Querying permits by serialNumber (this is failing)...');
        const serialNum = 600;
        const permitResult = await db.select().from(permits).where(eq(permits.serialNumber, serialNum)).limit(1);
        console.log('Permit Result:', permitResult);

    } catch (error: any) {
        console.error('Debug Failed!');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
    }
    process.exit(0);
}

debug();

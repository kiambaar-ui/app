
import { db } from '@/lib/db';
import { users, permits } from '@/lib/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Testing DB connection and query...');
    try {
        const username = 'admin';
        console.log(`Querying for user: ${username}`);
        const foundUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        console.log('User Result:', foundUser);

        const serialNum = 600;
        console.log(`Querying for permit with serialNumber: ${serialNum}`);
        const foundPermit = await db.select().from(permits).where(eq(permits.serialNumber, serialNum)).limit(1);
        console.log('Permit Result:', foundPermit);

    } catch (error: any) {
        console.error('Test Failed!');
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
    }
    process.exit(0);
}

main();

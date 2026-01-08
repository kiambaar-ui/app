
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('Testing DB connection and query...');
    try {
        const username = 'admin';
        console.log(`Querying for user: ${username}`);
        const foundUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        console.log('Result:', foundUser);
    } catch (error: any) {
        console.error('Test Failed!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);
        if (error.cause) console.error('Error Cause:', error.cause);
        console.error('Full Error:', error);
    }
    process.exit(0);
}

main();

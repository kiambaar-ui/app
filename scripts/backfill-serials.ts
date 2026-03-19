import { db } from '../lib/db';
import { permits } from '../lib/schema';
import { isNull, eq, asc } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function backfill() {
    console.log('Backfilling serial numbers...');

    const items = await db.select().from(permits).where(isNull(permits.serialNumber)).orderBy(asc(permits.id));
    console.log(`Found ${items.length} records without serial number.`);

    // Find current max serial to start from there or 600
    const maxRecord = await db.select().from(permits).orderBy(desc(permits.serialNumber)).limit(1);
    let nextSerial = Math.max(600, (maxRecord[0]?.serialNumber || 599) + 1);

    for (const item of items) {
        console.log(`Assigning ${nextSerial} to permit ${item.id}`);
        await db.update(permits).set({ serialNumber: nextSerial }).where(eq(permits.id, item.id));
        nextSerial++;
    }

    console.log('Backfill complete.');
    process.exit(0);
}

// Add desc import
import { desc } from 'drizzle-orm';

backfill().catch(err => {
    console.error(err);
    process.exit(1);
});

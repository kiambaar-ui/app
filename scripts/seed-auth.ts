import { db } from '../lib/db';
import { users } from '../lib/schema';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env' });

async function seed() {
    console.log('Seeding admin user...');

    if (!process.env.POSTGRES_URL) {
        console.error('Error: POSTGRES_URL is not set.');
        process.exit(1);
    }

    const username = 'admin';
    const password = 'Admin@2030$'; // Hardcoded default as per request
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.username, username));
        if (existingUser.length > 0) {
            console.log('Admin user already exists. Updating credentials/role...');
            await db.update(users).set({
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            }).where(eq(users.username, username));
        } else {
            await db.insert(users).values({
                username,
                password: hashedPassword,
                role: 'admin',
                status: 'active'
            });
            console.log('Admin user created.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();

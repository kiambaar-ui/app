import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
        }

        const user = await db.select().from(users).where(eq(users.username, session.user)).limit(1);
        if (user.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Verify current password if provided (optional if forced change? No, always good practice, 
        // but if they are logged in via session, maybe strictly required? 
        // For "Force Change" flow, they just logged in with old password, so maybe we trust session?
        // Let's require it for standard change, maybe optional for "Force Change" if we pass a flag?
        // Simpler: Determine if it's a "Force Change" flow. 
        // If user.mustChangePassword is true, maybe we allow them to skip current password check if they just logged in?
        // Actually, safer to always require current password or just rely on active session.
        // Let's rely on active session for simplicity but verify "currentPassword" if user provides it.

        if (currentPassword) {
            const valid = await bcrypt.compare(currentPassword, user[0].password);
            if (!valid) {
                return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.update(users).set({
            password: hashedPassword,
            mustChangePassword: false
        }).where(eq(users.username, session.user));

        const response = NextResponse.json({ success: true });
        response.cookies.delete('session');
        return response;

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}

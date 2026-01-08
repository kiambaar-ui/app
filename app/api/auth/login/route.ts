import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    console.log('Login request received');
    let username = '';
    let password = '';

    try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const json = await request.json();
            username = json.username;
            password = json.password;
        } else {
            const formData = await request.formData();
            username = formData.get('username') as string;
            password = formData.get('password') as string;
        }

        console.log(`Attempting login for user: ${username}`);

        if (!username || !password) {
            console.warn('Missing username or password');
            // If JSON request, return JSON error
            if (contentType.includes('application/json')) {
                return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
            }
            return NextResponse.redirect(new URL('/login?error=Missing_Comput', request.url), 303);
        }

        console.log('Querying DB for user...');
        const foundUser = await db.select().from(users).where(eq(users.username, username)).limit(1);
        console.log(`DB Query complete. User found: ${foundUser.length > 0}`);

        if (foundUser.length === 0) {
            console.warn(`User found check failed: 0 users found for ${username}`);
            if (contentType.includes('application/json')) {
                return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
            }
            return NextResponse.redirect(new URL('/login?error=Invalid_Credentials', request.url), 303);
        }

        const user = foundUser[0];
        let checkPassword = false;

        if (user.password === '__RESET__') {
            console.log(`User ${username} is in RESET state. Bypassing password check.`);
            checkPassword = true; // Allow any password for reset state
        } else {
            checkPassword = await bcrypt.compare(password, user.password);
        }

        if (checkPassword) {
            const user = foundUser[0];
            console.log(`User ${username} authenticated successfully. Checking status/permissions...`);

            if (user.status === 'inactive') {
                console.warn(`User ${username} is inactive`);
                if (contentType.includes('application/json')) {
                    return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
                }
                return NextResponse.redirect(new URL('/login?error=Inactive', request.url), 303);
            }

            // Manual cookie set to include Role
            const { encrypt } = await import('@/lib/auth');
            const { cookies } = await import('next/headers');
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const now = Date.now();

            const session = await encrypt({
                user: user.username,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
                createdAt: now,
                lastActive: now,
                expires
            });

            const cookieStore = await cookies();
            cookieStore.set('session', session, {
                expires,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
            });

            console.log(`Session established for ${username}`);

            if (contentType.includes('application/json')) {
                return NextResponse.json({ success: true, mustChangePassword: user.mustChangePassword });
            }

            return NextResponse.redirect(new URL('/', request.url), 303);
        } else {
            console.warn(`Password mismatch for user ${username}`);
        }

        if (contentType.includes('application/json')) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        return NextResponse.redirect(new URL('/login?error=Invalid_Credentials', request.url), 303);

    } catch (error: any) {
        console.error("Login Critical Error:", error);
        if (error.cause) console.error("Error Cause:", error.cause);

        // Return JSON error if JSON request (avoids redirect loop for API clients)
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }

        return NextResponse.redirect(new URL('/login?error=System_Error', request.url), 303);
    }
}

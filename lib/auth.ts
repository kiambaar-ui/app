import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.SECRET_KEY || 'a-very-secret-key-for-sessions';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // Hard expiry at JWT level
        .sign(key);
}

export async function decrypt(input: string): Promise<any> {
    const { payload } = await jwtVerify(input, key, {
        algorithms: ['HS256'],
    });
    return payload;
}

export async function login(formData: FormData) {
    // Legacy helper - not used in current implementation
    const cookieStore = await cookies();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const now = Date.now();

    const session = await encrypt({
        user: 'admin',
        createdAt: now,
        lastActive: now,
        expires
    });

    cookieStore.set('session', session, {
        expires,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
}

export async function getSession() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return null;
    try {
        return await decrypt(session);
    } catch (error) {
        return null;
    }
}

export async function updateSession(request: NextRequest, response: NextResponse) {
    // Refresh the session's lastActive timestamp
    const session = request.cookies.get('session')?.value;
    if (!session) return response;

    try {
        const parsed = await decrypt(session);

        // Update lastActive to current time
        parsed.lastActive = Date.now();

        // Re-encrypt with updated timestamp
        const newSession = await encrypt(parsed);

        // Set updated cookie on response
        response.cookies.set({
            name: 'session',
            value: newSession,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        return response;
    } catch (e) {
        return response;
    }
}

export async function getUserPermissions(username: string): Promise<string[]> {
    // Fetch user permissions from database
    const { db } = await import('./db');
    const { users } = await import('./schema');
    const { eq } = await import('drizzle-orm');

    try {
        const result = await db.select().from(users).where(eq(users.username, username)).limit(1);

        if (result.length === 0) return [];

        const user = result[0];

        if (user.permissions) {
            try {
                return JSON.parse(user.permissions);
            } catch (e) {
                console.error('Error parsing permissions:', e);
                return [];
            }
        }

        // No permissions set in database - return empty array
        return [];
    } catch (error) {
        console.error('Error fetching user permissions:', error);
        return [];
    }
}

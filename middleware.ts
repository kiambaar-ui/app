import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from './lib/auth';

export async function middleware(request: NextRequest) {
    const session = request.cookies.get('session')?.value;

    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/muranga/login');
    // NOTE: /api/permits is NOT public. Only /permit/... (view page) is public.
    const isPublicPage = request.nextUrl.pathname.startsWith('/verify-liquor-permit');
    const isApiAuth = request.nextUrl.pathname.startsWith('/api/auth');

    if (isPublicPage || isApiAuth) {
        return NextResponse.next();
    }

    let verifiedSession = null;
    if (session) {
        try {
            verifiedSession = await decrypt(session);

            // Session Timeout Checks
            const now = Date.now();
            const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
            const HARD_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

            // Check hard expiry (24 hours since creation)
            if (verifiedSession.createdAt && (now - verifiedSession.createdAt > HARD_EXPIRY)) {
                console.log('Session expired: hard expiry (24h)');
                verifiedSession = null;
                // Delete the expired cookie
                const response = NextResponse.redirect(new URL('/login', request.url));
                response.cookies.delete('session');
                return response;
            }

            // Check idle timeout (30 minutes since last activity)
            if (verifiedSession.lastActive && (now - verifiedSession.lastActive > IDLE_TIMEOUT)) {
                console.log('Session expired: idle timeout (30m)');
                verifiedSession = null;
                // Delete the expired cookie
                const response = NextResponse.redirect(new URL('/login', request.url));
                response.cookies.delete('session');
                return response;
            }
        } catch (e) {
            // Invalid session (JWT expired or malformed)
            console.log('Session decryption failed:', e);
        }
    }

    // Enforce Password Change
    if (verifiedSession && verifiedSession.mustChangePassword) {
        if (!request.nextUrl.pathname.startsWith('/change-password') && !request.nextUrl.pathname.startsWith('/api/auth/logout') && !request.nextUrl.pathname.startsWith('/api/auth/change-password')) {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }
    }

    // Fetch permissions from database (real-time)
    const userRole = verifiedSession?.role;
    const username = verifiedSession?.user;
    let userPermissions: string[] = [];

    if (username) {
        const { getUserPermissions } = await import('./lib/auth');
        userPermissions = await getUserPermissions(username);
    }

    const hasPermission = (required: string) => {
        // Legacy/Super Admin Rule:
        // If role is 'admin' AND permissions is empty/undefined, allow access (Legacy/Super Admin).
        if (userRole === 'admin' && (!userPermissions || userPermissions.length === 0)) return true;

        return userPermissions.includes(required);
    };

    // Protect Admin Routes & Specific API Endpoints
    const path = request.nextUrl.pathname;

    // 1. General Admin Pages (/admin/*)
    if (path.startsWith('/admin')) {
        if (userRole !== 'admin') {
            return NextResponse.redirect(new URL('/', request.url));
        }
        // Specific Admin Sub-pages
        if (path.startsWith('/admin/users') && !hasPermission('users')) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 2. API Routes

    // /api/users -> Requires 'users' permission
    if (path.startsWith('/api/users')) {
        if (userRole !== 'admin' || !hasPermission('users')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    // /api/backup -> Requires 'backups' permission
    if (path.startsWith('/api/backup')) {
        if (userRole !== 'admin' || !hasPermission('backups')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }

    // /api/permits -> Requires 'permits' permission
    if (path.startsWith('/api/permits')) {
        if (!verifiedSession || !hasPermission('permits')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
    }


    // Dashboard protection (fallback for root /)
    if (!verifiedSession && !isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect to dashboard if logged in and on login page
    if (verifiedSession && isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // Refresh session if authenticated (update lastActive)
    if (verifiedSession) {
        const { updateSession } = await import('./lib/auth');
        const response = NextResponse.next();
        return await updateSession(request, response);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

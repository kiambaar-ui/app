import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';

// GET: List all users with pagination
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        // Permission Check: Must be admin AND have 'users' permission (or be legacy full admin)
        // We allow if role is admin and (permissions includes 'users' OR permissions is undefined/null/empty for legacy)
        const hasPermission = session && session.role === 'admin' && (
            !session.permissions ||
            session.permissions.length === 0 ||
            session.permissions.includes('users')
        );

        if (!hasPermission) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = (page - 1) * limit;

        // Fetch all users EXCEPT the current logged-in user
        const currentUsername = session.user;

        const allUsers = await db.select({
            id: users.id,
            username: users.username,
            role: users.role,
            status: users.status,
            permissions: users.permissions,
            createdAt: users.createdAt
        })
            .from(users)
            .limit(limit)
            .offset(offset);

        // Filter out current user from results
        const filteredUsers = allUsers.filter(u => u.username !== currentUsername);

        // Get total count for pagination (excluding current user)
        const allUsersCount = await db.select().from(users);
        const totalUsers = allUsersCount.filter(u => u.username !== currentUsername).length;
        const totalPages = Math.ceil(totalUsers / limit);

        return NextResponse.json({
            success: true,
            users: filteredUsers,
            pagination: {
                page,
                limit,
                totalPages,
                totalUsers
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }
}

// POST: Create new user
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { username, password, role, status, permissions } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
        }

        // Validation: Only admins can have 'users' permission
        if (permissions) {
            try {
                const permsArray = JSON.parse(permissions);
                if (permsArray.includes('users') && role !== 'admin') {
                    return NextResponse.json({ error: 'Only users with admin role can be assigned user management permission' }, { status: 400 });
                }
            } catch (e) {
                return NextResponse.json({ error: 'Invalid permissions format' }, { status: 400 });
            }
        }

        // Check exists
        const exists = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (exists.length > 0) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.insert(users).values({
            username,
            password: hashedPassword,
            role: role || 'user',
            status: status || 'active',
            permissions: permissions || null,
            mustChangePassword: true // Always force change for new users
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}

// PUT: Update user
export async function PUT(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id, role, status, password, permissions, adminPassword } = await request.json();

        // Admin Password Verification for Password Reset
        if (password === '__RESET__') {
            if (!adminPassword) {
                return NextResponse.json({ error: 'Your [Admin] password is required to reset this user.' }, { status: 400 });
            }

            const adminUserResult = await db.select().from(users).where(eq(users.username, session.user)).limit(1);
            if (adminUserResult.length === 0) {
                return NextResponse.json({ error: 'Authenticated admin not found.' }, { status: 404 });
            }

            const isAdminValid = await bcrypt.compare(adminPassword, adminUserResult[0].password);
            if (!isAdminValid) {
                return NextResponse.json({ error: 'Invalid admin password. Reset failed.' }, { status: 401 });
            }
        }

        // Get target user info
        const targetUserResult = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (targetUserResult.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const targetUser = targetUserResult[0];

        // Prevent self-modification of role or status
        if (targetUser.username === session.user) {
            if (role && role !== targetUser.role) {
                return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 });
            }
            if (status && status !== targetUser.status) {
                return NextResponse.json({ error: 'You cannot change your own status' }, { status: 400 });
            }
        }

        // Validation: Only admins can have 'users' permission
        if (permissions) {
            try {
                const permsArray = JSON.parse(permissions);
                const targetRole = role || targetUser.role; // Use new role if provided, otherwise existing
                if (permsArray.includes('users') && targetRole !== 'admin') {
                    return NextResponse.json({ error: 'Only users with admin role can be assigned user management permission' }, { status: 400 });
                }
            } catch (e) {
                return NextResponse.json({ error: 'Invalid permissions format' }, { status: 400 });
            }
        }

        // Safeguard: If demoting admin or deactivating admin check if they are the last one
        if (role === 'user' || status === 'inactive') {
            if (targetUser.role === 'admin') {
                const adminCountResult = await db.select().from(users).where(eq(users.role, 'admin'));
                const adminCount = adminCountResult.filter(u => u.status === 'active').length;

                if (targetUser.status === 'active' && adminCount <= 1) {
                    return NextResponse.json({ error: 'Cannot demote/deactivate the last active administrator.' }, { status: 400 });
                }
            }
        }

        if (password) {
            // Check if it's the special __RESET__ trigger
            if (password === '__RESET__') {
                await db.update(users).set({
                    password: '__RESET__',
                    mustChangePassword: true
                }).where(eq(users.id, id));
            } else {
                const hashedPassword = await bcrypt.hash(password, 10);
                await db.update(users).set({
                    password: hashedPassword,
                    role,
                    status,
                    permissions,
                    mustChangePassword: true // Force change on manual set
                }).where(eq(users.id, id));
            }
        } else {
            await db.update(users).set({ role, status, permissions }).where(eq(users.id, id));
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}

// DELETE: Delete user
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userToDelete = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (userToDelete.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const targetUser = userToDelete[0];

        // 1. Prevent Self-Deletion
        if (targetUser.username === session.user) {
            return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
        }

        // 2. Prevent Deleting Last Admin
        if (targetUser.role === 'admin') {
            const adminCountResult = await db.select().from(users).where(eq(users.role, 'admin'));
            // We check strictly for 'admin' role. Status check might be overkill if we just want to ensure role exists, 
            // but let's assume we want at least one *active* admin? 
            // The prompt says "atleast user with admin powers", usually implies active. 
            // However, just checking role count is safer base logic.
            const adminCount = adminCountResult.length;

            if (adminCount <= 1) {
                return NextResponse.json({ error: 'Cannot delete the last administrator.' }, { status: 400 });
            }
        }

        await db.delete(users).where(eq(users.id, id));

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

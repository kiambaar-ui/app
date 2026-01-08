'use client';

import React from 'react';

interface PermissionWrapperProps {
    permissions: string[]; // User's permissions
    userRole: string;      // User's role
    requiredPermission: string; // Permission required for this module
    children: React.ReactNode;
}

export default function PermissionWrapper({ permissions = [], userRole, requiredPermission, children }: PermissionWrapperProps) {
    // 1. Super Admin / Legacy Admin Rule:
    // If role is 'admin' AND permissions is empty/undefined, we assume it's a legacy admin with full access (or super admin).
    // HOWEVER, if permissions array IS set (length > 0), we strictly respect it even for admins, 
    // UNLESS we decide 'admin' always has access. 
    // The user's prompt implies strict granular permissions: "if user does not have any permition cannot see that module".

    // Let's implement a robust check:
    // Access if:
    // a) Permission is explicitly in the list
    // b) Role is 'admin' AND permissions list is empty (Legacy fallback)

    // NOTE: 'users' permission usually implies Super Admin who might see everything? 
    // No, keep it granular.

    const hasExplicitPermission = permissions.includes(requiredPermission);
    const isLegacyFullAdmin = userRole === 'admin' && (!permissions || permissions.length === 0);

    // Special case: 'permits' might be available to everyone or just those with permission?
    // User said "james is a user with ["permits","backups"]". 
    // If role is 'user' and permissions=[] (default), can they see permits? 
    // Usually standard users see permits. 
    // Let's assume 'permits' is the base feature. If 'requiredPermission' is 'permits', maybe we allow all?
    // but the user specifically added "permits" to the list. So likely they want to restrict that too.

    const hasAccess = hasExplicitPermission || isLegacyFullAdmin;

    if (!hasAccess) return null;

    return <>{children}</>;
}

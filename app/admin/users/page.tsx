'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
    role: 'admin' | 'user';
    status: 'active' | 'inactive';
    permissions: string | null; // JSON string
    createdAt: string;
}

const MODULES = [
    { id: 'permits', label: 'Manage Permits' },
    { id: 'backups', label: 'System Backups' },
    { id: 'users', label: 'User Management' },
];

export default function UserManagement() {
    const router = useRouter();

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    // Loading State for Updates
    const [updatingUser, setUpdatingUser] = useState<{ id: number, field: string } | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        role: 'user',
        status: 'active',
        permissions: ['permits'] // Default permission
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Password Reset State
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [resetData, setResetData] = useState({
        id: 0,
        username: '',
        password: '',
        confirmPassword: ''
    });
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage]);

    const fetchUsers = async (page: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?page=${page}&limit=10`);
            if (res.status === 403) {
                toast.error('Unauthorized');
                router.push('/');
                return;
            }
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
                setTotalPages(data.pagination.totalPages);
                setTotalUsers(data.pagination.totalUsers);
            }
        } catch (e) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...newUser,
                permissions: JSON.stringify(newUser.permissions)
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                toast.success('User created');
                setNewUser({ username: '', password: '', role: 'user', status: 'active', permissions: ['permits'] });
                setIsModalOpen(false);
                fetchUsers(currentPage);
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error('Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('User deleted');
                fetchUsers(currentPage);
            } else {
                toast.error(data.error);
            }
        } catch (e) {
            toast.error('Failed to delete');
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (resetData.password.length < 1) {
            toast.error('Admin password is required');
            return;
        }

        setIsResetting(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: resetData.id,
                    password: '__RESET__',
                    adminPassword: resetData.password
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Password reset successfully');
                setIsResetModalOpen(false);
                setResetData({ id: 0, username: '', password: '', confirmPassword: '' });
            } else {
                toast.error(data.error || 'Failed to reset password');
            }
        } catch (e) {
            toast.error('Failed to reset password');
        } finally {
            setIsResetting(false);
        }
    };

    const handleUpdate = async (id: number, field: string, value: string) => {
        try {
            // Set loading state
            setUpdatingUser({ id, field });

            // Optimistic UI for simple fields
            if (field !== 'permissions') {
                setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
            }

            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, [field]: value })
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || 'Failed to update');
                fetchUsers(currentPage);
            } else {
                toast.success('Updated');
                // For permissions we might need to reload to show correct state if optimistic failed logic
                if (field === 'permissions') fetchUsers(currentPage);
            }
        } catch (e) {
            toast.error('Failed to update');
            fetchUsers(currentPage);
        } finally {
            setUpdatingUser(null);
        }
    };

    const togglePermission = (moduleId: string) => {
        setNewUser(prev => {
            const perms = prev.permissions.includes(moduleId)
                ? prev.permissions.filter(p => p !== moduleId)
                : [...prev.permissions, moduleId];
            return { ...prev, permissions: perms };
        });
    };

    // Helpers
    const getPermissionsArray = (json: string | null) => {
        try {
            return json ? JSON.parse(json) : [];
        } catch (e) { return []; }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
                        <p className="text-gray-500 mt-1">Manage system access, roles, and granular permissions</p>
                    </div>
                    <div className="flex gap-3">
                        <a href="/" className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm no-underline">
                            &larr; Dashboard
                        </a>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            + Add New User
                        </button>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Loading users...</div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-5 font-semibold border-b">User</th>
                                            <th className="p-5 font-semibold border-b">Role</th>
                                            <th className="p-5 font-semibold border-b">Permissions</th>
                                            <th className="p-5 font-semibold border-b">Status</th>
                                            <th className="p-5 font-semibold border-b text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map(user => {
                                            const userPerms = getPermissionsArray(user.permissions);
                                            return (
                                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-slate-300">
                                                                {user.username.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{user.username}</div>
                                                                <div className="text-xs text-gray-400">ID: #{user.id}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 relative">
                                                        <select
                                                            className={`text-sm rounded border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1 pl-2 pr-8 ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 font-medium' : 'bg-gray-50 text-gray-600'}`}
                                                            value={user.role}
                                                            onChange={(e) => handleUpdate(user.id, 'role', e.target.value)}
                                                            disabled={user.username === 'admin' || (updatingUser?.id === user.id && updatingUser?.field === 'role')}
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                        {updatingUser?.id === user.id && updatingUser?.field === 'role' && (
                                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                                                                <i className="fas fa-spinner fa-spin text-blue-600"></i>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 relative">
                                                        <div className="flex gap-1 flex-wrap max-w-xs">
                                                            {MODULES.map(mod => {
                                                                const userPerms = getPermissionsArray(user.permissions);
                                                                const hasPerm = userPerms.includes(mod.id);
                                                                // Disable 'users' permission toggle if user role is not 'admin'
                                                                const isDisabled = mod.id === 'users' && user.role !== 'admin';
                                                                const isUpdating = updatingUser?.id === user.id && updatingUser?.field === 'permissions';

                                                                return (
                                                                    <span
                                                                        key={mod.id}
                                                                        onClick={() => {
                                                                            if (isDisabled || isUpdating) return; // Don't allow toggle if disabled or updating
                                                                            const newPerms = hasPerm
                                                                                ? userPerms.filter((p: string) => p !== mod.id)
                                                                                : [...userPerms, mod.id];
                                                                            handleUpdate(user.id, 'permissions', JSON.stringify(newPerms));
                                                                        }}
                                                                        className={`
                                                                    text-[10px] px-2 py-1 rounded-full select-none border transition-colors
                                                                    ${(isDisabled || isUpdating) ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                                                                    ${hasPerm
                                                                                ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                                                                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}
                                                                `}
                                                                    >
                                                                        {mod.label}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                        {updatingUser?.id === user.id && updatingUser?.field === 'permissions' && (
                                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                                                                <i className="fas fa-spinner fa-spin text-blue-600"></i>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 relative">
                                                        <select
                                                            className={`text-sm rounded border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1 pl-2 pr-8 ${user.status === 'active' ? 'bg-green-50 text-green-700 font-medium' : 'bg-red-50 text-red-700 font-medium'}`}
                                                            value={user.status}
                                                            onChange={(e) => handleUpdate(user.id, 'status', e.target.value)}
                                                            disabled={user.username === 'admin' || (updatingUser?.id === user.id && updatingUser?.field === 'status')}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>
                                                        {updatingUser?.id === user.id && updatingUser?.field === 'status' && (
                                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded">
                                                                <i className="fas fa-spinner fa-spin text-blue-600"></i>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setResetData({ ...resetData, id: user.id, username: user.username });
                                                                    setIsResetModalOpen(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                                title="Reset Password"
                                                            >
                                                                <i className="fas fa-key"></i>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id, user.username)}
                                                                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                                disabled={user.username === 'admin'}
                                                                title="Delete User"
                                                            >
                                                                <i className="fas fa-trash-alt"></i>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-400">No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                                <span className="text-sm text-gray-500">
                                    Showing {users.length} of {totalUsers} users (Page {currentPage} of {totalPages})
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100 text-gray-700 font-medium"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm bg-white border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100 text-gray-700 font-medium"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Add New User</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">User will be forced to change this on first login.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                        value={newUser.status}
                                        onChange={e => setNewUser({ ...newUser, status: e.target.value })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {/* Permissions Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Access Type (Permissions)</label>
                                <div className="grid grid-cols-1 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    {MODULES.map(mod => {
                                        // Disable 'users' permission if role is not 'admin'
                                        const isDisabled = mod.id === 'users' && newUser.role !== 'admin';
                                        return (
                                            <label key={mod.id} className={`flex items-center space-x-2 cursor-pointer p-1 hover:bg-gray-100 rounded ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={newUser.permissions.includes(mod.id)}
                                                    onChange={() => togglePermission(mod.id)}
                                                    disabled={isDisabled}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{mod.label}</span>
                                                {isDisabled && <span className="text-xs text-gray-400">(Admin only)</span>}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium disabled:opacity-70"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Password Reset Modal */}
            {isResetModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800">Reset Password: {resetData.username}</h3>
                            <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your [Admin] Password</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Enter your password to confirm"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                                    value={resetData.password}
                                    onChange={e => setResetData({ ...resetData, password: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-1">Verification required to reset user.</p>
                            </div>
                            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100 italic">
                                Once reset, the user can login with **any password** one time and will be forced to change it immediately.
                            </p>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsResetModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isResetting}
                                    className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium disabled:opacity-70"
                                >
                                    {isResetting ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

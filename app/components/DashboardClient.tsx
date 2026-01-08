'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SmartDatePicker from './SmartDatePicker';
import toast from 'react-hot-toast';
import PermissionWrapper from './PermissionWrapper';

interface DashboardClientProps {
    permits: any[];
    userRole: string;
    permissions?: string[]; // Array of allowed modules
}

export default function DashboardClient({ permits, userRole, permissions = [] }: DashboardClientProps) {
    console.log('DashboardClient Props:', { userRole, permissions }); // DEBUG LOG
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [showBackups, setShowBackups] = useState(false);

    // Logic to determine if "Admin Modules" section should be visible
    const isLegacyAdmin = userRole === 'admin' && (!permissions || permissions.length === 0);
    const hasAdminModules = isLegacyAdmin || permissions.includes('backups') || permissions.includes('users');
    const showAdminControls = hasAdminModules;

    // Show banner ONLY if user has NO permissions at all
    const hasAnyPermission = permissions.length > 0 || isLegacyAdmin;

    const [showPermits, setShowPermits] = useState(true);

    const [qrModal, setQrModal] = useState<{ isOpen: boolean; imgUrl: string; id: string | null }>({
        isOpen: false,
        imgUrl: '',
        id: null,
    });

    // Pagination for permits
    const itemsPerPage = 5;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(permits.length / itemsPerPage);

    const paginatedPermits = permits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const showQrCode = async (permitId: string, permitUrl: string) => {
        try {
            const res = await fetch(`/api/qrcode?url=${encodeURIComponent(permitUrl)}`);
            const data = await res.json();
            if (data.qr_code_image) {
                setQrModal({ isOpen: true, imgUrl: data.qr_code_image, id: permitId });
            }
        } catch (e) {
            toast.error('Failed to load QR code');
        }
    };

    const closeModal = () => {
        setQrModal({ isOpen: false, imgUrl: '', id: null });
    };

    const deletePermit = async (permitId: string) => {
        if (!confirm('Are you sure you want to delete this permit?')) {
            return;
        }
        try {
            const res = await fetch(`/api/permits/${permitId}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Permit deleted successfully');
                router.refresh();
            } else {
                toast.error('Failed to delete permit: ' + data.error);
            }
        } catch (e) {
            toast.error('Failed to delete permit');
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];

        if (!confirm('Are you sure you want to restore from this backup? Current data will be replaced.')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const res = await fetch('/api/backup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(json)
                });
                const data = await res.json();
                if (data.success) {
                    toast.success('Database restored successfully: ' + (data.message || ''));
                    router.refresh();
                } else {
                    toast.error('Restore failed: ' + data.error);
                }
            } catch (err) {
                toast.error('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-7xl mx-auto p-5 font-sans">
            <div className="flex justify-between items-center bg-slate-700 text-white p-4 rounded-t-lg mb-0 text-sm">
                <h1 className="text-xl font-normal">Permit Dashboard</h1>
                <div className="flex gap-2">
                    <a href="/profile" className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white no-underline transition-colors">My Profile</a>
                    <a href="/api/auth/logout" className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white no-underline transition-colors">Logout</a>
                </div>
            </div>

            {/* Form Section - Require 'permits' permission to create/edit? Or just see? 
                Let's wrap the CREATE form in 'permits' permission. 
                Assuming 'permits' permission controls access to the whole permits module. 
            */}
            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="permits">
                <div className="bg-white p-6 rounded-b-lg shadow-sm mb-6 border border-gray-200">
                    <div className="mb-6 border-b-2 border-blue-400 pb-2">
                        <h2 className="text-2xl font-bold text-gray-700">COUNTY GOVERNMENT OF MURANG&apos;A</h2>
                        <h3 className="text-xl text-center text-gray-500 mt-2">Liquor Permit Verification</h3>
                    </div>

                    <form action="/api/permits" method="POST">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            {[
                                { label: 'Business Name/ Owner', name: 'businessName' },
                                { label: 'Business ID No', name: 'businessId' },
                                { label: 'Address P.O. Box', name: 'addressPoBox' },
                                { label: 'Phone No.', name: 'phone' },
                                { label: 'Subcounty', name: 'subcounty' },
                                { label: 'Ward', name: 'ward' },
                                { label: 'Market', name: 'market' },
                                { label: 'Plot No', name: 'plotNo' },
                                { label: 'Activity/Business/Profession or Occupation of', name: 'activity' },
                                { label: 'Permit Amount Paid', name: 'amount' },
                                { label: 'Kshs in words', name: 'amountInWords' },
                            ].map((field) => (
                                <div key={field.name} className="flex flex-col">
                                    <label className="mb-1 text-gray-600 font-bold text-sm">{field.label}:</label>
                                    <input type="text" name={field.name} className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm text-black" required />
                                </div>
                            ))}

                            <div className="flex flex-col">
                                <label className="mb-1 text-gray-600 font-bold text-sm">Status:</label>
                                <input type="text" name="status" className="p-2 border border-gray-300 rounded focus:outline-none focus:border-blue-400 text-sm text-black" required />
                            </div>
                            <div className="flex flex-col">
                                {/* Smart Date Picker handles label internally but our layout expects wrapper */}
                                <SmartDatePicker label="Date of issue" name="issueDate" />
                            </div>
                            <div className="flex flex-col">
                                <SmartDatePicker label="Expiry Date" name="expiryDate" />
                            </div>
                        </div>

                        <button type="submit" className="bg-blue-500 text-white font-bold py-3 px-6 rounded hover:bg-blue-600 transition-colors text-sm">
                            ✓ Create New Permit
                        </button>
                    </form>
                </div>
            </PermissionWrapper>

            {/* Admin Controls (Backups & Users) */}
            {/* Only show if user has at least one admin permission */}
            {showAdminControls && (
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
                    <h2
                        onClick={() => setShowBackups(!showBackups)}
                        className="text-lg font-bold text-gray-700 cursor-pointer select-none flex items-center gap-2 mb-2 border-b pb-2"
                    >
                        <span>{showBackups ? '▼' : '▶'}</span> Admin Modules
                    </h2>

                    {showBackups && (
                        <div className="mt-4 flex gap-4 flex-wrap">
                            {/* Backups Module */}
                            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="backups">
                                <div className="flex gap-4">
                                    <a href="/api/backup" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold no-underline inline-block">
                                        Download Data Backup (JSON)
                                    </a>

                                    <label className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm font-bold cursor-pointer inline-block">
                                        Restore from Backup
                                        <input type="file" onChange={handleRestore} className="hidden" accept=".json" />
                                    </label>
                                </div>
                            </PermissionWrapper>

                            {/* Users Module */}
                            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="users">
                                <a href="/admin/users" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-bold no-underline inline-block">
                                    Manage Users
                                </a>
                            </PermissionWrapper>

                            <p className="w-full mt-2 text-xs text-gray-500">Note: Data processing is handled securely.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Show banner ONLY if user has NO permissions at all */}
            {!hasAnyPermission && (
                <div className="bg-gray-50 p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
                    <div className="text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Permissions Assigned</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            You do not have any permissions assigned to your account.
                        </p>
                        <p className="text-gray-500 text-xs">
                            Please contact your system administrator to request access to modules (permits, backups, user management).
                        </p>
                    </div>
                </div>
            )}

            {/* Permit List Section */}
            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="permits">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2
                        onClick={() => setShowPermits(!showPermits)}
                        className="text-lg font-bold text-gray-700 cursor-pointer select-none flex items-center gap-2 mb-4 border-b pb-2"
                    >
                        <span>{showPermits ? '▼' : '▶'}</span> Existing Permits
                    </h2>

                    {showPermits && (
                        <div className="space-y-4">
                            {permits.length === 0 ? <p className="text-center text-gray-500 py-4">No permits created yet.</p> : (
                                <>
                                    {paginatedPermits.map((permit: any) => {
                                        const permitUrl = typeof window !== 'undefined' ? `${window.location.origin}/permit/${permit.id}` : `/permit/${permit.id}`;
                                        return (
                                            <div key={permit.id} className="border border-gray-200 p-4 rounded-lg bg-white mb-4">
                                                <h3 className="text-gray-700 font-bold mb-1">{permit.businessName}</h3>
                                                <p className="text-gray-500 text-sm mb-2">ID: {permit.id}</p>
                                                <div className="flex gap-2 flex-wrap">
                                                    <a href={`/permit/${permit.id}`} target="_blank" className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm font-bold no-underline">View</a>
                                                    <button onClick={() => showQrCode(permit.id, permitUrl)} className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-bold">Show QR</button>
                                                    <a href={`/api/download-qrcode/${permit.id}`} className="bg-orange-400 text-white px-3 py-1.5 rounded hover:bg-orange-500 text-sm font-bold no-underline">Download</a>
                                                    <button onClick={() => deletePermit(permit.id)} className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 text-sm font-bold">Delete</button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                            <button
                                                disabled={currentPage === 1}
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-3 py-1 text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                                            <button
                                                disabled={currentPage === totalPages}
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                className={`px-3 py-1 rounded text-sm ${currentPage === totalPages ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </PermissionWrapper>

            {/* Modal */}
            {qrModal.isOpen && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity" onClick={closeModal}>
                    <div className="bg-white p-8 rounded-lg text-center max-w-xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <span className="float-right text-gray-400 hover:text-black cursor-pointer text-3xl font-bold leading-none" onClick={closeModal}>&times;</span>
                        <h3 className="text-2xl font-bold mb-6 text-gray-800">Permit QR Code</h3>
                        <div className="flex justify-center mb-4">
                            <img src={qrModal.imgUrl} alt="QR Code" className="max-w-full h-auto w-64 height-64" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

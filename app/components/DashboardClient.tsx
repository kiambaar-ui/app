'use client';

import { useState, useEffect } from 'react';
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
    const hasAdminModules = isLegacyAdmin || permissions.includes('backups') || permissions.includes('users') || permissions.includes('permits');
    const showAdminControls = hasAdminModules;

    const [backgrounds, setBackgrounds] = useState<any[]>([]);
    const [isUploadingBg, setIsUploadingBg] = useState(false);

    useEffect(() => {
        if (hasAdminModules) {
            fetchBackgrounds();
        }
    }, [hasAdminModules]);

    const fetchBackgrounds = async () => {
        try {
            const res = await fetch('/api/backgrounds');
            const data = await res.json();
            if (Array.isArray(data)) setBackgrounds(data);
        } catch (e) {
            console.error('Failed to fetch backgrounds');
        }
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const name = prompt('Enter a name for this background template:', file.name.replace(/\.[^/.]+$/, ""));
        if (!name) return;

        setIsUploadingBg(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const res = await fetch('/api/backgrounds', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, data: event.target?.result })
                });
                const result = await res.json();
                if (result.success) {
                    toast.success('Background uploaded');
                    fetchBackgrounds();
                } else {
                    toast.error('Upload failed: ' + result.error);
                }
            } catch (err) {
                toast.error('Upload failed');
            } finally {
                setIsUploadingBg(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const deleteBackground = async (id: number) => {
        if (!confirm('Delete this background template?')) return;
        try {
            const res = await fetch(`/api/backgrounds?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                toast.success('Background deleted');
                fetchBackgrounds();
            }
        } catch (e) {
            toast.error('Delete failed');
        }
    };

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

    const handleDownload = (serialNumber: number) => {
        router.push(`/permit/${serialNumber}`);
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
            <div className="flex justify-between items-center bg-slate-700 text-white p-4 rounded-lg mb-6 shadow-sm text-sm">
                <div className="flex gap-2">
                    <a href="/profile" className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded text-white no-underline transition-colors flex items-center justify-center">My Profile</a>
                    <a href="/permit/new" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-bold no-underline transition-colors shadow-sm flex items-center justify-center gap-1">➕ Add New Permit</a>
                    <a href="/api/auth/logout" className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded text-white no-underline transition-colors flex items-center justify-center">Logout</a>
                </div>
            </div>

            {/* Admin Controls (Backups & Users) */}
            {hasAdminModules && (
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-gray-200">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h2 className="text-lg font-bold text-gray-700">Administrative Tools</h2>
                    </div>

                    <div className="flex gap-4 flex-wrap">

                        <div className="flex gap-4 mt-2 w-full">
                            {/* Backups Module */}
                            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="backups">
                                <a href="/api/backup" className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm font-bold no-underline inline-block border border-gray-300">
                                    📦 Download Backup
                                </a>

                                <label className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 text-sm font-bold cursor-pointer inline-block border border-gray-300">
                                    📂 Restore
                                    <input type="file" onChange={handleRestore} className="hidden" accept=".json" />
                                </label>
                            </PermissionWrapper>

                             {/* Users Module */}
                            <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="users">
                                <a href="/admin/users" className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm font-bold no-underline inline-block shadow-sm">
                                    👤 Manage Users
                                </a>
                            </PermissionWrapper>
                        </div>

                        {/* Background Management */}
                        <PermissionWrapper permissions={permissions} userRole={userRole} requiredPermission="permits">
                            <div className="mt-4 w-full border-t pt-4">
                                <h3 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Permit Background Graphics</h3>
                                <div className="flex gap-3 flex-wrap items-center">
                                    <label className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm font-bold cursor-pointer inline-block shadow-sm">
                                        {isUploadingBg ? '⌛ Uploading...' : '🖼️ Upload New Background'}
                                        <input type="file" onChange={handleBgUpload} className="hidden" accept="image/*" disabled={isUploadingBg} />
                                    </label>
                                    
                                    <div className="flex gap-2 flex-wrap">
                                        {backgrounds.map(bg => (
                                            <div key={bg.id} className="group relative flex items-center bg-gray-50 border rounded pl-3 pr-2 py-1.5 gap-2">
                                                <span className="text-xs font-medium text-gray-700">{bg.name}</span>
                                                <button 
                                                    onClick={() => deleteBackground(bg.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete template"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                        {backgrounds.length === 0 && <span className="text-xs text-gray-400 italic">No backgrounds uploaded yet.</span>}
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2">These images will be available as templates when creating new permits.</p>
                            </div>
                        </PermissionWrapper>
                    </div>
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
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                            <span>📋</span> Existing Records
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {permits.length === 0 ? <p className="text-center text-gray-500 py-4">No created yet.</p> : (
                            <>
                                {paginatedPermits.map((permit: any) => {
                                    const permitUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify-liquor-permit/${permit.serialNumber}` : `/verify-liquor-permit/${permit.serialNumber}`;
                                    return (
                                        <div key={permit.id} className="border border-gray-200 p-4 rounded-lg bg-white mb-4">
                                            <h3 className="text-gray-700 font-bold mb-1">{permit.businessName}</h3>
                                            <p className="text-gray-500 text-sm mb-2">Serial No: {permit.serialNumber}</p>
                                            <div className="flex gap-2 flex-wrap">
                                                 <a href={`/verify-liquor-permit/${permit.serialNumber}`} target="_blank" className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm font-bold no-underline">Verify</a>
                                                 <a href={`/permit/${permit.serialNumber}`} className="bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 text-sm font-bold no-underline">Edit</a>
                                                 <button onClick={() => showQrCode(permit.id, permitUrl)} className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-bold">Show QR</button>
                                                 <button onClick={() => handleDownload(permit.serialNumber)} className="bg-orange-400 text-white px-3 py-1.5 rounded hover:bg-orange-500 text-sm font-bold">Download</button>
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

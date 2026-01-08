'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Simple hack to get query param in client component without Suspense logic for now
    if (typeof window !== 'undefined' && !error) {
        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err) setError(err);
    }

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (data.success) {
                router.push('/');
            } else {
                setError(data.error || 'Login failed');
                setLoading(false);
            }
        } catch (e) {
            setError('System error. Please try again later.');
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen font-sans" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {error && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 shadow-lg">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error.replace(/_/g, ' ')}</span>
                </div>
            )}
            <div className="w-full max-w-sm bg-white p-10 rounded-lg shadow-2xl">
                <h1 className="text-2xl font-semibold text-center text-gray-800 mb-2">Murang&apos;a County E-Service Portal</h1>
                <h2 className="text-lg text-center text-gray-500 mb-8">Sign In</h2>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="form-group">
                        <label className="block mb-1 text-gray-600 font-bold text-sm">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-black"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="block mb-1 text-gray-600 font-bold text-sm">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-black"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-500 text-white p-3 rounded font-bold hover:bg-indigo-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <i className="fas fa-spinner fa-spin"></i>}
                        {loading ? 'Signing In...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}

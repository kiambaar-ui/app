'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface TemplateMappingPageProps {
    params: Promise<{ id: string }>;
}

export default function TemplateMappingPage({ params }: TemplateMappingPageProps) {
    const { id: templateId } = use(params);
    const router = useRouter();
    const [template, setTemplate] = useState<any>(null);
    const [mappings, setMappings] = useState<Record<string, { source: string, customLabel?: string }>>({});
    const [rawJson, setRawJson] = useState<string>('');
    const [showRaw, setShowRaw] = useState(false);
    const [loading, setLoading] = useState(true);

    const standardFields = [
        // ... (standardFields remain the same)
        { label: 'Business Name', value: 'businessName' },
        { label: 'Business ID', value: 'businessId' },
        { label: 'Address P.O. Box', value: 'addressPoBox' },
        { label: 'Phone', value: 'phone' },
        { label: 'Owner Name', value: 'ownerName' },
        { label: 'Owner Email', value: 'ownerEmail' },
        { label: 'Owner Phone', value: 'ownerPhone' },
        { label: 'Subcounty', value: 'subcounty' },
        { label: 'Ward', value: 'ward' },
        { label: 'Market', value: 'market' },
        { label: 'Plot No', value: 'plotNo' },
        { label: 'Activity/Business', value: 'activity' },
        { label: 'Amount', value: 'amount' },
        { label: 'Amount In Words', value: 'amountInWords' },
        { label: 'Paid For Year', value: 'paidForYear' },
        { label: 'Renewal Status', value: 'renewalStatus' },
        { label: 'Status', value: 'status' },
        { label: 'Issue Date', value: 'issueDate' },
        { label: 'Expiry Date', value: 'expiryDate' },
    ];

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await fetch('/api/templates');
                const data = await res.json();
                if (data.success) {
                    const t = data.data.find((item: any) => item.id.toString() === templateId);
                    if (t) {
                        setTemplate(t);
                        setRawJson(t.fieldMappings || '');
                        if (t.mappingConfig) {
                            setMappings(JSON.parse(t.mappingConfig));
                        } else {
                            // Initialize default mappings based on field names
                            const initialMappings: any = {};
                            const rawMappings = JSON.parse(t.fieldMappings || '{}');
                            
                            const processField = (fieldName: string) => {
                                const matched = standardFields.find(sf => 
                                    sf.value.toLowerCase() === fieldName.toLowerCase() || 
                                    sf.label.toLowerCase() === fieldName.toLowerCase()
                                );
                                initialMappings[fieldName] = { 
                                    source: matched ? matched.value : 'custom',
                                    customLabel: matched ? undefined : fieldName
                                };
                            };

                            if (rawMappings.predefined) {
                                rawMappings.predefined.forEach((p: any) => processField(Object.keys(p)[0]));
                            }
                            if (rawMappings.custome) {
                                Object.keys(rawMappings.custome).forEach(processField);
                            }
                            setMappings(initialMappings);
                        }
                    }
                }
            } catch (e) {
                toast.error('Failed to load template');
            } finally {
                setLoading(false);
            }
        };
        fetchTemplate();
    }, [templateId]);

    const handleMappingChange = (pdfField: string, source: string) => {
        setMappings(prev => ({
            ...prev,
            [pdfField]: { ...prev[pdfField], source }
        }));
    };

    const handleLabelChange = (pdfField: string, label: string) => {
        setMappings(prev => ({
            ...prev,
            [pdfField]: { ...prev[pdfField], customLabel: label }
        }));
    };

    const prettifyJson = () => {
        try {
            const parsed = JSON.parse(rawJson);
            setRawJson(JSON.stringify(parsed, null, 4));
            toast.success('JSON formatted');
        } catch (e) {
            toast.error('Invalid JSON - cannot format');
        }
    };

    const saveMappings = async () => {
        try {
            // Validate JSON before saving if edited
            if (showRaw) {
                try {
                    JSON.parse(rawJson);
                } catch (e) {
                    toast.error('Invalid JSON in Raw Editor');
                    return;
                }
            }

            const res = await fetch(`/api/templates/${templateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    mappingConfig: mappings,
                    fieldMappings: rawJson
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Configuration saved successfully');
                router.push('/');
            } else {
                toast.error('Failed to save mappings');
            }
        } catch (e) {
            toast.error('Error saving mappings');
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading template configuration...</div>;
    if (!template) return <div className="p-10 text-center text-red-500">Template not found.</div>;

    let visualMappingsParsed: any = {};
    try {
        visualMappingsParsed = JSON.parse(rawJson || '{}');
    } catch (e) {
        visualMappingsParsed = {};
    }

    const pdfFields = [
        ...(visualMappingsParsed.predefined?.map((p: any) => Object.keys(p)[0]) || []),
        ...Object.keys(visualMappingsParsed.custome || {})
    ].filter(f => f !== 'qrCode' && f !== 'qr'); // Skip QR codes

    return (
        <div className="max-w-4xl mx-auto p-6 font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Configure: {template.name}</h1>
                    <p className="text-sm text-gray-500">Edit form mapping and visual configuration raw JSON.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowRaw(!showRaw)}
                        className={`px-3 py-1.5 rounded text-sm font-bold border transition-colors ${showRaw ? 'bg-orange-100 border-orange-300 text-orange-700' : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'}`}
                    >
                        {showRaw ? '‹ Visual Editor' : '⚡ Edit Raw JSON'}
                    </button>
                    <button 
                        onClick={() => router.push('/')}
                        className="text-gray-500 hover:text-gray-800 text-sm font-bold px-3 py-1.5"
                    >
                        Back
                    </button>
                </div>
            </div>

            {showRaw ? (
                <div className="bg-slate-900 p-4 rounded-lg shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex flex-col">
                            <label className="text-blue-300 text-xs font-bold uppercase tracking-widest">Field Mappings (Raw JSON)</label>
                            <span className="text-slate-500 text-[10px]">Edit styling, fonts, and positions here.</span>
                        </div>
                        <button 
                            onClick={prettifyJson}
                            className="bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] font-bold py-1 px-3 rounded border border-slate-700 transition-colors"
                        >
                            {`{ }`} Prettify
                        </button>
                    </div>
                    <textarea
                        className="w-full h-[500px] bg-transparent text-green-400 font-mono text-sm p-4 border border-slate-700 rounded focus:border-blue-500 focus:outline-none resize-none"
                        value={rawJson}
                        onChange={(e) => setRawJson(e.target.value)}
                        spellCheck={false}
                    />
                    <p className="mt-2 text-xs text-slate-400 italic">
                        Caution: Changing field names here will require you to update the mapping table as well.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="p-4 text-sm font-bold text-gray-700 w-1/3">PDF Field Name</th>
                                <th className="p-4 text-sm font-bold text-gray-700">Source Mapping</th>
                                <th className="p-4 text-sm font-bold text-gray-700">Form Label (if Custom)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pdfFields.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400 italic text-sm">
                                        No fields found in JSON mappings. Use the Raw JSON editor to check structure.
                                    </td>
                                </tr>
                            ) : pdfFields.map(field => (
                                <tr key={field} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-4 text-[13px] text-gray-800 font-mono">{field}</td>
                                    <td className="p-4">
                                        <select 
                                            className="w-full p-2 border border-gray-300 rounded text-sm text-black bg-white"
                                            value={mappings[field]?.source || 'custom'}
                                            onChange={(e) => handleMappingChange(field, e.target.value)}
                                        >
                                            <option value="custom">-- Create Custom Input --</option>
                                            <option value="none">-- Don't Fill (Static) --</option>
                                            <optgroup label="Standard Fields">
                                                {standardFields.map(sf => (
                                                    <option key={sf.value} value={sf.value}>{sf.label}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        {mappings[field]?.source === 'custom' && (
                                            <input 
                                                type="text"
                                                className="w-full p-2 border border-gray-300 rounded text-sm text-black focus:border-blue-400 outline-none"
                                                placeholder="Enter label for form"
                                                value={mappings[field]?.customLabel || ''}
                                                onChange={(e) => handleLabelChange(field, e.target.value)}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-8 flex justify-end gap-4 border-t pt-6">
                <button 
                    onClick={() => router.push('/')}
                    className="px-6 py-2 rounded text-gray-500 font-bold hover:bg-gray-100 transition-colors text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={saveMappings}
                    className="px-8 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm transition-all text-sm"
                >
                    Save All Changes
                </button>
            </div>
        </div>
    );
}

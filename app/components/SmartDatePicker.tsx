'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface SmartDatePickerProps {
    label: string;
    name: string;
}

const SUPPORTED_FORMATS = [
    'yyyy-MM-dd',    // 2027-12-13
    'dd/MM/yyyy',    // 13/12/2027
    'MM/dd/yyyy',    // 12/13/2027
    'd MMMM yyyy',   // 13 December 2027
    'MMMM d, yyyy',  // December 13, 2027
    'EEE, d MMM yyyy', // Mon, 13 Dec 2027
];

const TIME_FORMATS = [
    '', // No time
    'HH:mm:ss', // 14:00:00
    'hh:mm a',  // 02:00 PM
];

const EXAMPLE_DATE = new Date(2027, 11, 13, 14, 0, 0); // Dec 13, 2027, 2:00 PM

export default function SmartDatePicker({ label, name }: SmartDatePickerProps) {
    // We strictly use UTC/Local separation to prevent hydration mismatch if possible, 
    // but for simple input logic, state is fine. 
    // We need to output Two values: 
    // 1. Text formatted string (for display/QR) -> name={name}
    // 2. ISO timestamp (for logic) -> name={name + 'Iso'}

    // Default to today
    const [dateVal, setDateVal] = useState<string>('');
    const [timeVal, setTimeVal] = useState<string>('00:00');
    const [dateFormat, setDateFormat] = useState<string>('dd/MM/yyyy');
    const [timeFormat, setTimeFormat] = useState<string>(''); // Default none

    const [preview, setPreview] = useState<string>('');
    const [isoValue, setIsoValue] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    useEffect(() => {
        if (!dateVal) {
            setPreview('');
            setIsoValue('');
            return;
        }

        try {
            const d = new Date(`${dateVal}T${timeVal || '00:00'}`);
            // Check Validity
            if (isNaN(d.getTime())) return;

            setIsoValue(d.toISOString());

            // Construct Format
            let pattern = dateFormat;
            if (timeFormat) {
                pattern += ' ' + timeFormat;
            }

            setPreview(format(d, pattern));
        } catch (e) {
            // invalid
        }
    }, [dateVal, timeVal, dateFormat, timeFormat]);

    return (
        <div className="flex flex-col border border-gray-300 p-2 rounded bg-gray-50 transition-all duration-200">
            <div className="flex justify-between items-center mb-1">
                <label className="text-gray-700 font-bold text-[11px] uppercase tracking-wider">{label}:</label>
                <button 
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-tighter"
                >
                    {isExpanded ? 'Collapse ↑' : 'Format ⚙'}
                </button>
            </div>

            {/* Hidden Inputs for Form Submission */}
            <input type="hidden" name={name} value={preview} />
            <input type="hidden" name={`${name}Iso`} value={isoValue} />

            <div className="flex gap-1">
                <div className="flex-1">
                    <input
                        type="date"
                        className="w-full p-1.5 border border-gray-300 rounded text-xs text-black"
                        onChange={(e) => setDateVal(e.target.value)}
                        required
                    />
                </div>
                <div className="w-1/3">
                    <input
                        type="time"
                        className="w-full p-1.5 border border-gray-300 rounded text-xs text-black"
                        value={timeVal}
                        onChange={(e) => setTimeVal(e.target.value)}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex gap-1">
                        <select
                            className="flex-1 p-1.5 border border-gray-300 rounded text-xs text-black bg-white"
                            onChange={(e) => setDateFormat(e.target.value)}
                            value={dateFormat}
                        >
                            {SUPPORTED_FORMATS.map(f => (
                                <option key={f} value={f}>{format(EXAMPLE_DATE, f)}</option>
                            ))}
                        </select>
                        <select
                            className="w-1/3 p-1.5 border border-gray-300 rounded text-xs text-black bg-white"
                            onChange={(e) => setTimeFormat(e.target.value)}
                            value={timeFormat}
                        >
                            <option value="">No Time</option>
                            {TIME_FORMATS.filter(t => t).map(t => (
                                <option key={t} value={t}>{format(EXAMPLE_DATE, t)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white px-2 py-1 border border-dashed border-gray-400 rounded">
                        <span className="text-[10px] text-gray-500 block uppercase tracking-wide">Output Preview</span>
                        <p className="text-sm font-mono font-bold text-blue-600 truncate">
                            {preview || 'Select a date'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

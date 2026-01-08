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
        <div className="flex flex-col border border-gray-300 p-3 rounded bg-gray-50">
            <label className="mb-2 text-gray-700 font-bold text-sm block">{label}:</label>

            {/* Hidden Inputs for Form Submission */}
            <input type="hidden" name={name} value={preview} />
            <input type="hidden" name={`${name}Iso`} value={isoValue} />

            <div className="flex gap-2 mb-2">
                <div className="flex-1">
                    <input
                        type="date"
                        className="w-full p-2 border border-gray-300 rounded text-sm text-black"
                        onChange={(e) => setDateVal(e.target.value)}
                        required
                    />
                </div>
                <div className="w-1/3">
                    <input
                        type="time"
                        className="w-full p-2 border border-gray-300 rounded text-sm text-black"
                        value={timeVal}
                        onChange={(e) => setTimeVal(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex gap-2 mb-2">
                <select
                    className="flex-1 p-2 border border-gray-300 rounded text-sm text-black"
                    onChange={(e) => setDateFormat(e.target.value)}
                    value={dateFormat}
                >
                    {SUPPORTED_FORMATS.map(f => (
                        <option key={f} value={f}>{format(new Date(), f)}</option>
                    ))}
                </select>
                <select
                    className="w-1/3 p-2 border border-gray-300 rounded text-sm text-black"
                    onChange={(e) => setTimeFormat(e.target.value)}
                    value={timeFormat}
                >
                    <option value="">No Time</option>
                    {TIME_FORMATS.filter(t => t).map(t => (
                        <option key={t} value={t}>{format(new Date(), t)}</option>
                    ))}
                </select>
            </div>

            <div className="mt-1 bg-white p-2 border border-dashed border-gray-400 rounded">
                <span className="text-xs text-gray-500 block uppercase tracking-wide">Preview</span>
                <p className="text-lg font-mono font-bold text-blue-600 truncate">
                    {preview || 'Select a date'}
                </p>
            </div>
        </div>
    );
}

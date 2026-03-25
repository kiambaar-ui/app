'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface SmartDatePickerProps {
    label: string;
    name?: string;
    initialDate?: string; // Parses incoming date strings like "14 Mar 2026"
    value?: string;
    onChange?: (displayVal: string, isoVal: string) => void;
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

export default function SmartDatePicker({ label, name, initialDate, value, onChange }: SmartDatePickerProps) {
    // We strictly use UTC/Local separation to prevent hydration mismatch if possible, 
    // but for simple input logic, state is fine. 
    // We output Two values via onChange (or hidden inputs if name is provided)
    
    const [dateVal, setDateVal] = useState<string>('');
    const [timeVal, setTimeVal] = useState<string>('00:00');
    const [dateFormat, setDateFormat] = useState<string>('dd/MM/yyyy');
    const [timeFormat, setTimeFormat] = useState<string>(''); // Default none

    const [preview, setPreview] = useState<string>('');
    const [isoValue, setIsoValue] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    // Initialize from explicitly passed strings (like "14 Mar 2026")
    useEffect(() => {
        if (initialDate && !dateVal) {
            try {
                const cleanDateStr = initialDate.includes(' ') && initialDate.includes(':') ? initialDate : initialDate; // rudimentary check
                const d = new Date(cleanDateStr);
                if (!isNaN(d.getTime())) {
                    setDateVal(format(d, 'yyyy-MM-dd'));
                    // If the initial string contains a time component (e.g. AM/PM or HH:mm), we extract it, but for simplicity let's stick to 00:00 default
                }
            } catch (e) {
                // ignore
            }
        }
    }, [initialDate]);

    // Handle controlled or internal state change
    useEffect(() => {
        if (!dateVal) {
            setPreview('');
            setIsoValue('');
            if (onChange) onChange('', '');
            return;
        }

        try {
            const d = new Date(`${dateVal}T${timeVal || '00:00'}`);
            // Check Validity
            if (isNaN(d.getTime())) return;

            const newIso = d.toISOString();
            setIsoValue(newIso);

            // Construct Format
            let pattern = dateFormat;
            if (timeFormat) {
                pattern += ' ' + timeFormat;
            }

            const newPreview = format(d, pattern);
            setPreview(newPreview);
            
            // Broadcast the calculated strings back to parent perfectly formatted
            if (onChange) {
                onChange(newPreview, newIso);
            }
        } catch (e) {
            // invalid
        }
    }, [dateVal, timeVal, dateFormat, timeFormat]);

    return (
        <div className="flex flex-col border border-white/10 p-2 rounded bg-black/20 transition-all duration-200">
            <div className="flex justify-between items-center mb-1">
                <label className="text-white/80 font-bold text-[10px] uppercase tracking-wider">{label}:</label>
                <button 
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[9px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-tighter"
                >
                    {isExpanded ? 'Collapse ↑' : 'Format ⚙'}
                </button>
            </div>

            {/* Hidden Inputs for generic html form fallback */}
            {name && (
                <>
                    <input type="hidden" name={name} value={preview} />
                    <input type="hidden" name={`${name}Iso`} value={isoValue} />
                </>
            )}

            <div className="flex gap-1">
                <div className="flex-1">
                    <input
                        type="date"
                        className="w-full p-1 border border-white/20 rounded text-[11px] text-white bg-black/40 color-scheme-dark"
                        onChange={(e) => setDateVal(e.target.value)}
                        required
                    />
                </div>
                <div className="w-[80px]">
                    <input
                        type="time"
                        className="w-full p-1 border border-white/20 rounded text-[11px] text-white bg-black/40 color-scheme-dark"
                        value={timeVal}
                        onChange={(e) => setTimeVal(e.target.value)}
                    />
                </div>
            </div>

            {isExpanded && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex gap-1">
                        <select
                            className="flex-1 p-1 border border-white/20 rounded text-[10px] text-white bg-gray-800"
                            onChange={(e) => setDateFormat(e.target.value)}
                            value={dateFormat}
                        >
                            {SUPPORTED_FORMATS.map(f => (
                                <option key={f} value={f}>{format(EXAMPLE_DATE, f)}</option>
                            ))}
                        </select>
                        <select
                            className="w-[80px] p-1 border border-white/20 rounded text-[10px] text-white bg-gray-800"
                            onChange={(e) => setTimeFormat(e.target.value)}
                            value={timeFormat}
                        >
                            <option value="">No Time</option>
                            {TIME_FORMATS.filter(t => t).map(t => (
                                <option key={t} value={t}>{format(EXAMPLE_DATE, t)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-black/30 px-2 py-1 border border-dashed border-white/20 rounded">
                        <span className="text-[9px] text-white/40 block uppercase tracking-wide">Output Preview</span>
                        <p className="text-xs font-mono font-bold text-blue-300 truncate">
                            {preview || 'Select a date'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

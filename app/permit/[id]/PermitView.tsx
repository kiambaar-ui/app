'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface PermitViewProps {
    data: any;
    serialNumber: number;
    initialBackground?: string | null;
}

export default function PermitView({ data, serialNumber, initialBackground }: PermitViewProps) {
    const permitRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [bgDataUrl, setBgDataUrl] = useState<string>(initialBackground || '');
    const [isGenerating, setIsGenerating] = useState(false);

    // Initial metadata parse
    const initialMetadata = useMemo(() => {
        try {
            return data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : {};
        } catch (e) {
            return {};
        }
    }, [data.metadata]);

    // Live state for all fields
    const [form, setForm] = useState({
        licNo: data.serialNumber?.toString() || '',
        effDate: data.issueDate || '',
        expDate: data.expiryDate || '',
        bizName: data.businessName || '',
        phone: data.phone || '',
        pobox: data.addressPoBox || 'N/A',
        activity: data.activity || '',
        hours: initialMetadata.operatingHours || data.operatingHours || '5:00 PM - 11:00 PM',
        fee: data.amount || '',
        feeWords: data.amountInWords || '',
        receipt: initialMetadata.receiptNo || data.receiptNo || 'N/A',
        txDate: data.issueDate || '',
        mode: 'M-Pesa',
        subcounty: data.subcounty || '',
        ward: data.ward || '',
        plot: data.plotNo || 'N/A',
        road: initialMetadata.road || data.road || 'N/A',
        issueDate: data.issueDate || '',
        issuedBy: initialMetadata.issuedBy || data.issuedBy || 'Bernad Kariuki -Chair',
        qrLink: ''
    });

    // Set initial QR link once window is available
    useEffect(() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const verifyUrl = `${origin}/verify-liquor-permit/${serialNumber}`;
        setForm(prev => ({ ...prev, qrLink: verifyUrl }));
    }, [serialNumber]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        // Map the IDs from the HTML example to our state keys
        const idMap: Record<string, string> = {
            f_licno: 'licNo',
            f_effdate: 'effDate',
            f_expdate: 'expDate',
            f_bizname: 'bizName',
            f_phone: 'phone',
            f_pobox: 'pobox',
            f_activity: 'activity',
            f_hours: 'hours',
            f_fee: 'fee',
            f_feewords: 'feeWords',
            f_receipt: 'receipt',
            f_txdate: 'txDate',
            f_mode: 'mode',
            f_subcounty: 'subcounty',
            f_ward: 'ward',
            f_plot: 'plot',
            f_road: 'road',
            f_issuedate: 'issueDate',
            f_issuedby: 'issuedBy',
            f_qrlink: 'qrLink'
        };
        const key = idMap[id];
        if (key) {
            setForm(prev => ({ ...prev, [key]: value }));
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
    };

    // QR generation whenever the link changes
    useEffect(() => {
        if (!form.qrLink) return;

        QRCode.toDataURL(form.qrLink, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
            errorCorrectionLevel: 'H'
        }).then(url => {
            const size = 300;
            const radius = 20;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(radius, 0); ctx.lineTo(size - radius, 0); ctx.quadraticCurveTo(size, 0, size, radius);
            ctx.lineTo(size, size - radius); ctx.quadraticCurveTo(size, size, size - radius, size);
            ctx.lineTo(radius, size); ctx.quadraticCurveTo(0, size, 0, size - radius);
            ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.fill();
            ctx.clip();

            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
                setQrDataUrl(canvas.toDataURL('image/png'));
            };
            img.src = url;
        });
    }, [form.qrLink]);

    const handleDownload = async () => {
        if (!permitRef.current || isGenerating) return;
        setIsGenerating(true);

        try {
            const canvas = await html2canvas(permitRef.current, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
                    const clonedPermit = clonedDoc.getElementById('permitCanvas');
                    if (clonedPermit) {
                        const qrPos = 'center 235mm';
                        if (bgDataUrl && qrDataUrl) {
                            clonedPermit.style.backgroundImage = `url(${qrDataUrl}), url(${bgDataUrl})`;
                            clonedPermit.style.backgroundSize = '35mm 35mm, 100% 100%';
                        } else if (bgDataUrl) {
                            clonedPermit.style.backgroundImage = `url(${bgDataUrl})`;
                        } else if (qrDataUrl) {
                            clonedPermit.style.backgroundImage = `url(${qrDataUrl})`;
                        }
                    }
                }
            });

            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `liquor-permit-${form.licNo}.png`;
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setBgDataUrl(event.target?.result as string);
        reader.readAsDataURL(file);
    };

    const permitBackgroundStyle: React.CSSProperties = {};
    const qrPos = 'center 235mm';
    if (bgDataUrl && qrDataUrl) {
        permitBackgroundStyle.backgroundImage = `url(${qrDataUrl}), url(${bgDataUrl})`;
        permitBackgroundStyle.backgroundSize = '35mm 35mm, 100% 100%';
        permitBackgroundStyle.backgroundRepeat = 'no-repeat, no-repeat';
        permitBackgroundStyle.backgroundPosition = `${qrPos}, center`;
    } else if (bgDataUrl) {
        permitBackgroundStyle.backgroundImage = `url(${bgDataUrl})`;
        permitBackgroundStyle.backgroundSize = '100% 100%';
        permitBackgroundStyle.backgroundPosition = 'center';
        permitBackgroundStyle.backgroundRepeat = 'no-repeat';
    } else if (qrDataUrl) {
        permitBackgroundStyle.backgroundImage = `url(${qrDataUrl})`;
        permitBackgroundStyle.backgroundSize = '35mm 35mm';
        permitBackgroundStyle.backgroundPosition = qrPos;
        permitBackgroundStyle.backgroundRepeat = 'no-repeat';
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="sb-back-nav">
                    <a href="/" className="back-btn">
                        Back to Dashboard
                    </a>
                </div>
                <div className="sb-header">
                    <h2>Murang'a County Liquor License</h2>
                    <p>Fill in the fields — permit updates instantly.</p>
                </div>

                <div className="sb-body">
                    <div className="sb-section">Background Template</div>
                    <div className="bg-wrap">
                        <p className="bg-hint">Browsers block the server background due to CORS. Upload your local <code>liquor_license_bg.png</code>.</p>
                        <label className="btn-file" htmlFor="f_bgfile">📂 Upload Background</label>
                        <input type="file" id="f_bgfile" accept="image/*" className="hidden" onChange={handleBgUpload} />
                        {bgDataUrl && <div className="bg-status ok mt-1">✅ Background loaded</div>}
                    </div>

                    <div className="sb-section">License Details</div>
                    <div className="sb-field">
                        <label>License Number</label>
                        <input type="text" id="f_licno" value={form.licNo} onChange={handleInput} />
                    </div>
                    <div className="g2">
                        <div className="sb-field">
                            <label>Effective Date</label>
                            <input type="date" id="f_effdate" value={form.effDate} onChange={handleInput} />
                        </div>
                        <div className="sb-field">
                            <label>Expiry Date</label>
                            <input type="date" id="f_expdate" value={form.expDate} onChange={handleInput} />
                        </div>
                    </div>

                    <div className="sb-section">Applicant / Business</div>
                    <div className="sb-field">
                        <label>Business / Commercial Name</label>
                        <input type="text" id="f_bizname" value={form.bizName} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Business Phone No.</label>
                        <input type="tel" id="f_phone" value={form.phone} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Business P.O Box</label>
                        <input type="text" id="f_pobox" value={form.pobox} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Activity / Occupation</label>
                        <input type="text" id="f_activity" value={form.activity} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Operating Hours</label>
                        <input type="text" id="f_hours" value={form.hours} onChange={handleInput} />
                    </div>

                    <div className="sb-section">Payment</div>
                    <div className="sb-field">
                        <label>Permit Fee (KES)</label>
                        <input type="text" id="f_fee" value={form.fee} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Amount in Words</label>
                        <textarea id="f_feewords" value={form.feeWords} onChange={handleInput} />
                    </div>
                    <div className="g2">
                        <div className="sb-field">
                            <label>Receipt No.</label>
                            <input type="text" id="f_receipt" value={form.receipt} onChange={handleInput} />
                        </div>
                        <div className="sb-field">
                            <label>Transaction Date</label>
                            <input type="date" id="f_txdate" value={form.txDate} onChange={handleInput} />
                        </div>
                    </div>
                    <div className="sb-field">
                        <label>Mode of Payment</label>
                        <select id="f_mode" value={form.mode} onChange={handleInput}>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Cash">Cash</option>
                            <option value="Cheque">Cheque</option>
                        </select>
                    </div>

                    <div className="sb-section">Business Address</div>
                    <div className="g2">
                        <div className="sb-field">
                            <label>Sub County</label>
                            <input type="text" id="f_subcounty" value={form.subcounty} onChange={handleInput} />
                        </div>
                        <div className="sb-field">
                            <label>Ward</label>
                            <input type="text" id="f_ward" value={form.ward} onChange={handleInput} />
                        </div>
                    </div>
                    <div className="sb-field">
                        <label>Plot No.</label>
                        <input type="text" id="f_plot" value={form.plot} onChange={handleInput} />
                    </div>
                    <div className="sb-field">
                        <label>Road / Street</label>
                        <input type="text" id="f_road" value={form.road} onChange={handleInput} />
                    </div>

                    <div className="sb-section">Issuance</div>
                    <div className="g2">
                        <div className="sb-field">
                            <label>Date of Issue</label>
                            <input type="date" id="f_issuedate" value={form.issueDate} onChange={handleInput} />
                        </div>
                        <div className="sb-field">
                            <label>Issued By</label>
                            <input type="text" id="f_issuedby" value={form.issuedBy} onChange={handleInput} />
                        </div>
                    </div>

                    <div className="sb-section">QR Code</div>
                    <div className="qr-wrap">
                        <div className="sb-field">
                            <label style={{ color: 'rgba(255,255,255,.6)' }}>🔗 Verification URL</label>
                            <input type="url" id="f_qrlink" value={form.qrLink} onChange={handleInput} placeholder="https://…" />
                        </div>
                        {qrDataUrl && <div className="bg-status ok mt-1">✅ QR loaded</div>}
                    </div>
                </div>

                <div className="sb-footer">
                    <button onClick={handleDownload} disabled={isGenerating} className="btn btn-danger w-100 fw-bold">
                        {isGenerating ? '⌛ Generating...' : '⬇ Download Permit'}
                    </button>
                </div>
            </aside>

            <main className="main-area">
                <div className="preview-label">Live Preview — A4</div>
                <div ref={permitRef} id="permitCanvas" className={`permit-page ${!bgDataUrl ? 'no-bg' : ''}`} style={permitBackgroundStyle}>
                    <div className="duplicate-watermark">DUPLICATE</div>
                    <div className="overlay">
                        <div className="hdr-right">
                            <div className="license-no-label">LICENSE No.</div>
                            <p className="license-no">{form.licNo}</p>
                        </div>

                        <div className="body">
                            <div className="row2">
                                <div className="line">Effective Date: <span className="u">{formatDate(form.effDate)}</span></div>
                                <div className="line">Expiry Date: <span className="u">{formatDate(form.expDate)}</span></div>
                            </div>

                            <div className="section-h">County Government of Murang'a grant this alcoholic drink license to</div>

                            <div className="line">Applicant / Business / Commercial Name: <span className="u">{form.bizName}</span></div>

                            <div className="row2">
                                <div className="line">License No: <span className="u">{form.licNo}</span></div>
                                <div className="line">Business Phone No: <span className="u">{form.phone}</span></div>
                            </div>

                            <div className="row2">
                                <div className="line">Business P.O Box: <span className="u">{form.pobox}</span></div>
                                <div className="line"></div>
                            </div>

                            <div className="line">To engage in the activity/business or occupation of: <span className="u">{form.activity}</span></div>

                            <div className="line">Operating Hours: <span className="u">{form.hours}</span></div>

                            <div className="line">Having Paid a business Permit Fee of KES: <span className="u">{form.fee}</span></div>

                            <div className="line">Amount in words: <span className="u">{form.feeWords}</span></div>

                            <div className="row2">
                                <div className="line">Receipt No: <span className="u">{form.receipt}</span></div>
                                <div className="line">Transaction Date: <span className="u">{formatDate(form.txDate)}</span></div>
                            </div>

                            <div className="line">Mode: <span className="u">{form.mode}</span></div>

                            <div className="section-h" style={{ marginTop: '12px' }}>Business under this permit shall be conducted at the address below</div>

                            <div className="row2">
                                <div className="line">Sub County: <span className="u">{form.subcounty}</span></div>
                                <div className="line">Ward: <span className="u">{form.ward}</span></div>
                            </div>

                            <div className="row2">
                                <div className="line">Plot No: <span className="u">{form.plot}</span></div>
                            </div>

                            <div className="line">Road / Street: <span className="u">{form.road}</span></div>
                            <div className="line">Date of Issue: <span className="u">{formatDate(form.issueDate)}</span></div>
                            <div className="line">Issued By: <span className="u">{form.issuedBy}</span></div>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                body { background: #f0ede8; margin: 0; font-family: Arial, sans-serif; }
                .app-shell { display: flex; min-height: 100vh; }
                .sidebar { width: 360px; flex-shrink: 0; background: #1a1a2e; color: #fff; display: flex; flex-direction: column; height: 100vh; position: sticky; top: 0; overflow-y: auto; }
                .sb-header { background: #ec2665; padding: 20px 22px 16px; flex-shrink: 0; }
                .sb-back-nav { padding: 12px 20px 0; background: #1a1a2e; }
                .back-btn { display: flex; align-items: center; gap: 8px; color: rgba(255, 255, 255, 0.7); text-decoration: none; font-size: 13px; font-weight: 600; transition: color 0.15s; }
                .back-btn:hover { color: #fff; }
                .sb-header h2 { margin: 0 0 4px; font-size: 17px; font-weight: 800; }
                .sb-header p { margin: 0; font-size: 11px; opacity: .8; }
                .sb-body { padding: 16px 20px; overflow-y: auto; flex: 1; }
                .sb-section { font-size: 10px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #ec2665; margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, .1); }
                .sb-section:first-child { margin-top: 0; }
                .sb-field { margin-bottom: 10px; }
                .sb-field label { display: block; font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, .5); letter-spacing: .4px; margin-bottom: 4px; text-transform: uppercase; }
                .sb-field input, .sb-field select, .sb-field textarea { width: 100%; padding: 7px 10px; background: rgba(255, 255, 255, .07); border: 1px solid rgba(255, 255, 255, .15); border-radius: 5px; color: #fff; font-size: 12.5px; outline: none; transition: border-color .15s; box-sizing: border-box; }
                .sb-field input:focus, .sb-field select:focus, .sb-field textarea:focus { border-color: #ec2665; background: rgba(236, 38, 101, .1); }
                .sb-field select option { background: #1a1a2e; }
                .sb-field textarea { resize: vertical; min-height: 54px; }
                .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .qr-wrap { background: rgba(236, 38, 101, .12); border: 1px dashed #ec2665; border-radius: 6px; padding: 12px; }
                .bg-wrap { background: rgba(74, 108, 247, .12); border: 1px dashed #4a6cf7; border-radius: 6px; padding: 12px; }
                .bg-hint { font-size: 11px; color: rgba(255, 255, 255, .5); line-height: 1.5; margin-bottom: 8px; }
                .bg-hint code { background: rgba(74, 108, 247, .25); padding: 1px 4px; border-radius: 3px; font-size: 10px; color: #8ba4ff; }
                .btn-file { display: inline-block; padding: 7px 14px; background: #4a6cf7; color: #fff; border-radius: 5px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: none; }
                .bg-status { font-size: 11px; font-weight: 700; margin-top: 6px; }
                .bg-status.ok { color: #4ade80; }
                .sb-footer { padding: 14px 20px; border-top: 1px solid rgba(255, 255, 255, .08); flex-shrink: 0; }
                .main-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 32px 20px 40px; overflow-y: auto; }
                .preview-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 14px; }
                :root { --a4-w: 210mm; --a4-h: 297mm; --safe-top: 20mm; --safe-left: 8mm; --safe-right: 8mm; --safe-bottom: 18mm; --pink: #ec2665; --text: #000; --gold: #d4af37; }
                .permit-page { width: var(--a4-w); height: var(--a4-h); position: relative; margin: 0 auto; background-repeat: no-repeat; background-position: center; background-size: 100% 100%; background-color: #fff; overflow: hidden; box-shadow: 0 8px 40px rgba(0, 0, 0, .2); }
                .overlay { position: absolute; top: var(--safe-top); left: var(--safe-left); right: var(--safe-right); bottom: var(--safe-bottom); font-family: Arial, sans-serif; color: var(--text); }
                .duplicate-watermark { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 120px; color: rgba(255, 0, 0, 0.22); font-weight: 800; transform: rotate(-45deg); pointer-events: none; z-index: 50; letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; }
                .hdr-right { position: absolute; top: 35mm; right: 18mm; width: 55mm; text-align: right; }
                .license-no-label { font-size: 12px; margin-top: 6px; }
                .license-no { color: var(--pink); font-weight: 800; font-size: 16px; margin: 0; }
                .body { position: absolute; top: 62mm; left: 18mm; right: 18mm; bottom: 50mm; font-size: 14px; line-height: 1.55; }
                .section-h { font-weight: 800; color: var(--pink); font-size: 16px; margin: 10px 0 8px 0; text-transform: uppercase; }
                .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
                .line { margin: 4px 0; }
                .u { display: inline-block; padding: 0 2px; border-bottom: 1px solid rgba(0, 0, 0, .6); font-weight: 700; font-size: 14px; }
                .permit-page.no-bg .overlay,
                .permit-page.no-bg .duplicate-watermark {
                    z-index: 1;
                }
                .permit-page.no-bg::after { content: '⬆ Upload background image in the sidebar'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #aaa; background: repeating-linear-gradient(45deg, #f9f9f9, #f9f9f9 10px, #f0f0f0 10px, #f0f0f0 20px); pointer-events: none; z-index: 0; }
                @media print { .sidebar, .preview-label { display: none !important; } body { background: #fff; } }
                .btn { display: inline-block; font-weight: 400; line-height: 1.5; color: #212529; text-align: center; text-decoration: none; vertical-align: middle; cursor: pointer; user-select: none; background-color: transparent; border: 1px solid transparent; padding: .375rem .75rem; font-size: 1rem; border-radius: .375rem; transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out; }
                .btn-danger { color: #fff; background-color: #dc3545; border-color: #dc3545; }
                .btn-danger:hover { color: #fff; background-color: #bb2d3b; border-color: #b02a37; }
                .w-100 { width: 100%!important; }
                .fw-bold { font-weight: 700!important; }
            `}</style>
        </div>
    );
}

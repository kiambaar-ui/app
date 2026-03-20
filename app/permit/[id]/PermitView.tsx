'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';

interface PermitViewProps {
    data: any;
    serialNumber: number;
    initialBackground?: string | null;
}

export default function PermitView({ data, serialNumber, initialBackground }: PermitViewProps) {
    const router = useRouter();
    const permitRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [bgDataUrl, setBgDataUrl] = useState<string>(initialBackground || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isIframeReady, setIsIframeReady] = useState(false);

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

    // Handle handshake from iframe
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data.type === 'IFRAME_READY') {
                setIsIframeReady(true);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Sync form data to iframe
    useEffect(() => {
        if (!iframeRef.current || !isIframeReady) return;
        const target = iframeRef.current.contentWindow;
        if (!target) return;

        target.postMessage({
            type: 'UPDATE',
            form: {
                ...form,
                effDate: formatDate(form.effDate),
                expDate: formatDate(form.expDate),
                txDate: formatDate(form.txDate),
                issueDate: formatDate(form.issueDate),
            },
            bgDataUrl,
            qrDataUrl
        }, '*');
    }, [form, bgDataUrl, qrDataUrl, isIframeReady]);

    const handleDownload = async () => {
        if (!iframeRef.current || isGenerating) return;
        setIsGenerating(true);

        try {
            // Setup listener for the response
            const downloadHandler = (event: MessageEvent) => {
                if (event.data.type === 'CAPTURE_DONE') {
                    const link = document.createElement('a');
                    link.href = event.data.dataUrl;
                    link.download = `liquor-permit-${form.licNo}.png`;
                    link.click();
                    window.removeEventListener('message', downloadHandler);
                    setIsGenerating(false);
                }
            };
            window.addEventListener('message', downloadHandler);

            // Trigger capture in iframe WITH LATEST DATA
            iframeRef.current.contentWindow?.postMessage({ 
                type: 'CAPTURE',
                form: {
                    ...form,
                    effDate: formatDate(form.effDate),
                    expDate: formatDate(form.expDate),
                    txDate: formatDate(form.txDate),
                    issueDate: formatDate(form.issueDate),
                },
                bgDataUrl,
                qrDataUrl
            }, '*');
            
            // Timeout safety
            setTimeout(() => {
                setIsGenerating(false);
                window.removeEventListener('message', downloadHandler);
            }, 10000);

        } catch (err) {
            console.error('Download failed:', err);
            setIsGenerating(false);
        }
    };

    const PERMIT_HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        :root {
            --a4-w: 210mm; --a4-h: 297mm;
            --safe-top: 20mm; --safe-left: 8mm; --safe-right: 8mm; --safe-bottom: 18mm;
            --pink: #ec2665; --text: #000;
        }
        body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; overflow: hidden; }
        .permit-page {
            width: var(--a4-w); height: var(--a4-h);
            position: relative; margin: 0;
            background-repeat: no-repeat; background-position: center; background-size: 100% 100%;
            background-color: #fff; overflow: hidden;
        }
        .overlay {
            position: absolute; top: var(--safe-top); left: var(--safe-left); 
            right: var(--safe-right); bottom: var(--safe-bottom);
            font-family: Arial, sans-serif; color: var(--text);
        }
        .hdr-right { position: absolute; top: 35mm; right: 18mm; width: 55mm; text-align: right; }
        .license-no-label { font-size: 12px; margin-top: 6px; }
        .license-no { color: var(--pink); font-weight: 800; font-size: 16px; margin: 0; }
        .body { position: absolute; top: 62mm; left: 18mm; right: 18mm; bottom: 50mm; font-size: 14px; line-height: 1.55; }
        .section-h { font-weight: 800; color: var(--pink); font-size: 16px; margin: 10px 0 8px 0; text-transform: uppercase; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
        .line { margin: 4px 0; }
        .u { display: inline-block; padding: 0 2px; border-bottom: 1px solid rgba(0, 0, 0, .6); font-weight: 700; font-size: 14px; }
    </style>
</head>
<body>
    <div class="permit-page" id="permitCanvas">
        <div class="overlay">
            <div class="hdr-right">
                <div class="license-no-label">LICENSE No.</div>
                <p class="license-no" id="p_licno"></p>
            </div>
            <div class="body">
                <div class="row2">
                    <div class="line">Effective Date: <span class="u" id="p_effdate"></span></div>
                    <div class="line">Expiry Date: <span class="u" id="p_expdate"></span></div>
                </div>
                <div class="section-h">County Government of Murang'a grant this alcoholic drink license to</div>
                <div class="line">Applicant / Business / Commercial Name: <span class="u" id="p_bizname"></span></div>
                <div class="row2">
                    <div class="line">License No: <span class="u" id="p_licno2"></span></div>
                    <div class="line">Business Phone No: <span class="u" id="p_phone"></span></div>
                </div>
                <div class="row2">
                    <div class="line">Business P.O Box: <span class="u" id="p_pobox"></span></div>
                    <div class="line"></div>
                </div>
                <div class="line">To engage in the activity/business or occupation of: <span class="u" id="p_activity"></span></div>
                <div class="line">Operating Hours: <span class="u" id="p_hours"></span></div>
                <div class="line">Having Paid a business Permit Fee of KES: <span class="u" id="p_fee"></span></div>
                <div class="line">Amount in words: <span class="u" id="p_feewords"></span></div>
                <div class="row2">
                    <div class="line">Receipt No: <span class="u" id="p_receipt"></span></div>
                    <div class="line">Transaction Date: <span class="u" id="p_txdate"></span></div>
                </div>
                <div class="line">Mode: <span class="u" id="p_mode"></span></div>
                <div class="section-h" style="margin-top: 12px">Business under this permit shall be conducted at the address below</div>
                <div class="row2">
                    <div class="line">Sub County: <span class="u" id="p_subcounty"></span></div>
                    <div class="line">Ward: <span class="u" id="p_ward"></span></div>
                </div>
                <div class="row2">
                    <div class="line">Plot No: <span class="u" id="p_plot"></span></div>
                </div>
                <div class="line">Road / Street: <span class="u" id="p_road"></span></div>
                <div class="line">Date of Issue: <span class="u" id="p_issuedate"></span></div>
                <div class="line">Issued By: <span class="u" id="p_issuedby"></span></div>
            </div>
        </div>
    </div>
    <script>
        window.addEventListener('message', (e) => {
            if (e.data.type === 'UPDATE') {
                const f = e.data.form;
                document.getElementById('p_licno').textContent = f.licNo;
                document.getElementById('p_licno2').textContent = f.licNo;
                document.getElementById('p_effdate').textContent = f.effDate;
                document.getElementById('p_expdate').textContent = f.expDate;
                document.getElementById('p_bizname').textContent = f.bizName;
                document.getElementById('p_phone').textContent = f.phone;
                document.getElementById('p_pobox').textContent = f.pobox;
                document.getElementById('p_activity').textContent = f.activity;
                document.getElementById('p_hours').textContent = f.hours;
                document.getElementById('p_fee').textContent = f.fee;
                document.getElementById('p_feewords').textContent = f.feeWords;
                document.getElementById('p_receipt').textContent = f.receipt;
                document.getElementById('p_txdate').textContent = f.txDate;
                document.getElementById('p_mode').textContent = f.mode;
                document.getElementById('p_subcounty').textContent = f.subcounty;
                document.getElementById('p_ward').textContent = f.ward;
                document.getElementById('p_plot').textContent = f.plot;
                document.getElementById('p_road').textContent = f.road;
                document.getElementById('p_issuedate').textContent = f.issueDate;
                document.getElementById('p_issuedby').textContent = f.issuedBy;

                const el = document.getElementById('permitCanvas');
                const bg = e.data.bgDataUrl;
                const qr = e.data.qrDataUrl;
                const qrPos = 'center 235mm';
                
                if (bg && qr) {
                    el.style.backgroundImage = 'url("' + qr + '"), url("' + bg + '")';
                    el.style.backgroundSize = '35mm 35mm, 100% 100%';
                    el.style.backgroundRepeat = 'no-repeat, no-repeat';
                    el.style.backgroundPosition = qrPos + ', center';
                } else if (bg) {
                    el.style.backgroundImage = 'url("' + bg + '")';
                    el.style.backgroundSize = '100% 100%';
                    el.style.backgroundRepeat = 'no-repeat';
                    el.style.backgroundPosition = 'center';
                } else {
                    el.style.backgroundImage = 'none';
                }
            } else if (e.data.type === 'CAPTURE') {
                const target = document.getElementById('permitCanvas');
                if (!target) return;
                
                // FINAL SYNC BEFORE CAPTURE
                const f = e.data.form;
                const bg = e.data.bgDataUrl;
                const qr = e.data.qrDataUrl;
                
                if (f) {
                    document.getElementById('p_licno').textContent = f.licNo;
                    document.getElementById('p_licno2').textContent = f.licNo;
                    document.getElementById('p_effdate').textContent = f.effDate;
                    document.getElementById('p_expdate').textContent = f.expDate;
                    document.getElementById('p_bizname').textContent = f.bizName;
                    document.getElementById('p_phone').textContent = f.phone;
                    document.getElementById('p_pobox').textContent = f.pobox;
                    document.getElementById('p_activity').textContent = f.activity;
                    document.getElementById('p_hours').textContent = f.hours;
                    document.getElementById('p_fee').textContent = f.fee;
                    document.getElementById('p_feewords').textContent = f.feeWords;
                    document.getElementById('p_receipt').textContent = f.receipt;
                    document.getElementById('p_txdate').textContent = f.txDate;
                    document.getElementById('p_mode').textContent = f.mode;
                    document.getElementById('p_subcounty').textContent = f.subcounty;
                    document.getElementById('p_ward').textContent = f.ward;
                    document.getElementById('p_plot').textContent = f.plot;
                    document.getElementById('p_road').textContent = f.road;
                    document.getElementById('p_issuedate').textContent = f.issueDate;
                    document.getElementById('p_issuedby').textContent = f.issuedBy;
                }
                
                const qrPos = 'center 235mm';
                if (bg && qr) {
                    target.style.backgroundImage = 'url("' + qr + '"), url("' + bg + '")';
                    target.style.backgroundSize = '35mm 35mm, 100% 100%';
                    target.style.backgroundRepeat = 'no-repeat, no-repeat';
                    target.style.backgroundPosition = qrPos + ', center';
                } else if (bg) {
                    target.style.backgroundImage = 'url("' + bg + '")';
                    target.style.backgroundSize = '100% 100%';
                    target.style.backgroundRepeat = 'no-repeat';
                    target.style.backgroundPosition = 'center';
                }

                console.log('Final capture with form:', f);
                
                html2canvas(target, {
                    scale: 2,
                    backgroundColor: null,
                    useCORS: true,
                    logging: true,
                    width: 794,  // 210mm @ 96dpi
                    height: 1123 // 297mm @ 96dpi
                }).then(canvas => {
                    window.parent.postMessage({
                        type: 'CAPTURE_DONE',
                        dataUrl: canvas.toDataURL('image/png')
                    }, '*');
                }).catch(err => {
                    console.error('html2canvas error in iframe:', err);
                });
            }
        });
        // SIGNAL READY AFTER LISTENER IS ATTACHED
        window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
    </script>
</body>
</html>
    `;

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
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f0ede8', fontFamily: 'Arial, sans-serif', width: '100%' }}>
            {/* Hidden Iframe Worker for PNG Generation */}
            <iframe
                ref={iframeRef}
                srcDoc={PERMIT_HTML_TEMPLATE}
                style={{ 
                    position: 'absolute', 
                    width: '210mm', 
                    height: '297mm', 
                    left: '-10000px', 
                    top: '-10000px', 
                    opacity: 0, 
                    pointerEvents: 'none',
                    zIndex: -1000
                }}
                title="Permit Worker"
            />

            {/* Sidebar View (React State) */}
            <aside className="no-print" style={{ width: '360px', flexShrink: 0, background: '#1a1a2e', color: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, overflowY: 'auto' }}>
                <div style={{ background: '#ec2665', padding: '20px 22px 16px', flexShrink: 0 }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 800 }}>Murang'a County Liquor License</h2>
                    <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>Fill in the fields — permit updates instantly.</p>
                </div>

                <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                    <div className="sb-section">Background Template</div>
                    <div style={{ background: 'rgba(74, 108, 247, .12)', border: '1px dashed #4a6cf7', borderRadius: '6px', padding: '12px' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, .5)', lineHeight: 1.5, marginBottom: '8px' }}>
                            Upload local <code>liquor_license_bg.png</code> if CORS blocks the server image.
                        </p>
                        <label className="btn-file" htmlFor="f_bgfile">📂 Upload Background</label>
                        <input type="file" id="f_bgfile" accept="image/*" style={{ display: 'none' }} onChange={handleBgUpload} />
                        {bgDataUrl && <div className="bg-status ok">✅ Loaded</div>}
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
                        {qrDataUrl && <div className="bg-status ok">✅ QR loaded</div>}
                    </div>
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, .08)', flexShrink: 0 }}>
                    <button 
                        onClick={handleDownload} 
                        disabled={isGenerating} 
                        style={{ width: '100%', background: '#ec2665', color: '#fff', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {isGenerating ? '⌛ Generating...' : '⬇ Download Permit'}
                    </button>
                    <button 
                         onClick={() => router.back()}
                         style={{ width: '100%', background: '#444', color: '#fff', border: 'none', padding: '10px', borderRadius: '5px', marginTop: '8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                         Back to Dashboard
                    </button>
                </div>
            </aside>

            {/* Main Area matches temple.html 1:1 */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '32px 20px 40px', overflowY: 'auto' }}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '14px' }}>Live Preview — A4</div>

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
                            <div className="section-h">County Government of Murang&apos;a grant this alcoholic drink license to</div>
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
                .sb-header h2 { margin: 0 0 4px; font-size: 17px; font-weight: 800; }
                .sb-header p { margin: 0; font-size: 11px; opacity: .8; }
                .sb-section { font-size: 10px; font-weight: 700; letter-spacing: 1.8px; text-transform: uppercase; color: #ec2665; margin: 18px 0 8px; padding-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, .1); }
                .sb-field { margin-bottom: 10px; }
                .sb-field label { display: block; font-size: 10px; font-weight: 600; color: rgba(255, 255, 255, .5); letter-spacing: .4px; margin-bottom: 4px; text-transform: uppercase; }
                .sb-field input, .sb-field select, .sb-field textarea { width: 100%; padding: 7px 10px; background: rgba(255, 255, 255, .07); border: 1px solid rgba(255, 255, 255, .15); border-radius: 5px; color: #fff; font-size: 12.5px; outline: none; transition: border-color .15s; box-sizing: border-box; }
                .sb-field input:focus, .sb-field select:focus, .sb-field textarea:focus { border-color: #ec2665; background: rgba(236, 38, 101, .1); }
                .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .qr-wrap { background: rgba(236, 38, 101, .12); border: 1px dashed #ec2665; border-radius: 6px; padding: 12px; }
                .btn-file { display: inline-block; padding: 7px 14px; background: #4a6cf7; color: #fff; border-radius: 5px; font-size: 11.5px; font-weight: 700; cursor: pointer; border: none; }
                .bg-status.ok { color: #4ade80; font-size: 11px; font-weight: 700; }
                
                :root { --a4-w: 210mm; --a4-h: 297mm; --safe-top: 20mm; --safe-left: 8mm; --safe-right: 8mm; --safe-bottom: 18mm; --pink: #ec2665; --text: #000; --gold: #d4af37; }
                .permit-page { width: var(--a4-w); height: var(--a4-h); position: relative; margin: 0 auto; background-repeat: no-repeat; background-position: center; background-size: 100% 100%; background-color: #fff !important; overflow: hidden; box-shadow: 0 8px 40px rgba(0, 0, 0, .2); }
                .overlay { position: absolute; top: var(--safe-top); left: var(--safe-left); right: var(--safe-right); bottom: var(--safe-bottom); font-family: Arial, sans-serif; color: #000 !important; z-index: 10; }
                .hdr-right { position: absolute; top: 35mm; right: 18mm; width: 55mm; text-align: right; }
                .license-no-label { font-size: 12px; margin-top: 6px; color: #000 !important; }
                .license-no { color: var(--pink) !important; font-weight: 800; font-size: 16px; margin: 0; }
                .body { position: absolute; top: 62mm; left: 18mm; right: 18mm; bottom: 50mm; font-size: 14px; line-height: 1.55; color: #000 !important; }
                .section-h { font-weight: 800; color: var(--pink) !important; font-size: 16px; margin: 10px 0 8px 0; text-transform: uppercase; }
                .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
                .line { margin: 4px 0; color: #000 !important; }
                .u { display: inline-block; padding: 0 2px; border-bottom: 1px solid rgba(0, 0, 0, .6) !important; font-weight: 700; font-size: 14px; color: #000 !important; }
                .permit-page.no-bg::after { content: '⬆ Upload background image in the sidebar'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #aaa; background: repeating-linear-gradient(45deg, #f9f9f9, #f9f9f9 10px, #f0f0f0 10px, #f0f0f0 20px); pointer-events: none; z-index: 0; }
                @media print { .no-print { display: none !important; } }
            `}</style>
        </div>
    );
}

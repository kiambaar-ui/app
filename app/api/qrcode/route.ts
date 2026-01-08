import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL parameter is missing' }, { status: 400 });
    }

    try {
        const qrCodeDataUrl = await QRCode.toDataURL(url);
        // Return wrapped in json as per original
        return NextResponse.json({ qr_code_image: qrCodeDataUrl });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
    }
}

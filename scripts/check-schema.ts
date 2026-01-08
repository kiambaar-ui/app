import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSchema() {
    try {
        const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'permits';
    `;
        console.log('Columns in permits table:', result.rows);
    } catch (err) {
        console.error('Error checking schema:', err);
    }
}

checkSchema();

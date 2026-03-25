
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
    console.log('Testing Raw PG connection...');
    const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
    });

    try {
        console.log('Querying users table...');
        const result = await pool.query('SELECT * FROM users LIMIT 1');
        console.log('Raw Result:', result.rows);
        
        console.log('Querying permits table...');
        const permitResult = await pool.query('SELECT * FROM permits LIMIT 1');
        console.log('Permit Result:', permitResult.rows);
        
    } catch (error: any) {
        console.error('Raw PG Test Failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Detail:', error.detail);
        console.error('Error Hint:', error.hint);
    } finally {
        await pool.end();
    }
}

main();

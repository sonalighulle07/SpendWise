import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { dbConfig } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.resolve(__dirname, '../../../database/schema.sql'), 'utf8');

const { database, ...conn } = dbConfig;
const connection = await mysql.createConnection({ ...conn, multipleStatements: true });
await connection.query(sql.replaceAll('spendwise', database));
console.log(`Database "${database}" is ready.`);
await connection.end();

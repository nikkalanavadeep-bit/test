const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

// 1. Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0];
  } catch {
    return null;
  }
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function getConnectionString() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: npm run db:migrate [options]

Options:
  --password=<pwd>    Supabase database password
  --url=<url>         Direct postgres connection string
  -h, --help          Show this help message

Environment variables supported in .env:
  SUPABASE_URL         (e.g. https://muspbsuofpbzdsxozgkj.supabase.co)
  SUPABASE_DB_PASSWORD (your database password)
  DATABASE_URL         (e.g. postgresql://postgres:[pwd]@db.muspbsuofpbzdsxozgkj.supabase.co:5432/postgres)
`);
    process.exit(0);
  }

  // Option 1: Direct DATABASE_URL or process.env.DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  // Option 2: CLI argument --url=<url> or --db-url=<url>
  const urlArg = process.argv.find((arg) => arg.startsWith('--url=') || arg.startsWith('--db-url='));
  if (urlArg) {
    return urlArg.split('=')[1].trim();
  }

  // Option 3: Derive host from SUPABASE_URL
  const projectRef = extractProjectRef(process.env.SUPABASE_URL) || 'muspbsuofpbzdsxozgkj';
  const host = `db.${projectRef}.supabase.co`;

  // Check for password in args or env
  const pwdArg = process.argv.find((arg) => arg.startsWith('--password=') || arg.startsWith('-p='));
  let password = pwdArg ? pwdArg.split('=')[1].trim() : (process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD);

  if (!password) {
    console.log(`\n======================================================`);
    console.log(`🔑 Supabase Database Migration Runner`);
    console.log(`📡 Target Project: ${projectRef} (${host})`);
    console.log(`======================================================\n`);
    console.log(`Tip: You can also set SUPABASE_DB_PASSWORD in your .env or pass --password=<your-password>\n`);
    password = await askQuestion(`Enter your Supabase database password for project '${projectRef}': `);
  }

  if (!password) {
    throw new Error('Database password is required to run the migration.');
  }

  return `postgresql://postgres:${encodeURIComponent(password)}@${host}:5432/postgres`;
}

async function runMigration() {
  const migrationFile = path.resolve(__dirname, '../../supabase/migrations/20261011000000_create_chat_schema.sql');
  const fallbackFile = path.resolve(__dirname, 'schema.sql');

  const sqlPath = fs.existsSync(migrationFile) ? migrationFile : fallbackFile;
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration SQL file not found at ${migrationFile} or ${fallbackFile}`);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log(`\n📄 Loading migration from: ${path.relative(process.cwd(), sqlPath)}`);

  const connectionString = await getConnectionString();
  console.log('🔌 Connecting to Supabase PostgreSQL database...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('⚡ Executing migration statements...');
    await client.query(sqlContent);
    console.log('✅ Migration executed successfully!');

    // Verify tables
    const checkRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('conversations', 'messages')
      ORDER BY table_name;
    `);

    const existingTables = checkRes.rows.map(r => r.table_name);
    console.log(`\n🎉 Verification:`);
    console.log(`   - conversations table: ${existingTables.includes('conversations') ? '✅ Created' : '❌ Missing'}`);
    console.log(`   - messages table:      ${existingTables.includes('messages') ? '✅ Created' : '❌ Missing'}`);

    if (existingTables.length === 2) {
      console.log(`\n🚀 Supabase is fully initialized and ready to store chats!\n`);
    } else {
      console.warn('\n⚠️ Warning: Some tables could not be verified. Please check permissions.');
    }
  } catch (err) {
    console.error('\n❌ Migration Failed:');
    if (err.code === '28P01') {
      console.error('Password authentication failed. Please double-check your Supabase database password.');
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      console.error(`Could not reach the database server. Ensure your network has access to Supabase port 5432 / 6543.`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runMigration().catch((err) => {
  console.error('Migration error:', err.message);
  process.exit(1);
});

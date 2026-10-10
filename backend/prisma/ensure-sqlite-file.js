const fs = require('node:fs');
const path = require('node:path');

const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl.startsWith('file:')) process.exit(0);

const encodedPath = databaseUrl.slice('file:'.length).split('?')[0];
if (!encodedPath || encodedPath === ':memory:') process.exit(0);

const databasePath = path.resolve(__dirname, decodeURIComponent(encodedPath));
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
if (!fs.existsSync(databasePath)) fs.closeSync(fs.openSync(databasePath, 'a'));

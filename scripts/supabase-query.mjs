const [query] = process.argv.slice(2);

if (!query) {
  console.error('Usage: node scripts/supabase-query.mjs "select ..."');
  process.exit(1);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || 'gwgliwyulajjcmngojql';

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const text = await response.text();
console.log(text);

if (!response.ok) {
  process.exit(1);
}

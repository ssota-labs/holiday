export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>holiday BYOC — Vercel + Supabase</h1>
      <p>Health: <code>/api/health</code>. Fax webhook: <code>/api/fax/webhook</code>.</p>
      <p>This is not a managed holiday web. Review drafts via MCP or <code>/api/review</code>.</p>
    </main>
  );
}

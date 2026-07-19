export async function GET() {
  return Response.json({ ok: true, target: 'chatgpt-sites', mode: 'inbox-export', d1EngineEligible: false });
}

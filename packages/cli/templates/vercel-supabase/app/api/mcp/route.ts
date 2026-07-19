import { dispatchHttp, MCP_TOOLS } from '@holiday-cfo/adapters';
import { requireApiToken, withFacade } from '../../../lib/holiday';

export const runtime = 'nodejs';

/**
 * Streamable-HTTP-friendly MCP shim.
 *
 * GET lists tools. POST { name, arguments } dispatches via shared adapters.
 * Hosts that speak full MCP Streamable HTTP can wrap the same dispatchMcpTool.
 */
export async function GET(req: Request) {
  const denied = requireApiToken(req);
  if (denied) return denied;
  return Response.json({ tools: MCP_TOOLS });
}

export async function POST(req: Request) {
  const denied = requireApiToken(req);
  if (denied) return denied;
  const body = await req.json();
  return withFacade(async (facade) => {
    const r = await dispatchHttp(facade, { method: 'POST', path: '/mcp', body });
    return Response.json(r.body, { status: r.status });
  });
}

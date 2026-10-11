# DealFlow CRE — MCP Server

Production MCP (Model Context Protocol) server for commercial real estate deal management. Built with the official `@modelcontextprotocol/sdk` — connects Claude Desktop, Claude Code, or any MCP-compatible client to a live CRE platform.

## 9 Tools

| Tool | Description |
|------|-------------|
| `search_deals` | Search deals by name, stage, property type, deal type (paginated) |
| `get_deal` | Full deal details — parties, property, underwriting, financials |
| `get_pipeline` | Pipeline summary by stage with aggregate values |
| `search_properties` | Search properties by address, city, state, property type |
| `get_property` | Full property details — suites, lease abstracts, financials |
| `search_contacts` | Search CRE contacts (buyers, sellers, tenants, landlords, lenders) |
| `get_contact` | Full contact details — activity history, deal involvement |
| `log_activity` | Log calls, emails, meetings, notes, tasks on deals |
| `get_portfolio_risk` | Portfolio analytics — lease expiration wall, tenant concentration, loan maturities |

## Architecture

```
Claude Desktop / Claude Code / MCP Client
    |
    v  (stdio transport)
MCP Server (@modelcontextprotocol/sdk)
    |
    v  (REST API + JWT auth)
DealFlow CRE Backend (Express + Prisma + PostgreSQL)
```

- **Transport:** stdio (standard MCP pattern)
- **Auth:** Service-account JWT — the server authenticates as a system user
- **Validation:** Zod schemas on all tool inputs
- **Type Safety:** Full TypeScript with strict mode

## Setup

```bash
npm install
npm run build

# Configure in claude_desktop_config.json:
{
  "mcpServers": {
    "dealflow-cre": {
      "command": "node",
      "args": ["path/to/dist/index.js"],
      "env": {
        "DEALFLOW_API_URL": "https://your-dealflow-instance.com",
        "DEALFLOW_SERVICE_TOKEN": "your-jwt-token"
      }
    }
  }
}
```

## Stack

- `@modelcontextprotocol/sdk` v1.0.0 (official Anthropic SDK)
- TypeScript 5 (strict)
- Zod for input validation
- stdio transport via `StdioServerTransport`

## Part of DealFlow CRE

This MCP server is the AI integration layer for [DealFlow CRE](https://github.com/maxev-digital) — a multi-tenant commercial real estate platform with broker authentication, deal pipeline management, AI document extraction, and property data ingestion.

## Author

**Will Peterson** — Solutions Architect & Forward Deployed Engineer at Wolters Kluwer.

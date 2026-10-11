/**
 * DealFlow CRE MCP Server
 *
 * Exposes DealFlow deals, properties, contacts, and activities as MCP tools
 * so any MCP-compatible AI agent (Claude Desktop, OpenAI Assistants, etc.)
 * can query and update DealFlow data with natural language.
 *
 * Auth: Service-account JWT issued by the DealFlow API.
 * Set DEALFLOW_API_URL and DEALFLOW_SERVICE_TOKEN in environment.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

// ─── API client ───────────────────────────────────────────────────────────────

function createApiClient(): AxiosInstance {
  const baseURL = process.env['DEALFLOW_API_URL'] ?? 'http://localhost:3040';
  const token   = process.env['DEALFLOW_SERVICE_TOKEN'] ?? '';
  if (!token) {
    console.error('[mcp] DEALFLOW_SERVICE_TOKEN is not set — requests will be unauthenticated');
  }
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
}

const api = createApiClient();

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const r = await api.get<{ data: T }>(path, { params });
  return r.data.data;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await api.post<{ data: T }>(path, body);
  return r.data.data;
}

// ─── Server ───────────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'dealflow-cre',
  version: '1.0.0',
});

// ─── Tools ───────────────────────────────────────────────────────────────────

// Search deals
server.tool(
  'search_deals',
  'Search active deals in DealFlow CRE by name, stage, property type, or deal type',
  {
    query:      z.string().optional().describe('Free-text search against deal name'),
    stage:      z.string().optional().describe('Pipeline stage e.g. PROSPECT, LOI, UNDER_CONTRACT, CLOSED'),
    deal_type:  z.string().optional().describe('Deal type e.g. SALE, LEASE, ACQUISITION'),
    page:       z.number().optional().default(1),
    page_size:  z.number().optional().default(25),
  },
  async ({ query, stage, deal_type, page, page_size }) => {
    const deals = await get('/api/v1/deals', {
      search: query,
      stage,
      dealType: deal_type,
      page,
      pageSize: page_size,
    });
    return { content: [{ type: 'text', text: JSON.stringify(deals, null, 2) }] };
  }
);

// Get deal by ID
server.tool(
  'get_deal',
  'Get full details of a specific deal including parties, property, and underwriting data',
  { deal_id: z.string().describe('The deal ID') },
  async ({ deal_id }) => {
    const deal = await get(`/api/v1/deals/${deal_id}`);
    return { content: [{ type: 'text', text: JSON.stringify(deal, null, 2) }] };
  }
);

// Get deal pipeline summary
server.tool(
  'get_pipeline',
  'Get a summary of the deal pipeline showing count and value by stage',
  {},
  async () => {
    const pipeline = await get('/api/v1/deals/pipeline');
    return { content: [{ type: 'text', text: JSON.stringify(pipeline, null, 2) }] };
  }
);

// Search properties
server.tool(
  'search_properties',
  'Search properties in DealFlow CRE by address, city, state, or property type',
  {
    query:          z.string().optional().describe('Free-text search'),
    property_type:  z.string().optional().describe('e.g. OFFICE, RETAIL, INDUSTRIAL, MULTIFAMILY'),
    city:           z.string().optional(),
    state:          z.string().optional(),
    page:           z.number().optional().default(1),
    page_size:      z.number().optional().default(25),
  },
  async ({ query, property_type, city, state, page, page_size }) => {
    const properties = await get('/api/v1/properties', {
      search: query,
      propertyType: property_type,
      city,
      state,
      page,
      pageSize: page_size,
    });
    return { content: [{ type: 'text', text: JSON.stringify(properties, null, 2) }] };
  }
);

// Get property by ID
server.tool(
  'get_property',
  'Get full details of a specific property including suites, lease abstracts, and financials',
  { property_id: z.string().describe('The property ID') },
  async ({ property_id }) => {
    const property = await get(`/api/v1/properties/${property_id}`);
    return { content: [{ type: 'text', text: JSON.stringify(property, null, 2) }] };
  }
);

// Search contacts
server.tool(
  'search_contacts',
  'Search CRE contacts (buyers, sellers, tenants, landlords, lenders) in DealFlow',
  {
    query:      z.string().optional().describe('Search by name, email, or company'),
    type:       z.string().optional().describe('Contact type: BUYER, SELLER, TENANT, LANDLORD, LENDER, INVESTOR'),
    page:       z.number().optional().default(1),
    page_size:  z.number().optional().default(25),
  },
  async ({ query, type, page, page_size }) => {
    const contacts = await get('/api/v1/contacts', {
      search: query,
      type,
      page,
      pageSize: page_size,
    });
    return { content: [{ type: 'text', text: JSON.stringify(contacts, null, 2) }] };
  }
);

// Get contact by ID
server.tool(
  'get_contact',
  'Get full details of a specific contact including activity history and deal involvement',
  { contact_id: z.string().describe('The contact ID') },
  async ({ contact_id }) => {
    const contact = await get(`/api/v1/contacts/${contact_id}`);
    return { content: [{ type: 'text', text: JSON.stringify(contact, null, 2) }] };
  }
);

// Log an activity on a deal
server.tool(
  'log_activity',
  'Log a call, email, meeting, note, or task on a deal in DealFlow',
  {
    deal_id:    z.string().describe('The deal to log the activity on'),
    type:       z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
    subject:    z.string().describe('Brief subject or summary'),
    notes:      z.string().optional().describe('Detailed notes'),
    date:       z.string().optional().describe('ISO 8601 date — defaults to now'),
    contact_id: z.string().optional().describe('Contact involved'),
  },
  async ({ deal_id, type, subject, notes, date, contact_id }) => {
    const activity = await post(`/api/v1/deals/${deal_id}/activities`, {
      type,
      subject,
      notes,
      date: date ?? new Date().toISOString(),
      contactId: contact_id,
    });
    return { content: [{ type: 'text', text: JSON.stringify(activity, null, 2) }] };
  }
);

// Get portfolio risk summary
server.tool(
  'get_portfolio_risk',
  'Get portfolio risk analytics including lease expiration wall, tenant concentration, and loan maturities',
  {},
  async () => {
    const risk = await get('/api/v1/analytics/portfolio-risk');
    return { content: [{ type: 'text', text: JSON.stringify(risk, null, 2) }] };
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[dealflow-mcp] Server started — listening on stdio');

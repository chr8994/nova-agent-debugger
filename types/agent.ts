// Types for AI Agent Configuration (adapted from odyssey-ui)

export type AgentStatus = 'connected' | 'disconnected' | 'error';

export type AgentHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface AgentConfigEndpoints {
  discovery?: string;
  info?: string;
  health?: string;
  stream?: string;
  query?: string;
  collaborate?: string;
  mcp?: string;
}

export interface AgentConfigTool {
  name: string;
  description: string;
  category?: string;
  inputSchema?: any;
  outputSchema?: any;
}

export interface AgentConfig {
  agent_id?: string;
  name: string;
  version: string;
  description?: string;
  theme_color?: string;
  avatar_url?: string;
  logo_url?: string;
  capabilities?: string[];
  endpoints?: AgentConfigEndpoints;
  tools?: AgentConfigTool[];
  resources?: any[];
  prompts?: any[];
  models?: any[];
  config?: any;
  protocols?: any;
  metadata?: any;
}

export interface DebuggerConfig {
  serviceUrl: string;
  authToken: string;
}

export interface DebuggerState {
  config: DebuggerConfig;
  agentInfo: AgentConfig | null;
  status: AgentStatus;
  error: string | null;
  isDiscovering: boolean;
}

// Local storage keys
export const STORAGE_KEYS = {
  SERVICE_URL: 'nova-debugger-service-url',
  AUTH_TOKEN: 'nova-debugger-auth-token',
  PANEL_OPEN: 'nova-debugger-panel-open',
} as const;

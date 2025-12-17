'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatContainer, useChatStream, type ChatMessage } from '@newhomestar/chat-ui';
import { Sun, Moon, Bug } from 'lucide-react';
import { ConfigPanel } from '@/components/config-panel';
import type { AgentConfig, AgentStatus } from '@/types/agent';

// Storage keys
const STORAGE = {
  SERVICE_URL: 'nova-debugger-service-url',
  AUTH_TOKEN: 'nova-debugger-auth-token',
  PANEL_OPEN: 'nova-debugger-panel-open',
  PANEL_WIDTH: 'nova-debugger-panel-width',
} as const;

const DEFAULT_PANEL_WIDTH = 320;

// Suggested prompts for the agent debugger
const SUGGESTED_PROMPTS = [
  {
    text: "Show available data sources",
    fullPrompt: "Please provide a comprehensive list of all available data sources, including their names and discriptions",
    lucideIcon: "database"
  },
  {
    text: 'Show total sales for the year',
    fullPrompt: 'Show me the total sales counts for the current year broken down by month using the wallet sales data. Provide the results in a markdown table format.',
    lucideIcon: 'trending-up',
  },
  {
    text: "Summarize 2025 IPA Results",
    fullPrompt: "Using the IPA Submissions data source provide a table in markdown format with the total scores for each category for 2025 with the completed_for name included and manager name.",
    lucideIcon: "line-chart"
  }
];

// Default fallback for logo
const DEFAULT_LOGO_SVG =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" fill="%234F46E5" rx="4"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-size="12" font-family="Arial">AI</text></svg>';

// Helper to safely access localStorage
const getStorageItem = (key: string, defaultValue: string = ''): string => {
  if (typeof window === 'undefined') return defaultValue;
  return localStorage.getItem(key) || defaultValue;
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
    // Also set as cookie for the icon proxy API to access
    if (key === STORAGE.SERVICE_URL) {
      document.cookie = `nova-debugger-service-url=${encodeURIComponent(value)}; path=/; max-age=31536000`;
    }
  }
};

export default function HomeClient() {
  const [isDark, setIsDark] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Config panel state
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [serviceUrl, setServiceUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [agentInfo, setAgentInfo] = useState<AgentConfig | null>(null);
  const [status, setStatus] = useState<AgentStatus>('disconnected');
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [chatId, setChatId] = useState(() => 
    `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  // Load saved config on mount
  useEffect(() => {
    // Use environment variables as defaults, falling back to hardcoded values
    const envApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const envAuthToken = process.env.NEXT_PUBLIC_AUTH_TOKEN || '';

    // Check localStorage first (user's saved preferences take priority)
    const savedUrl = getStorageItem(STORAGE.SERVICE_URL, '');
    const savedToken = getStorageItem(STORAGE.AUTH_TOKEN, '');
    const savedPanelOpen = getStorageItem(STORAGE.PANEL_OPEN, 'true');
    const savedPanelWidth = getStorageItem(STORAGE.PANEL_WIDTH, '');

    // Use localStorage values if they exist, otherwise use environment variables
    setServiceUrl(savedUrl || envApiUrl);
    setAuthToken(savedToken || envAuthToken);
    setIsPanelOpen(savedPanelOpen !== 'false');
    if (savedPanelWidth) {
      const width = parseInt(savedPanelWidth, 10);
      if (width >= 280 && width <= 600) {
        setPanelWidth(width);
      }
    }
  }, []);

  // Save config when it changes
  useEffect(() => {
    if (serviceUrl) setStorageItem(STORAGE.SERVICE_URL, serviceUrl);
  }, [serviceUrl]);

  useEffect(() => {
    setStorageItem(STORAGE.AUTH_TOKEN, authToken);
  }, [authToken]);

  useEffect(() => {
    setStorageItem(STORAGE.PANEL_OPEN, isPanelOpen.toString());
  }, [isPanelOpen]);

  // Save panel width when it changes
  const handlePanelWidthChange = useCallback((width: number) => {
    setPanelWidth(width);
    setStorageItem(STORAGE.PANEL_WIDTH, width.toString());
  }, []);

  // Configure the chat stream hook with dynamic config
  const {
    messages,
    isLoading,
    isStreaming,
    sendMessage,
    userName,
    userAvatar,
  } = useChatStream({
    apiUrl: serviceUrl || 'http://localhost:3000',
    agentId: agentInfo?.agent_id || agentInfo?.name || 'nova-agent-core',
    chatId: chatId,
    authToken: authToken || 'demo-token',
    settings: {
      persist: false, // Disable database persistence for demo/testing
    },
    onError: (errorMessage) => {
      setChatError(errorMessage);
      setStatus('error');
    },
  });

  // Handle agent discovery
  const handleDiscover = useCallback(async () => {
    if (!serviceUrl) {
      setDiscoveryError('Please enter a service URL');
      return;
    }

    setIsDiscovering(true);
    setDiscoveryError(null);

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: serviceUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to discover agent');
      }

      setAgentInfo(result.data);
      setStatus('connected');
      setLogoError(false);
      setChatError(null);
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : 'Failed to discover agent'
      );
      setStatus('error');
      setAgentInfo(null);
    } finally {
      setIsDiscovering(false);
    }
  }, [serviceUrl]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    (content: string) => {
      setChatError(null);
      sendMessage(content);
    },
    [sendMessage]
  );

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Toggle config panel
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Clear configuration
  const handleClearConfig = useCallback(() => {
    setAgentInfo(null);
    setStatus('disconnected');
    setDiscoveryError(null);
    setChatError(null);
    setChatId(`debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Reset chat (keep agent connected, just start fresh conversation)
  const handleResetChat = useCallback(() => {
    setChatError(null);
    setChatId(`debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Get logo URL from config, with fallback
  const logoUrl =
    (!logoError && (agentInfo?.avatar_url || agentInfo?.logo_url)) ||
    DEFAULT_LOGO_SVG;
  const agentName = agentInfo?.name || 'Nova Agent Debugger';

  return (
    <main className={`h-screen flex flex-col overflow-hidden ${isDark ? 'dark' : ''}`}>
      {/* Header */}
      <header 
        className="fixed top-0 left-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-gray-900 dark:border-gray-700 transition-all duration-300"
        style={{ right: isPanelOpen ? `${panelWidth}px` : '0' }}
      >
        <div className="flex items-center gap-3">

            <img
              src="https://lsbhexqvhkemgkqfbwdj.supabase.co/storage/v1/object/public/logos/light_logo.png"
              alt="Nova Agent Debugger"
              className="h-8 w-auto"
            />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {agentName}
            </h1>
            {serviceUrl && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {serviceUrl}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'connected'
                  ? 'bg-green-500'
                  : status === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-400'
              }`}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {status === 'connected'
                ? 'Connected'
                : status === 'error'
                ? 'Error'
                : 'Not Connected'}
            </span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* Content wrapper with padding for fixed header */}
      <div className="pt-[73px] flex-1 flex flex-col min-h-0">
        {/* Error Banner */}
        {chatError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mx-6 mt-4 rounded">
          <p className="text-red-700 dark:text-red-300">{chatError}</p>
          <button
            onClick={() => setChatError(null)}
            className="text-sm text-red-500 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Chat Container */}
        <div
          className="flex-1 flex flex-col min-h-0 transition-all duration-300"
          style={{ marginRight: isPanelOpen ? `${panelWidth}px` : '0' }}
        >
          {status === 'connected' ? (
            <ChatContainer
              key={chatId}
              messages={messages as any}
              isLoading={isLoading}
              isStreaming={isStreaming}
              userName={userName}
              userAvatar={userAvatar}
              agentName={agentName}
              agentLogoUrl={agentInfo?.logo_url || agentInfo?.avatar_url}
              onSendMessage={handleSendMessage}
              messageContainerClassName="max-w-3xl mx-auto"
              inputPlaceholder="Send a message to test the agent..."
              examplePrompts={SUGGESTED_PROMPTS}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-700/30 flex items-center justify-center mx-auto mb-4">
                  <Bug className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Nova Agent Debugger
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Configure your agent connection in the panel on the right to
                  start testing.
                </p>
                {!isPanelOpen && (
                  <button
                    onClick={togglePanel}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Open Configuration Panel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Config Panel */}
        <ConfigPanel
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          serviceUrl={serviceUrl}
          authToken={authToken}
          agentInfo={agentInfo}
          status={status}
          error={discoveryError}
          isDiscovering={isDiscovering}
          onServiceUrlChange={setServiceUrl}
          onAuthTokenChange={setAuthToken}
          onDiscover={handleDiscover}
          onClearConfig={handleClearConfig}
          onResetChat={handleResetChat}
          panelWidth={panelWidth}
          onPanelWidthChange={handlePanelWidthChange}
        />
      </div>
      </div>
    </main>
  );
}

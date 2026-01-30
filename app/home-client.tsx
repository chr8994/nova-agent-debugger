'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatContainer, useChatStream, type ChatMessage } from '@newhomestar/chat-ui';
import { Sun, Moon, Menu } from 'lucide-react';
import { ConfigPanel } from '@/components/config-panel';
import { ChatSidebar } from '@/components/chat-sidebar';
import type { AgentConfig, AgentStatus } from '@/types/agent';
import { getChatMessagesUrl } from '@/utils/chat-api';

// Storage keys
const STORAGE = {
  SERVICE_URL: 'nova-debugger-service-url',
  AUTH_TOKEN: 'nova-debugger-auth-token',
  PANEL_OPEN: 'nova-debugger-panel-open',
  PANEL_WIDTH: 'nova-debugger-panel-width',
  PERSIST: 'nova-debugger-persist',
} as const;

const DEFAULT_PANEL_WIDTH = 320;

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
  const [persist, setPersist] = useState(false);
  const [agentInfo, setAgentInfo] = useState<AgentConfig | null>(null);
  const [status, setStatus] = useState<AgentStatus>('disconnected');
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [chatId, setChatId] = useState(() => 
    `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  
  // Chat sidebar state
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
  
  // Initial messages state for loading existing chats
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

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
    const savedPersist = getStorageItem(STORAGE.PERSIST, 'false');

    // Use localStorage values if they exist, otherwise use environment variables
    setServiceUrl(savedUrl || envApiUrl);
    setAuthToken(savedToken || envAuthToken);
    setIsPanelOpen(savedPanelOpen !== 'false');
    setPersist(savedPersist === 'true');
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

  // Note: persist is saved in handlePersistChange to avoid race condition with load effect

  // Handle persist change
  const handlePersistChange = useCallback((newPersist: boolean) => {
    setPersist(newPersist);
    // Save to localStorage immediately when user changes the value
    setStorageItem(STORAGE.PERSIST, newPersist.toString());
    // Reset chat when toggling persist to ensure clean state
    setChatId(`debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    setInitialMessages([]);
  }, []);

  // Fetch existing messages when selecting a chat from sidebar
  useEffect(() => {
    const fetchChatMessages = async () => {
      // Skip fetching for new chats (those starting with 'debug-')
      if (!chatId || chatId.startsWith('debug-') || !serviceUrl || !persist) {
        setInitialMessages([]);
        return;
      }

      console.log('[HomeClient] Fetching messages for chat:', chatId);
      setIsLoadingMessages(true);
      setChatError(null);

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const url = getChatMessagesUrl(serviceUrl, chatId);
        console.log('[HomeClient] Fetching from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[HomeClient] Messages response:', data);
          
          // Handle different response formats
          let rawMessages: any[] = [];
          if (data.success && data.messages) {
            rawMessages = data.messages;
          } else if (Array.isArray(data)) {
            rawMessages = data;
          } else if (data.data && Array.isArray(data.data)) {
            rawMessages = data.data;
          }
          
          // Transform messages to include rich content from annotation field
          // This matches how project-starfleet-web handles it
          const transformedMessages = rawMessages.map((msg: any) => {
            // De-duplicate toolSteps by toolCallId to prevent duplicate chart/table rendering
            // The database sometimes contains duplicate entries with the same toolCallId
            const rawToolSteps = msg.annotation?.toolSteps || [];
            const uniqueToolSteps = rawToolSteps.filter(
              (step: any, index: number, arr: any[]) => 
                arr.findIndex((s: any) => s.toolCallId === step.toolCallId) === index
            );
            
            return {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
              // Add timestamp for compatibility with ChatMessage type
              timestamp: new Date(msg.createdAt || msg.created_at || new Date()),
              // Restore feedback state from API
              liked: msg.liked || false,
              disliked: msg.disliked || false,
              hasComment: msg.hasComment || false,
              // Restore tool steps from annotation (chain of thought) - de-duplicated
              toolSteps: uniqueToolSteps.length > 0 ? uniqueToolSteps : undefined,
              // Restore knowledge sources from annotation
              knowledgeSources: msg.annotation?.knowledge_sources || undefined,
              // Create toolData from annotation for tool visualization (charts, tables, etc.)
              // Note: Don't include separate 'annotation' field to avoid duplicate rendering
              toolData: msg.annotation ? {
                type: msg.annotation.type || 'unknown',
                state: 'output-available',
                output: msg.annotation
              } : undefined
            };
          }) as ChatMessage[];
          
          console.log('[HomeClient] Transformed messages:', transformedMessages);
          setInitialMessages(transformedMessages);
        } else {
          const errorText = await response.text();
          console.error('[HomeClient] Error fetching messages:', response.status, errorText);
          setChatError(`Failed to load chat messages: ${response.status}`);
          setInitialMessages([]);
        }
      } catch (error) {
        console.error('[HomeClient] Error fetching chat messages:', error);
        setChatError(`Failed to load messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setInitialMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchChatMessages();
  }, [chatId, serviceUrl, authToken, persist]);

  // Save panel width when it changes
  const handlePanelWidthChange = useCallback((width: number) => {
    setPanelWidth(width);
    setStorageItem(STORAGE.PANEL_WIDTH, width.toString());
  }, []);

  // Configure the chat stream hook with dynamic config
  const {
    messages: streamMessages,
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
      persist: persist, // Use persist setting from config
    },
    onError: (errorMessage) => {
      setChatError(errorMessage);
      setStatus('error');
    },
  });

  // Combine initial messages with stream messages
  // When loading an existing chat, use initialMessages; new messages from stream are appended
  const messages = streamMessages.length > 0 ? streamMessages : initialMessages;

  // Handle chat selection from sidebar
  const handleChatSelect = useCallback((selectedChatId: string) => {
    console.log('[HomeClient] Chat selected:', selectedChatId);
    // Set the chat ID to trigger the ChatContainer re-render with the new chat
    setChatId(selectedChatId);
  }, []);

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
    (content: string | ChatMessage) => {
      setChatError(null);
      // Pass the full ChatMessage to preserve annotation (including forced_tools)
      // useChatStream.sendMessage handles both string and ChatMessage types
      sendMessage(content);
    },
    [sendMessage]
  );

  // Handle retry message - resend the last user message
  const handleRetryMessage = useCallback(
    (messageId: string) => {
      // Find the last user message before this assistant message
      const messageIndex = messages.findIndex((m: any) => m.id === messageId);
      if (messageIndex > 0) {
        const previousUserMessage = messages
          .slice(0, messageIndex)
          .reverse()
          .find((m: any) => m.role === 'user');
        if (previousUserMessage) {
          setChatError(null);
          sendMessage(previousUserMessage.content);
        }
      }
    },
    [messages, sendMessage]
  );

  // Handle like message - console log for debugging
  const handleLikeMessage = useCallback((messageId: string) => {
    console.log('👍 Liked message:', messageId);
  }, []);

  // Handle dislike message - console log for debugging
  const handleDislikeMessage = useCallback((messageId: string) => {
    console.log('👎 Disliked message:', messageId);
  }, []);

  // Handle share message - copy to clipboard
  const handleShareMessage = useCallback(
    (messageId: string) => {
      const message = messages.find((m: any) => m.id === messageId);
      if (message) {
        navigator.clipboard.writeText(message.content).then(() => {
          console.log('📋 Message copied to clipboard:', messageId);
        }).catch((err) => {
          console.error('Failed to copy message:', err);
        });
      }
    },
    [messages]
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
    setInitialMessages([]);
  }, []);

  // Handle chat deleted from sidebar
  const handleChatDeleted = useCallback((deletedChatId: string, chatTitle: string) => {
    // If the deleted chat was the current one, reset to a new chat
    if (chatId === deletedChatId) {
      setChatError(null);
      setChatId(`debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
      setInitialMessages([]);
    }
    // Show success toast
    setToast({ show: true, message: `"${chatTitle}" deleted successfully`, type: 'success' });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }, [chatId]);

  // Get logo URL from config, with fallback
  const logoUrl =
    (!logoError && (agentInfo?.avatar_url || agentInfo?.logo_url)) ||
    DEFAULT_LOGO_SVG;
  const agentName = agentInfo?.name || 'Nova Agent Debugger';

  return (
    <main className={`h-screen flex flex-col overflow-hidden ${isDark ? 'dark' : ''}`}>
      {/* Chat History Toggle Button - Always visible when persist enabled */}
      {persist && status === 'connected' && (
        <div
          className="fixed top-4 z-50 flex items-center gap-2 transition-[left] duration-300 ease-in-out"
          style={{
            left: isChatSidebarOpen ? 'calc(18rem + 16px)' : '16px',
          }}
        >
          <button
            onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
            className="p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isChatSidebarOpen ? 'Close chat history' : 'Open chat history'}
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {/* Header */}
      <header 
        className="fixed top-0 z-40 h-[70px] flex items-center justify-between px-6 py-3 border-b bg-white dark:bg-gray-900 dark:border-gray-700 transition-[left,right] duration-300 ease-in-out"
        style={{ 
          left: isChatSidebarOpen && persist && status === 'connected' ? '18rem' : '0',
          right: isPanelOpen ? `${panelWidth}px` : '0' 
        }}
      >
        <div className="flex items-center gap-3">
          {/* Spacer for chat history button */}
          {persist && status === 'connected' && (
            <div className="w-10" />
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* Dark mode toggle moved to config panel */}
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
          className="flex-1 flex flex-col min-h-0 transition-[margin-left,margin-right] duration-300 ease-in-out"
          style={{ 
            marginLeft: isChatSidebarOpen && persist && status === 'connected' ? '18rem' : '0',
            marginRight: isPanelOpen ? `${panelWidth}px` : '0' 
          }}
        >
          {status === 'connected' ? (
            <ChatContainer
              key={chatId}
              chatId={chatId}
              messages={messages as any}
              isLoading={isLoading}
              isStreaming={isStreaming}
              userName={userName}
              userAvatar={userAvatar}
              agentName={agentName}
              agentLogoUrl={agentInfo?.logo_url || agentInfo?.avatar_url}
              apiUrl={serviceUrl}
              onSendMessage={handleSendMessage}
              onRetryMessage={handleRetryMessage}
              onLikeMessage={handleLikeMessage}
              onDislikeMessage={handleDislikeMessage}
              onShareMessage={handleShareMessage}
              messageContainerClassName="max-w-3xl mx-auto"
              inputPlaceholder="Send a message to test the agent..."
              showPromptsWhen="empty"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="h-16 w-16 rounded-2xl bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center mx-auto mb-4">
                  <img 
                    src="https://kmwscxlhhndytxluptqp.supabase.co/storage/v1/object/public/assets/Flux.png"
                    alt="Flux"
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Agent Debugger
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Configure your agent connection in the panel on the right to
                  start testing.
                </p>
                {!isPanelOpen && (
                  <button
                    onClick={togglePanel}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
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
          persist={persist}
          agentInfo={agentInfo}
          status={status}
          error={discoveryError}
          isDiscovering={isDiscovering}
          onServiceUrlChange={setServiceUrl}
          onAuthTokenChange={setAuthToken}
          onPersistChange={handlePersistChange}
          onDiscover={handleDiscover}
          onClearConfig={handleClearConfig}
          onResetChat={handleResetChat}
          panelWidth={panelWidth}
          onPanelWidthChange={handlePanelWidthChange}
          isDark={isDark}
          onToggleDarkMode={toggleDarkMode}
        />
      </div>
      </div>

      {/* Chat Sidebar - only rendered when persist is enabled */}
      {persist && (
        <ChatSidebar
          isOpen={isChatSidebarOpen}
          onClose={() => setIsChatSidebarOpen(false)}
          serviceUrl={serviceUrl}
          authToken={authToken}
          currentChatId={chatId}
          onChatSelect={handleChatSelect}
          onNewChat={handleResetChat}
          onChatDeleted={handleChatDeleted}
        />
      )}

      {/* Toast notification */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="ml-2 hover:opacity-80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </main>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PanelRightClose,
  PanelRightOpen,
  Globe,
  Key,
  Loader2,
  CheckCircle,
  AlertCircle,
  Terminal,
  Wrench,
  RefreshCw,
  X,
  GripVertical,
} from 'lucide-react';
import type { AgentConfig, AgentStatus, STORAGE_KEYS } from '@/types/agent';

const STORAGE = {
  SERVICE_URL: 'nova-debugger-service-url',
  AUTH_TOKEN: 'nova-debugger-auth-token',
  PANEL_OPEN: 'nova-debugger-panel-open',
  PANEL_WIDTH: 'nova-debugger-panel-width',
} as const;

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 320;

interface ConfigPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  serviceUrl: string;
  authToken: string;
  agentInfo: AgentConfig | null;
  status: AgentStatus;
  error: string | null;
  isDiscovering: boolean;
  onServiceUrlChange: (url: string) => void;
  onAuthTokenChange: (token: string) => void;
  onDiscover: () => void;
  onClearConfig: () => void;
  panelWidth: number;
  onPanelWidthChange: (width: number) => void;
}

export function ConfigPanel({
  isOpen,
  onToggle,
  serviceUrl,
  authToken,
  agentInfo,
  status,
  error,
  isDiscovering,
  onServiceUrlChange,
  onAuthTokenChange,
  onDiscover,
  onClearConfig,
  panelWidth,
  onPanelWidthChange,
}: ConfigPanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth));
      onPanelWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, onPanelWidthChange]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'disconnected':
        return 'text-gray-400';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Not Connected';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <>
      {/* Toggle Button - Always visible */}
      <button
        onClick={onToggle}
        className={`fixed top-4 z-50 p-2 rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all`}
        style={{
          right: isOpen ? `${panelWidth + 20}px` : '16px',
        }}
        aria-label={isOpen ? 'Close config panel' : 'Open config panel'}
      >
        {isOpen ? (
          <PanelRightClose className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        ) : (
          <PanelRightOpen className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-full bg-white dark:bg-gray-900 border-l dark:border-gray-700 transform transition-transform duration-300 ease-in-out z-40 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: `${panelWidth}px` }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors group ${
            isResizing ? 'bg-indigo-500/50' : 'bg-transparent'
          }`}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Config Panel
            </h2>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 text-sm ${getStatusColor()}`}>
                <span className={`h-2 w-2 rounded-full ${
                  status === 'connected' ? 'bg-green-500' : 
                  status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                {getStatusLabel()}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Connection Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Connection
              </h3>

              {/* Service URL */}
              <div className="space-y-2">
                <label
                  htmlFor="service-url"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Service URL
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="service-url"
                    type="text"
                    value={serviceUrl}
                    onChange={(e) => onServiceUrlChange(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Auth Token */}
              <div className="space-y-2">
                <label
                  htmlFor="auth-token"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Auth Token
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="auth-token"
                    type="password"
                    value={authToken}
                    onChange={(e) => onAuthTokenChange(e.target.value)}
                    placeholder="Enter auth token (optional)"
                    className="w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Discover Button */}
              <button
                onClick={onDiscover}
                disabled={isDiscovering || !serviceUrl}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#212935' }}
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Discover Agent
                  </>
                )}
              </button>

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-2 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Agent Info Section */}
            {agentInfo && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Agent Info
                  </h3>
                  <button
                    onClick={onClearConfig}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear
                  </button>
                </div>

                {/* Agent Card */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 space-y-3">
                  <div className="flex items-center gap-3">
                    {agentInfo.avatar_url || agentInfo.logo_url ? (
                      <img
                        src={agentInfo.avatar_url || agentInfo.logo_url}
                        alt={agentInfo.name}
                        className="h-8 w-8 rounded-lg object-cover border dark:border-gray-600 bg-white"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center border dark:border-gray-600"
                        style={{
                          backgroundColor: agentInfo.theme_color
                            ? `${agentInfo.theme_color}1a`
                            : 'rgb(79 70 229 / 0.1)',
                        }}
                      >
                        <Terminal
                          className="h-5 w-5"
                          style={{
                            color: agentInfo.theme_color || 'rgb(79 70 229)',
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">
                          {agentInfo.name}
                        </h4>
                        <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                          v{agentInfo.version}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Discovered
                        </span>
                      </div>
                    </div>
                  </div>

                  {agentInfo.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {agentInfo.description}
                    </p>
                  )}

                  {/* Capabilities */}
                  {agentInfo.capabilities && agentInfo.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {agentInfo.capabilities.slice(0, 5).map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                        >
                          {cap}
                        </span>
                      ))}
                      {agentInfo.capabilities.length > 5 && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                          +{agentInfo.capabilities.length - 5} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tools Count */}
                  {agentInfo.tools && agentInfo.tools.length > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>{agentInfo.tools.length} available tools</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help Text */}
            {!agentInfo && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Enter the base URL of your nova-agent-core service and click
                  "Discover Agent" to fetch its configuration.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  The debugger will try to fetch from:
                </p>
                <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 list-disc list-inside">
                  <li>/.well-known/agent-config</li>
                  <li>/api/agent-config</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

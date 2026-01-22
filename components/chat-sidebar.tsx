'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
  Check,
  Loader2,
} from 'lucide-react';
import type { Chat } from '@/types/agent';
import { getChatListUrl, getChatDeleteUrl, getChatUpdateUrl } from '@/utils/chat-api';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  serviceUrl: string;
  authToken: string;
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
}

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  editingChatId: string | null;
  editingTitle: string;
  isUpdating: boolean;
  onSelect: () => void;
  onEditStart: (chat: Chat, e: React.MouseEvent) => void;
  onEditSave: (chatId: string) => void;
  onEditCancel: (e?: React.MouseEvent | React.KeyboardEvent) => void;
  onDeleteStart: (chat: Chat, e: React.MouseEvent) => void;
  setEditingTitle: (title: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({
  chat,
  isSelected,
  editingChatId,
  editingTitle,
  isUpdating,
  onSelect,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDeleteStart,
  setEditingTitle,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={onSelect}
    >
      {editingChatId === chat.id ? (
        <div className="flex items-center space-x-2 flex-1">
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onEditSave(chat.id);
              }
              if (e.key === 'Escape') {
                onEditCancel(e);
              }
            }}
            className="text-sm h-7 flex-1 px-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isUpdating}
            autoFocus
          />
          <button
            className="h-7 w-7 p-1 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onEditSave(chat.id);
            }}
            disabled={isUpdating}
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            className="h-7 w-7 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={onEditCancel}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <span className="text-sm text-gray-700 dark:text-gray-200 truncate flex-1">
            {chat.title || 'Untitled Chat'}
          </span>

          <div className="relative">
            <button
              className="h-6 w-6 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 top-6 z-20 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={(e) => {
                      onEditStart(chat, e);
                      setShowMenu(false);
                    }}
                  >
                    <Edit3 className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={(e) => {
                      onDeleteStart(chat, e);
                      setShowMenu(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export function ChatSidebar({
  isOpen,
  onClose,
  serviceUrl,
  authToken,
  currentChatId,
  onChatSelect,
  onNewChat,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [updatingChatId, setUpdatingChatId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Chat | null>(null);

  // Fetch chats when sidebar opens
  useEffect(() => {
    const fetchChats = async () => {
      if (!isOpen || !serviceUrl) return;

      try {
        setLoading(true);
        setError(null);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const url = getChatListUrl(serviceUrl);
        console.log('[ChatSidebar] Fetching chats from:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
        });

        console.log('[ChatSidebar] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[ChatSidebar] Response data:', data);
          
          // Handle different response formats
          if (data.success && data.chats) {
            setChats(data.chats);
          } else if (Array.isArray(data)) {
            // Direct array response
            setChats(data);
          } else if (data.data && Array.isArray(data.data)) {
            // Wrapped in data property
            setChats(data.data);
          } else {
            console.warn('[ChatSidebar] Unexpected response format:', data);
            setChats([]);
          }
        } else {
          const errorText = await response.text();
          console.error('[ChatSidebar] Error response:', response.status, errorText);
          setError(`Failed to load chats: ${response.status}`);
        }
      } catch (error) {
        console.error('[ChatSidebar] Error fetching chats:', error);
        setError(`Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isOpen, serviceUrl, authToken]);

  // Group chats by time periods
  const groupedChats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as Chat[],
      yesterday: [] as Chat[],
      previous7Days: [] as Chat[],
      older: [] as Chat[],
    };

    chats.forEach((chat) => {
      const chatDate = new Date(chat.updated_at || chat.created_at);

      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= sevenDaysAgo) {
        groups.previous7Days.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    // Sort chats within each group by most recent first
    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime()
      );
    });

    return groups;
  }, [chats]);

  // Handle edit chat name
  const handleEditStart = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditingTitle(chat.title || 'Untitled Chat');
  };

  const handleEditSave = async (chatId: string) => {
    if (!editingTitle.trim()) return;

    setUpdatingChatId(chatId);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(getChatUpdateUrl(serviceUrl, chatId), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title: editingTitle.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setChats(
            chats.map((chat) =>
              chat.id === chatId
                ? { ...chat, title: data.chat?.title || editingTitle.trim(), updated_at: new Date().toISOString() }
                : chat
            )
          );
          setEditingChatId(null);
          setEditingTitle('');
        }
      }
    } catch (error) {
      console.error('Error updating chat name:', error);
    } finally {
      setUpdatingChatId(null);
    }
  };

  const handleEditCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle('');
  };

  // Handle delete chat
  const handleDeleteStart = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(chat);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(getChatDeleteUrl(serviceUrl, deleteConfirm.id), {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        setChats(chats.filter((chat) => chat.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const renderChatGroup = (title: string, groupChats: Chat[]) => {
    if (groupChats.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2 uppercase tracking-wider">
          {title}
        </h3>
        <div className="space-y-1">
          {groupChats.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              isSelected={chat.id === currentChatId}
              editingChatId={editingChatId}
              editingTitle={editingTitle}
              isUpdating={updatingChatId === chat.id}
              onSelect={() => {
                onChatSelect(chat.id);
                // Don't close the sidebar - let user manually close it if desired
              }}
              onEditStart={handleEditStart}
              onEditSave={handleEditSave}
              onEditCancel={handleEditCancel}
              onDeleteStart={handleDeleteStart}
              setEditingTitle={setEditingTitle}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-900 border-r dark:border-gray-700 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Chat History
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="New chat"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Loading chats...
                  </span>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Failed to load chats
                </div>
                <div className="text-xs text-red-500 dark:text-red-400 max-w-xs mb-4">
                  {error}
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    // Trigger re-fetch by closing and opening
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No chat history yet
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                  Your conversations will appear here once you start chatting with
                  persist enabled
                </div>
              </div>
            ) : (
              <>
                {renderChatGroup('Today', groupedChats.today)}
                {renderChatGroup('Yesterday', groupedChats.yesterday)}
                {renderChatGroup('Previous 7 Days', groupedChats.previous7Days)}
                {renderChatGroup('Older', groupedChats.older)}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Chat
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{deleteConfirm.title || 'Untitled Chat'}"?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useClerk } from '@clerk/clerk-react';

interface ChatDrawerProps {
  userId: string;
  userRole: 'admin' | 'user';
  targetUserId?: string; // For admin, the user to chat with
  onClose: () => void;
}

interface ChatUser {
  name: string;
  id: string;
  username: string;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({ userId, userRole, targetUserId, onClose }) => {
  const clerk = useClerk();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollInterval, setPollInterval] = useState<number | null>(null);
  const [adminTargetId, setAdminTargetId] = useState(targetUserId || '');
  const [userList, setUserList] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user list for admin
  useEffect(() => {
    if (userRole === 'admin') {
      fetchUserList();
    }
  }, [userRole]);

  const fetchUserList = async () => {
    try {
      const token = await clerk.session?.getToken();
      const res = await fetch('http://127.0.0.1:5000/api/admin/users/only-users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUserList(data.users || []);
      // Auto-select first user if none selected
      if (!selectedUser && data.users && data.users.length > 0) {
        setSelectedUser(data.users[0]);
        setAdminTargetId(data.users[0].id);
      }
    } catch {}
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for messages
  useEffect(() => {
    const id = userRole === 'admin' ? adminTargetId : userId;
    if (!userId || (userRole === 'admin' && !adminTargetId)) return;
    fetchMessages();
    if (pollInterval) clearInterval(pollInterval);
    const interval = window.setInterval(fetchMessages, 5000);
    setPollInterval(interval);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [userId, userRole, adminTargetId]);

  const fetchMessages = async () => {
    try {
      const id = userRole === 'admin' ? adminTargetId : userId;
      if (!id) return;
      const token = await clerk.session?.getToken();
      const res = await fetch(`http://127.0.0.1:5000/api/chat/messages?user_id=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const payload = {
        from_id: userId,
        from_role: userRole,
        to_id: userRole === 'admin' ? adminTargetId : 'admin',
        to_role: userRole === 'admin' ? 'user' : 'admin',
        content: input.trim(),
      };
      const token = await clerk.session?.getToken();
      const res = await fetch('http://127.0.0.1:5000/api/chat/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInput('');
        fetchMessages();
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle user selection (admin)
  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    setAdminTargetId(user.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Enhanced Overlay with blur effect */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}></div>
      
      {/* Enhanced Drawer */}
      <div className="relative w-full sm:max-w-3xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 h-full shadow-2xl flex flex-col sm:flex-row rounded-none sm:rounded-l-3xl border border-yellow-400/20 backdrop-blur-xl transform transition-all duration-300 ease-out">
        
        {/* Enhanced User List for Admin */}
        {userRole === 'admin' && (
          <div className="w-full sm:w-80 border-b sm:border-b-0 sm:border-r border-yellow-400/20 bg-gradient-to-b from-white to-yellow-50/30 dark:from-gray-800 dark:to-gray-800/50 flex flex-col rounded-none sm:rounded-l-3xl">
            <div className="p-5 font-bold border-b border-yellow-400/30 text-gray-800 dark:text-gray-200 bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-none sm:rounded-tl-3xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
                <span className="text-lg">Active Users</span>
                <span className="ml-auto text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-gray-600/50 px-2 py-1 rounded-full">
                  {userList.length}
                </span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-32 sm:max-h-none p-2">
              {userList.length === 0 ? (
                <div className="text-yellow-600 dark:text-yellow-400 text-center mt-8 flex flex-col items-center gap-3">
                  <div className="animate-spin w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                  <span className="text-sm font-medium">Loading users...</span>
                </div>
              ) : (
                <div className="flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible">
                  {userList.map((user) => (
                    <div
                      key={user.id}
                      className={`cursor-pointer p-4 rounded-2xl transition-all duration-200 hover:scale-105 hover:shadow-lg border ${
                        selectedUser?.id === user.id 
                          ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-800/50 dark:to-yellow-700/50 font-semibold text-yellow-800 dark:text-yellow-200 shadow-lg border-yellow-300 dark:border-yellow-600 ring-2 ring-yellow-300/50' 
                          : 'text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-yellow-200 dark:hover:border-yellow-600'
                      } whitespace-nowrap backdrop-blur-sm min-w-[200px] sm:min-w-0`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {(user.name || user.id).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.name || user.id}</div>
                          <div className="text-xs opacity-70 truncate">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                        {selectedUser?.id === user.id && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Enhanced Chat Panel */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 rounded-none sm:rounded-r-3xl">
          
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-5 border-b border-yellow-400/30 bg-gradient-to-r from-yellow-50/50 to-white dark:from-gray-700/50 dark:to-gray-800 rounded-none sm:rounded-tr-3xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {userRole === 'admin' ? `Chat with ${selectedUser?.name || 'Select User'}` : 'Chat with Admin'}
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {userRole === 'admin' ? 'Admin Panel' : 'Support Chat'}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 flex items-center justify-center hover:scale-110"
              aria-label="Close chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Enhanced Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-gray-50/30 to-white/50 dark:from-gray-800/30 dark:to-gray-900/50">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Start a conversation!</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={msg._id || idx}
                  className={`flex ${msg.from_id === userId ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                    {msg.from_id !== userId && (
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 flex-shrink-0">
                        A
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-sm backdrop-blur-sm border ${
                        msg.from_id === userId
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-yellow-200 dark:shadow-yellow-900/30 border-yellow-300 rounded-br-md'
                          : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-gray-200 dark:shadow-gray-900/30 border-gray-200 dark:border-gray-600 rounded-bl-md'
                      } transition-all duration-200 hover:shadow-md`}
                    >
                      <div className="text-sm sm:text-base leading-relaxed">{msg.content}</div>
                      <div className={`text-xs mt-2 ${msg.from_id === userId ? 'text-yellow-100' : 'text-gray-500 dark:text-gray-400'} text-right`}>
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    {msg.from_id === userId && (
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1 flex-shrink-0">
                        {(userRole === 'admin' ? 'A' : 'U')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Enhanced Input Area */}
          <div className="p-4 sm:p-6 border-t border-yellow-400/30 bg-gradient-to-r from-white to-yellow-50/30 dark:from-gray-800 dark:to-gray-800/50 rounded-none sm:rounded-br-3xl backdrop-blur-sm">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Type your message here..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  disabled={loading || (userRole === 'admin' && !adminTargetId)}
                />
                {input.trim() && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">
                    Press Enter to send
                  </div>
                )}
              </div>
              
              <button
                onClick={sendMessage}
                className={`px-6 py-3 rounded-2xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 ${
                  loading || !input.trim() || (userRole === 'admin' && !adminTargetId)
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400' 
                    : 'bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-yellow-200 dark:shadow-yellow-900/30'
                }`}
                disabled={loading || !input.trim() || (userRole === 'admin' && !adminTargetId)}
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #fbbf24, #f59e0b);
          border-radius: 6px;
          transition: background 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #f59e0b, #d97706);
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 251, 235, 0.3);
          border-radius: 6px;
        }
        
        /* Dark mode scrollbar */
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.3);
        }
        
        /* Smooth animations */
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .chat-drawer {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ChatDrawer;
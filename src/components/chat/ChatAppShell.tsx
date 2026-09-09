import React, { useState, useEffect, useRef } from 'react';
import { User, Message, RagDocument, ChatSession } from '../../types';
import { PrimaryMode } from './PrimaryMode';
import { JssSssChat } from './JssSssChat';
import { UniversityChat } from './UniversityChat';
import { EducationSettingsModal } from './EducationSettingsModal';
import { LogoutConfirmModal } from './LogoutConfirmModal';
import { ThemePickerModal } from './ThemePickerModal';
import { getThemeById, getUserStoredTheme, setUserStoredTheme } from '../../lib/theme';
import { AlertTriangle, X } from 'lucide-react';

interface ChatAppShellProps {
  onNavigate: (route: string) => void;
}

export const ChatAppShell: React.FC<ChatAppShellProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [activeDoc, setActiveDoc] = useState<RagDocument | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showThemeModal, setShowThemeModal] = useState<boolean>(false);
  const [currentTheme, setCurrentTheme] = useState<string>('obsidian');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load user, token, background theme and session history from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('vortex_user');
      const storedToken = localStorage.getItem('vortex_token');

      if (!storedUser || !storedToken) {
        onNavigate('/sign-up-login-screen');
        return;
      }

      const parsedUser: User = JSON.parse(storedUser);
      setUser(parsedUser);
      setToken(storedToken);

      // Initialize individual user background theme
      const storedTheme = getUserStoredTheme(parsedUser.email);
      setCurrentTheme(storedTheme);

      // Load saved sessions from local storage
      const storedSessions = localStorage.getItem(`vortex_sessions_${parsedUser.email}`);
      let parsedSessions: ChatSession[] = [];
      if (storedSessions) {
        try {
          parsedSessions = JSON.parse(storedSessions);
          setSessions(parsedSessions);
        } catch {
          parsedSessions = [];
        }
      }

      // Initialize default session if none exists
      if (parsedSessions.length > 0) {
        const latest = parsedSessions[0];
        setCurrentSessionId(latest.id);
        setMessages(latest.messages || []);
        setActiveDoc(latest.activeDoc || null);
      } else {
        const newId = `session_${Date.now()}`;
        setCurrentSessionId(newId);
      }

      // Check for any initial prompt set by landing page prompt cards
      const initialPrompt = localStorage.getItem('vortex_initial_prompt');
      if (initialPrompt) {
        localStorage.removeItem('vortex_initial_prompt');
        setTimeout(() => {
          handleSendMessageWithUser(initialPrompt, parsedUser, storedToken);
        }, 400);
      }
    } catch (e) {
      onNavigate('/sign-up-login-screen');
    }
  }, []);

  // Persist sessions whenever messages, activeDoc, or currentSessionId changes
  const saveCurrentSession = (
    newMessages: Message[],
    doc: RagDocument | null,
    sessionId: string,
    currentUser: User
  ) => {
    if (!sessionId || !currentUser) return;
    if (newMessages.length === 0) return;

    setSessions((prev) => {
      const firstUserMsg = newMessages.find((m) => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 42) : 'Study Session';

      const existingIndex = prev.findIndex((s) => s.id === sessionId);
      let updated: ChatSession[];

      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          title: updated[existingIndex].title || title,
          messages: newMessages,
          activeDoc: doc,
          updatedAt: new Date().toISOString(),
        };
        // Bring active session to top
        const [target] = updated.splice(existingIndex, 1);
        updated.unshift(target);
      } else {
        const newSession: ChatSession = {
          id: sessionId,
          title,
          messages: newMessages,
          activeDoc: doc,
          updatedAt: new Date().toISOString(),
        };
        updated = [newSession, ...prev];
      }

      try {
        localStorage.setItem(`vortex_sessions_${currentUser.email}`, JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to persist chat sessions:', err);
      }

      return updated;
    });
  };

  const handleSelectSession = (sessionId: string) => {
    const found = sessions.find((s) => s.id === sessionId);
    if (found) {
      setCurrentSessionId(found.id);
      setMessages(found.messages || []);
      setActiveDoc(found.activeDoc || null);
      setErrorMessage(null);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!user) return;
    const updated = sessions.filter((s) => s.id !== sessionId);
    setSessions(updated);
    try {
      localStorage.setItem(`vortex_sessions_${user.email}`, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        setCurrentSessionId(updated[0].id);
        setMessages(updated[0].messages || []);
        setActiveDoc(updated[0].activeDoc || null);
      } else {
        const newId = `session_${Date.now()}`;
        setCurrentSessionId(newId);
        setMessages([]);
        setActiveDoc(null);
      }
    }
  };

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([]);
    setActiveDoc(null);
    setErrorMessage(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('vortex_user', JSON.stringify(updatedUser));
    if (token) {
      fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUser),
      }).catch((err) => console.warn('Sync profile error:', err));
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '⏹️ *Generation stopped by user.*',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSendMessageWithUser = async (
    text: string,
    currentUser: User,
    currentToken: string,
    currentDoc: RagDocument | null = activeDoc,
    image?: { data: string; mimeType: string } | null
  ) => {
    if (!text.trim() && !image) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage: Message = {
      role: 'user',
      content: text.trim() || (image ? '📷 [Attached Exam Past Question Photo]' : ''),
      timestamp: new Date().toISOString(),
      attachedDoc: currentDoc?.fileName,
      image: image || undefined,
      imageUrl: image?.data || undefined,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsThinking(true);
    setErrorMessage(null);

    const activeSessionId = currentSessionId || `session_${Date.now()}`;
    if (!currentSessionId) setCurrentSessionId(activeSessionId);

    // Save immediately with user message
    saveCurrentSession(nextMessages, currentDoc, activeSessionId, currentUser);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          message: text.trim(),
          image: image || undefined,
          educationLevel: currentUser.educationLevel,
          classYear: currentUser.classYear,
          course: currentUser.course,
          ragContext: currentDoc?.textPreview || undefined,
          history: messages.slice(-8).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to communicate with VORTEX AI');
      }

      const aiMessage: Message = {
        role: 'assistant',
        content: data.reply || data.response || 'No response generated',
        timestamp: new Date().toISOString(),
        ragSource: Boolean(data.ragSourceUsed),
      };

      const finalMessages = [...nextMessages, aiMessage];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages, currentDoc, activeSessionId, currentUser);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      setErrorMessage(err.message || 'Unable to connect to VORTEX AI. Please try again.');
      const errAiMessage: Message = {
        role: 'assistant',
        content: `⚠️ **Notice**: ${err.message || 'Failed to receive reply.'}\n\nPlease try asking again.`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...nextMessages, errAiMessage];
      setMessages(finalMessages);
      saveCurrentSession(finalMessages, currentDoc, activeSessionId, currentUser);
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = (text: string, image?: { data: string; mimeType: string }) => {
    if (!user || !token) return;
    handleSendMessageWithUser(text, user, token, activeDoc, image);
  };

  const handleUploadSuccess = (info: {
    fileName: string;
    chunksCount: number;
    textPreview?: string;
    fullText?: string;
  }) => {
    const docRecord: RagDocument = {
      fileName: info.fileName,
      chunksCount: info.chunksCount,
      textPreview: info.textPreview,
      fullText: info.fullText,
      uploadedAt: new Date().toISOString(),
    };
    setActiveDoc(docRecord);
  };

  const handleClearDoc = () => {
    setActiveDoc(null);
  };

  const handleLogout = () => {
    handleConfirmLogout();
  };

  const handleConfirmLogout = () => {
    localStorage.removeItem('vortex_user');
    localStorage.removeItem('vortex_token');
    localStorage.removeItem('vortex_initial_prompt');
    localStorage.setItem('vortex_auth_mode', 'login');
    window.location.hash = 'login';
    onNavigate('/sign-up-login-screen#login');
  };

  const handleSelectTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    setUserStoredTheme(themeId, user?.email);
    if (user) {
      const updatedUser = { ...user, theme: themeId };
      setUser(updatedUser);
      try {
        localStorage.setItem('vortex_user', JSON.stringify(updatedUser));
      } catch {
        // ignore
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-stone-400">Loading Assistant...</p>
        </div>
      </div>
    );
  }

  const normalizedLevel = (user.educationLevel || '').toLowerCase();

  return (
    <div className={`relative h-full w-full overflow-hidden transition-all duration-300 theme-${currentTheme}`}>
      {/* Global Education Settings Modal (Includes Student Profile, Academic Stage & Themes) */}
      <EducationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={user}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
        currentThemeId={currentTheme}
        onSelectTheme={handleSelectTheme}
        sessionsCount={sessions.length}
        activeDoc={activeDoc}
      />

      {/* Global Theme / Background Picker Modal */}
      <ThemePickerModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentThemeId={currentTheme}
        onSelectTheme={handleSelectTheme}
      />

      {/* Global Error Toast */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-rose-950/90 border border-rose-600 text-rose-200 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-100 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Adaptive Render Based on Education Level */}
      {normalizedLevel.includes('primary') ? (
        <PrimaryMode
          user={user}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isThinking={isThinking}
          onLogout={handleLogout}
          onOpenSettings={() => setShowSettingsModal(true)}
          currentThemeId={currentTheme}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      ) : normalizedLevel.includes('jss') || normalizedLevel.includes('sss') || normalizedLevel.includes('secondary') ? (
        <JssSssChat
          user={user}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isThinking={isThinking}
          onLogout={handleLogout}
          token={token}
          activeDoc={activeDoc}
          onUploadSuccess={handleUploadSuccess}
          onClearDoc={handleClearDoc}
          onOpenSettings={() => setShowSettingsModal(true)}
          currentThemeId={currentTheme}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      ) : (
        <UniversityChat
          user={user}
          messages={messages}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          isThinking={isThinking}
          onLogout={handleLogout}
          token={token}
          activeDoc={activeDoc}
          onUploadSuccess={handleUploadSuccess}
          onClearDoc={handleClearDoc}
          onNewChat={handleNewChat}
          onOpenSettings={() => setShowSettingsModal(true)}
          currentThemeId={currentTheme}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
        />
      )}
    </div>
  );
};

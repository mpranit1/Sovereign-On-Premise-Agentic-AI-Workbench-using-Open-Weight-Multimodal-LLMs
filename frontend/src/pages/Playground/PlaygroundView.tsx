import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Square, Copy, Check, Paperclip, Plus, Trash2, 
  Settings, Sliders, Sparkles, Image as ImageIcon, FileText, 
  RefreshCw, Bot, User as UserIcon
} from 'lucide-react';
import { api } from '../../services/api';
import { ModelRecord, Conversation, ChatMessage } from '../../types';

export const PlaygroundView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  
  // Inference options
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showSettings, setShowSettings] = useState(false);

  // Streaming and status
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load models & conversations on mount
  useEffect(() => {
    loadModels();
    loadConversations();
  }, []);

  const loadModels = async () => {
    try {
      const list = await api.listModels();
      setModels(list);
      if (list.length > 0) {
        setSelectedModelId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadConversations = async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        selectConversation(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    try {
      const conv = await api.getConversation(id);
      setMessages(conv.messages || []);
      if (conv.model_id) setSelectedModelId(conv.model_id);
    } catch (e) {
      console.error(e);
    }
  };

  const createNewConversation = async () => {
    try {
      const conv = await api.createConversation("New Conversation", selectedModelId);
      setConversations([conv, ...conversations]);
      setActiveConvId(conv.id);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter(c => c.id !== id);
      setConversations(remaining);
      if (activeConvId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments([...attachments, ...files]);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSendMessage = async () => {
    if ((!inputPrompt.trim() && attachments.length === 0) || isGenerating) return;

    let targetConvId = activeConvId;
    if (!targetConvId) {
      const newConv = await api.createConversation(inputPrompt.slice(0, 30) || "Conversation", selectedModelId);
      setConversations([newConv, ...conversations]);
      targetConvId = newConv.id;
      setActiveConvId(newConv.id);
    }

    // Process attachments
    const attachedMeta: any[] = [];
    for (const f of attachments) {
      try {
        const uploaded = await api.uploadAttachment(targetConvId, f);
        attachedMeta.push({ name: f.name, size: f.size, type: f.type, id: uploaded.id });
      } catch (err) {
        attachedMeta.push({ name: f.name, size: f.size, type: f.type });
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputPrompt,
      attachments: attachedMeta.length > 0 ? attachedMeta : undefined,
      created_at: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setAttachments([]);
    setIsGenerating(true);

    // Placeholder for assistant stream
    const assistantIndex = newMessages.length;
    setMessages([...newMessages, { role: 'assistant', content: '', created_at: new Date().toISOString() }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: selectedModelId,
          conversation_id: targetConvId,
          messages: newMessages,
          options: {
            temperature,
            top_p: topP,
            max_tokens: maxTokens
          }
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error('Streaming request failed.');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr) {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.token) {
                    fullAssistantText += parsed.token;
                    setMessages(prev => {
                      const updated = [...prev];
                      if (updated[assistantIndex]) {
                        updated[assistantIndex].content = fullAssistantText;
                      }
                      return updated;
                    });
                  }
                  if (parsed.done) {
                    break;
                  }
                } catch {}
              }
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          if (updated[assistantIndex]) {
            updated[assistantIndex].content = `[Generation error: ${e.message}]`;
          }
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const selectedModel = models.find(m => m.id === selectedModelId);

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Left Conversation Drawer */}
      <div className="w-72 bg-[#111827] border-r border-[#1F293D] flex flex-col shrink-0">
        <div className="p-3 border-b border-[#1F293D]">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold shadow transition"
          >
            <Plus size={16} />
            <span>New Conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No conversations yet.</p>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs transition ${
                  activeConvId === conv.id 
                    ? 'bg-[#151D2E] text-white font-medium border border-[#1F293D]' 
                    : 'text-gray-400 hover:bg-[#151D2E]/60 hover:text-gray-200'
                }`}
              >
                <span className="truncate pr-2">{conv.title}</span>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-rose-400 text-gray-500 transition"
                  title="Delete conversation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Stage */}
      <div className="flex-1 flex flex-col bg-[#0B0F19] overflow-hidden">
        {/* Model Bar & Parameters Toggle */}
        <div className="h-14 border-b border-[#1F293D] px-6 flex items-center justify-between bg-[#111827]/70">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-gray-400 uppercase">Model:</span>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="bg-[#151D2E] border border-[#1F293D] text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>

            {/* Capability Badges */}
            <div className="hidden md:flex items-center space-x-1.5 ml-2">
              {selectedModel?.capabilities.map(cap => (
                <span 
                  key={cap}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-indigo-950/60 text-indigo-300 border border-indigo-800/40"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              showSettings ? 'bg-indigo-600 text-white' : 'bg-[#151D2E] text-gray-300 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            <span>Parameters</span>
          </button>
        </div>

        {/* Inference Parameter Drawer */}
        {showSettings && (
          <div className="bg-[#151D2E] border-b border-[#1F293D] p-4 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                <span>Temperature</span>
                <span>{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                <span>Top P</span>
                <span>{topP}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={e => setTopP(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-300 font-medium mb-1">
                <span>Max Output Tokens</span>
                <span>{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Messages Stream Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 text-gray-400">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles size={24} />
              </div>
              <h3 className="text-base font-bold text-white">Sovereign Multimodal Chat</h3>
              <p className="text-xs text-gray-400">
                Prompts, images, documents, and tool executions stay 100% on your internal server.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex space-x-3.5 max-w-3xl ${msg.role === 'user' ? 'ml-auto justify-end' : ''}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Bot size={16} />
                  </div>
                )}

                <div 
                  className={`rounded-2xl px-5 py-3.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#6366F1] text-white rounded-tr-none'
                      : 'bg-[#151D2E] text-gray-200 border border-[#1F293D] rounded-tl-none shadow-sm'
                  }`}
                >
                  {/* Attachments preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {msg.attachments.map((att: any, aIdx: number) => (
                        <div key={aIdx} className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#0B0F19]/40 text-xs">
                          <Paperclip size={12} />
                          <span className="truncate max-w-[150px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {msg.content || (isGenerating && idx === messages.length - 1 ? (
                      <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1" />
                    ) : '')}
                  </div>

                  {msg.role === 'assistant' && msg.content && (
                    <div className="mt-2.5 pt-2 border-t border-[#1F293D]/60 flex items-center justify-between text-[11px] text-gray-400">
                      <span>{selectedModel?.name || 'Local Model'}</span>
                      <button
                        onClick={() => copyToClipboard(msg.content, idx)}
                        className="hover:text-white flex items-center space-x-1 transition"
                        title="Copy to clipboard"
                      >
                        {copiedIdx === idx ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedIdx === idx ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <UserIcon size={16} />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#111827] border-t border-[#1F293D]">
          {/* File attachments badge tray */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, fIdx) => (
                <div key={fIdx} className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#151D2E] border border-[#1F293D] text-xs text-indigo-300">
                  <FileText size={12} />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button 
                    onClick={() => setAttachments(attachments.filter((_, i) => i !== fIdx))}
                    className="text-gray-400 hover:text-rose-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-3 bg-[#151D2E] border border-[#1F293D] rounded-xl px-4 py-2 focus-within:border-indigo-500 transition">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*,.pdf,.docx,.txt,.csv,.xlsx"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-indigo-400 transition"
              title="Attach Multimodal Image or Document"
            >
              <Paperclip size={18} />
            </button>

            <textarea
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Send message to ${selectedModel?.name || 'Local Model'}...`}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none resize-none max-h-32"
            />

            {isGenerating ? (
              <button
                onClick={stopGeneration}
                className="p-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition shadow"
                title="Stop Generation"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={!inputPrompt.trim() && attachments.length === 0}
                className="p-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white transition disabled:opacity-40 shadow"
                title="Send"
              >
                <Send size={16} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            Air-Gapped Sovereign AI Execution. Models and embeddings run strictly on-premise.
          </p>
        </div>
      </div>
    </div>
  );
};

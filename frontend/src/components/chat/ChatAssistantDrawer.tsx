import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PartDimensions, MaterialProperties, FullCalculationResult, ManufacturingProcessType } from '@shared/types';
import { OriginBadge } from '../ui/OriginBadge';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dimensions: PartDimensions | null;
  material: MaterialProperties | null;
  calculation: FullCalculationResult | null;
  selectedProcess?: ManufacturingProcessType;
  rawPricePerKg?: number;
}

const QUICK_PROMPTS = [
  'Why this material?',
  'How can I reduce cost?',
  'What if quantity increases?',
  'When should the process change?',
  'Why is break-even high?'
];

export const ChatAssistantDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  dimensions,
  material,
  calculation,
  selectedProcess,
  rawPricePerKg
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (messageText: string) => {
    const text = messageText.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          userMessage: text,
          context: {
            dimensions,
            material,
            calculation,
            selectedProcess,
            rawPricePerKg
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to query assistant.');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        content: data.response || 'No response returned.',
        timestamp: new Date().toISOString(),
        groundedFactsCited: data.groundedFactsCited || []
      };

      setMessages([...newHistory, botMsg]);
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now()}_e`,
        sender: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Please check your connection.`,
        timestamp: new Date().toISOString()
      };
      setMessages([...newHistory, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-left">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Ask ManufactureAI</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-500/40 text-indigo-300">
                Gemma 4
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">Strictly grounded in current part data</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-3 bg-slate-950/50 border-b border-slate-800 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 hover:bg-indigo-950 border border-slate-700/80 hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-indigo-200 transition-colors cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <Bot className="w-10 h-10 text-indigo-400/50 mb-3" />
            <h4 className="text-sm font-bold text-slate-200 mb-1">Gemma 4 Manufacturing Copilot</h4>
            <p className="text-xs max-w-xs text-slate-400 leading-relaxed mb-4">
              I am initialized with all verified geometry, material costs, and break-even figures for this part. Click a prompt above or ask any manufacturing question.
            </p>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Grounded in project data • Never invents numbers</span>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>

                {msg.groundedFactsCited && msg.groundedFactsCited.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                      Verified Facts Cited:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {msg.groundedFactsCited.map((fact, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono-num"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 max-w-[80%]">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
            <span>Gemma 4 is synthesizing grounded answer...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend(input);
        }}
        className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about material, cycle time, cost..."
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

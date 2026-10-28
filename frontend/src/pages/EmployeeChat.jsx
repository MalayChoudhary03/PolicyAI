import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, BookOpen, Zap, AlertCircle, Sparkles, 
  RotateCcw, Clock, Hash, Cpu
} from 'lucide-react';
import { api } from '../services/api';

export default function EmployeeChat() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am **PolicyAI**, your company policy assistant. You can ask me any question about working hours, remote work stipends, annual leave, travel expenses, or conduct policies.\n\nAll answers are strictly verified and cited from our official company policy documents.',
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [modelName, setModelName] = useState('Llama 3.2 (3B)');
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let intervalId;
    const checkHealth = () => {
      api.getHealth().then(res => {
        const m = res.services?.ollama?.activeModel || '';
        if (m.includes('1b')) setModelName('Llama 3.2 (1B High-Speed)');
        else if (m.includes('3b')) setModelName('Llama 3.2 (3B)');
        else if (m) setModelName(m);

        const warming = Boolean(res.services?.cagCache?.isWarmingUp);
        const warmed = Boolean(res.services?.cagCache?.isWarmedUp);
        setIsWarmingUp(warming);
        setIsWarmedUp(warmed);

        if (!warming && intervalId) {
          clearInterval(intervalId);
        }
      }).catch(() => {});
    };

    checkHealth();
    intervalId = setInterval(checkHealth, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let timer;
    if (loading) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const suggestedQuestions = [
    'What are the core hours for remote workers?',
    'How many annual leave days do I accrue each month?',
    'What is the daily meal per diem for domestic travel?',
    'What is the company policy regarding lunar and space travel?'
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (questionText = null) => {
    const query = (questionText || input).trim();
    if (!query || loading) return;

    setInput('');
    setError(null);

    const userMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage = {
      id: assistantId,
      sender: 'assistant',
      text: '',
      citations: [],
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setLoading(true);

    let accumulatedText = '';

    try {
      await api.askQuestionStream(
        query,
        (chunk) => {
          accumulatedText += chunk;
          const displayStreamText = accumulatedText
            .replace(/(?:Citation:\s*)?\[(?:Citation:\s*)?(?:Document\s*\d+:\s*)?[^|\]]+\|\s*Section:[\s\S]*$/i, '')
            .replace(/\[Citation:[\s\S]*$/i, '')
            .replace(/Citation:\s*\[[\s\S]*$/i, '')
            .trimEnd();
          setMessages(prev => prev.map(m => {
            if (m.id === assistantId) {
              return { ...m, text: displayStreamText || accumulatedText };
            }
            return m;
          }));
        },
        (finalData) => {
          setMessages(prev => prev.map(m => {
            if (m.id === assistantId) {
              return {
                ...m,
                text: finalData?.answer || accumulatedText,
                citations: finalData?.citations || [],
                isCacheHit: finalData?.isCacheHit,
                contextVersion: finalData?.contextVersion,
                metrics: finalData?.metrics,
                isStreaming: false
              };
            }
            return m;
          }));
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Error communicating with server.');
          setMessages(prev => prev.filter(m => m.id !== assistantId || m.text.length > 0));
          setLoading(false);
        }
      );
    } catch (err) {
      setError(err.message || 'Error communicating with server.');
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Chat history cleared. What question can I help answer from our official policies?',
        citations: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5rem)] flex flex-col">
      {/* Top Bar with Dedicated Model Badge and Clear */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <span>Corporate Policy Chat</span>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              Strictly Grounded
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Answers are synthesized strictly from cached corporate policy documents.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isWarmingUp && (
            <div className="flex items-center space-x-1.5 text-xs bg-amber-50 text-amber-800 px-2.5 py-1.5 rounded-xl border border-amber-200 font-medium animate-pulse">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Pre-warming in background...</span>
            </div>
          )}
          {isWarmedUp && !isWarmingUp && (
            <div className="flex items-center space-x-1.5 text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-xl border border-emerald-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Context Hot</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-xs bg-indigo-50/80 text-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI Model: <strong className="font-semibold text-indigo-950">{modelName}</strong></span>
          </div>

          <button
            onClick={handleClear}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-slate-800 text-white' 
                : 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white'
            }`}>
              {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Message Bubble Container */}
            <div className={`max-w-[80%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-none'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
              }`}>
                {msg.text ? (
                  <div className="whitespace-pre-wrap">
                    {msg.text}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 bg-indigo-600 animate-pulse ml-1 align-middle rounded-xs" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-slate-500 text-xs py-1">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                    </div>
                    <span className="font-medium text-slate-600">
                      Reading cached policies & synthesizing...
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 font-mono text-[11px] text-slate-500">
                      {elapsedSeconds}s
                    </span>
                  </div>
                )}

                {/* Insufficient Info Warning */}
                {msg.text && msg.text.includes('could not find information') && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong>Notice:</strong> This policy query has no matching provisions in the published company manual. PolicyAI does not hallucinate or assume unverified corporate rules.
                    </span>
                  </div>
                )}
              </div>

              {/* Citations Card if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center space-x-1.5 font-semibold text-slate-700">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                    <span>Verified Policy Citations ({msg.citations.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {msg.citations.map((cite, cIdx) => (
                      <div key={cIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between font-medium text-slate-900">
                          <span className="text-sky-800">{cite.documentTitle}</span>
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {cite.section}
                          </span>
                        </div>
                        {cite.excerpt && (
                          <p className="mt-1 text-slate-600 italic text-[11px] border-l-2 border-sky-400 pl-2">
                            "{cite.excerpt}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CAG Performance Tag */}
              {msg.metrics && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-medium border ${
                    msg.isCacheHit 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    <Zap className="w-3 h-3" />
                    <span>{msg.isCacheHit ? 'CAG Cache Hit (0ms prep)' : 'Context Rebuilt'}</span>
                  </span>

                  <span className="inline-flex items-center space-x-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>Inference: {msg.metrics.inferenceTimeMs || 0}ms</span>
                  </span>

                  <span className="inline-flex items-center space-x-1 text-slate-500">
                    <Hash className="w-3 h-3" />
                    <span>{msg.metrics.completionTokens || 0} tokens generated</span>
                  </span>

                  <span className="text-slate-400 font-mono text-[10px]">
                    [{msg.timestamp}]
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pill bar */}
      {messages.length <= 2 && (
        <div className="py-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-sky-500" />
            <span>Sample Policy Inquiries</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={loading}
                className="text-xs bg-white hover:bg-sky-50 hover:border-sky-300 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-all text-left shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-2 border-t border-slate-200"
      >
        <div className="flex items-center space-x-2 bg-white rounded-2xl border border-slate-300 p-2 shadow-sm focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask a question about leave, remote work, equipment, or business conduct..."
            className="flex-1 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white rounded-xl shadow-sm transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

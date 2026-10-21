import React, { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  AlertCircle, 
  User, 
  Bot,
  ExternalLink,
  BookOpen
} from 'lucide-react'
import { safeJson } from '../utils/api'

export default function ChatTab({ setActiveTab, health, onToast }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your local AI document assistant. Ask me anything about your uploaded PDFs, and I will answer with verified page citations and source snippets.',
      sources: []
    }
  ])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [copiedId, setCopiedId] = useState(null)
  const [expandedSourceId, setExpandedSourceId] = useState(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  const samplePrompts = [
    "What is the minimum attendance required for end-semester exams?",
    "What is the annual tuition fee for B.Tech?",
    "When is the library open?",
    "What is the hostel capacity?",
    "What was the highest placement package in 2025?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    onToast('Answer copied to clipboard', 'info')
  }

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat cleared. How can I help you explore your documents?',
        sources: []
      }
    ])
    onToast('Chat history cleared', 'info')
  }

  const handleSend = async (questionText = input) => {
    const q = questionText.trim()
    if (!q || isStreaming) return

    if (!health?.index?.has_index) {
      onToast('No documents indexed! Please upload PDFs in the Documents tab first.', 'warning')
      return
    }

    const userMsgId = 'user-' + Date.now()
    const assistantMsgId = 'asst-' + Date.now()

    const newMessages = [
      ...messages,
      { id: userMsgId, role: 'user', content: q },
      { id: assistantMsgId, role: 'assistant', content: '', sources: [], streaming: true }
    ]

    setMessages(newMessages)
    setInput('')
    setIsStreaming(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          stream: true
        })
      })

      if (!response.ok) {
        const errJson = await safeJson(response).catch(() => ({}))
        throw new Error(errJson.detail || `Server returned error status ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      let fullAnswer = ''
      let capturedSources = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep unparsed remainder

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))
            if (data.type === 'sources') {
              capturedSources = data.sources || []
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, sources: capturedSources } : m))
            } else if (data.type === 'token') {
              fullAnswer += data.token
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullAnswer } : m))
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, streaming: false, total_time: data.total_time } : m))
            } else if (data.type === 'error') {
              fullAnswer += `\n\n⚠️ Error: ${data.message}`
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: fullAnswer, streaming: false } : m))
              onToast(data.message, 'error')
            }
          } catch (e) {
            console.error('SSE JSON parse error:', e, trimmed)
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, streaming: false } : m))
    } catch (err) {
      console.error('Chat request failed:', err)
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { 
        ...m, 
        content: `Error: ${err.message}. Please check if Ollama is running on http://localhost:11434.`, 
        streaming: false 
      } : m))
      onToast(err.message, 'error')
    } finally {
      setIsStreaming(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Chat Header Actions */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-base">Conversation</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {messages.filter(m => m.role === 'user').length} queries
          </span>
        </div>

        <button
          onClick={handleClear}
          disabled={isStreaming}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'

          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[78%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-normal">
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-brand-400 animate-pulse align-middle" />
                    )}
                  </div>

                  {!isUser && !msg.streaming && msg.content && msg.id !== 'welcome' && (
                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        {msg.total_time && (
                          <span className="font-mono text-[11px] text-slate-500">
                            Latency: {msg.total_time}s
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
                        title="Copy to clipboard"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Sources Section */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <BookOpen className="w-3.5 h-3.5 text-brand-400" />
                      <span>Retrieved Sources ({msg.sources.length})</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {msg.sources.map((src, sIdx) => {
                        const isExpanded = expandedSourceId === `${msg.id}-${sIdx}`
                        const scorePct = Math.round((src.score || 0) * 100)

                        return (
                          <div
                            key={sIdx}
                            className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs transition-all"
                          >
                            <div 
                              onClick={() => setExpandedSourceId(isExpanded ? null : `${msg.id}-${sIdx}`)}
                              className="flex items-center justify-between cursor-pointer gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="font-medium text-slate-200 truncate">{src.source}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] shrink-0">
                                  Page {src.page}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {scorePct}% match
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                            </div>

                            {/* Snippet dropdown */}
                            {isExpanded && (
                              <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                                {src.text}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Chips (shown when only welcome message exists) */}
      {messages.length <= 1 && (
        <div className="py-2">
          <p className="text-xs text-slate-500 font-medium mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(p)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-brand-500/40 text-slate-300 hover:text-white transition-all text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="pt-2 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="relative flex items-center gap-2 bg-slate-900/90 rounded-2xl border border-slate-800 focus-within:border-brand-500/60 focus-within:ring-2 focus-within:ring-brand-500/20 shadow-xl p-2 transition-all"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              health?.index?.has_index
                ? "Ask a question about your documents... (Press Enter to send)"
                : "Upload and index documents to start asking questions..."
            }
            disabled={isStreaming}
            className="flex-1 bg-transparent px-3 py-1 text-sm text-white placeholder-slate-500 focus:outline-none resize-none max-h-32 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!input.trim() || isStreaming || !health?.index?.has_index}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-brand-600/30 transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-2">
          Strictly grounded in your local documents. Running offline via Ollama model llama3.2:3b.
        </p>
      </div>
    </div>
  )
}

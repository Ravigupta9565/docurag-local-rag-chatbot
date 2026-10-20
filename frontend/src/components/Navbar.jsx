import React from 'react'
import { BookOpen, MessageSquare, FileText, BarChart3, Settings, ShieldCheck, Activity } from 'lucide-react'

export default function Navbar({ activeTab, setActiveTab, health }) {
  const navItems = [
    { id: 'home', label: 'Overview', icon: BookOpen },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText, badge: health?.index?.document_count },
    { id: 'eval', label: 'Evaluation', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const isOllamaOk = health?.ollama?.status === 'connected'
  const hasIndex = Boolean(health?.index?.has_index)
  const chunkCount = typeof health?.index?.chunk_count === 'number' ? health.index.chunk_count : 0
  const chunkText = health === null 
    ? 'Checking...' 
    : hasIndex && chunkCount > 0 
      ? `${chunkCount} ${chunkCount === 1 ? 'chunk' : 'chunks'}` 
      : 'Empty'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-white tracking-tight">DocuRAG</span>
              <span className="hidden lg:inline-flex px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md uppercase tracking-wider items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% Local
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden xl:block">Private Offline RAG Chatbot</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-0.5 sm:gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-2 sm:px-2.5 md:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* System Health Pill */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOllamaOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">Ollama:</span>
              <span className={isOllamaOk ? 'text-emerald-400' : 'text-rose-400 font-medium'}>
                {isOllamaOk ? 'Online' : 'Offline'}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${hasIndex && chunkCount > 0 ? 'bg-sky-400' : 'bg-amber-400'}`} />
              <span className="text-slate-300 font-medium">Index:</span>
              <span className={hasIndex && chunkCount > 0 ? 'text-sky-400 font-medium' : 'text-amber-400'}>
                {chunkText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

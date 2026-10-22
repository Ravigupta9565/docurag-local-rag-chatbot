import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import HomeTab from './components/HomeTab'
import ChatTab from './components/ChatTab'
import DocumentsTab from './components/DocumentsTab'
import EvalTab from './components/EvalTab'
import SettingsTab from './components/SettingsTab'
import Toast from './components/Toast'
import { ShieldCheck } from 'lucide-react'
import profileConfig from './config/profile'
import { API_BASE_URL, safeJson } from './utils/api'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [health, setHealth] = useState(null)
  const [toasts, setToasts] = useState([])

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`)
      if (res.ok) {
        const data = await safeJson(res)
        setHealth(data)
      }
    } catch (err) {
      console.warn('Health check unreachable:', err)
    }
  }

  useEffect(() => {
    document.title = `DocuRAG | Developed by ${profileConfig.name}`
    fetchHealth()
    const timer = setInterval(fetchHealth, 15000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 selection:bg-brand-500 selection:text-white overflow-x-hidden">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        health={health}
      />

      {/* Main Tab Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === 'home' && (
          <HomeTab
            setActiveTab={setActiveTab}
            health={health}
            onReindex={fetchHealth}
          />
        )}

        {activeTab === 'chat' && (
          <ChatTab
            setActiveTab={setActiveTab}
            health={health}
            onToast={addToast}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsTab
            onToast={addToast}
            onRefreshHealth={fetchHealth}
          />
        )}

        {activeTab === 'eval' && (
          <EvalTab
            onToast={addToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            onToast={addToast}
            onRefreshHealth={fetchHealth}
            health={health}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-slate-400">
            <span className="font-semibold text-white">DocuRAG</span>
            <span className="text-slate-600">·</span>
            <span>Developed by {profileConfig.name}</span>
            <span className="text-slate-600">·</span>
            <span>{profileConfig.university}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Local Retrieval-Augmented Generation Platform</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Offline and Private
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

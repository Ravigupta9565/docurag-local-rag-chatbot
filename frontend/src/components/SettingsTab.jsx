import React, { useState, useEffect } from 'react'
import { 
  Sliders, 
  Cpu, 
  Database, 
  Save, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  HardDrive, 
  Folder,
  Layers,
  Sparkles
} from 'lucide-react'

export default function SettingsTab({ onToast, onRefreshHealth, health }) {
  const [topK, setTopK] = useState(6)
  const [minScore, setMinScore] = useState(0.15)
  const [selectedModel, setSelectedModel] = useState('llama3.2:3b')
  const [availableModels, setAvailableModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      const data = await res.json()
      if (data.settings) {
        setTopK(data.settings.top_k ?? 6)
        setMinScore(data.settings.min_score ?? 0.15)
        setSelectedModel(data.settings.llm_model || 'llama3.2:3b')
      }
      setAvailableModels(data.available_models || ['llama3.2:3b'])
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          top_k: Number(topK),
          min_score: Number(minScore),
          llm_model: selectedModel
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to save settings')
      onToast('Settings successfully updated!', 'success')
      onRefreshHealth()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setTopK(6)
    setMinScore(0.15)
    setSelectedModel('llama3.2:3b')
    onToast('Reset to default values (k=6, min_score=0.15)', 'info')
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">System & Model Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Tune retrieval hyperparameters, switch local Ollama models, and review air-gapped system health.
        </p>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Retrieval Parameters</h2>
          </div>

          {/* Model Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Ollama LLM Model
            </label>
            <div className="flex gap-3">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 'llama3.2:3b' ? '(Recommended Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Discovered from your local Ollama engine at <code className="text-slate-400">http://localhost:11434</code>.
            </p>
          </div>

          {/* Top-K Retrieval */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                Top-K Chunks to Retrieve
              </label>
              <span className="font-mono text-sm px-2.5 py-1 rounded-md bg-slate-800 text-sky-400 font-bold">
                k = {topK}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-brand-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>1 chunk (ultra focused)</span>
              <span>4 chunks (default)</span>
              <span>10 chunks (broad context)</span>
            </div>
          </div>

          {/* MIN_SCORE Threshold */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                Similarity Score Cutoff (MIN_SCORE)
              </label>
              <span className="font-mono text-sm px-2.5 py-1 rounded-md bg-slate-800 text-emerald-400 font-bold">
                {Number(minScore).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.80"
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-emerald-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>0.00 (allow all matches)</span>
              <span>0.20 (original filter)</span>
              <span>0.80 (strict similarity)</span>
            </div>
            <p className="text-xs text-slate-500">
              Chunks with cosine inner-product similarity below this threshold are discarded to prevent out-of-scope hallucinations.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Diagnostics Card */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <Database className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">System Diagnostics & Environment</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Backend API</span>
            <div className="flex items-center gap-2 font-mono text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>http://127.0.0.1:8000</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Ollama Engine</span>
            <div className="flex items-center gap-2 font-mono text-slate-200">
              <span className={`w-2 h-2 rounded-full ${health?.ollama?.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span>http://localhost:11434 ({health?.ollama?.status || 'checking'})</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Embedding Model</span>
            <div className="font-mono text-slate-200">
              all-MiniLM-L6-v2 (384 dimensions)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500">Active FAISS Index</span>
            <div className="font-mono text-sky-400 font-semibold">
              {health?.index?.has_index ? `${health.index.chunk_count} chunks indexed` : 'No index found'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 sm:col-span-2">
            <span className="text-slate-500">Drive Constraints (D: Only Storage)</span>
            <div className="font-mono text-slate-300 text-[11px] space-y-0.5">
              <div>• Project Root: <span className="text-slate-400">D:\rag-chatbot</span></div>
              <div>• Pip Cache: <span className="text-slate-400">D:\pip-cache</span> | HF Cache: <span className="text-slate-400">D:\hf-cache</span> | NPM Cache: <span className="text-slate-400">D:\npm-cache</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

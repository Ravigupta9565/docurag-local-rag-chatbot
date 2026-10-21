import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Target, 
  Zap, 
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { safeJson } from '../utils/api'

export default function EvalTab({ onToast }) {
  const [evalData, setEvalData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [runTimer, setRunTimer] = useState(0)
  const [filterType, setFilterType] = useState('all') // all, in-scope, out-of-scope, failed
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEval = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/eval', {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.detail || 'Failed to load evaluation results')
      setEvalData(data)
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEval()
  }, [])

  useEffect(() => {
    let interval = null
    if (running) {
      interval = setInterval(() => {
        setRunTimer((t) => t + 1)
      }, 1000)
    } else {
      setRunTimer(0)
    }
    return () => clearInterval(interval)
  }, [running])

  const handleRunBenchmark = async () => {
    setRunning(true)
    try {
      const res = await fetch('/api/eval/run', { 
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      const data = await safeJson(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Benchmark evaluation failed')
      }

      setEvalData(data)
      onToast('Evaluation benchmark completed successfully!', 'success')
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  const metrics = evalData?.metrics || {
    retrieval_hit_rate: 0,
    answer_accuracy: 0,
    refusal_rate: 0,
    avg_response_time: 0,
    total_tests: 0,
    in_scope_count: 0,
    out_of_scope_count: 0
  }

  const filteredRows = (evalData?.rows || []).filter((r) => {
    if (filterType === 'in-scope' && r.type !== 'in-scope') return false
    if (filterType === 'out-of-scope' && r.type !== 'out-of-scope') return false
    if (filterType === 'failed' && r.correct) return false
    if (searchQuery && !r.question.toLowerCase().includes(searchQuery.toLowerCase()) && !r.answer.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header and Run Benchmark CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">RAG Evaluation & Benchmark</h1>
            {evalData?.last_run && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-brand-400" />
                <span>Last run: {evalData.last_run}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated quality assurance measuring retrieval hit rate, hallucination refusal, and inference latency across {metrics.total_tests || 18} test cases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchEval}
            disabled={loading || running}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-all disabled:opacity-50"
            title="Refresh from disk"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunBenchmark}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Evaluating ({runTimer}s)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Retrieval Hit Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Retrieval Hit Rate</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.retrieval_hit_rate}%</span>
            <span className="text-xs text-slate-400">of in-scope tests</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-sky-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics.retrieval_hit_rate}%` }}
            />
          </div>
        </div>

        {/* Answer Accuracy */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Answer Accuracy</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.answer_accuracy}%</span>
            <span className="text-xs text-slate-400">ground truth match</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics.answer_accuracy}%` }}
            />
          </div>
        </div>

        {/* Refusal Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Refusal Rate</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.refusal_rate}%</span>
            <span className="text-xs text-slate-400">out-of-scope rejected</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics.refusal_rate}%` }}
            />
          </div>
        </div>

        {/* Average Latency */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Avg Latency</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{metrics.avg_response_time}s</span>
            <span className="text-xs text-slate-400">per inference</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {metrics.total_tests || 0} total cases ({metrics.in_scope_count || 0} in-scope + {metrics.out_of_scope_count || 0} out-of-scope)
          </div>
        </div>
      </div>

      {/* Visual Chart / Breakdown Card */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-white">Benchmark Accuracy Distribution</h2>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-300">Retrieval Hit Rate ({metrics.in_scope_count} In-Scope Queries)</span>
              <span className="text-sky-400 font-mono font-bold">{metrics.retrieval_hit_rate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-sky-500 to-brand-400 h-full rounded-full transition-all duration-500" style={{ width: `${metrics.retrieval_hit_rate}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-300">Answer Accuracy ({metrics.in_scope_count} In-Scope Queries)</span>
              <span className="text-emerald-400 font-mono font-bold">{metrics.answer_accuracy}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${metrics.answer_accuracy}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-slate-300">Refusal Rate ({metrics.out_of_scope_count} Out-of-Scope Queries)</span>
              <span className="text-amber-400 font-mono font-bold">{metrics.refusal_rate}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${metrics.refusal_rate}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Results Table with Horizontal Scroll */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">Evaluation Test Cases</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredRows.length} of {evalData?.rows?.length || 0}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('in-scope')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterType === 'in-scope' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In-Scope
              </button>
              <button
                onClick={() => setFilterType('out-of-scope')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterType === 'out-of-scope' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Out-of-Scope
              </button>
              <button
                onClick={() => setFilterType('failed')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filterType === 'failed' ? 'bg-rose-950 text-rose-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Failed Only
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries..."
                className="bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
              />
            </div>
          </div>
        </div>

        {/* Responsive Table with horizontal scroll on small screens */}
        <div className="overflow-x-auto w-full rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <table className="min-w-[850px] w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 w-24">Status</th>
                <th className="px-5 py-3.5 w-72">Test Question</th>
                <th className="px-4 py-3.5 w-32">Type</th>
                <th className="px-4 py-3.5 w-32">Retrieval Hit</th>
                <th className="px-4 py-3.5 w-24">Latency</th>
                <th className="px-5 py-3.5">Model Generated Answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    {row.correct ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white break-words" title={row.question}>
                    {row.question}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                      row.type === 'in-scope'
                        ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs">
                    {row.retrieval_hit === null ? (
                      <span className="text-slate-600">—</span>
                    ) : row.retrieval_hit ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Miss
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                    {row.seconds}s
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-300 font-mono break-words leading-relaxed">
                    {row.answer}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

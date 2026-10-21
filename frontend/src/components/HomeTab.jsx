import React, { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  FileText,
  Files,
  ShieldAlert,
  Zap, 
  BarChart3,
  SlidersHorizontal,
  Layers, 
  ArrowRight, 
  FileUp, 
  Binary, 
  Search, 
  Bot, 
  Sparkles,
  GraduationCap,
  Code,
  Github,
  Linkedin,
  Mail,
  ExternalLink
} from 'lucide-react'
import profileConfig from '../config/profile'
import { safeJson } from '../utils/api'

export default function HomeTab({ setActiveTab, health, onReindex }) {
  const [evalData, setEvalData] = useState(null)
  const [evalLoading, setEvalLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchEval = async () => {
      try {
        const res = await fetch('/api/eval', {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        })
        if (res.ok && isMounted) {
          const data = await safeJson(res)
          setEvalData(data)
        }
      } catch (err) {
        console.warn('Failed to fetch /api/eval on home:', err)
      } finally {
        if (isMounted) setEvalLoading(false)
      }
    }
    fetchEval()
    return () => {
      isMounted = false
    }
  }, [])

  const highlightCards = [
    {
      id: 'local-private',
      title: '100% Local and Private',
      desc: 'Runs on your own computer with Ollama, your documents never leave your machine.',
      icon: ShieldCheck,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'citations',
      title: 'Source Citations',
      desc: 'Every answer shows the file, page and similarity score of the chunks it used.',
      icon: FileText,
      color: 'from-sky-500/20 to-blue-500/20 text-sky-400 border-sky-500/30'
    },
    {
      id: 'multi-pdf',
      title: 'Multi-PDF Library',
      desc: 'Upload several PDFs, index them with one click, delete any time.',
      icon: Files,
      color: 'from-indigo-500/20 to-violet-500/20 text-indigo-400 border-indigo-500/30'
    },
    {
      id: 'refusals',
      title: 'Honest Refusals',
      desc: "Says it couldn't find an answer instead of making one up when the documents don't cover the question.",
      icon: ShieldAlert,
      color: 'from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30'
    },
    {
      id: 'streaming',
      title: 'Streaming Answers',
      desc: 'Responses appear token by token with latency shown.',
      icon: Zap,
      color: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30'
    },
    {
      id: 'eval-dashboard',
      title: 'Evaluation Dashboard',
      desc: 'Retrieval hit rate, answer accuracy and refusal rate measured on a benchmark of test questions.',
      icon: BarChart3,
      color: 'from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30',
      isEval: true
    },
    {
      id: 'tunable-retrieval',
      title: 'Tunable Retrieval',
      desc: 'Adjust top-k and the similarity threshold live in Settings.',
      icon: SlidersHorizontal,
      color: 'from-cyan-500/20 to-sky-500/20 text-cyan-400 border-cyan-500/30'
    },
    {
      id: 'smart-chunking',
      title: 'Smart Chunking',
      desc: 'Sentence-based chunking that also splits long unpunctuated text into smaller pieces for better retrieval.',
      icon: Layers,
      color: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30'
    }
  ]

  const steps = [
    {
      num: "01",
      title: "Upload PDF",
      tech: "pypdf",
      desc: "Extracts raw text page by page with scanned document heuristics.",
      icon: FileUp,
      color: "from-blue-500/20 to-sky-500/20 text-sky-400 border-sky-500/30"
    },
    {
      num: "02",
      title: "Sentence Chunking",
      tech: "Regex & Overlap",
      desc: "Segments text at sentence boundaries with rolling overlap for context preservation.",
      icon: Layers,
      color: "from-indigo-500/20 to-violet-500/20 text-indigo-400 border-indigo-500/30"
    },
    {
      num: "03",
      title: "Dense Embeddings",
      tech: "all-MiniLM-L6-v2",
      desc: "Transforms text chunks into normalized 384-dimensional vector representations.",
      icon: Binary,
      color: "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30"
    },
    {
      num: "04",
      title: "FAISS Search",
      tech: "IndexFlatIP",
      desc: "Performs high-speed cosine similarity search, filtering results by MIN_SCORE threshold.",
      icon: Search,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30"
    },
    {
      num: "05",
      title: "Local LLM",
      tech: "Ollama llama3.2:3b",
      desc: "Prompts local model with strict 'answer ONLY from context' instruction at temperature 0.",
      icon: Bot,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30"
    },
    {
      num: "06",
      title: "Streamed Answer",
      tech: "Server-Sent Events",
      desc: "Delivers live token-by-token answer accompanied by verifiable page citations & snippets.",
      icon: Sparkles,
      color: "from-rose-500/20 to-red-500/20 text-rose-400 border-rose-500/30"
    }
  ]

  const chunkCount = typeof health?.index?.chunk_count === 'number' ? health.index.chunk_count : 0
  const chunkText = health === null 
    ? 'Checking...' 
    : `${chunkCount} ${chunkCount === 1 ? 'chunk' : 'chunks'}`

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold tracking-wide shadow-inner">
          <ShieldCheck className="w-4 h-4 text-brand-400" />
          <span>Local Retrieval-Augmented Generation</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
          <span>Zero Cloud Telemetry</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] break-words">
          Ask questions about your documents.{' '}
          <span className="bg-gradient-to-r from-brand-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
            100% private, 100% local.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          Upload your PDFs and converse with your data using state-of-the-art open source models running directly on your Windows PC via FAISS and Ollama.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4">
          <button
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white font-semibold shadow-lg shadow-brand-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>Start Chatting</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold transition-all hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <FileUp className="w-4 h-4 text-brand-400" />
            <span>Manage & Upload PDFs</span>
          </button>

          <button
            onClick={() => setActiveTab('eval')}
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 border border-slate-800 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <span>View Benchmark Results</span>
          </button>
        </div>

        {/* Live Index Status Bar */}
        <div className="pt-6 w-full flex justify-center">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 px-4 sm:px-6 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-300 shadow-xl max-w-full">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Indexed Docs:</span>
              <span className="font-bold text-white">{health?.index?.document_count || 0} files</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block"></span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Vector Chunks:</span>
              <span className="font-bold text-sky-400">{chunkText}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block"></span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">LLM Engine:</span>
              <span className="font-bold text-emerald-400">llama3.2:3b</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block"></span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Embedding:</span>
              <span className="font-bold text-indigo-400">all-MiniLM-L6-v2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Section */}
      <section className="max-w-6xl mx-auto space-y-6" aria-labelledby="feature-highlights-heading">
        <div className="border-b border-slate-800 pb-4">
          <h2 id="feature-highlights-heading" className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Feature Highlights
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Everything you need to chat with your documents, privately.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {highlightCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.id}
                tabIndex={0}
                role="article"
                aria-label={card.title}
                className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-default"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${card.color} shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-base sm:text-lg text-white group-hover:text-brand-300 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-2">
                    {card.desc}
                  </p>
                </div>

                {card.isEval && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    {evalData?.has_eval && evalData?.metrics && evalData.metrics.total_tests > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                        <span 
                          className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold"
                          title="Retrieval Hit Rate"
                        >
                          Hit: {evalData.metrics.retrieval_hit_rate}%
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/25 text-sky-400 font-semibold"
                          title="Answer Accuracy"
                        >
                          Acc: {evalData.metrics.answer_accuracy}%
                        </span>
                        <span 
                          className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold"
                          title="Refusal Rate"
                        >
                          Refusal: {evalData.metrics.refusal_rate}%
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/80 text-slate-400 font-mono text-[11px]">
                        {evalLoading ? 'Checking...' : 'Not run yet'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Interactive Architecture Flow Diagram */}
      <section className="max-w-6xl mx-auto space-y-6" aria-labelledby="architecture-heading">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div>
            <h2 id="architecture-heading" className="text-2xl font-bold text-white tracking-tight">System Architecture & Pipeline</h2>
            <p className="text-sm text-slate-400 mt-1">
              End-to-end local data flow from raw PDF parsing to verified citations.
            </p>
          </div>
          <span className="self-start sm:self-center px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-brand-400">
            D:\rag-chatbot
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {steps.map((st, idx) => {
            const Icon = st.icon
            return (
              <div
                key={idx}
                tabIndex={0}
                className="relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-black/40 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl border bg-gradient-to-br ${st.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                    STAGE {st.num}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold text-lg text-white group-hover:text-sky-300 transition-colors">
                      {st.title}
                    </h3>
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {st.tech}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-1">
                    {st.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Developed By Section */}
      <section className="max-w-6xl mx-auto" aria-labelledby="developed-by-heading">
        <div 
          tabIndex={0}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 hover:border-slate-700/80 p-6 sm:p-8 transition-all duration-300 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Round Avatar with Initials */}
              <div 
                aria-label={`Avatar: ${profileConfig.initials}`}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-brand-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-lg shadow-brand-500/25 ring-4 ring-slate-800 shrink-0"
              >
                {profileConfig.initials}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-300">
                    Developed By
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>{profileConfig.university}</span>
                  </div>
                </div>

                <h3 id="developed-by-heading" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {profileConfig.name}
                </h3>

                <p className="text-sm sm:text-base font-medium text-sky-300">
                  {profileConfig.role}
                </p>

                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed pt-1">
                  {profileConfig.bio}
                </p>
              </div>
            </div>

            {/* Optional Links */}
            {(profileConfig.links.github || profileConfig.links.linkedin || profileConfig.links.email) && (
              <div className="flex flex-wrap items-center gap-2.5 pt-2 md:pt-0 self-start md:self-center shrink-0">
                {profileConfig.links.github && (
                  <a
                    href={profileConfig.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
                {profileConfig.links.linkedin && (
                  <a
                    href={profileConfig.links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Linkedin className="w-4 h-4 text-sky-400" />
                    <span>LinkedIn</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                )}
                {profileConfig.links.email && (
                  <a
                    href={profileConfig.links.email.startsWith('mailto:') ? profileConfig.links.email : `mailto:${profileConfig.links.email}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tech Stack Badge Row */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-brand-400" />
              <span>Core Stack:</span>
            </span>
            {profileConfig.techStack.map((tech, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-slate-800/70 border border-slate-700/70 text-slate-200 font-mono text-xs hover:border-slate-600 transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { 
  FileText, 
  Upload, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Layers, 
  HardDrive,
  FileCheck,
  AlertCircle
} from 'lucide-react'
import { API_BASE_URL, safeJson } from '../utils/api'

export default function DocumentsTab({ onToast, onRefreshHealth }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [indexingResult, setIndexingResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`)
      const data = await safeJson(res)
      setDocuments(data.documents || [])
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return

    // Filter PDFs
    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfFiles.length === 0) {
      onToast('Please upload valid PDF files (.pdf) only.', 'warning')
      return
    }

    setUploading(true)
    const formData = new FormData()
    for (const f of pdfFiles) {
      formData.append('files', f)
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await safeJson(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Upload failed')
      }

      onToast(data.message || `Uploaded ${pdfFiles.length} file(s)`, 'success')
      await fetchDocuments()
      onRefreshHealth()

      // Prompt to re-index
      setIndexingResult({
        needsReindex: true,
        message: 'New files uploaded. Click "Rebuild Index" to vectorize.'
      })
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRebuildIndex = async () => {
    setIndexing(true)
    setIndexingResult(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/index`, { method: 'POST' })
      const data = await safeJson(res)
      if (!res.ok) {
        throw new Error(data.detail || 'Indexing failed')
      }

      setIndexingResult({
        needsReindex: false,
        chunks: data.chunks,
        elapsed: data.elapsed_seconds,
        message: `Generated ${data.chunks} vector chunks in ${data.elapsed_seconds}s!`
      })
      onToast(`Index built: ${data.chunks} chunks (${data.elapsed_seconds}s)`, 'success')
      await fetchDocuments()
      onRefreshHealth()
    } catch (err) {
      onToast(err.message, 'error')
      setIndexingResult({
        error: true,
        message: err.message
      })
    } finally {
      setIndexing(false)
    }
  }

  const handleDelete = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? The vector index will be automatically updated.`)) {
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      })
      const data = await safeJson(res)
      if (!res.ok) throw new Error(data.detail || 'Failed to delete file')

      onToast(`Deleted "${filename}". Index updated.`, 'info')
      await fetchDocuments()
      onRefreshHealth()
    } catch (err) {
      onToast(err.message, 'error')
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header and Index Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Library</h1>
          <p className="text-sm text-slate-400 mt-1">
            Upload PDF files to parse, chunk, and index locally using FAISS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDocuments}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-all"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRebuildIndex}
            disabled={indexing || documents.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold shadow-md shadow-brand-600/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin' : ''}`} />
            <span>{indexing ? 'Indexing Chunks...' : 'Rebuild Index'}</span>
          </button>
        </div>
      </div>

      {/* Index Status Banner if any */}
      {indexingResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm ${
          indexingResult.error 
            ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            : indexingResult.needsReindex
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {indexingResult.error ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : indexingResult.needsReindex ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{indexingResult.message}</span>
          </div>

          {indexingResult.needsReindex && (
            <button
              onClick={handleRebuildIndex}
              className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400"
            >
              Rebuild Now
            </button>
          )}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleUploadFiles(e.dataTransfer.files)
        }}
        className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          dragOver
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => handleUploadFiles(e.target.files)}
        />

        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-3">
          <Upload className={`w-6 h-6 ${uploading ? 'animate-bounce' : ''}`} />
        </div>

        <p className="text-base font-semibold text-white">
          {uploading ? 'Uploading PDFs...' : 'Click to upload or drag & drop PDFs'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Supports single or multiple PDF documents (Max 50MB per file). Stored safely in <span className="font-mono text-slate-300">D:\rag-chatbot\data</span>.
        </p>
      </div>

      {/* Documents Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Indexed Files ({documents.length})</h2>
          <span className="text-xs text-slate-400">Total Files: {documents.length}</span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium text-sm">No documents uploaded yet</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Drop your first PDF into the box above to generate sentence embeddings and start asking questions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Document Name</th>
                  <th className="px-4 py-3.5">Pages</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Chunks</th>
                  <th className="px-4 py-3.5">Modified</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {documents.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate max-w-xs sm:max-w-md" title={doc.name}>
                        {doc.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs">
                      {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-400">
                      {doc.size_formatted}
                    </td>
                    <td className="px-4 py-3.5">
                      {doc.scanned_warning ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20" title="No extractable text found (likely scanned images)">
                          <AlertTriangle className="w-3 h-3" /> Scanned Warning
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-sky-400 font-semibold">
                      {doc.chunk_count}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">
                      {doc.last_modified}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(doc.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

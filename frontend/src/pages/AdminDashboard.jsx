import React, { useState, useEffect } from 'react';
import { 
  Plus, RefreshCw, FileText, Trash2, Eye, CheckCircle2, 
  AlertTriangle, Database, Zap, Clock
} from 'lucide-react';
import { api } from '../services/api';
import DocumentUploadModal from '../components/DocumentUploadModal';
import TextInspectorModal from '../components/TextInspectorModal';

export default function AdminDashboard({ onContextChange, onUnauthorized }) {
  const [documents, setDocuments] = useState([]);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [contextPreviewOpen, setContextPreviewOpen] = useState(false);
  const [contextPreviewText, setContextPreviewText] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [docsRes, cacheRes] = await Promise.all([
        api.getDocuments(),
        api.getContextStatus()
      ]);

      if (!docsRes.success && docsRes.error?.toLowerCase().includes('unauthorized')) {
        if (onUnauthorized) {
          onUnauthorized();
          return;
        }
      }

      if (docsRes.success) {
        setDocuments(docsRes.documents);
      } else {
        setError(docsRes.error || 'Failed to load policy documents');
      }

      if (cacheRes.success) {
        setCacheStatus(cacheRes.cache);
        if (onContextChange) onContextChange(cacheRes.cache);
      }
    } catch (err) {
      setError('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handlePrepareContext = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await api.prepareContext();
      if (res.success) {
        showNotification(res.message);
        fetchData();
      } else {
        setError(res.error || 'Failed to prepare context');
      }
    } catch (err) {
      setError(err.message || 'Error preparing context');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTogglePublish = async (id) => {
    try {
      const res = await api.togglePublish(id);
      if (res.success) {
        showNotification(res.message);
        fetchData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await api.deleteDocument(id);
      if (res.success) {
        showNotification(res.message);
        fetchData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInspect = async (id) => {
    try {
      const res = await api.getDocumentById(id);
      if (res.success) {
        setSelectedDoc(res.document);
        setInspectorModalOpen(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePreviewContext = async () => {
    try {
      const res = await api.previewContext();
      if (res.success) {
        setContextPreviewText(res.context || 'No documents in context.');
        setContextPreviewOpen(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const totalTokens = documents
    .filter(d => d.isPublished)
    .reduce((acc, d) => acc + (d.tokenCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & CAG Value Prop Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Policy Management & CAG Engine</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            In <strong>Cache-Augmented Generation (CAG)</strong>, the full corpus of company policies is prepared, structured, and cached in-memory once. Employee questions reuse this pre-assembled context, eliminating per-query database queries, embedding drift, and retrieval latency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Policy</span>
          </button>

          <button
            onClick={handlePrepareContext}
            disabled={refreshing}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Rebuilding Context...' : 'Prepare / Refresh Context'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center space-x-2 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Documents</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">
              {documents.filter(d => d.isPublished).length}
            </span>
            <span className="text-xs text-slate-400">/ {documents.length} total</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Included in CAG context corpus</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Tokens</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">
              {totalTokens.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-600 font-medium">Fits 8K context</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Pre-loaded in RAM for zero retrieval delay</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CAG Cache Status</span>
            <div className={`p-2 rounded-lg ${cacheStatus?.isCached ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${cacheStatus?.isCached ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-xl font-bold text-slate-900">
              {cacheStatus?.isCached ? 'Valid & Primed' : 'Needs Preparation'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate" title={cacheStatus?.version || 'N/A'}>
            Version: {cacheStatus?.version ? cacheStatus.version.substring(0, 22) + '...' : 'None'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Context Prep Time</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900">
              {cacheStatus?.lastPrepTimeMs || 0}
            </span>
            <span className="text-xs text-slate-500">ms</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reused across {cacheStatus?.totalQueries || 0} question(s) ({cacheStatus?.hitRate || '0%'} hit rate)
          </p>
        </div>
      </div>

      {/* Policy Documents List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Company Policy Documents</h2>
            <p className="text-xs text-slate-500">
              Manage authoritative policies. Modifying, toggling, or replacing policies automatically invalidates the CAG cache.
            </p>
          </div>
          <button
            onClick={handlePreviewContext}
            disabled={!cacheStatus?.isCached}
            className="text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
          >
            Preview Assembled Context
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading policy documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">No policy documents found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Upload your company's official PDF, DOCX, or TXT policy documents to build your CAG knowledge base.
            </p>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Upload First Policy Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/70 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Document Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Type & Size</th>
                  <th className="px-6 py-3">Tokens / Pages</th>
                  <th className="px-6 py-3">Version</th>
                  <th className="px-6 py-3">CAG Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{doc.title}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                        {doc.originalFilename}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-md">
                        {doc.category || 'General'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 uppercase font-mono">
                      {doc.fileExtension?.replace('.', '')} • {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-800">
                        {doc.tokenCount?.toLocaleString() || 0} tokens
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {doc.pageCount || 1} page(s)
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 text-xs font-semibold bg-sky-50 text-sky-700 rounded border border-sky-100">
                        v{doc.version || 1}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(doc.id)}
                        className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                          doc.isPublished
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle inclusion in CAG context"
                      >
                        <div className={`w-2 h-2 rounded-full ${doc.isPublished ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{doc.isPublished ? 'Published' : 'Draft'}</span>
                      </button>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleInspect(doc.id)}
                          className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Inspect Extracted Text"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Modals */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => {
          showNotification('Document uploaded successfully');
          fetchData();
        }}
      />

      <TextInspectorModal
        isOpen={inspectorModalOpen}
        onClose={() => {
          setInspectorModalOpen(false);
          setSelectedDoc(null);
        }}
        document={selectedDoc}
      />

      {/* Assembled Context Preview Modal */}
      {contextPreviewOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">Assembled CAG Policy Context</h3>
                <p className="text-xs text-slate-500">This exact structured context is pre-loaded into memory and provided to Ollama.</p>
              </div>
              <button
                onClick={() => setContextPreviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-900 text-slate-100 font-mono text-xs">
              <pre className="whitespace-pre-wrap">{contextPreviewText}</pre>
            </div>
            <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setContextPreviewOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

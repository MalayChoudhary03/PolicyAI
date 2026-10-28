import React, { useState } from 'react';
import { X, Copy, Check, FileText, Layers, Hash, FileCode } from 'lucide-react';

export default function TextInspectorModal({ isOpen, onClose, document }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('text'); // 'text' or 'sections'

  if (!isOpen || !document) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(document.extractedText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">{document.title}</h3>
              <p className="text-xs text-slate-500">
                {document.originalFilename} • Category: {document.category} • Version {document.version || 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1.5 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Metadata Bar */}
        <div className="grid grid-cols-4 gap-2 px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Hash className="w-3.5 h-3.5 text-slate-400" />
            <span>Tokens: <strong className="text-slate-800">{document.tokenCount?.toLocaleString() || 0}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Words: <strong className="text-slate-800">{document.wordCount?.toLocaleString() || 0}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Pages: <strong className="text-slate-800">{document.pageCount || 1}</strong></span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-600 truncate" title={document.checksum}>
            <span>SHA: <strong className="text-slate-800 font-mono text-[11px]">{document.checksum?.substring(0, 8)}...</strong></span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 px-6 pt-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Raw Extracted Text
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'sections'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Parsed Sections ({document.sections?.length || 0})
          </button>
          <div className="ml-auto flex items-center pb-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {activeTab === 'text' ? (
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700 bg-white p-4 rounded-xl border border-slate-200">
              {document.extractedText}
            </pre>
          ) : (
            <div className="space-y-4">
              {document.sections && document.sections.length > 0 ? (
                document.sections.map((sec, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-800 text-xs">{sec.title}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        Page {sec.pageNumber || 1}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-xs text-slate-600 leading-relaxed">
                      {sec.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">No discrete sections detected.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

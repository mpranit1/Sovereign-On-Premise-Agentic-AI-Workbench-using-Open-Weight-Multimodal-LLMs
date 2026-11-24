import React, { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, GitCompare, Table, Layers, 
  ArrowRight, CheckCircle2, AlertCircle, FileSearch
} from 'lucide-react';
import { api } from '../../services/api';

export const DocumentIntelligenceView: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [extractedSections, setExtractedSections] = useState<any[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  
  // Document Comparison
  const [compareDocA, setCompareDocA] = useState<string>('');
  const [compareDocB, setCompareDocB] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.listAllDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDocId(docs[0].id);
        loadExtracted(docs[0].id);
        if (docs.length >= 2) {
          setCompareDocA(docs[0].id);
          setCompareDocB(docs[1].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadExtracted = async (id: string) => {
    setSelectedDocId(id);
    setSummary(null);
    try {
      const res = await api.extractDocument(id);
      setExtractedSections(res.sections || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSummarize = async () => {
    if (!selectedDocId) return;
    setIsLoadingSummary(true);
    try {
      const res = await api.summarizeDocument(selectedDocId);
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCompare = async () => {
    if (!compareDocA || !compareDocB || compareDocA === compareDocB) {
      alert('Please select two distinct documents to compare.');
      return;
    }
    setIsComparing(true);
    try {
      const res = await api.compareDocuments([compareDocA, compareDocB]);
      setComparisonResult(res);
    } catch (e: any) {
      alert(`Comparison failed: ${e.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const selectedDoc = documents.find(d => d.id === selectedDocId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Document Intelligence</h2>
        <p className="text-gray-400 text-sm mt-1">
          Perform clause extraction, automated executive summarization, and side-by-side policy diff comparisons.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Selector */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 block mb-3">
            Available Documents ({documents.length})
          </span>
          {documents.length === 0 ? (
            <p className="text-xs text-gray-500 p-2 italic">No documents uploaded. Please upload documents in Knowledge Base.</p>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => loadExtracted(doc.id)}
                  className={`p-3 rounded-lg cursor-pointer transition border flex items-center space-x-3 ${
                    selectedDocId === doc.id
                      ? 'bg-[#1F293D] border-indigo-500/60 text-white'
                      : 'bg-[#0B0F19]/60 border-transparent text-gray-300 hover:bg-[#1F293D]/50'
                  }`}
                >
                  <FileText size={16} className="text-indigo-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-xs text-white truncate block">{doc.file_name}</span>
                    <span className="text-[10px] text-gray-400">{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Document Extraction & Summarization */}
        {selectedDoc && (
          <div className="lg:col-span-2 bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1F293D]">
              <div>
                <h3 className="text-base font-bold text-white">{selectedDoc.file_name}</h3>
                <span className="text-xs text-gray-400">Total Extracted Sections: {extractedSections.length}</span>
              </div>
              <button
                onClick={handleSummarize}
                disabled={isLoadingSummary}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow disabled:opacity-50 transition"
              >
                <Sparkles size={14} />
                <span>{isLoadingSummary ? 'Summarizing...' : 'Generate AI Summary'}</span>
              </button>
            </div>

            {/* AI Summary Banner */}
            {summary && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-700/50 space-y-2">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">Executive Summary</span>
                <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">{summary}</p>
              </div>
            )}

            {/* Extracted Sections Preview */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Extracted Sections & Clauses
              </span>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {extractedSections.map((sec, sIdx) => (
                  <div key={sIdx} className="p-3.5 rounded-lg bg-[#0B0F19] border border-[#1F293D] text-xs space-y-1">
                    <div className="flex items-center justify-between text-indigo-400 font-semibold">
                      <span>{sec.section || `Section ${sIdx + 1}`}</span>
                      <span className="text-[10px] text-gray-500">Page {sec.page || 1}</span>
                    </div>
                    <p className="text-gray-300 leading-relaxed font-sans max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Document Policy Comparison Tool */}
      <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <GitCompare size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Document Comparison & Clause Diff Engine</h3>
            <p className="text-xs text-gray-400">Detect added sections, deleted clauses, and semantic variance across versions.</p>
          </div>
        </div>

        {documents.length >= 2 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Base Document (A)</label>
                <select
                  value={compareDocA}
                  onChange={e => setCompareDocA(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>{d.file_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Comparison Document (B)</label>
                <select
                  value={compareDocB}
                  onChange={e => setCompareDocB(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>{d.file_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCompare}
              disabled={isComparing}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-[#06B6D4] hover:bg-[#0891B2] text-black text-xs font-bold transition shadow disabled:opacity-50"
            >
              <GitCompare size={14} />
              <span>{isComparing ? 'Diffing Clauses...' : 'Run Document Diff Analysis'}</span>
            </button>

            {/* Comparison Diff Results */}
            {comparisonResult && (
              <div className="mt-4 p-5 rounded-xl bg-[#0B0F19] border border-[#1F293D] space-y-4 text-xs animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-[#1F293D]">
                  <span className="font-bold text-white text-sm">Comparison Results</span>
                  <span className="text-cyan-400 font-mono">Similarity Index: {Math.round((comparisonResult.similarity_ratio || 0) * 100)}%</span>
                </div>

                <div className="p-3 rounded-lg bg-[#151D2E] text-gray-200">
                  <span className="font-semibold text-white block mb-1">Executive Summary:</span>
                  {comparisonResult.executive_summary}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Added Clauses */}
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                    <span className="font-bold text-emerald-400 block mb-2">Added Provisions (in Doc B):</span>
                    {comparisonResult.added_sections?.length === 0 ? (
                      <span className="text-gray-500 italic">No added provisions detected.</span>
                    ) : (
                      <ul className="space-y-1.5 list-disc list-inside text-gray-300">
                        {comparisonResult.added_sections?.map((item: string, idx: number) => (
                          <li key={idx} className="truncate">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Removed Clauses */}
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40">
                    <span className="font-bold text-rose-400 block mb-2">Removed Provisions (omitted from Doc B):</span>
                    {comparisonResult.removed_sections?.length === 0 ? (
                      <span className="text-gray-500 italic">No removed provisions detected.</span>
                    ) : (
                      <ul className="space-y-1.5 list-disc list-inside text-gray-300">
                        {comparisonResult.removed_sections?.map((item: string, idx: number) => (
                          <li key={idx} className="truncate">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500 italic">
            Upload at least two documents in Knowledge Base to run comparative clause diffing.
          </p>
        )}
      </div>
    </div>
  );
};

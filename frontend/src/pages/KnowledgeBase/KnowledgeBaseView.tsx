import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Plus, Upload, Search, FileText, Trash2, 
  CheckCircle2, Clock, AlertCircle, Sparkles, BookOpen
} from 'lucide-react';
import { api } from '../../services/api';
import { KnowledgeBase, DocumentItem } from '../../types';

export const KnowledgeBaseView: React.FC = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [kbName, setKbName] = useState('');
  const [kbDesc, setKbDesc] = useState('');
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(64);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchKBs = async () => {
    try {
      const list = await api.listKnowledgeBases();
      setKnowledgeBases(list);
      if (list.length > 0 && !selectedKB) {
        loadKBDetails(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadKBDetails = async (id: string) => {
    try {
      const kb = await api.getKnowledgeBase(id);
      setSelectedKB(kb);
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchKBs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedKB || !e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);

    try {
      const file = e.target.files[0];
      await api.uploadDocumentToKB(selectedKB.id, file);
      await loadKBDetails(selectedKB.id);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKB || !searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const res = await api.searchKnowledgeBase(selectedKB.id, searchQuery, 5);
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to purge this document and its vector embeddings?')) return;
    try {
      await api.deleteDocument(docId);
      if (selectedKB) loadKBDetails(selectedKB.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateKB = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newKB = await api.createKnowledgeBase({
        name: kbName,
        description: kbDesc,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap
      });
      setShowCreateModal(false);
      setKbName('');
      setKbDesc('');
      fetchKBs();
      loadKBDetails(newKB.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create collection');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Knowledge Base & RAG</h2>
          <p className="text-gray-400 text-sm mt-1">
            Private document vectorization, chunk indexing, and similarity retrieval with grounded citations.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold transition shadow"
        >
          <Plus size={16} />
          <span>New Collection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collections Drawer */}
        <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 block mb-3">
            Collections ({knowledgeBases.length})
          </span>
          <div className="space-y-1.5">
            {knowledgeBases.map(kb => (
              <div
                key={kb.id}
                onClick={() => loadKBDetails(kb.id)}
                className={`p-3 rounded-lg cursor-pointer transition border ${
                  selectedKB?.id === kb.id
                    ? 'bg-[#1F293D] border-indigo-500/60 text-white'
                    : 'bg-[#0B0F19]/60 border-transparent text-gray-300 hover:bg-[#1F293D]/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#151D2E] border border-[#1F293D] text-purple-400">
                    <Database size={18} />
                  </div>
                  <div className="flex-1 truncate">
                    <span className="font-bold text-sm text-white truncate block">{kb.name}</span>
                    <span className="text-[11px] text-gray-400">Chunk: {kb.chunk_size} tokens</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected KB Workspace */}
        {selectedKB && (
          <div className="lg:col-span-2 space-y-6">
            {/* Collection Metadata & Ingest Action */}
            <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedKB.name}</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xl">{selectedKB.description || 'Private organizational knowledge base.'}</p>
                <span className="text-[11px] text-indigo-400 mt-2 block font-mono">
                  Indexed Documents: {selectedKB.documents?.length || 0}
                </span>
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.csv,.xlsx"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-semibold transition disabled:opacity-50 shadow"
                >
                  <Upload size={14} />
                  <span>{isUploading ? 'Parsing & Indexing...' : 'Upload Document'}</span>
                </button>
              </div>
            </div>

            {/* Document List */}
            <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-4">
                Indexed Documents ({selectedKB.documents?.length || 0})
              </span>

              {(!selectedKB.documents || selectedKB.documents.length === 0) ? (
                <p className="text-xs text-gray-500 italic">No documents uploaded yet. Upload a PDF, DOCX, or CSV to index.</p>
              ) : (
                <div className="space-y-2">
                  {selectedKB.documents.map((doc: DocumentItem) => (
                    <div 
                      key={doc.id}
                      className="p-3 rounded-lg bg-[#0B0F19] border border-[#1F293D] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-3">
                        <FileText size={16} className="text-indigo-400" />
                        <div>
                          <span className="font-semibold text-white block">{doc.file_name}</span>
                          <span className="text-[10px] text-gray-500">
                            {doc.chunk_count} vector chunks | {(doc.size_bytes / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/40">
                          {doc.status}
                        </span>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1 rounded text-gray-500 hover:text-rose-400"
                          title="Purge Document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grounded Semantic Search Tester */}
            <div className="bg-[#151D2E] border border-[#1F293D] rounded-xl p-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Test Vector Retrieval & Grounded Citations
              </span>

              <form onSubmit={handleSearch} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Enter query to retrieve matching document sections..."
                  className="flex-1 bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 transition"
                >
                  <Search size={14} />
                  <span>{isSearching ? 'Searching...' : 'Search'}</span>
                </button>
              </form>

              {/* Retrieval Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-indigo-300">Retrieved Grounded Chunks ({searchResults.length}):</span>
                  {searchResults.map((res, rIdx) => (
                    <div key={rIdx} className="p-3.5 rounded-lg bg-[#0B0F19] border border-[#1F293D] text-xs space-y-2">
                      <div className="flex items-center justify-between text-indigo-400 font-semibold">
                        <span>{res.citation}</span>
                        <span className="text-[10px] text-gray-400 font-mono">Similarity: {res.score}</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed font-sans">{res.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create KB Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151D2E] border border-[#1F293D] rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Create Knowledge Collection</h3>
            <form onSubmit={handleCreateKB} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-medium mb-1">Collection Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Legal Compliance & Governance"
                  value={kbName}
                  onChange={e => setKbName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Collection scope and documentation topics"
                  value={kbDesc}
                  onChange={e => setKbDesc(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Chunk Size (Tokens)</label>
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={e => setChunkSize(parseInt(e.target.value))}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-medium mb-1">Overlap (Tokens)</label>
                  <input
                    type="number"
                    value={chunkOverlap}
                    onChange={e => setChunkOverlap(parseInt(e.target.value))}
                    className="w-full bg-[#0B0F19] border border-[#1F293D] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#0B0F19] text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

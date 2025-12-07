import React, { useState } from 'react';
import { ViewState, PaperAnalysis, ComparisonPoint } from './types';
import { PaperAnalysisView } from './components/PaperAnalysisView';
import { ComparisonView } from './components/ComparisonView';
import { DiscoveryView } from './components/DiscoveryView';
import { Activity, Copy, FileSearch, BrainCircuit, Github } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.ANALYZE);
  const [papers, setPapers] = useState<PaperAnalysis[]>([]);
  // State lifted from ComparisonView for persistence
  const [comparisonResult, setComparisonResult] = useState<ComparisonPoint[] | null>(null);

  const handleAnalysisComplete = (newPaper: PaperAnalysis) => {
    setPapers(prev => [newPaper, ...prev]);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 transition-all">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            <span className="font-bold text-lg tracking-tight">NeuroLit AI</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Research Assistant for AD & Depression</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setView(ViewState.ANALYZE)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewState.ANALYZE 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSearch className="w-5 h-5 mr-3" />
            Analyze Paper
          </button>
          
          <button
            onClick={() => setView(ViewState.COMPARE)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewState.COMPARE 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5 mr-3" />
            Compare Findings
            {papers.length > 0 && (
                <span className="ml-auto bg-slate-800 text-xs px-2 py-0.5 rounded-full">{papers.length}</span>
            )}
          </button>

          <button
            onClick={() => setView(ViewState.DISCOVER)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              view === ViewState.DISCOVER 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Copy className="w-5 h-5 mr-3" />
            Find Related
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800 rounded-lg p-3 text-xs">
                <p className="font-medium text-slate-200 mb-1">Library Stats</p>
                <div className="flex justify-between text-slate-400">
                    <span>Papers analyzed</span>
                    <span>{papers.length}</span>
                </div>
            </div>
            <p className="text-[10px] text-slate-600 mt-4 text-center">Powered by Google Gemini 2.5</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
            <h1 className="text-lg font-semibold text-slate-800">
                {view === ViewState.ANALYZE && 'Single Paper Analysis'}
                {view === ViewState.COMPARE && 'Multi-Paper Comparison'}
                {view === ViewState.DISCOVER && 'Literature Discovery'}
            </h1>
            <div className="flex items-center gap-4">
                 <a href="#" className="text-slate-400 hover:text-slate-600">
                    <Github className="w-5 h-5" />
                 </a>
                 <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                    NL
                 </div>
            </div>
        </header>
        
        <div className="flex-1 overflow-hidden p-8">
            <div className="h-full max-w-6xl mx-auto">
                {view === ViewState.ANALYZE && (
                    <PaperAnalysisView 
                        onAnalysisComplete={handleAnalysisComplete} 
                        savedPapers={papers}
                    />
                )}
                {view === ViewState.COMPARE && (
                    <ComparisonView 
                        papers={papers} 
                        comparisonResult={comparisonResult}
                        setComparisonResult={setComparisonResult}
                    />
                )}
                {view === ViewState.DISCOVER && <DiscoveryView papers={papers} />}
            </div>
        </div>
      </main>
    </div>
  );
}
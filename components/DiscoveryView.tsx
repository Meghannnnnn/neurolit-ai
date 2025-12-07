import React, { useState } from 'react';
import { PaperAnalysis, Recommendation } from '../types';
import { findRelatedPapers } from '../services/gemini';
import { Button } from './Button';
import { BookOpen, ExternalLink, Sparkles, Quote, Globe, AlertCircle } from 'lucide-react';

interface DiscoveryViewProps {
  papers: PaperAnalysis[];
}

export const DiscoveryView: React.FC<DiscoveryViewProps> = ({ papers }) => {
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    if (!selectedPaperId) return;
    const paper = papers.find(p => p.id === selectedPaperId);
    if (!paper) return;

    setIsLoading(true);
    setRecommendations(null);
    setError(null);
    try {
      const results = await findRelatedPapers(paper);
      setRecommendations(results);
    } catch (e: any) {
      console.error(e);
      // FIX: Capture and set the error message from the service
      setError(e.message || "An unexpected error occurred while discovering papers.");
    } finally {
      setIsLoading(false);
    }
  };

  const groupedRecs = recommendations ? {
    cited: recommendations.filter(r => r.category === 'Cited within Source'),
    external: recommendations.filter(r => r.category === 'External Related Paper'),
  } : { cited: [], external: [] };

  const RenderSection = ({ title, icon: Icon, items }: { title: string, icon: any, items: Recommendation[] }) => {
    if (items.length === 0) return null;
    return (
        <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center">
                <Icon className="w-4 h-4 mr-2" /> {title}
            </h3>
            <div className="grid gap-4">
                {items.map((rec, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-lg font-semibold text-slate-800 hover:text-indigo-600 transition-colors">
                                    {rec.title}
                                </h4>
                                <p className="text-sm text-indigo-600 font-medium mt-1">{rec.authors}</p>
                            </div>
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded ml-4 flex-shrink-0">
                                {rec.year}
                            </span>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-md border border-slate-100 mt-3">
                            <p className="text-sm text-slate-600 italic">"{rec.reason}"</p>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <a 
                                href={`https://scholar.google.com/scholar?q=${encodeURIComponent(rec.title)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full"
                            >
                                Search on Scholar <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-xl shadow-md text-white flex-shrink-0">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-2 flex items-center">
                        <Sparkles className="w-6 h-6 mr-2 text-indigo-400" /> 
                        Literature Discovery
                    </h2>
                    <p className="text-indigo-100 max-w-xl">
                        Leverage Gemini to find seminal works and recent breakthroughs.
                        We prioritize papers that fill the specific gaps found in your research.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 bg-white/10 p-4 rounded-lg backdrop-blur-sm border border-white/20">
                <label className="block text-xs font-medium text-indigo-200 uppercase tracking-wider mb-2">
                    Select Source Paper to Analyze
                </label>
                <div className="flex gap-4">
                    <select 
                        value={selectedPaperId} 
                        onChange={(e) => setSelectedPaperId(e.target.value)}
                        className="flex-1 bg-slate-900/50 border border-indigo-400/30 text-white rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                        <option value="" disabled>Select a paper from your library...</option>
                        {papers.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>
                    <Button 
                        onClick={handleDiscover} 
                        disabled={!selectedPaperId} 
                        isLoading={isLoading}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white border-none"
                    >
                        Find Related
                    </Button>
                </div>
            </div>
        </div>

        {/* Error Alert */}
        {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-sm">Analysis Failed</h4>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        )}

        {recommendations && (
            <div className="flex-1 overflow-y-auto pr-2 pb-6">
                <RenderSection title="Cited & Seminal Works (Foundations)" icon={Quote} items={groupedRecs.cited} />
                <RenderSection title="External & Recent Papers (Extensions)" icon={Globe} items={groupedRecs.external} />
            </div>
        )}
        
        {!recommendations && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a paper above to generate reading recommendations.</p>
            </div>
        )}
    </div>
  );
};
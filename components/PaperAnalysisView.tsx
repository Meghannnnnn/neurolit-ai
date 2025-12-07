import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, BookOpen, Layers, Search, Loader2 } from 'lucide-react';
import { PaperAnalysis } from '../types';
import { analyzePaper } from '../services/gemini';
import { Button } from './Button';

interface PaperAnalysisViewProps {
  onAnalysisComplete: (analysis: PaperAnalysis) => void;
  savedPapers: PaperAnalysis[];
}

export const PaperAnalysisView: React.FC<PaperAnalysisViewProps> = ({ onAnalysisComplete, savedPapers }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<PaperAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // reset error
    setError(null);

    // 1. Size Validation (Limit to 6MB to avoid XHR RPC errors)
    const MAX_SIZE_MB = 6;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload a file smaller than ${MAX_SIZE_MB}MB.`);
        return;
    }

    // 2. Type Validation (Robust check for PDF/TXT)
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      setError("Unsupported file type. Please upload a PDF or TXT file.");
      return;
    }

    const mimeType = isPdf ? 'application/pdf' : 'text/plain';

    setIsAnalyzing(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        try {
          const result = await analyzePaper(base64Data, mimeType, file.name);
          const newAnalysis: PaperAnalysis = {
            ...result,
            id: crypto.randomUUID(),
            fileName: file.name,
            uploadDate: Date.now(),
          };
          setActiveAnalysis(newAnalysis);
          onAnalysisComplete(newAnalysis);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to analyze the paper. Please try again with a smaller file.");
        } finally {
            setIsAnalyzing(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        setError("Error reading file.");
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("An unexpected error occurred.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Header / Upload Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Paper Analysis</h2>
        <p className="text-slate-500 mb-6">Upload a research paper (PDF) to extract findings, methodologies, and research gaps.</p>
        
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt"
            className="hidden"
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            isLoading={isAnalyzing}
            size="lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Paper
          </Button>
          <span className="text-xs text-slate-400">Supported: PDF, TXT (Max 6MB)</span>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm border border-red-100">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {activeAnalysis ? (
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            
            {/* Title & Meta */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{activeAnalysis.title}</h3>
                        <div className="flex items-center mt-2 space-x-2">
                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium flex items-center">
                                <FileText className="w-3 h-3 mr-1"/> {activeAnalysis.fileName}
                            </span>
                            <span className="text-slate-400 text-xs">Analyzed just now</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                        <BookOpen className="w-4 h-4 mr-2 text-indigo-500" /> Summary
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-sm">{activeAnalysis.summary}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Findings */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Major Findings
                    </h4>
                    <ul className="space-y-3">
                        {activeAnalysis.majorFindings.map((finding, idx) => (
                            <li key={idx} className="flex items-start text-sm text-slate-600">
                                <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
                                {finding}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Gaps */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center">
                        <Search className="w-4 h-4 mr-2 text-amber-500" /> Research Gaps
                    </h4>
                    <ul className="space-y-3">
                        {activeAnalysis.researchGaps.map((gap, idx) => (
                            <li key={idx} className="flex items-start text-sm text-slate-600">
                                <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                                {gap}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Methodology */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-2 flex items-center">
                    <Layers className="w-4 h-4 mr-2 text-blue-500" /> Methodology
                </h4>
                <p className="text-slate-600 leading-relaxed text-sm">{activeAnalysis.methodology}</p>
            </div>

             {/* Keywords */}
            <div className="flex flex-wrap gap-2">
                {activeAnalysis.keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-200 text-slate-600 text-xs rounded-full">
                        {kw}
                    </span>
                ))}
            </div>

        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 m-1">
            {isAnalyzing ? (
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Analyzing document with Gemini...</p>
                    <p className="text-slate-400 text-sm mt-1">Extracting insights on depression and cognitive decline</p>
                </div>
            ) : (
                <div className="text-center max-w-md p-6">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No Analysis Yet</h3>
                    <p className="text-slate-500 mt-2 mb-6">Upload a paper to get started. I can read PDFs about neurological research and break them down for you.</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Select File</Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};
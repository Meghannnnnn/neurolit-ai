import React, { useState, useEffect, useRef } from 'react';
import { PaperAnalysis, ComparisonPoint } from '../types';
import { comparePapers } from '../services/gemini';
import { Button } from './Button';
import { Check, Loader2, Download, ArrowDownAZ, Edit2, Save, X, AlertCircle } from 'lucide-react';

interface ComparisonViewProps {
  papers: PaperAnalysis[];
  comparisonResult: ComparisonPoint[] | null;
  setComparisonResult: (results: ComparisonPoint[] | null) => void;
}

// Editable Cell Component
const EditableCell = ({ 
    initialValue, 
    onSave, 
    isEditing, 
    setIsEditing 
}: { 
    initialValue: string, 
    onSave: (val: string) => void, 
    isEditing: boolean, 
    setIsEditing: (val: boolean) => void 
}) => {
    const [value, setValue] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            // Auto-resize
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        onSave(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsEditing(false);
            setValue(initialValue); // Revert
        }
        // Allow Shift+Enter for newline, but maybe Ctrl+Enter to save? 
        // For now standard blur save is fine.
    };

    if (isEditing) {
        return (
            <div className="relative min-h-[60px] w-full">
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-full h-full p-2 text-sm border-2 border-indigo-400 rounded bg-white text-slate-900 focus:outline-none resize-none overflow-hidden"
                />
                <div className="absolute bottom-1 right-2 text-xs text-slate-400 pointer-events-none">
                    Click outside to save
                </div>
            </div>
        );
    }

    // Render Mode (Markdown-ish parsing)
    const renderContent = () => {
        if (!value) return <span className="text-slate-300 italic">Double click to add notes...</span>;

        const lines = value.split('\n').filter(line => line.trim() !== '');
        
        return (
            <div className="space-y-1">
                {lines.map((line, idx) => {
                    // Check if it's a bullet point
                    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
                    const cleanLine = isBullet ? line.trim().substring(2) : line;

                    // Parse Bold syntax **text**
                    const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
                    const renderedLine = (
                        <span>
                            {parts.map((part, i) => {
                                if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={i} className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded">{part.slice(2, -2)}</strong>;
                                }
                                return <span key={i}>{part}</span>;
                            })}
                        </span>
                    );

                    if (isBullet) {
                        return (
                            <div key={idx} className="flex items-start">
                                <span className="mr-2 mt-1.5 w-1.5 h-1.5 bg-indigo-400 rounded-full flex-shrink-0"></span>
                                <span className="text-slate-700 leading-relaxed">{renderedLine}</span>
                            </div>
                        );
                    }

                    return <div key={idx} className="text-slate-700 leading-relaxed mb-1">{renderedLine}</div>;
                })}
            </div>
        );
    };

    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className="cursor-text hover:bg-slate-50 min-h-[60px] p-2 -m-2 rounded transition-colors group relative"
            title="Click to edit"
        >
             {renderContent()}
             <Edit2 className="w-3 h-3 text-slate-300 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ papers, comparisonResult, setComparisonResult }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track which cell is being edited to prevent multiple edits at once ideally, 
  // but simpler to let each cell manage itself.
  // We do need to know the active paper IDs in the result to transpose correctly.

  const togglePaper = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleCompare = async () => {
    if (selectedIds.size < 2) return;
    
    setIsComparing(true);
    setError(null);
    const selectedPapers = papers.filter(p => selectedIds.has(p.id));

    try {
      const results = await comparePapers(selectedPapers);
      setComparisonResult(results);
    } catch (err: any) {
      // FIX: Use err.message to show the specific error (e.g. Region Not Supported)
      setError(err.message || "Failed to generate comparison. Please check your connection and try again.");
    } finally {
      setIsComparing(false);
    }
  };

  const updateCell = (paperId: string, criteriaName: string, newValue: string) => {
    if (!comparisonResult) return;

    const newResult = comparisonResult.map(point => {
        if (point.criteria === criteriaName) {
            return {
                ...point,
                paperInsights: {
                    ...point.paperInsights,
                    [paperId]: newValue
                }
            };
        }
        return point;
    });
    setComparisonResult(newResult);
  };

  const downloadCSV = () => {
    if (!comparisonResult || selectedIds.size === 0) return;

    // Transposed Export: Rows = Papers, Cols = Criteria
    const paperIdsInResult = Object.keys(comparisonResult[0]?.paperInsights || {});
    const relevantPapers = papers.filter(p => paperIdsInResult.includes(p.id));
    
    // Header Row: "Paper Title", Criteria 1, Criteria 2, ...
    const criteriaNames = comparisonResult.map(c => c.criteria);
    const headers = ['Paper Title', 'Authors/Year (Ref)', ...criteriaNames];

    const rows = relevantPapers.map(p => {
        const rowData = [
            `"${p.title.replace(/"/g, '""')}"`,
            `"${p.fileName.replace(/"/g, '""')}"`, // Placeholder for simplified ref
            ...comparisonResult.map(c => {
                 const text = (c.paperInsights?.[p.id] || "").replace(/\*\*/g, '').replace(/-/g, '•');
                 return `"${text.replace(/"/g, '""')}"`;
            })
        ];
        return rowData.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "neurolit_comparison.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (papers.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-xl border border-slate-200">
            <h3 className="text-lg font-medium text-slate-800">No Papers to Compare</h3>
            <p className="text-slate-500 mt-2">Analyze at least two papers first to unlock comparison features.</p>
        </div>
    );
  }

  // --- Sorting & Transposition Logic ---

  // 1. Identify IDs involved
  const activeResultIds = comparisonResult && comparisonResult.length > 0 
    ? Object.keys(comparisonResult[0].paperInsights || {})
    : [];

  // 2. Filter valid paper objects
  let tablePapers = papers.filter(p => activeResultIds.includes(p.id));

  // 3. Sort Logic: Group by Model
  if (comparisonResult) {
      // Find the criteria related to Model
      const modelCriteria = comparisonResult.find(
          c => c.criteria.toLowerCase().includes('model') || c.criteria.toLowerCase().includes('architecture')
      );

      if (modelCriteria) {
          tablePapers = tablePapers.sort((a, b) => {
              const modelA = (modelCriteria.paperInsights?.[a.id] || "").toLowerCase();
              const modelB = (modelCriteria.paperInsights?.[b.id] || "").toLowerCase();
              return modelA.localeCompare(modelB);
          });
      }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-shrink-0">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Comparative Analysis</h2>
                    <p className="text-slate-500">Select papers to generate a side-by-side comparison matrix.</p>
                </div>
                {comparisonResult && (
                    <Button variant="outline" size="sm" onClick={downloadCSV}>
                        <Download className="w-4 h-4 mr-2" /> Download CSV
                    </Button>
                )}
            </div>
            
            <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Available Papers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-32 overflow-y-auto pr-2">
                    {papers.map(paper => (
                        <div 
                            key={paper.id}
                            onClick={() => togglePaper(paper.id)}
                            className={`
                                cursor-pointer p-3 rounded-lg border text-left transition-all relative
                                ${selectedIds.has(paper.id) 
                                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' 
                                    : 'border-slate-200 hover:border-indigo-300 bg-white'
                                }
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <p className="font-medium text-xs text-slate-800 line-clamp-1">{paper.title}</p>
                                {selectedIds.has(paper.id) && <Check className="w-3 h-3 text-indigo-600 flex-shrink-0 ml-2" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <Button 
                    onClick={handleCompare} 
                    disabled={selectedIds.size < 2 || isComparing}
                    isLoading={isComparing}
                >
                    {comparisonResult ? "Update Comparison" : "Run Comparison"}
                </Button>
                {selectedIds.size < 2 && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        Select at least 2 papers
                    </span>
                )}
                {activeResultIds.length > 0 && (
                    <div className="flex items-center text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg ml-auto">
                        <ArrowDownAZ className="w-4 h-4 mr-2" />
                        Sorted by Model / Architecture
                    </div>
                )}
            </div>
            
            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm border border-red-100">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}
        </div>

        {/* Transposed Comparison Table */}
        {comparisonResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                    <h3 className="font-semibold text-slate-700">Detailed Methodology & Findings Matrix</h3>
                    <span className="text-xs text-slate-400 italic">Click any cell to edit • Papers sorted by Model used</span>
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left border-collapse">
                        {/* HEADER: Criteria */}
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 font-bold bg-slate-100 min-w-[200px] w-[250px] sticky left-0 z-30 border-r border-slate-200 border-b">
                                    Paper / Source
                                </th>
                                {comparisonResult.map((point, idx) => (
                                    <th key={idx} className="px-6 py-4 font-bold bg-slate-50 min-w-[300px] border-b border-slate-200">
                                        {point.criteria}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        {/* BODY: Papers as Rows */}
                        <tbody className="divide-y divide-slate-200">
                            {tablePapers.map((paper) => (
                                <tr key={paper.id} className="bg-white hover:bg-slate-50/50">
                                    {/* First Column: Paper Info */}
                                    <td className="px-6 py-4 border-r border-slate-200 sticky left-0 bg-white z-10 group align-top">
                                        <div className="font-bold text-slate-800 mb-1 line-clamp-2" title={paper.title}>
                                            {paper.title}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono">
                                            {paper.fileName}
                                        </div>
                                    </td>
                                    
                                    {/* Data Columns */}
                                    {comparisonResult.map((point, idx) => {
                                        const content = point.paperInsights?.[paper.id] || "";
                                        return (
                                            <td key={idx} className="px-6 py-4 align-top border-r border-slate-100 last:border-0">
                                                <EditableCell 
                                                    initialValue={content}
                                                    isEditing={false} 
                                                    setIsEditing={(val) => { /* Optional parent control */ }}
                                                    onSave={(newVal) => updateCell(paper.id, point.criteria, newVal)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
  );
};
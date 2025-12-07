export enum ViewState {
  ANALYZE = 'ANALYZE',
  COMPARE = 'COMPARE',
  DISCOVER = 'DISCOVER'
}

export interface PaperAnalysis {
  id: string;
  fileName: string;
  title: string;
  summary: string;
  majorFindings: string[];
  methodology: string;
  researchGaps: string[];
  keywords: string[];
  uploadDate: number;
}

export interface Recommendation {
  title: string;
  authors: string;
  year: string;
  reason: string;
  category: 'Cited within Source' | 'External Related Paper';
}

export interface ComparisonPoint {
  criteria: string;
  paperInsights: Record<string, string>; // paperId -> insight
}
import { GoogleGenAI, Type } from "@google/genai";
import { PaperAnalysis, Recommendation, ComparisonPoint } from "../types";

// Helper to initialize Gemini
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Centralized error handler
const handleGeminiError = (error: any) => {
  console.error("Gemini API Error:", error);
  const errorStr = JSON.stringify(error);

  if (
    errorStr.includes("Region not supported") || 
    error.message?.includes("Region not supported") || 
    error.status === "PERMISSION_DENIED" || 
    error.code === 403
  ) {
    throw new Error("Region Not Supported: Gemini 2.5 is currently restricted in your location. Please check your network or VPN settings.");
  }

  if (errorStr.includes("xhr error") || error.code === 500) {
    throw new Error("Network Error: The file might be too large (limit 6MB) or the request timed out. Please try a smaller file.");
  }
  
  // Pass through other errors
  throw error;
};

/**
 * Analyzes a single paper (PDF or Text) to extract structured data.
 */
export const analyzePaper = async (
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<Omit<PaperAnalysis, 'id' | 'uploadDate'>> => {
  const ai = getAiClient();

  // Schema for structured output
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The extracted title of the paper" },
      summary: { type: Type.STRING, description: "A concise executive summary of the paper" },
      majorFindings: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Key findings and results of the study" 
      },
      methodology: { type: Type.STRING, description: "Description of methods, study design, and participants" },
      researchGaps: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Unaddressed gaps, limitations, or future directions mentioned" 
      },
      keywords: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Relevant keywords for this paper" 
      },
    },
    required: ["title", "summary", "majorFindings", "methodology", "researchGaps", "keywords"],
  };

  const prompt = `
    You are an expert academic researcher specializing in late-life depression, cognitive decline, and Alzheimer's Disease.
    Analyze the attached research paper. 
    Extract the title, a comprehensive summary, the major findings, the methodology used (including sample size and demographics if available), and specifically identify the research gaps or limitations the authors mention.
    Ensure the tone is academic and precise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileData,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    if (!response.text) {
        throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error: any) {
    handleGeminiError(error);
    throw error; // unreachable due to handleGeminiError throwing, but keeps TS happy
  }
};

/**
 * Compares multiple papers based on their analyses.
 */
export const comparePapers = async (papers: PaperAnalysis[]): Promise<ComparisonPoint[]> => {
  const ai = getAiClient();

  const paperContexts = papers.map(p => `
    Paper ID: ${p.id}
    Title: ${p.title}
    Findings: ${p.majorFindings.join('; ')}
    Methodology: ${p.methodology}
    Gaps: ${p.researchGaps.join('; ')}
  `).join('\n\n');

  const prompt = `
    Compare the provided research papers (identified by Paper ID) in the field of late-life depression and AD.
    Create a detailed comparison matrix.
    
    CRITICAL FORMATTING INSTRUCTIONS:
    1. Wrap important statistical findings (like p-values, sample sizes, hazard ratios) or specific model names in double asterisks, e.g., **n=500**, **p<0.001**, **Cox Proportional Hazards**.
    2. Use bullet points (start lines with "- ") for lists of items within a single cell to make it readable. Do not use block paragraphs.

    Compare on these specific criteria rows in this order:
    1. Study Design (e.g., Cross-sectional, Longitudinal, RCT)
    2. Model/Architecture/Tools Used (e.g., Human Clinical Data, Transgenic Mice, specific ML models, MRI, MMSE)
    3. Sample Cohorts & Demographics (e.g., Sample size, Age range, Gender distribution)
    4. Major Experimental Methodology (The core procedure used)
    5. Key Findings/Outcomes
    6. Limitations/Gaps
    7. Proposed Mechanisms/Theories

    RETURN JSON ONLY. The output must be a JSON array of objects with the structure:
    [
      {
        "criteria": "Category Name",
        "paperInsights": {
          "PAPER_ID_1": "- Insight bullet 1\n- Insight bullet 2",
          "PAPER_ID_2": "Specific insight..."
        }
      }
    ]

    Important: The keys in the "paperInsights" object must be the exact Paper IDs provided in the context.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: paperContexts },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) {
        throw new Error("No response from Gemini");
    }
    
    return JSON.parse(response.text) as ComparisonPoint[];
  } catch (error) {
    handleGeminiError(error);
    throw error;
  }
};

/**
 * Finds relevant papers based on a source paper.
 */
export const findRelatedPapers = async (paper: PaperAnalysis): Promise<Recommendation[]> => {
    const ai = getAiClient();
  
    const prompt = `
      Based on the following paper analysis in the field of late-life depression, cognitive decline, or AD:
      
      Source Paper Title: ${paper.title}
      Source Findings: ${paper.majorFindings.join('; ')}
      Source Gaps: ${paper.researchGaps.join('; ')}
  
      Task:
      1. Identify 5-7 highly relevant papers.
      2. Categorize them into two groups: 
         - "Cited within Source": Seminal papers that likely influenced this work or are fundamental to the topic.
         - "External Related Paper": Newer papers, alternative viewpoints, or adjacent studies not necessarily in the bibliography but highly relevant.
      3. Rank them from Highest relevance to Lowest.
  
      Return a JSON array of recommendations.
    `;
  
    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          authors: { type: Type.STRING },
          year: { type: Type.STRING },
          reason: { type: Type.STRING, description: "Why is this paper relevant?" },
          category: { type: Type.STRING, enum: ["Cited within Source", "External Related Paper"] }
        },
        required: ["title", "authors", "year", "reason", "category"]
      }
    };
  
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { text: prompt },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });
  
      if (!response.text) {
        return [];
      }
  
      return JSON.parse(response.text);
    } catch (error) {
      handleGeminiError(error);
      throw error;
    }
  };

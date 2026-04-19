import { GoogleGenAI, Type } from "@google/genai";
import { KnowledgePoint } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const KNOWLEDGE_CACHE: Record<string, KnowledgePoint> = {
  linear_equation_one_var: {
    tag: "linear_equation_one_var",
    name: "一元一次方程 (Linear Equation)",
    definition: "只含有一个未知数，且未知数的次数是1的方程。它是代数学的基础，用于解决生活中的平衡和未知量问题。",
    example: "2x + 3 = 7",
    visualization: {
      type: "equation_solver",
      data: {
        equation: "2x + 3 = 7",
        steps: [
          { desc: "Original equation", expr: "2x + 3 = 7" },
          { desc: "Subtract 3 from both sides (移项)", expr: "2x = 7 - 3" },
          { desc: "Simplify (化简)", expr: "2x = 4" },
          { desc: "Divide by 2 (系数化为1)", expr: "x = 2" }
        ]
      }
    },
    extensions: ["方程的解", "等式的性质", "比例问题"]
  },
  quadratic_function: {
    tag: "quadratic_function",
    name: "二次函数 (Quadratic Function)",
    definition: "形如 y = ax² + bx + c (a≠0) 的函数。它的图像是一条抛物线，广泛应用于物理中的抛体运动。",
    example: "y = x² + 2x + 1",
    visualization: {
      type: "function_plot",
      data: {
        func: "ax^2 + bx + c",
        xRange: [-5, 5],
        yRange: [-5, 10],
        coefficients: [
          { label: "a", value: 1, min: -2, max: 2 },
          { label: "b", value: 0, min: -5, max: 5 },
          { label: "c", value: 0, min: -5, max: 5 }
        ]
      }
    },
    extensions: ["抛物线顶点", "对称轴", "最值问题"]
  }
};

export async function parseQueryToTag(query: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `
      You are a Math Concept Identifier. 
      Analyze the input: "${query}"
      
      Instructions:
      1. If the input is a Chinese math term, map it to a standard snake_case tag (e.g., "勾股定理" -> "pythagorean_theorem").
      2. If the input is a mathematical expression (e.g., "2x+5=10"), generate a tag "equation_solving".
      3. If the input specifies a topic not in your list, generate a descriptive snake_case tag (e.g., "logarithms").
      4. ONLY return "unknown" if the input is completely non-mathematical (e.g., "what's for dinner", "hello world").
      5. Output ONLY the raw tag.
      
      Common tags for reference:
      - linear_equation_one_var
      - pythagorean_theorem
      - quadratic_function
      - linear_function
      - square_root
      - triangle_congruence
      - circle_properties
    ` }] }],
  });

  let tag = response.text?.trim().toLowerCase() || "unknown";
  
  // Clean up punctuation and common AI wordiness
  tag = tag.replace(/['"`]/g, "").replace(/\./g, "");
  
  // If AI returned a sentence, try to extract the last word or the most likely tag
  if (tag.includes(" ")) {
    const parts = tag.split(/\s+/);
    tag = parts.find(p => p.includes("_")) || parts[parts.length - 1];
  }

  // Final validation: if it's still "unknown" but the query contains math symbols,
  // force it to a generic "math_concept" tag to attempt generation anyway.
  if (tag === "unknown" && /[\+\-\*\/\^=\d]/.test(query)) {
    return "mathematical_expression";
  }
  
  return tag;
}

export async function generateKnowledgeContent(tag: string): Promise<KnowledgePoint> {
  if (KNOWLEDGE_CACHE[tag]) {
    return KNOWLEDGE_CACHE[tag];
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `Generate educational content for the math topic: ${tag}. 
    
    Pedagogical Goal: Explain the concept, provide a clear example, and create data for an interactive visualization.
    
    Instructions:
    1. Write definitions and descriptions in Chinese.
    2. Use Markdown for formatting in the 'definition' and 'example' fields.
    3. IMPORTANT: Use LaTeX for ALL mathematical formulas. 
       - Inline math: $ x^2 $ (Add a space before and after the math inside the delimiter for better parsing)
       - Block math: $$ x^2 + 2x + 1 = 0 $$
    4. Format the 'example' field as follows:
       - Use '### 问题 (Problem)' for the task.
       - Use '### 解析 (Analysis)' for the step-by-step logic.
       - Ensure steps are numbered and clear.
    
    Visualizations available:
    1. "equation_solver": Best for step-by-step algebraic manipulation. 
       Required data: { equation: string, steps: {desc: string, expr: string}[] }
    2. "function_plot": Best for geometry or graphs. 
       Required data: { func: string, xRange: [number, number], yRange: [number, number], coefficients?: {label: string, value: number, min: number, max: number}[] }
    
    Choose the most appropriate visualization type.
    Write definitions and descriptions in Chinese.
    ` }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tag: { type: Type.STRING },
          name: { type: Type.STRING, description: "Display name (e.g., 平方根)" },
          definition: { type: Type.STRING },
          example: { type: Type.STRING, description: "A simple textual example" },
          visualization: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: "Either 'equation_solver' or 'function_plot'" },
              data: { type: Type.OBJECT }
            },
            required: ["type", "data"]
          },
          extensions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 related topics for further exploration" }
        },
        required: ["tag", "name", "definition", "example", "visualization", "extensions"]
      }
    }
  });

  let text = response.text || "{}";
  text = text.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
  return JSON.parse(text);
}

export async function generateThinkingStream(tag: string, onChunk: (text: string) => void): Promise<void> {
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `
      Topic: "${tag}"
      Task: Perform a deep cognitive and pedagogical analysis for middle school learners.
      
      Format:
      - Start with [PHASE_01: INITIATING_META_STRATEGY]
      - Use [PHASE_02: COGNITIVE_ANALYSIS]
      - Use [PHASE_03: MISCONCEPTION_MAPPING]
      - Use [PHASE_04: SCAFFOLDING_PROTOCOL]
      - Use headers like > Reasoning Trace, > Visualization Logic.
      - Output your internal monologue about how to best visualize this specific topic.
      - If it's heavy in algebra, think about balance and steps.
      - If it's geometry, think about spatial intuition.
      
      Language: Chinese (Mandarin).
      Style: Concise, analytical, step-by-step reasoning. Max 3-4 bullet points per phase.
      Like a high-level educational architect thinking aloud.
    ` }] }],
  });

  for await (const chunk of stream) {
    if (chunk.text) {
      onChunk(chunk.text);
    }
  }
}

export async function getTutorAnswer(tag: string, context: string, question: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: `
      You are an AI tutor for middle school students on the platform "Jianzhi" (简知).
      Context Topic: "${tag}"
      Current Page Info: ${context}
      Student Question: "${question}"
      
      Provide a clear, encouraging, and accurate answer suitable for a middle school student. 
      Use Markdown for formatting. 
      CRITICAL: Use LaTeX for ALL formulas. 
      Add a space around the content inside the delimiter for better parsing (e.g., $ x = 2 $ or $$ \sum_{i=1}^n i $$).
    ` }] }],
  });

  return response.text || "I'm sorry, I couldn't generate an answer right now.";
}

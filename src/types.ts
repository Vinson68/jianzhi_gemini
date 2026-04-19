export interface VisualizationData {
  type: 'equation_solver' | 'function_plot' | 'triangle_solver' | 'geometry_proof';
  data: any;
}

export interface KnowledgePoint {
  tag: string;
  name: string;
  definition: string;
  example: string;
  visualization: VisualizationData;
  extensions: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

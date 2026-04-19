import React from 'react';
import EquationSolver from './EquationSolver';
import FunctionPlotter from './FunctionPlotter';
import { VisualizationData } from '../../types';

interface VisualizationRendererProps {
  viz: VisualizationData;
}

const VisualizationRenderer: React.FC<VisualizationRendererProps> = ({ viz }) => {
  switch (viz.type) {
    case 'equation_solver':
      return <EquationSolver data={viz.data} />;
    case 'function_plot':
      return <FunctionPlotter data={viz.data} />;
    default:
      return (
        <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
          Component for "{viz.type}" is coming soon.
        </div>
      );
  }
};

export default VisualizationRenderer;

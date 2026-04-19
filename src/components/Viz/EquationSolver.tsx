import React from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Step {
  desc: string;
  expr: string;
}

interface EquationSolverProps {
  data: {
    equation: string;
    steps: Step[];
  };
}

const EquationSolver: React.FC<EquationSolverProps> = ({ data }) => {
  const [currentStep, setCurrentStep] = React.useState(0);

  if (!data?.steps || data.steps.length === 0) {
    return (
      <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
        Equation steps are being prepared...
      </div>
    );
  }

  const stepCount = data.steps.length;
  // Ensure we don't index out of bounds if data changes
  const safeStep = Math.min(currentStep, stepCount - 1);

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
          Interactive Steps
        </h3>
        <div className="text-sm font-mono text-gray-400">
          Step {safeStep + 1} / {stepCount}
        </div>
      </div>

      <div className="min-h-[160px] flex flex-col items-center justify-center bg-gray-50 rounded-xl p-8">
        <motion.div
          key={safeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="text-3xl font-mono font-medium text-gray-800 mb-2">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {`$${data.steps[safeStep]?.expr || '...'}$`}
            </ReactMarkdown>
          </div>
          <div className="text-gray-500 italic">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {data.steps[safeStep]?.desc || '...'}
            </ReactMarkdown>
          </div>
        </motion.div>
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setCurrentStep(Math.max(0, safeStep - 1))}
          disabled={safeStep === 0}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(stepCount - 1, safeStep + 1))}
          disabled={safeStep === stepCount - 1}
          className="px-4 py-2 rounded-lg bg-orange-500 text-white disabled:opacity-30 hover:bg-orange-600 transition-colors"
        >
          Next
        </button>
        <button
          onClick={() => setCurrentStep(0)}
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Restart
        </button>
      </div>
    </div>
  );
};

export default EquationSolver;

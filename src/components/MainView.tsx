import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, Lightbulb, BookOpen, Layers, MessageSquare, History, Brain, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { KnowledgePoint } from '../types';
import VisualizationRenderer from './Viz/VisualizationRenderer';
import ChatBox from './Chat/ChatBox';
import { parseQueryToTag, generateKnowledgeContent, generateThinkingStream } from '../services/geminiService';

const LOADING_MESSAGES = [
  "Analyzing your knowledge request...",
  "Parsing mathematical structures...",
  "Generating interactive models...",
  "Consulting the AI math tutor...",
  "Visualizing complex concepts...",
  "Structuring pedagogical content..."
];

const MainView: React.FC = () => {
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [thinkingTrace, setThinkingTrace] = useState('');
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [knowledge, setKnowledge] = React.useState<KnowledgePoint | null>(null);
  const [history, setHistory] = React.useState<KnowledgePoint[]>([]);
  const thinkingRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isThinkingExpanded && thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinkingTrace, isThinkingExpanded]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setThinkingTrace('');
    setIsThinkingExpanded(false);
    try {
      // 1. Parse query to tag
      const tag = await parseQueryToTag(query);

      if (!tag || tag === 'unknown') {
        setError("Not sure about this one. Try a specific math problem like 'x^2+2x+1' or a concept like 'Pythagorean Theorem'.");
        setLoading(false);
        return;
      }

      // 2. Start thinking stream & content fetch
      // We don't await the thinking promise to speed up time-to-result
      generateThinkingStream(tag, (chunk) => {
        setThinkingTrace(prev => prev + chunk);
      }).catch(console.error);

      // Only wait for the structured content
      const data = await generateKnowledgeContent(tag);
      
      if (!data || !data.name) throw new Error("Invalid content received.");

      setKnowledge(data);
      setHistory(prev => [data, ...prev.filter(h => h.tag !== data.tag)].slice(0, 5));
      setQuery('');
    } catch (err: any) {
      console.error(err);
      setError("Failed to load knowledge. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-gray-900 font-sans p-4 md:p-8">
      {/* Search Header */}
      <div className={`max-w-2xl mx-auto transition-all duration-700 ${knowledge ? 'mb-12' : 'mt-[20vh] mb-24'}`}>
        {!knowledge && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-6xl font-bold tracking-tight mb-4 flex items-center justify-center gap-4">
              <span className="bg-orange-500 text-white px-4 py-1 rounded-2xl transform -rotate-3">简</span>
              <span className="text-gray-900">知</span>
            </h1>
            <p className="text-gray-500 text-lg">Knowledge Visualization for Students</p>
          </motion.div>
        )}

        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null); }}
            placeholder="Enter a formula or math topic..."
            className={`w-full h-16 pl-14 pr-32 rounded-3xl bg-white border ${error ? 'border-red-300 ring-4 ring-red-500/5' : 'border-gray-200'} focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-lg shadow-sm`}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 rounded-2xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-gray-900 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Search'}
          </button>
        </form>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl text-center text-sm border border-red-100"
          >
            {error}
          </motion.div>
        )}

        {/* Search Recommendations */}
        {!knowledge && !loading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {['2x + 5 = 11', 'Pythagorean Theorem', 'y = x^2 + 2x + 1', 'Circle Area'].map(rec => (
              <button
                key={rec}
                onClick={() => { setQuery(rec); setTimeout(() => handleSearch(), 100); }}
                className="px-4 py-2 rounded-full bg-white border border-gray-100 text-sm text-gray-500 hover:border-orange-200 hover:text-orange-600 transition-all shadow-sm"
              >
                {rec}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Main Content Area */}
      {knowledge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-6xl mx-auto space-y-8 pb-32"
        >
          {/* Deep Thinking Trace - Result View */}
          {(thinkingTrace || loading) && (
             <motion.div 
               layout
               className="bg-white/50 backdrop-blur-sm border border-orange-100 rounded-[2rem] shadow-sm overflow-hidden"
             >
               <div className="p-4 border-b border-orange-50/50 flex items-center justify-between px-6">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                       {thinkingTrace.includes('PHASE_04') ? 'Pedagogical Scaffold' : 
                        thinkingTrace.includes('PHASE_03') ? 'Mapping Misconceptions' :
                        thinkingTrace.includes('PHASE_02') ? 'Cognitive Analysis' :
                        'Reasoning Trace'}
                     </span>
                  </div>
                  <button 
                   onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                   className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest"
                  >
                    {isThinkingExpanded ? 'Hide Trace' : `View reasoning (${thinkingTrace.length} chars ${loading ? '...' : ''})`}
                  </button>
               </div>
               <motion.div 
                 initial={false}
                 animate={{ height: isThinkingExpanded ? 'auto' : '0px' }}
                 className="overflow-hidden"
               >
                 <div 
                   ref={thinkingRef}
                   className="p-8 pt-4 text-sm text-gray-500 leading-relaxed font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto scrollbar-thin opacity-80"
                 >
                   <div className="text-gray-400 mb-2 opacity-60 text-xs">
                     [SYS_LOG] Initializing reasoning kernel...<br/>
                     [SYS_LOG] Connecting to Gemini-3-Pro-Architect...<br/>
                     [SYS_LOG] Fetching pedagogical knowledge base...
                   </div>
                   {thinkingTrace}
                   {loading && <span className="inline-block w-1.5 h-3 bg-orange-300 ml-1 animate-pulse" />}
                 </div>
               </motion.div>
             </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Knowledge Base */}
            <div className="lg:col-span-12 flex items-center justify-between mb-2">
            <button 
              onClick={() => setKnowledge(null)}
              className="text-sm text-gray-400 hover:text-gray-900 flex items-center gap-1"
            >
              ← Back to Search
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">
              <Lightbulb size={12} />
              Verified Core Knowledge
            </div>
          </div>

          <div className="lg:col-span-7 space-y-8">
            {/* Section 1: Definition */}
            <section className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <BookOpen size={160} />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] font-bold text-orange-400 uppercase tracking-[0.3em] mb-4">
                  <div className="w-4 h-[1px] bg-orange-200" />
                  Conceptual Foundation
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm">1</span>
                  Concept Origin
                </h2>
                <h3 className="text-5xl font-bold mb-6 text-gray-900 tracking-tight">{knowledge.name}</h3>
                <div className="text-gray-600 leading-relaxed text-xl prose prose-orange max-w-none prose-headings:text-gray-900 prose-p:text-gray-500">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {knowledge.definition}
                  </ReactMarkdown>
                </div>
              </div>
            </section>

            {/* Section 2: Example */}
            <section className="bg-gray-900 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-bold flex items-center gap-3">
                   <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-sm">2</span>
                   Worked Example
                 </h2>
                 <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500 bg-white/5 px-2 py-1 rounded">
                   Scenario Analysis
                 </span>
               </div>
               
               <div className="bg-white/5 p-8 rounded-3xl border border-white/10 font-mono text-lg text-left prose prose-invert prose-headings:text-orange-400 prose-headings:mb-4 prose-p:text-gray-300 max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {knowledge.example}
                </ReactMarkdown>
              </div>
              <div className="mt-6 flex items-center gap-3 text-xs text-orange-400 font-medium">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                Follow the logic above to master the concept.
              </div>
            </section>

            {/* Section 4: Extensions/Links */}
            <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm">4</span>
                    Extended Connections
                </h2>
                <div className="flex flex-wrap gap-4">
                    {knowledge.extensions.map(ext => (
                        <button 
                            key={ext} 
                            onClick={() => {
                                setQuery(ext);
                                // The handleSearch will be triggered by state effect or we can wrap search logic
                                // To be safe, we'll just set query and call handleSearch after a micro-tick
                                setTimeout(() => {
                                    const mockEvent = { preventDefault: () => {} } as React.FormEvent;
                                    handleSearch(mockEvent);
                                }, 10);
                            }}
                            className="px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-700 flex items-center gap-2 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-all cursor-pointer group"
                        >
                            <Layers size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                            {ext}
                        </button>
                    ))}
                </div>
            </section>
          </div>

          {/* Right Column: Interaction & AI */}
          <div className="lg:col-span-5 space-y-8">
            {/* Section 3: Visualization */}
            <div className="sticky top-8 space-y-8">
                <section>
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-sm">3</span>
                            Model Exploration
                        </h2>
                    </div>
                    <VisualizationRenderer viz={knowledge.visualization} />
                </section>

                {/* Section 5: AI Chat */}
                <section>
                     <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                            <MessageSquare size={20} className="text-orange-500" />
                            AI Tutoring
                        </h2>
                    </div>
                    <ChatBox knowledge={knowledge} />
                </section>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* History Side (Floating or footer) */}
      {!knowledge && !loading && history.length > 0 && (
         <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="max-w-4xl mx-auto mt-24"
         >
            <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold uppercase tracking-widest text-xs">
                <History size={16} />
                Recent Exploration
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(h => (
                    <button
                        key={h.tag}
                        onClick={() => setKnowledge(h)}
                        className="p-6 text-left bg-white rounded-3xl border border-gray-100 shadow-sm hover:border-orange-500/30 transition-all group"
                    >
                        <div className="text-xs uppercase font-bold text-gray-400 mb-2">{h.tag.replace(/_/g, ' ')}</div>
                        <div className="text-xl font-bold text-gray-800 group-hover:text-orange-600 transition-colors">{h.name}</div>
                    </button>
                ))}
            </div>
         </motion.div>
      )}
      {/* Immersive Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#fafaf9]/95 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto"
          >
            <div className="max-w-xl w-full text-center space-y-8 my-auto">
              <motion.div
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 bg-orange-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-orange-500/20"
              >
                <Brain className="text-white w-8 h-8" />
              </motion.div>
              
              <div className="space-y-4">
                <div className="relative h-6">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={loadingStep}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-lg font-bold text-gray-900"
                    >
                      {LOADING_MESSAGES[loadingStep]}
                    </motion.p>
                  </AnimatePresence>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1 h-1 bg-orange-400 rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Architecting Lesson</span>
                </div>
              </div>

              {/* Simplified thinking during loading to reduce perceived time */}
              <div className="bg-white/40 border border-gray-100 rounded-3xl p-6 text-left max-h-[100px] overflow-hidden relative">
                <div className="text-[10px] font-mono text-gray-400 truncate mb-2">
                  {thinkingTrace || '> Initializing reasoning kernel...'}
                </div>
                <div className="text-sm font-mono text-gray-300 pointer-events-none select-none">
                  {thinkingTrace.slice(-100)}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#fafaf9] to-transparent" />
              </div>

              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 bg-orange-500 rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainView;

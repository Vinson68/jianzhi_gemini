import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

interface FunctionPlotterProps {
  data: {
    func: string; // e.g., "x^2"
    xRange: [number, number];
    yRange: [number, number];
    coefficients?: { label: string; value: number; min: number; max: number }[];
  };
}

const FunctionPlotter: React.FC<FunctionPlotterProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  const safeXRange: [number, number] = data?.xRange || [-10, 10];
  const safeYRange: [number, number] = data?.yRange || [-10, 10];
  const safeFunc = data?.func || 'x^2';

  const [coeffs, setCoeffs] = React.useState<Record<string, number>>(
    data?.coefficients ? Object.fromEntries(data.coefficients.map(c => [c.label, c.value])) : {}
  );

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const width = 400;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleLinear()
      .domain(safeXRange)
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain(safeYRange)
      .range([height - margin.bottom, margin.top]);

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${y(0)})`)
      .call(d3.axisBottom(x).ticks(10).tickSize(-height).tickFormat(() => ''))
      .attr('opacity', 0.1);

    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(${x(0)},0)`)
      .call(d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat(() => ''))
      .attr('opacity', 0.1);

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${y(0)})`)
      .call(d3.axisBottom(x).ticks(5))
      .attr('stroke-width', 1.5);

    svg.append('g')
      .attr('transform', `translate(${x(0)},0)`)
      .call(d3.axisLeft(y).ticks(5))
      .attr('stroke-width', 1.5);

    // Function path
    const line = d3.line<[number, number]>()
      .x(d => x(d[0]))
      .y(d => y(d[1]));

    const points: [number, number][] = [];
    const step = (safeXRange[1] - safeXRange[0]) / 200;

    for (let currentX = safeXRange[0]; currentX <= safeXRange[1]; currentX += step) {
      // Very basic parser for the demo, expansion would need a real expression parser
      let val = 0;
      if (safeFunc === "ax^2 + bx + c") {
        const { a = 1, b = 0, c = 0 } = coeffs;
        val = a * currentX * currentX + b * currentX + c;
      } else if (safeFunc === "kx + b") {
         const { k = 1, b = 0 } = coeffs;
         val = k * currentX + b;
      } else {
        // Fallback for simple x^2 etc
        val = Math.pow(currentX, 2);
      }
      points.push([currentX, val]);
    }

    svg.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', '#f97316')
      .attr('stroke-width', 2.5)
      .attr('d', line);

  }, [data, coeffs, safeXRange, safeYRange, safeFunc]);

  return (
    <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
        Function Visualization
      </h3>

      <div className="flex justify-center">
        <svg ref={svgRef} width="400" height="400" className="overflow-visible" />
      </div>

      {data.coefficients && (
        <div className="flex flex-wrap gap-4 justify-center bg-gray-50 p-4 rounded-xl">
          {data.coefficients.map((c) => (
            <div key={c.label} className="flex flex-col gap-2 min-w-[120px]">
              <div className="flex justify-between text-xs font-mono">
                <span>{c.label}</span>
                <span className="text-orange-600 font-bold">{coeffs[c.label]?.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step="0.1"
                value={coeffs[c.label] || 0}
                onChange={(e) => setCoeffs(prev => ({ ...prev, [c.label]: parseFloat(e.target.value) }))}
                className="w-full accent-orange-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FunctionPlotter;

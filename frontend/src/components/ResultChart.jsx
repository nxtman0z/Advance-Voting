import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { FiBarChart2, FiPieChart } from "react-icons/fi";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const COLORS = [
  "rgba(59, 130, 246, 0.85)",
  "rgba(16, 185, 129, 0.85)",
  "rgba(245, 158, 11, 0.85)",
  "rgba(239, 68, 68, 0.85)",
  "rgba(139, 92, 246, 0.85)",
  "rgba(236, 72, 153, 0.85)",
];

const BORDER_COLORS = COLORS.map((c) => c.replace("0.85", "1"));

/**
 * ResultChart component
 * Props:
 *  - candidates: [{ name, party, voteCount }]
 *  - totalVotes: number
 *  - chartType: "doughnut" | "bar" (default "doughnut")
 */
export default function ResultChart({ candidates = [], totalVotes = 0, chartType = "doughnut" }) {
  const labels = candidates.map((c) => c.name);
  const data   = candidates.map((c) => c.voteCount);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Votes",
        data,
        backgroundColor: COLORS.slice(0, candidates.length),
        borderColor: BORDER_COLORS.slice(0, candidates.length),
        borderWidth: 2,
        borderRadius: chartType === "bar" ? 6 : 0,
        hoverOffset: 10,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          padding: 16,
          font: { size: 13 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#334155",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        callbacks: {
          label: (ctx) => {
            const pct = totalVotes > 0 ? ((ctx.parsed / totalVotes) * 100).toFixed(1) : 0;
            return `  ${ctx.label}: ${ctx.parsed} votes (${pct}%)`;
          },
        },
      },
      title: {
        display: false,
      },
    },
  };

  const barOptions = {
    ...commonOptions,
    scales: {
      x: {
        ticks: { color: "#94a3b8" },
        grid: { color: "#1e293b" },
      },
      y: {
        ticks: { color: "#94a3b8", stepSize: 1 },
        grid: { color: "#334155" },
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    ...commonOptions,
    cutout: "65%",
  };

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <FiBarChart2 size={48} className="mb-3 opacity-40" />
        <p>No data to display</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-md">
        {chartType === "doughnut" ? (
          <Doughnut data={chartData} options={doughnutOptions} />
        ) : (
          <Bar data={chartData} options={barOptions} />
        )}
      </div>

      {/* Legend Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left pb-2 font-medium">Candidate</th>
              <th className="text-left pb-2 font-medium">Party</th>
              <th className="text-right pb-2 font-medium">Votes</th>
              <th className="text-right pb-2 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <tr key={c.id || i} className="border-b border-slate-800 hover:bg-slate-800/50">
                <td className="py-2 flex items-center gap-2 text-white font-medium">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: BORDER_COLORS[i % BORDER_COLORS.length] }}
                  />
                  {c.name}
                </td>
                <td className="py-2 text-slate-400">{c.party}</td>
                <td className="py-2 text-right text-white font-mono">{c.voteCount}</td>
                <td className="py-2 text-right text-blue-400 font-mono">
                  {totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-slate-300 font-semibold">
              <td className="pt-2" colSpan={2}>Total</td>
              <td className="pt-2 text-right font-mono">{totalVotes}</td>
              <td className="pt-2 text-right font-mono">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

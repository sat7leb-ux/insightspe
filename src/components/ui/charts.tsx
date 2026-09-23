"use client";

import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from "chart.js";
import { Bar, Line, Doughnut, Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

ChartJS.defaults.font.family = "ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif";
ChartJS.defaults.font.size = 11.5;
ChartJS.defaults.color = "#64748b";
ChartJS.defaults.plugins.tooltip.backgroundColor = "#0f172a";
ChartJS.defaults.plugins.tooltip.padding = 10;
ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
ChartJS.defaults.plugins.tooltip.boxPadding = 4;

export const PALETTE = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#0ea5e9", "#ec4899", "#64748b"];

const gridStyle = { color: "#eef2f6" };

export function BarChart({ labels, datasets, stacked, horizontal, height = 260 }: {
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  stacked?: boolean;
  horizontal?: boolean;
  height?: number;
}) {
  return (
    <div className="chartjs-container" style={{ height }}>
      <Bar
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            label: d.label,
            data: d.data,
            backgroundColor: d.color ?? PALETTE[i % PALETTE.length],
            borderRadius: 6,
            maxBarThickness: 42,
          })),
        }}
        options={{
          indexAxis: horizontal ? "y" : "x",
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked, grid: horizontal ? gridStyle : { display: false } },
            y: { stacked, grid: horizontal ? { display: false } : gridStyle, beginAtZero: true },
          },
          plugins: { legend: { display: datasets.length > 1 } },
        }}
      />
    </div>
  );
}

export function LineChart({ labels, datasets, area, height = 260 }: {
  labels: string[];
  datasets: { label: string; data: number[]; color?: string }[];
  area?: boolean;
  height?: number;
}) {
  return (
    <div className="chartjs-container" style={{ height }}>
      <Line
        data={{
          labels,
          datasets: datasets.map((d, i) => {
            const c = d.color ?? PALETTE[i % PALETTE.length];
            return {
              label: d.label,
              data: d.data,
              borderColor: c,
              backgroundColor: area ? `${c}22` : c,
              fill: !!area,
              tension: 0.35,
              pointRadius: 3,
              pointHoverRadius: 5,
              borderWidth: 2,
            };
          }),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          scales: {
            x: { grid: { display: false } },
            y: { grid: gridStyle, beginAtZero: true },
          },
          plugins: { legend: { display: datasets.length > 1 } },
        }}
      />
    </div>
  );
}

export function DonutChart({ labels, data, colors, height = 240, asPie }: {
  labels: string[]; data: number[]; colors?: string[]; height?: number; asPie?: boolean;
}) {
  const Chart = asPie ? Pie : Doughnut;
  return (
    <div className="chartjs-container" style={{ height }}>
      <Chart
        data={{
          labels,
          datasets: [{
            data,
            backgroundColor: labels.map((_, i) => (colors ?? PALETTE)[i % (colors ?? PALETTE).length]),
            borderColor: "#fff",
            borderWidth: 2,
            hoverOffset: 6,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: asPie ? 0 : "62%",
          plugins: { legend: { position: "right", labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } },
        }}
      />
    </div>
  );
}

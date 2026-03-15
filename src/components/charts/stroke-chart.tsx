"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSplit } from "@/lib/utils";
import type { StrokeDataPoint } from "@/types";

interface StrokeChartProps {
  data: StrokeDataPoint[];
  dataKey: keyof StrokeDataPoint;
  title: string;
  color?: string;
  unit?: string;
  formatter?: (value: number) => string;
  avgValue?: number;
  invertYAxis?: boolean;
}

export function StrokeChart({
  data,
  dataKey,
  title,
  color = "#3b82f6",
  unit = "",
  formatter,
  avgValue,
  invertYAxis = false,
}: StrokeChartProps) {
  const chartData = data
    .filter((d) => d[dataKey] !== null && d[dataKey] !== undefined)
    .map((d) => ({
      stroke: d.strokeNumber,
      value: d[dataKey] as number,
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (v: number) => {
    if (formatter) return formatter(v);
    return `${v.toFixed(1)}${unit}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="stroke"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v) => formatValue(v)}
                reversed={invertYAxis}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="rounded-lg border bg-card p-2 shadow-md">
                      <p className="text-xs text-muted-foreground">
                        Stroke {item.payload.stroke}
                      </p>
                      <p className="text-sm font-medium">
                        {formatValue(item.value as number)}
                      </p>
                    </div>
                  );
                }}
              />
              {avgValue !== undefined && (
                <ReferenceLine
                  y={avgValue}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label={{
                    value: `Avg: ${formatValue(avgValue)}`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#94a3b8",
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface CombinedChartProps {
  data: StrokeDataPoint[];
}

export function CombinedStrokeChart({ data }: CombinedChartProps) {
  const chartData = data.map((d) => ({
    stroke: d.strokeNumber,
    pace: d.paceSplitSecs,
    power: d.powerWatts,
    spm: d.strokeRate,
  }));

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Combined: Pace + Power + SPM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="stroke" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Watts / SPM",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 11,
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                reversed
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatSplit(v)}
                label={{
                  value: "Pace",
                  angle: 90,
                  position: "insideRight",
                  fontSize: 11,
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-card p-2 shadow-md text-xs space-y-1">
                      <p className="text-muted-foreground">
                        Stroke {payload[0]?.payload?.stroke}
                      </p>
                      {payload.map((p) => (
                        <p key={p.dataKey as string} style={{ color: p.color }}>
                          {p.dataKey === "pace"
                            ? `Pace: ${formatSplit(p.value as number)}`
                            : `${p.dataKey === "power" ? "Power" : "SPM"}: ${(p.value as number)?.toFixed(1)}`}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="power"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                name="Power"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="spm"
                stroke="#10b981"
                strokeWidth={1.5}
                dot={false}
                name="SPM"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="pace"
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={false}
                name="Pace"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Pace
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Power
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> SPM
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

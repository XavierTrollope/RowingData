"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TrendLineChart, VolumeBarChart } from "@/components/charts/trend-charts";
import { formatSplit, formatNumber } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Activity,
  Brain,
} from "lucide-react";
import type { WorkoutSummary, TrendReport, PersonalBest } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function TrendsPage() {
  const { data: workoutsRes, isLoading: workoutsLoading } = useQuery({
    queryKey: ["all-workouts-for-trends"],
    queryFn: () =>
      fetchJson<{ data: WorkoutSummary[] }>("/api/workouts?limit=100"),
  });

  const { data: trendReport, isLoading: trendLoading } = useQuery({
    queryKey: ["trend-report"],
    queryFn: () => fetchJson<TrendReport | null>("/api/user/trends"),
  });

  const { data: pbs } = useQuery({
    queryKey: ["personal-bests-trends"],
    queryFn: () => fetchJson<PersonalBest[]>("/api/user/pbs"),
  });

  const workouts = workoutsRes?.data ?? [];
  const report = trendReport?.reportJson;

  const monthlyData = computeMonthlyAggregation(workouts);

  const trajectoryIcon = () => {
    if (!report) return null;
    switch (report.fitness_trajectory) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trends</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Long-term performance analysis and coaching insights
        </p>
      </div>

      {report && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Trend Report (90-day)</CardTitle>
              <div className="ml-auto flex items-center gap-2">
                {trajectoryIcon()}
                <Badge
                  variant="outline"
                  className={
                    report.fitness_trajectory === "improving"
                      ? "text-emerald-500 border-emerald-500/30"
                      : report.fitness_trajectory === "declining"
                        ? "text-red-500 border-red-500/30"
                        : "text-yellow-500 border-yellow-500/30"
                  }
                >
                  {report.fitness_trajectory}
                </Badge>
                {report.trajectory_confidence && (
                  <span className="text-xs text-muted-foreground">
                    {report.trajectory_confidence}% confidence
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{report.narrative}</p>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Volume Trend</h4>
                <p className="text-sm text-muted-foreground">{report.weekly_volume_trend}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Consistency</h4>
                <p className="text-sm text-muted-foreground">{report.consistency_assessment}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pace Trend</h4>
                <p className="text-sm text-muted-foreground">{report.pace_trend}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Power Trend</h4>
                <p className="text-sm text-muted-foreground">{report.power_trend}</p>
              </div>
            </div>

            {report.key_observations?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Key Observations</h4>
                  <ul className="space-y-1">
                    {report.key_observations.map((obs, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <Activity className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                        {obs}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {report.recommended_focus_areas?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Recommended Focus Areas</h4>
                  <ul className="space-y-1">
                    {report.recommended_focus_areas.map((area, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <Target className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {report.training_block_suggestion && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-1">Next Training Block</h4>
                  <p className="text-sm text-muted-foreground">{report.training_block_suggestion}</p>
                </div>
              </>
            )}

            {trendReport?.generatedAt && (
              <p className="text-xs text-muted-foreground pt-2">
                Generated {new Date(trendReport.generatedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!report && !trendLoading && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No trend report available yet. Reports are generated weekly on Mondays.
          </CardContent>
        </Card>
      )}

      {trendLoading && <Skeleton className="h-64" />}

      {workoutsLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Monthly Trends</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <TrendLineChart
              data={monthlyData.pace}
              title="Monthly Avg Pace"
              color="#3b82f6"
              formatter={formatSplit}
              invertYAxis
            />
            <TrendLineChart
              data={monthlyData.watts}
              title="Monthly Avg Power"
              color="#f59e0b"
              formatter={(v) => `${v.toFixed(0)}W`}
            />
          </div>
          <VolumeBarChart
            data={monthlyData.volume}
            title="Monthly Volume"
          />
        </div>
      )}

      {pbs && pbs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Personal Best History</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pbs.map((pb) => (
              <Card key={pb.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{pb.category}</span>
                    <Badge variant="secondary">
                      {new Date(pb.achievedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold font-mono mt-2">
                    {pb.value > 3600
                      ? `${Math.floor(pb.value / 3600)}:${String(Math.floor((pb.value % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(pb.value % 60)).padStart(2, "0")}`
                      : `${Math.floor(pb.value / 60)}:${String(Math.floor(pb.value % 60)).padStart(2, "0")}`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function computeMonthlyAggregation(workouts: WorkoutSummary[]) {
  const months: Record<string, { paces: number[]; watts: number[]; meters: number }> = {};

  for (const w of workouts) {
    const date = new Date(w.workoutDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!months[key]) months[key] = { paces: [], watts: [], meters: 0 };

    if (w.avgSplitSeconds) months[key].paces.push(w.avgSplitSeconds);
    if (w.avgWatts) months[key].watts.push(w.avgWatts);
    months[key].meters += w.distanceMeters ?? 0;
  }

  const sortedKeys = Object.keys(months).sort();

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    pace: sortedKeys
      .filter((k) => months[k].paces.length > 0)
      .map((k) => ({
        label: new Date(k + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        value: avg(months[k].paces),
      })),
    watts: sortedKeys
      .filter((k) => months[k].watts.length > 0)
      .map((k) => ({
        label: new Date(k + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        value: avg(months[k].watts),
      })),
    volume: sortedKeys.map((k) => ({
      label: new Date(k + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      }),
      meters: months[k].meters,
    })),
  };
}

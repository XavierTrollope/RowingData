"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  StrokeChart,
  CombinedStrokeChart,
} from "@/components/charts/stroke-chart";
import { ScoreRing } from "@/components/charts/score-ring";
import {
  formatSplit,
  formatDuration,
  formatDistance,
  formatNumber,
  gradeColor,
  gradeBgColor,
  pacingStrategyLabel,
} from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Heart,
  Timer,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import type { WorkoutDetail, StrokeDataPoint, AiAnalysis } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const { data: workout, isLoading: workoutLoading } = useQuery({
    queryKey: ["workout", id],
    queryFn: () => fetchJson<WorkoutDetail & { aiAnalysis: AiAnalysis | null }>(`/api/workouts/${id}`),
  });

  const { data: strokes, isLoading: strokesLoading } = useQuery({
    queryKey: ["workout-strokes", id],
    queryFn: () => fetchJson<StrokeDataPoint[]>(`/api/workouts/${id}/strokes`),
  });

  const reanalyseMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/workouts/${id}/reanalyse`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout", id] });
    },
  });

  if (workoutLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Workout not found</p>
        <Link href="/workouts" className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to workouts
        </Link>
      </div>
    );
  }

  const analysis = workout.aiAnalysis;
  const strokeData = strokes ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/workouts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {workout.description || formatDistance(workout.distanceMeters)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(workout.workoutDate).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {analysis && (
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl border text-2xl font-bold ${gradeBgColor(analysis.overall_grade)} ${gradeColor(analysis.overall_grade)}`}
          >
            {analysis.overall_grade}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard icon={<Gauge className="h-3.5 w-3.5" />} label="Distance" value={formatDistance(workout.distanceMeters)} />
        <MetricCard icon={<Timer className="h-3.5 w-3.5" />} label="Duration" value={formatDuration(workout.durationSeconds)} />
        <MetricCard icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg Pace" value={formatSplit(workout.avgSplitSeconds)} />
        <MetricCard icon={<Zap className="h-3.5 w-3.5" />} label="Avg Watts" value={formatNumber(workout.avgWatts, 0)} />
        <MetricCard icon={<Target className="h-3.5 w-3.5" />} label="Avg SPM" value={formatNumber(workout.avgSpm, 1)} />
        <MetricCard icon={<Heart className="h-3.5 w-3.5" />} label="Avg HR" value={workout.heartRateAvg ? `${workout.heartRateAvg}` : "--"} />
        <MetricCard label="Calories" value={formatNumber(workout.totalCalories, 0)} />
        <MetricCard label="Peak Power" value={workout.peakPowerWatts ? `${formatNumber(workout.peakPowerWatts, 0)}W` : "--"} />
      </div>

      {analysis && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">AI Analysis</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reanalyseMutation.mutate()}
                disabled={reanalyseMutation.isPending}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${reanalyseMutation.isPending ? "animate-spin" : ""}`} />
                Re-analyse
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm leading-relaxed">{analysis.coaching_narrative}</p>

            <div className="flex flex-wrap items-center gap-3">
              {analysis.performance_vs_pb && (
                <Badge variant="outline">{analysis.performance_vs_pb}</Badge>
              )}
              {analysis.key_metrics?.pacing_strategy && (
                <Badge
                  variant="outline"
                  className={pacingStrategyLabel(analysis.key_metrics.pacing_strategy).color}
                >
                  {pacingStrategyLabel(analysis.key_metrics.pacing_strategy).label}
                </Badge>
              )}
              {analysis.pacing_analysis?.fade_detected && (
                <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Fade: {analysis.pacing_analysis.fade_percentage?.toFixed(1)}%
                </Badge>
              )}
            </div>

            {analysis.key_metrics && (
              <div className="flex flex-wrap gap-4 justify-center py-2">
                <ScoreRing score={analysis.key_metrics.pacing_score} label="Pacing" />
                <ScoreRing score={analysis.key_metrics.power_consistency_score} label="Power" />
                <ScoreRing score={analysis.key_metrics.technique_consistency_score} label="Technique" />
                <ScoreRing score={analysis.key_metrics.endurance_score} label="Endurance" />
                <ScoreRing score={analysis.key_metrics.overall_efficiency_score} label="Efficiency" />
              </div>
            )}

            <Separator />

            <div className="grid md:grid-cols-2 gap-6">
              {analysis.strengths?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-emerald-500 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-emerald-500 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.areas_for_improvement?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-orange-500 mb-2">Areas for Improvement</h4>
                  <ul className="space-y-1">
                    {analysis.areas_for_improvement.map((a, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">-</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {analysis.technique_insights && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Technique Insights</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <InsightCard
                      label="Drive:Recovery Ratio"
                      text={analysis.technique_insights.drive_recovery_ratio_assessment}
                      value={workout.driveToRecoveryRatio?.toFixed(2)}
                    />
                    <InsightCard
                      label="Stroke Rate Consistency"
                      text={analysis.technique_insights.stroke_rate_consistency}
                    />
                    <InsightCard
                      label="Power Application"
                      text={analysis.technique_insights.power_application}
                    />
                  </div>
                </div>
              </>
            )}

            {analysis.training_recommendations?.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-2">Training Recommendations</h4>
                  <ol className="space-y-1.5">
                    {analysis.training_recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary font-medium">{i + 1}.</span>
                        {r}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {strokesLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-60" />
          <Skeleton className="h-60" />
        </div>
      ) : strokeData.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Stroke Data</h2>

          <CombinedStrokeChart data={strokeData} />

          <div className="grid md:grid-cols-2 gap-4">
            <StrokeChart
              data={strokeData}
              dataKey="paceSplitSecs"
              title="Pace (per 500m)"
              color="#3b82f6"
              formatter={formatSplit}
              invertYAxis
              avgValue={workout.avgSplitSeconds ?? undefined}
            />
            <StrokeChart
              data={strokeData}
              dataKey="powerWatts"
              title="Power (watts)"
              color="#f59e0b"
              unit="W"
              avgValue={workout.avgWatts ?? undefined}
            />
            <StrokeChart
              data={strokeData}
              dataKey="strokeRate"
              title="Stroke Rate (SPM)"
              color="#10b981"
              unit=" spm"
              avgValue={workout.avgSpm ?? undefined}
            />
            <StrokeChart
              data={strokeData}
              dataKey="heartRate"
              title="Heart Rate"
              color="#ef4444"
              unit=" bpm"
              avgValue={workout.heartRateAvg ?? undefined}
            />
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground text-sm">
            No stroke-level data available for this workout
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
          {icon}
          <span className="text-[11px]">{label}</span>
        </div>
        <p className="text-sm font-bold font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  label,
  text,
  value,
}: {
  label: string;
  text: string;
  value?: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {value && (
          <span className="text-xs font-mono text-primary">{value}</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

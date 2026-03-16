"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendLineChart, VolumeBarChart } from "@/components/charts/trend-charts";
import {
  formatSplit,
  formatDuration,
  formatDistance,
  formatNumber,
  gradeColor,
  gradeBgColor,
} from "@/lib/utils";
import {
  Activity,
  Waves,
  Target,
  Flame,
  Calendar,
  TrendingUp,
  Lightbulb,
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import type { WorkoutSummary, UserStats, PersonalBest } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: () => fetchJson<UserStats>("/api/user/stats"),
  });

  const { data: workoutsRes, isLoading: workoutsLoading } = useQuery({
    queryKey: ["recent-workouts"],
    queryFn: () =>
      fetchJson<{ data: WorkoutSummary[] }>("/api/workouts?limit=100"),
  });

  const { data: pbs, isLoading: pbsLoading } = useQuery({
    queryKey: ["personal-bests"],
    queryFn: () => fetchJson<PersonalBest[]>("/api/user/pbs"),
  });

  const workouts = workoutsRes?.data ?? [];
  const latestWorkout = workouts[0];

  const paceTrendData = workouts
    .filter((w) => w.avgSplitSeconds)
    .slice(0, 30)
    .reverse()
    .map((w) => ({
      label: new Date(w.workoutDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      value: w.avgSplitSeconds!,
    }));

  const powerTrendData = workouts
    .filter((w) => w.avgWatts)
    .slice(0, 30)
    .reverse()
    .map((w) => ({
      label: new Date(w.workoutDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      value: w.avgWatts!,
    }));

  const weeklyVolume = computeWeeklyVolume(workouts);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your rowing performance at a glance
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Waves className="h-4 w-4" />}
          label="Total Metres"
          value={statsLoading ? null : formatDistance(stats?.totalMeters ?? 0)}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Total Workouts"
          value={statsLoading ? null : formatNumber(stats?.totalWorkouts ?? 0)}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Season Metres"
          value={
            statsLoading ? null : formatDistance(stats?.currentSeasonMeters ?? 0)
          }
        />
        <StatCard
          icon={<Flame className="h-4 w-4" />}
          label="Longest Streak"
          value={
            statsLoading
              ? null
              : `${stats?.longestStreak ?? 0} days`
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {workoutsLoading ? (
            <Skeleton className="h-40" />
          ) : latestWorkout ? (
            <RecentWorkoutCard workout={latestWorkout} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No workouts yet. Import your history from the Import page.
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <TrendLineChart
              data={paceTrendData}
              title="Pace Trend (last 30 workouts)"
              color="#3b82f6"
              formatter={formatSplit}
              invertYAxis
            />
            <TrendLineChart
              data={powerTrendData}
              title="Power Trend (last 30 workouts)"
              color="#f59e0b"
              formatter={(v) => `${v.toFixed(0)}W`}
            />
          </div>

          <VolumeBarChart data={weeklyVolume} title="Weekly Volume (last 12 weeks)" />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Personal Bests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pbsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-8" />
                  ))}
                </div>
              ) : pbs && pbs.length > 0 ? (
                <div className="space-y-3">
                  {pbs.map((pb) => (
                    <div key={pb.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{pb.category}</span>
                      <div className="text-right">
                        <span className="text-sm font-mono">
                          {formatDuration(pb.value)}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(pb.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No personal bests recorded yet
                </p>
              )}
            </CardContent>
          </Card>

          <AiInsightsCard hasWorkouts={workouts.length > 0} />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {value !== null ? (
          <p className="text-xl font-bold">{value}</p>
        ) : (
          <Skeleton className="h-7 w-24" />
        )}
      </CardContent>
    </Card>
  );
}

function RecentWorkoutCard({ workout }: { workout: WorkoutSummary }) {
  return (
    <Link href={`/workouts/${workout.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Latest Workout</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(workout.workoutDate).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            {workout.aiGrade && (
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl font-bold ${gradeBgColor(workout.aiGrade)} ${gradeColor(workout.aiGrade)}`}
              >
                {workout.aiGrade}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {workout.description && (
              <Badge variant="secondary">{workout.description}</Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {workout.workoutType}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <MiniStat label="Distance" value={formatDistance(workout.distanceMeters)} />
            <MiniStat label="Duration" value={formatDuration(workout.durationSeconds)} />
            <MiniStat label="Avg Pace" value={formatSplit(workout.avgSplitSeconds)} />
            <MiniStat label="Avg Watts" value={formatNumber(workout.avgWatts, 0)} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold font-mono">{value}</p>
    </div>
  );
}

function computeWeeklyVolume(
  workouts: WorkoutSummary[]
): { label: string; meters: number }[] {
  const weeks: Record<string, number> = {};
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7);
    const key = weekStart.toISOString().split("T")[0];
    weeks[key] = 0;
  }

  for (const w of workouts) {
    const date = new Date(w.workoutDate);
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split("T")[0];
    if (key in weeks) {
      weeks[key] += w.distanceMeters ?? 0;
    }
  }

  return Object.entries(weeks).map(([date, meters]) => ({
    label: new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    meters,
  }));
}

interface AiInsightsData {
  narrative: string | null;
  trajectory: string | null;
  keyObservations: string[];
  focusAreas: string[];
  generatedAt: string | null;
  cached: boolean;
  message?: string;
  error?: string;
}

const trajectoryConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  improving: {
    icon: <ArrowUpRight className="h-4 w-4" />,
    label: "Improving",
    color: "text-emerald-500",
  },
  plateauing: {
    icon: <ArrowRight className="h-4 w-4" />,
    label: "Plateauing",
    color: "text-amber-500",
  },
  declining: {
    icon: <ArrowDownRight className="h-4 w-4" />,
    label: "Declining",
    color: "text-red-500",
  },
};

function AiInsightsCard({ hasWorkouts }: { hasWorkouts: boolean }) {
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ["ai-insights"],
    queryFn: () =>
      fetch("/api/user/ai-insights", { credentials: "include" }).then((r) =>
        r.json()
      ) as Promise<AiInsightsData>,
    enabled: hasWorkouts,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user/ai-insights", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data as AiInsightsData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-insights"] });
    },
  });

  const traj = insights?.trajectory
    ? trajectoryConfig[insights.trajectory]
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </CardTitle>
          {hasWorkouts && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Analysing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {insights?.narrative ? "Refresh" : "Generate"}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : generateMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">
              Analysing your workout history with AI...
            </p>
            <p className="text-xs">This may take 10-20 seconds</p>
          </div>
        ) : generateMutation.isError ? (
          <div className="flex items-start gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{String(generateMutation.error)}</p>
          </div>
        ) : insights?.narrative ? (
          <div className="space-y-4">
            {traj && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${traj.color} gap-1 font-medium`}
                >
                  {traj.icon}
                  {traj.label}
                </Badge>
                {insights.generatedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(insights.generatedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            )}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {insights.narrative}
            </p>
            {insights.keyObservations.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Key Observations
                </p>
                <ul className="space-y-1">
                  {insights.keyObservations.map((obs, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-1.5"
                    >
                      <span className="text-primary mt-0.5">•</span>
                      {obs}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {insights.focusAreas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recommended Focus
                </p>
                <ul className="space-y-1">
                  {insights.focusAreas.map((area, i) => (
                    <li
                      key={i}
                      className="text-xs text-muted-foreground flex items-start gap-1.5"
                    >
                      <Target className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      {area}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {hasWorkouts
                ? "Click Generate to get AI-powered coaching insights based on your workout history."
                : "Import workouts first, then generate AI insights."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

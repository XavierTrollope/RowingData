"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workoutsLoading ? (
                <Skeleton className="h-20" />
              ) : workouts.length > 0 ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Review your latest workout analysis for personalised coaching
                    recommendations.
                  </p>
                  {latestWorkout && (
                    <Link
                      href={`/workouts/${latestWorkout.id}`}
                      className="text-primary hover:underline text-sm font-medium"
                    >
                      View Latest Analysis
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  AI insights will appear after your first workout is analysed
                </p>
              )}
            </CardContent>
          </Card>
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

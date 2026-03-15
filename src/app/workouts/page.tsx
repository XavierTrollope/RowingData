"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatSplit,
  formatDuration,
  formatDistance,
  formatNumber,
  gradeColor,
} from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
} from "lucide-react";
import Link from "next/link";
import type { WorkoutSummary } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function WorkoutsListPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const limit = 20;

  const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
  const url = `/api/workouts?page=${page}&limit=${limit}${typeParam}`;

  const { data, isLoading } = useQuery({
    queryKey: ["workouts-list", page, typeFilter],
    queryFn: () =>
      fetchJson<{
        data: WorkoutSummary[];
        meta: { page: number; total: number; totalPages: number };
      }>(url),
  });

  const workouts = data?.data ?? [];
  const meta = data?.meta;

  const exportCsv = () => {
    const headers = [
      "Date",
      "Type",
      "Description",
      "Distance (m)",
      "Duration (s)",
      "Avg Pace",
      "Avg Watts",
      "Avg SPM",
      "Calories",
      "AI Grade",
    ];
    const rows = workouts.map((w) => [
      new Date(w.workoutDate).toISOString().split("T")[0],
      w.workoutType,
      w.description || "",
      w.distanceMeters ?? "",
      w.durationSeconds ?? "",
      w.avgSplitSeconds?.toFixed(1) ?? "",
      w.avgWatts?.toFixed(0) ?? "",
      w.avgSpm?.toFixed(1) ?? "",
      w.totalCalories ?? "",
      w.aiGrade || "",
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workouts-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {meta ? `${meta.total} workouts total` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="rowed">RowErg</SelectItem>
              <SelectItem value="skierg">SkiErg</SelectItem>
              <SelectItem value="bikeerg">BikeErg</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={workouts.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-right p-3 font-medium">Distance</th>
                  <th className="text-right p-3 font-medium">Time</th>
                  <th className="text-right p-3 font-medium">Pace</th>
                  <th className="text-right p-3 font-medium">Watts</th>
                  <th className="text-right p-3 font-medium">SPM</th>
                  <th className="text-center p-3 font-medium">Grade</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="p-3">
                          <Skeleton className="h-5 w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : workouts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">
                      No workouts found
                    </td>
                  </tr>
                ) : (
                  workouts.map((w) => (
                    <tr key={w.id} className="border-b hover:bg-accent/50 transition-colors">
                      <td className="p-3">
                        <Link
                          href={`/workouts/${w.id}`}
                          className="text-sm font-medium hover:text-primary transition-colors"
                        >
                          {new Date(w.workoutDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {w.workoutType}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {w.description || "--"}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {formatDistance(w.distanceMeters)}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {formatDuration(w.durationSeconds)}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {formatSplit(w.avgSplitSeconds)}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {formatNumber(w.avgWatts, 0)}
                      </td>
                      <td className="p-3 text-sm text-right font-mono">
                        {formatNumber(w.avgSpm, 1)}
                      </td>
                      <td className="p-3 text-center">
                        {w.aiGrade ? (
                          <span className={`text-sm font-bold ${gradeColor(w.aiGrade)}`}>
                            {w.aiGrade}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

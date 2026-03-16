"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  RefreshCw,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

function BackfillWattsCard() {
  const [result, setResult] = useState<{ updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backfillMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync/backfill-watts", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
    },
    onError: (err) => setError(String(err)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recalculate Power Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Calculate average watts from split times for all workouts missing power
          data. This uses the standard Concept2 formula.
        </p>
        <Button
          variant="outline"
          onClick={() => backfillMutation.mutate()}
          disabled={backfillMutation.isPending}
        >
          {backfillMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Calculating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate Watts
            </>
          )}
        </Button>
        {result && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-500">
                Updated {result.updated} workouts with power data
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">{error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImportPage() {
  const queryClient = useQueryClient();
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    error?: string;
  } | null>(null);

  const { data: workoutCount } = useQuery({
    queryKey: ["workout-count-import"],
    queryFn: () => fetchJson<{ meta: { total: number } }>("/api/workouts?limit=1"),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync/import-direct", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return data;
    },
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["workout-count-import"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["recent-workouts"] });
      queryClient.invalidateQueries({ queryKey: ["workouts-list"] });
    },
    onError: (err) => {
      setImportResult({ imported: 0, skipped: 0, error: String(err) });
    },
  });

  const total = workoutCount?.meta?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import & Sync</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Import your workout history from Concept2
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">
              <strong>{total}</strong> workouts in database
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import from Concept2 Logbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fetch all your workouts from the Concept2 Online Logbook. Existing
            workouts will be skipped (no duplicates). This may take a minute
            depending on how many workouts you have.
          </p>

          <Button
            onClick={() => {
              setImportResult(null);
              importMutation.mutate();
            }}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importing... (this may take a moment)
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Import All Workouts
              </>
            )}
          </Button>

          {importResult && !importResult.error && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">
                  Import complete
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {importResult.imported} new workouts imported, {importResult.skipped} already existed.
              </p>
            </div>
          )}

          {importResult?.error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">
                  Import error
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {importResult.error}
                {importResult.imported > 0 &&
                  ` (${importResult.imported} workouts were imported before the error)`}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted p-3">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              The import fetches all pages from your Concept2 logbook. For large
              histories this can take 30-60 seconds. Do not close the page while
              importing.
            </span>
          </div>
        </CardContent>
      </Card>

      <BackfillWattsCard />
    </div>
  );
}

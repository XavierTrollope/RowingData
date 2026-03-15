"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  RefreshCw,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { SyncStatus } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function ImportPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ["sync-status"],
    queryFn: () => fetchJson<SyncStatus>("/api/sync/status"),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.isImporting ? 3000 : 30000;
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => fetch("/api/sync/trigger", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: () => fetch("/api/sync/historical", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import & Sync</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your Concept2 data synchronisation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking status...
            </div>
          ) : status?.isImporting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">Import in progress...</span>
              </div>
              <Progress value={status.progress ?? 0} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {status.imported ?? 0} of {status.total ?? "?"} workouts imported
                </span>
                <span>{status.progress ?? 0}%</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">No import currently running</span>
            </div>
          )}

          {status?.lastSyncAt && (
            <div className="text-xs text-muted-foreground">
              Last sync:{" "}
              {new Date(status.lastSyncAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Fetch any new workouts logged since the last sync. This runs
              automatically every 5 minutes, but you can trigger it manually.
            </p>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync New Workouts
            </Button>
            {syncMutation.isSuccess && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                Sync queued
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Full Historical Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Re-import all historical workouts from your Concept2 Logbook. This
              will fetch every workout and download stroke data for each one.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => importMutation.mutate()}
                disabled={importMutation.isPending || status?.isImporting}
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Re-import All Data
              </Button>
            </div>
            {importMutation.isSuccess && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                Import queued
              </Badge>
            )}
            <div className="flex items-start gap-2 text-xs text-muted-foreground rounded-lg bg-muted p-3">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                This can take several minutes depending on the number of workouts
                in your logbook. Existing data will not be duplicated.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Link2,
  Shield,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import type { UserStats } from "@/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

export default function SettingsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["user-stats-settings"],
    queryFn: () => fetchJson<UserStats>("/api/user/stats"),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account and API connections
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Concept2 Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Connection Status</span>
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
              Connected
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Workouts Imported</span>
            {isLoading ? (
              <Skeleton className="h-5 w-12" />
            ) : (
              <span className="text-sm font-mono">{stats?.totalWorkouts ?? 0}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Total Metres Rowed</span>
            {isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span className="text-sm font-mono">
                {(stats?.totalMeters ?? 0).toLocaleString()}m
              </span>
            )}
          </div>
          <Separator />
          <div className="text-xs text-muted-foreground">
            Auto-sync runs every 5 minutes. Workouts are fetched from the
            Concept2 Online Logbook and automatically analysed by AI.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Your Concept2 OAuth tokens are encrypted at rest using AES-256-GCM.
            </p>
            <p>
              All API calls to Claude AI are made server-side. Your API keys are
              never exposed to the browser.
            </p>
            <p>
              Row-level security ensures you can only access your own data.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/api/auth/logout">
            <Button variant="destructive" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

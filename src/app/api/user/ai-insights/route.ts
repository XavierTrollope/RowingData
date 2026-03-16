import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);
const CACHE_HOURS = 12;

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cachedReport = await prisma.trendReport.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  });

  if (cachedReport) {
    const ageMs = Date.now() - cachedReport.generatedAt.getTime();
    if (ageMs < CACHE_HOURS * 60 * 60 * 1000) {
      const report = cachedReport.reportJson as Record<string, unknown>;
      return NextResponse.json({
        narrative: cachedReport.narrativeText,
        trajectory: report.fitness_trajectory ?? null,
        keyObservations: report.key_observations ?? [],
        focusAreas: report.recommended_focus_areas ?? [],
        generatedAt: cachedReport.generatedAt.toISOString(),
        cached: true,
      });
    }
  }

  return NextResponse.json({
    narrative: null,
    cached: false,
    message: "No recent AI analysis. Use the Generate button to create one.",
  });
}

export async function POST(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const workouts = await prisma.workout.findMany({
    where: { userId },
    orderBy: { workoutDate: "desc" },
    take: 60,
    select: {
      workoutDate: true,
      workoutType: true,
      description: true,
      distanceMeters: true,
      durationSeconds: true,
      avgSplitSeconds: true,
      avgWatts: true,
      avgSpm: true,
      totalCalories: true,
      heartRateAvg: true,
    },
  });

  if (workouts.length === 0) {
    return NextResponse.json(
      { error: "No workouts to analyse" },
      { status: 400 }
    );
  }

  const workoutLines = workouts
    .reverse()
    .map((w) => {
      const split = w.avgSplitSeconds ? Number(w.avgSplitSeconds) : null;
      let watts = w.avgWatts ? Number(w.avgWatts) : null;
      if (!watts && split && split > 0) {
        watts = Math.round(2.80 / Math.pow(split / 500, 3));
      }
      const splitStr = split
        ? `${Math.floor(split / 60)}:${(split % 60).toFixed(1).padStart(4, "0")}`
        : "?";
      return `${w.workoutDate.toISOString().split("T")[0]} | ${w.workoutType} ${w.description || ""} | ${w.distanceMeters ?? 0}m | ${w.durationSeconds}s | ${splitStr}/500m | ${watts ?? "?"}W | ${w.avgSpm ? Number(w.avgSpm).toFixed(0) : "?"}spm | ${w.heartRateAvg ?? "?"}bpm | ${w.totalCalories ?? "?"}cal`;
    })
    .join("\n");

  const totalMeters = workouts.reduce(
    (sum, w) => sum + (w.distanceMeters ?? 0),
    0
  );
  const totalSessions = workouts.length;
  const dateRange = `${workouts[0].workoutDate.toISOString().split("T")[0]} to ${workouts[workouts.length - 1].workoutDate.toISOString().split("T")[0]}`;

  const prompt = `You are an expert rowing coach analysing a Concept2 indoor rower logbook. Provide a concise performance summary.

## Athlete Summary
- Sessions: ${totalSessions}
- Total metres: ${totalMeters.toLocaleString()}m
- Date range: ${dateRange}

## Workout Log
Date | Type | Distance | Duration | Pace | Power | SPM | HR | Calories
${workoutLines}

Respond with ONLY a valid JSON object (no markdown code fences, no extra text):
{
  "fitness_trajectory": "improving" or "plateauing" or "declining",
  "trajectory_confidence": number 0-100,
  "weekly_volume_trend": "brief description",
  "consistency_assessment": "brief description",
  "pace_trend": "brief description of pace changes over time",
  "power_trend": "brief description of power changes over time",
  "key_observations": ["3-4 specific, data-backed observations"],
  "recommended_focus_areas": ["2-3 actionable training recommendations"],
  "training_block_suggestion": "what the athlete should focus on in the next 4 weeks",
  "narrative": "A 4-6 sentence coaching summary written in second person (you/your). Be specific with numbers. Mention recent trends and what to work on next."
}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      },
    });

    let text = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        text = result.response.text();
        break;
      } catch (retryErr: unknown) {
        const msg = retryErr instanceof Error ? retryErr.message : "";
        if (attempt === 0 && msg.includes("429")) {
          await new Promise((r) => setTimeout(r, 25000));
          continue;
        }
        throw retryErr;
      }
    }

    let report: Record<string, unknown>;
    try {
      report = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");
      report = JSON.parse(match[0]);
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await prisma.trendReport.create({
      data: {
        userId,
        periodStart: ninetyDaysAgo,
        periodEnd: new Date(),
        reportJson: JSON.parse(JSON.stringify(report)),
        narrativeText:
          typeof report.narrative === "string" ? report.narrative : null,
      },
    });

    return NextResponse.json({
      narrative: report.narrative,
      trajectory: report.fitness_trajectory ?? null,
      keyObservations: report.key_observations ?? [],
      focusAreas: report.recommended_focus_areas ?? [],
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("AI insights error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

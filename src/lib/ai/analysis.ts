import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const MODEL_VERSION = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert rowing coach and sports scientist with deep knowledge of indoor rowing performance on the Concept2 ergometer. You analyse per-stroke rowing data to provide precise, actionable feedback.

Your analysis must be returned as a single valid JSON object with no additional text, markdown, or preamble. The schema is defined in the user message.`;

export interface AnalysisOutput {
  overall_grade: string;
  performance_vs_pb: string;
  key_metrics: {
    pacing_strategy: string;
    pacing_score: number;
    power_consistency_score: number;
    technique_consistency_score: number;
    endurance_score: number;
    overall_efficiency_score: number;
  };
  strengths: string[];
  areas_for_improvement: string[];
  pacing_analysis: {
    summary: string;
    fade_detected: boolean;
    fade_percentage: number | null;
    best_split_stroke: number;
    worst_split_stroke: number;
  };
  technique_insights: {
    drive_recovery_ratio_assessment: string;
    stroke_rate_consistency: string;
    power_application: string;
  };
  training_recommendations: string[];
  comparable_to_previous: string;
  coaching_narrative: string;
}

interface StrokeSample {
  stroke_number: number;
  pace_split_secs: number | null;
  power_watts: number | null;
  stroke_rate: number | null;
  heart_rate: number | null;
}

function downsampleStrokes(
  strokes: StrokeSample[],
  maxPoints: number = 500
): StrokeSample[] {
  if (strokes.length <= maxPoints) return strokes;
  const step = Math.ceil(strokes.length / maxPoints);
  return strokes.filter((_, i) => i % step === 0);
}

export async function analyzeWorkout(workoutId: string): Promise<void> {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      strokeData: {
        orderBy: { strokeNumber: "asc" },
        select: {
          strokeNumber: true,
          paceSplitSecs: true,
          powerWatts: true,
          strokeRate: true,
          heartRate: true,
        },
      },
      user: true,
    },
  });

  if (!workout) throw new Error(`Workout ${workoutId} not found`);

  const recentWorkouts = await prisma.workout.findMany({
    where: {
      userId: workout.userId,
      workoutType: workout.workoutType,
      id: { not: workout.id },
    },
    orderBy: { workoutDate: "desc" },
    take: 10,
    select: {
      workoutDate: true,
      distanceMeters: true,
      durationSeconds: true,
      avgSplitSeconds: true,
      avgWatts: true,
      avgSpm: true,
      description: true,
    },
  });

  const personalBest = await prisma.personalBest.findFirst({
    where: {
      userId: workout.userId,
      category: workout.description || undefined,
    },
  });

  const strokeSamples = downsampleStrokes(
    workout.strokeData.map((s) => ({
      stroke_number: s.strokeNumber,
      pace_split_secs: s.paceSplitSecs ? Number(s.paceSplitSecs) : null,
      power_watts: s.powerWatts ? Number(s.powerWatts) : null,
      stroke_rate: s.strokeRate ? Number(s.strokeRate) : null,
      heart_rate: s.heartRate,
    }))
  );

  const userPrompt = `Analyze this Concept2 rowing workout and return a JSON object matching the schema below.

## Workout Summary
- Type: ${workout.workoutType}
- Description: ${workout.description || "N/A"}
- Distance: ${workout.distanceMeters}m
- Duration: ${workout.durationSeconds}s
- Avg Pace: ${workout.avgSplitSeconds ? Number(workout.avgSplitSeconds).toFixed(1) : "N/A"}s/500m
- Avg Watts: ${workout.avgWatts ? Number(workout.avgWatts).toFixed(1) : "N/A"}
- Avg SPM: ${workout.avgSpm ? Number(workout.avgSpm).toFixed(1) : "N/A"}
- Calories: ${workout.totalCalories || "N/A"}
- Avg HR: ${workout.heartRateAvg || "N/A"}

## Stroke-Level Statistics
- Pace StdDev: ${workout.paceConsistencyStddev ? Number(workout.paceConsistencyStddev).toFixed(3) : "N/A"}
- Power StdDev: ${workout.powerConsistencyStddev ? Number(workout.powerConsistencyStddev).toFixed(3) : "N/A"}
- SPM StdDev: ${workout.spmConsistencyStddev ? Number(workout.spmConsistencyStddev).toFixed(3) : "N/A"}
- Drive:Recovery Ratio: ${workout.driveToRecoveryRatio ? Number(workout.driveToRecoveryRatio).toFixed(3) : "N/A"}
- First Quarter Avg Watts: ${workout.firstQuarterAvgWatts ? Number(workout.firstQuarterAvgWatts).toFixed(1) : "N/A"}
- Last Quarter Avg Watts: ${workout.lastQuarterAvgWatts ? Number(workout.lastQuarterAvgWatts).toFixed(1) : "N/A"}
- Peak Power: ${workout.peakPowerWatts ? Number(workout.peakPowerWatts).toFixed(1) : "N/A"}W at stroke #${workout.peakPowerStrokeNumber || "N/A"}

## Personal Best for this category
${personalBest ? `PB: ${Number(personalBest.value).toFixed(1)} (achieved ${personalBest.achievedAt.toISOString().split("T")[0]})` : "No PB recorded for this category"}

## Recent Workout History (same type, last 10)
${
  recentWorkouts.length > 0
    ? recentWorkouts
        .map(
          (w) =>
            `- ${w.workoutDate.toISOString().split("T")[0]}: ${w.description || "N/A"}, ${w.distanceMeters}m, ${w.durationSeconds}s, pace ${w.avgSplitSeconds ? Number(w.avgSplitSeconds).toFixed(1) : "?"}s/500m, ${w.avgWatts ? Number(w.avgWatts).toFixed(1) : "?"}W, ${w.avgSpm ? Number(w.avgSpm).toFixed(1) : "?"}SPM`
        )
        .join("\n")
    : "No previous workouts of this type"
}

## Stroke Data (sampled, ${strokeSamples.length} points)
${JSON.stringify(strokeSamples)}

## Required JSON Output Schema
{
  "overall_grade": "A/B/C/D/F",
  "performance_vs_pb": "string describing comparison to PB",
  "key_metrics": {
    "pacing_strategy": "positive split | negative split | even split | irregular",
    "pacing_score": 0-100,
    "power_consistency_score": 0-100,
    "technique_consistency_score": 0-100,
    "endurance_score": 0-100,
    "overall_efficiency_score": 0-100
  },
  "strengths": ["string"],
  "areas_for_improvement": ["string"],
  "pacing_analysis": {
    "summary": "string",
    "fade_detected": boolean,
    "fade_percentage": number or null,
    "best_split_stroke": number,
    "worst_split_stroke": number
  },
  "technique_insights": {
    "drive_recovery_ratio_assessment": "string",
    "stroke_rate_consistency": "string",
    "power_application": "string"
  },
  "training_recommendations": ["string"],
  "comparable_to_previous": "string",
  "coaching_narrative": "A 3-4 sentence plain English coaching summary"
}

Return ONLY the JSON object, no markdown formatting or extra text.`;

  const message = await anthropic.messages.create({
    model: MODEL_VERSION,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let analysisJson: AnalysisOutput;
  try {
    analysisJson = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI analysis response as JSON");
    }
    analysisJson = JSON.parse(jsonMatch[0]);
  }

  await prisma.aiAnalysis.upsert({
    where: { workoutId },
    update: {
      modelVersion: MODEL_VERSION,
      analysisJson: JSON.parse(JSON.stringify(analysisJson)),
      narrativeText: analysisJson.coaching_narrative,
      generatedAt: new Date(),
    },
    create: {
      workoutId,
      modelVersion: MODEL_VERSION,
      analysisJson: JSON.parse(JSON.stringify(analysisJson)),
      narrativeText: analysisJson.coaching_narrative,
    },
  });

  await prisma.workout.update({
    where: { id: workoutId },
    data: { aiAnalysisId: workoutId },
  });
}

export async function analyzeTrends(userId: string): Promise<void> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      workoutDate: { gte: ninetyDaysAgo },
    },
    orderBy: { workoutDate: "asc" },
    select: {
      workoutDate: true,
      workoutType: true,
      description: true,
      distanceMeters: true,
      durationSeconds: true,
      avgSplitSeconds: true,
      avgWatts: true,
      avgSpm: true,
      paceConsistencyStddev: true,
      powerConsistencyStddev: true,
      firstQuarterAvgWatts: true,
      lastQuarterAvgWatts: true,
    },
  });

  if (workouts.length === 0) return;

  const prompt = `Analyze these rowing workout trends from the past 90 days and return a JSON object.

## Workouts (${workouts.length} total)
${workouts
  .map(
    (w) =>
      `- ${w.workoutDate.toISOString().split("T")[0]}: ${w.workoutType} ${w.description || ""}, ${w.distanceMeters}m, pace ${w.avgSplitSeconds ? Number(w.avgSplitSeconds).toFixed(1) : "?"}s/500m, ${w.avgWatts ? Number(w.avgWatts).toFixed(1) : "?"}W, ${w.avgSpm ? Number(w.avgSpm).toFixed(1) : "?"}SPM`
  )
  .join("\n")}

Return a JSON object with:
{
  "fitness_trajectory": "improving | plateauing | declining",
  "trajectory_confidence": 0-100,
  "weekly_volume_trend": "string",
  "consistency_assessment": "string",
  "pace_trend": "string",
  "power_trend": "string",
  "key_observations": ["string"],
  "recommended_focus_areas": ["string"],
  "training_block_suggestion": "string",
  "narrative": "A 4-6 sentence comprehensive coaching summary of the 90-day trend"
}

Return ONLY the JSON object.`;

  const message = await anthropic.messages.create({
    model: MODEL_VERSION,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";

  let reportJson: Record<string, unknown>;
  try {
    reportJson = JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse trend analysis as JSON");
    reportJson = JSON.parse(jsonMatch[0]);
  }

  await prisma.trendReport.create({
    data: {
      userId,
      periodStart: ninetyDaysAgo,
      periodEnd: new Date(),
      reportJson: JSON.parse(JSON.stringify(reportJson)),
      narrativeText:
        typeof reportJson.narrative === "string"
          ? reportJson.narrative
          : null,
    },
  });
}

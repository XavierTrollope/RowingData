import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";
import {
  getResults,
  getResultsSince,
  getStrokeData,
  type Concept2Result,
} from "@/lib/concept2/client";
import { parseAndStoreStrokeData } from "@/lib/csv/parser";
import { uploadCsv } from "@/lib/storage";
import { analyzeWorkout, analyzeTrends } from "@/lib/ai/analysis";

function createConnection() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const connection = createConnection();

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 60_000,
  },
};

export const syncWorkoutsQueue = new Queue("sync-workouts", {
  connection,
  defaultJobOptions,
});

export const parseCsvQueue = new Queue("parse-csv", {
  connection,
  defaultJobOptions,
});

export const analyseWorkoutQueue = new Queue("analyse-workout", {
  connection,
  defaultJobOptions,
});

export const historicalImportQueue = new Queue("historical-import", {
  connection,
  defaultJobOptions: { ...defaultJobOptions, attempts: 5 },
});

export const weeklyTrendQueue = new Queue("weekly-trend", {
  connection,
  defaultJobOptions,
});

async function logJobFailure(
  queueName: string,
  jobId: string,
  error: string,
  payload?: unknown
) {
  try {
    await prisma.jobFailure.create({
      data: {
        queueName,
        jobId,
        error,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      },
    });
  } catch {
    console.error("Failed to log job failure:", error);
  }
}

async function ingestWorkout(
  userId: string,
  result: Concept2Result
): Promise<string | null> {
  const existing = await prisma.workout.findUnique({
    where: { concept2ResultId: result.id },
  });
  if (existing) return existing.id;

  const workout = await prisma.workout.create({
    data: {
      userId,
      concept2ResultId: result.id,
      workoutDate: new Date(result.date),
      workoutType: result.type || "rowed",
      description: result.description,
      distanceMeters: result.distance,
      durationSeconds: Math.round(result.time / 10),
      avgSplitSeconds: result.pace ? result.pace / 10 : null,
      avgSpm: result.stroke_rate || null,
      avgWatts: result.watts || null,
      totalCalories: result.calories || null,
      heartRateAvg: result.heart_rate?.average || null,
      heartRateMax: result.heart_rate?.max || null,
    },
  });

  return workout.id;
}

export function createWorkers() {
  const syncWorker = new Worker(
    "sync-workouts",
    async (job: Job) => {
      const { userId, concept2UserId } = job.data;

      const latestWorkout = await prisma.workout.findFirst({
        where: { userId },
        orderBy: { workoutDate: "desc" },
      });

      const since = latestWorkout
        ? latestWorkout.workoutDate
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const results = await getResultsSince(userId, concept2UserId, since);

      for (const result of results) {
        const workoutId = await ingestWorkout(userId, result);
        if (workoutId && result.stroke_data) {
          await parseCsvQueue.add("parse", {
            userId,
            concept2UserId,
            workoutId,
            concept2ResultId: result.id,
          });
        }
      }

      return { synced: results.length };
    },
    { connection }
  );

  const parseCsvWorker = new Worker(
    "parse-csv",
    async (job: Job) => {
      const { userId, concept2UserId, workoutId, concept2ResultId } = job.data;

      const csvContent = await getStrokeData(
        userId,
        concept2UserId,
        concept2ResultId
      );
      if (!csvContent) return { parsed: false, reason: "no stroke data" };

      const csvPath = await uploadCsv(userId, workoutId, csvContent);
      await prisma.workout.update({
        where: { id: workoutId },
        data: { rawCsvPath: csvPath },
      });

      await parseAndStoreStrokeData(workoutId, csvContent);

      await analyseWorkoutQueue.add("analyse", { workoutId });

      return { parsed: true, strokes: csvContent.split("\n").length - 1 };
    },
    { connection }
  );

  const analyseWorker = new Worker(
    "analyse-workout",
    async (job: Job) => {
      const { workoutId } = job.data;
      await analyzeWorkout(workoutId);
      return { analysed: true };
    },
    { connection }
  );

  const historicalWorker = new Worker(
    "historical-import",
    async (job: Job) => {
      const { userId, concept2UserId } = job.data;
      let page = 1;
      let totalImported = 0;
      let hasMore = true;

      while (hasMore) {
        const data = await getResults(userId, concept2UserId, page);

        for (const result of data.data) {
          const workoutId = await ingestWorkout(userId, result);
          if (workoutId && result.stroke_data) {
            await parseCsvQueue.add("parse", {
              userId,
              concept2UserId,
              workoutId,
              concept2ResultId: result.id,
            });
          }
          totalImported++;
        }

        await job.updateProgress({
          imported: totalImported,
          total: data.meta.total,
          page: data.meta.current_page,
          totalPages: data.meta.last_page,
        });

        hasMore = data.meta.current_page < data.meta.last_page;
        page++;

        // rate limit: 100ms between pages
        await new Promise((r) => setTimeout(r, 100));
      }

      return { totalImported };
    },
    { connection, concurrency: 1 }
  );

  const trendWorker = new Worker(
    "weekly-trend",
    async (job: Job) => {
      const users = await prisma.user.findMany({ select: { id: true } });
      for (const user of users) {
        await analyzeTrends(user.id);
      }
      return { usersProcessed: users.length };
    },
    { connection }
  );

  for (const worker of [
    syncWorker,
    parseCsvWorker,
    analyseWorker,
    historicalWorker,
    trendWorker,
  ]) {
    worker.on("failed", (job, err) => {
      if (job) {
        logJobFailure(job.queueName, job.id || "unknown", err.message, job.data);
      }
    });
  }

  return {
    syncWorker,
    parseCsvWorker,
    analyseWorker,
    historicalWorker,
    trendWorker,
  };
}

export async function setupRecurringJobs() {
  const users = await prisma.user.findMany({
    select: { id: true, concept2Id: true },
  });

  for (const user of users) {
    await syncWorkoutsQueue.add(
      `sync-${user.id}`,
      { userId: user.id, concept2UserId: user.concept2Id },
      {
        repeat: { every: 5 * 60 * 1000 },
        jobId: `sync-${user.id}`,
      }
    );
  }

  await weeklyTrendQueue.add(
    "weekly-trend",
    {},
    {
      repeat: { pattern: "0 6 * * 1" }, // Monday 06:00
      jobId: "weekly-trend-all",
    }
  );
}

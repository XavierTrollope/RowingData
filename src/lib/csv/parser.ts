import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";

interface RawStrokeRow {
  [key: string]: string;
}

interface ParsedStroke {
  strokeNumber: number;
  elapsedTimeMs: number | null;
  strokeRate: number | null;
  paceSplitSecs: number | null;
  powerWatts: number | null;
  driveLengthM: number | null;
  driveTimeSecs: number | null;
  strokeDistanceM: number | null;
  cumulativeDistanceM: number | null;
  heartRate: number | null;
}

const HEADER_MAP: Record<string, string> = {
  "stroke number": "strokeNumber",
  "stroke": "strokeNumber",
  "elapsed time (ms)": "elapsedTimeMs",
  "time (ms)": "elapsedTimeMs",
  "elapsed time": "elapsedTimeMs",
  "stroke rate": "strokeRate",
  "strokes/min": "strokeRate",
  "spm": "strokeRate",
  "speed (m/s)": "speedMs",
  "pace": "speedMs",
  "watts": "powerWatts",
  "power": "powerWatts",
  "power (watts)": "powerWatts",
  "drive length (m)": "driveLengthM",
  "drive length": "driveLengthM",
  "drive time (s)": "driveTimeSecs",
  "drive time": "driveTimeSecs",
  "stroke distance (m)": "strokeDistanceM",
  "stroke distance": "strokeDistanceM",
  "distance (m)": "cumulativeDistanceM",
  "distance": "cumulativeDistanceM",
  "heart rate": "heartRate",
  "hr": "heartRate",
};

function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase();
  return HEADER_MAP[normalized] || normalized;
}

function safeNum(val: string | undefined): number | null {
  if (!val || val.trim() === "") return null;
  const num = parseFloat(val.trim());
  return isNaN(num) ? null : num;
}

function speedToSplit(speedMs: number): number {
  if (speedMs <= 0) return 0;
  return 500 / speedMs;
}

export function parseCsvContent(csvContent: string): ParsedStroke[] {
  const records: RawStrokeRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) return [];

  const headerMapping: Record<string, string> = {};
  const sampleRow = records[0];
  for (const originalHeader of Object.keys(sampleRow)) {
    headerMapping[originalHeader] = normalizeHeader(originalHeader);
  }

  const strokes: ParsedStroke[] = [];
  let strokeCounter = 0;

  for (const row of records) {
    strokeCounter++;
    const mapped: Record<string, string> = {};
    for (const [original, value] of Object.entries(row)) {
      mapped[headerMapping[original] || original] = value;
    }

    const speedMs = safeNum(mapped["speedMs"]);
    const paceSplitSecs =
      speedMs !== null ? speedToSplit(speedMs) : safeNum(mapped["paceSplitSecs"]);

    strokes.push({
      strokeNumber: safeNum(mapped["strokeNumber"]) ?? strokeCounter,
      elapsedTimeMs: safeNum(mapped["elapsedTimeMs"]),
      strokeRate: safeNum(mapped["strokeRate"]),
      paceSplitSecs,
      powerWatts: safeNum(mapped["powerWatts"]),
      driveLengthM: safeNum(mapped["driveLengthM"]),
      driveTimeSecs: safeNum(mapped["driveTimeSecs"]),
      strokeDistanceM: safeNum(mapped["strokeDistanceM"]),
      cumulativeDistanceM: safeNum(mapped["cumulativeDistanceM"]),
      heartRate:
        safeNum(mapped["heartRate"]) !== null
          ? Math.round(safeNum(mapped["heartRate"])!)
          : null,
    });
  }

  return strokes;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export interface DerivedMetrics {
  driveToRecoveryRatio: number | null;
  paceConsistencyStddev: number | null;
  powerConsistencyStddev: number | null;
  spmConsistencyStddev: number | null;
  powerCurveJson: number[];
  paceCurveJson: number[];
  firstQuarterAvgWatts: number | null;
  lastQuarterAvgWatts: number | null;
  peakPowerWatts: number | null;
  peakPowerStrokeNumber: number | null;
}

export function computeDerivedMetrics(strokes: ParsedStroke[]): DerivedMetrics {
  const paceValues = strokes
    .map((s) => s.paceSplitSecs)
    .filter((v): v is number => v !== null && v > 0);
  const powerValues = strokes
    .map((s) => s.powerWatts)
    .filter((v): v is number => v !== null && v > 0);
  const spmValues = strokes
    .map((s) => s.strokeRate)
    .filter((v): v is number => v !== null && v > 0);
  const driveTimeValues = strokes
    .map((s) => s.driveTimeSecs)
    .filter((v): v is number => v !== null && v > 0);

  let driveToRecoveryRatio: number | null = null;
  if (driveTimeValues.length > 1 && strokes[0]?.elapsedTimeMs !== null) {
    const strokeTimes = strokes
      .filter((s) => s.elapsedTimeMs !== null && s.driveTimeSecs !== null)
      .map((s, i, arr) => {
        if (i === 0) return null;
        const totalStrokeTime =
          (s.elapsedTimeMs! - arr[i - 1].elapsedTimeMs!) / 1000;
        if (totalStrokeTime <= 0) return null;
        const recoveryTime = totalStrokeTime - s.driveTimeSecs!;
        if (recoveryTime <= 0) return null;
        return s.driveTimeSecs! / recoveryTime;
      })
      .filter((v): v is number => v !== null);

    if (strokeTimes.length > 0) {
      driveToRecoveryRatio =
        strokeTimes.reduce((a, b) => a + b, 0) / strokeTimes.length;
    }
  }

  const quarterSize = Math.floor(powerValues.length / 4);
  let firstQuarterAvgWatts: number | null = null;
  let lastQuarterAvgWatts: number | null = null;
  if (quarterSize > 0) {
    const firstQ = powerValues.slice(0, quarterSize);
    const lastQ = powerValues.slice(-quarterSize);
    firstQuarterAvgWatts = firstQ.reduce((a, b) => a + b, 0) / firstQ.length;
    lastQuarterAvgWatts = lastQ.reduce((a, b) => a + b, 0) / lastQ.length;
  }

  let peakPowerWatts: number | null = null;
  let peakPowerStrokeNumber: number | null = null;
  for (const stroke of strokes) {
    if (
      stroke.powerWatts !== null &&
      (peakPowerWatts === null || stroke.powerWatts > peakPowerWatts)
    ) {
      peakPowerWatts = stroke.powerWatts;
      peakPowerStrokeNumber = stroke.strokeNumber;
    }
  }

  return {
    driveToRecoveryRatio,
    paceConsistencyStddev: paceValues.length > 1 ? stddev(paceValues) : null,
    powerConsistencyStddev:
      powerValues.length > 1 ? stddev(powerValues) : null,
    spmConsistencyStddev: spmValues.length > 1 ? stddev(spmValues) : null,
    powerCurveJson: powerValues,
    paceCurveJson: paceValues,
    firstQuarterAvgWatts,
    lastQuarterAvgWatts,
    peakPowerWatts,
    peakPowerStrokeNumber,
  };
}

export async function parseAndStoreStrokeData(
  workoutId: string,
  csvContent: string
): Promise<void> {
  const strokes = parseCsvContent(csvContent);
  if (strokes.length === 0) {
    await prisma.workout.update({
      where: { id: workoutId },
      data: { strokeDataParsed: true },
    });
    return;
  }

  const metrics = computeDerivedMetrics(strokes);

  await prisma.$transaction(async (tx) => {
    await tx.strokeDataPoint.deleteMany({ where: { workoutId } });

    const BATCH_SIZE = 500;
    for (let i = 0; i < strokes.length; i += BATCH_SIZE) {
      const batch = strokes.slice(i, i + BATCH_SIZE);
      await tx.strokeDataPoint.createMany({
        data: batch.map((s) => ({
          workoutId,
          strokeNumber: s.strokeNumber,
          elapsedTimeMs: s.elapsedTimeMs,
          strokeRate: s.strokeRate,
          paceSplitSecs: s.paceSplitSecs,
          powerWatts: s.powerWatts,
          driveLengthM: s.driveLengthM,
          driveTimeSecs: s.driveTimeSecs,
          strokeDistanceM: s.strokeDistanceM,
          cumulativeDistanceM: s.cumulativeDistanceM,
          heartRate: s.heartRate,
        })),
      });
    }

    await tx.workout.update({
      where: { id: workoutId },
      data: {
        strokeDataParsed: true,
        driveToRecoveryRatio: metrics.driveToRecoveryRatio,
        paceConsistencyStddev: metrics.paceConsistencyStddev,
        powerConsistencyStddev: metrics.powerConsistencyStddev,
        spmConsistencyStddev: metrics.spmConsistencyStddev,
        powerCurveJson: metrics.powerCurveJson,
        paceCurveJson: metrics.paceCurveJson,
        firstQuarterAvgWatts: metrics.firstQuarterAvgWatts,
        lastQuarterAvgWatts: metrics.lastQuarterAvgWatts,
        peakPowerWatts: metrics.peakPowerWatts,
        peakPowerStrokeNumber: metrics.peakPowerStrokeNumber,
      },
    });
  });
}

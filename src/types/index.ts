export interface WorkoutSummary {
  id: string;
  workoutDate: string;
  workoutType: string;
  description: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  avgSplitSeconds: number | null;
  avgSpm: number | null;
  avgWatts: number | null;
  totalCalories: number | null;
  heartRateAvg: number | null;
  aiGrade: string | null;
}

export interface WorkoutDetail extends WorkoutSummary {
  heartRateMax: number | null;
  strokeDataParsed: boolean;
  driveToRecoveryRatio: number | null;
  paceConsistencyStddev: number | null;
  powerConsistencyStddev: number | null;
  spmConsistencyStddev: number | null;
  firstQuarterAvgWatts: number | null;
  lastQuarterAvgWatts: number | null;
  peakPowerWatts: number | null;
  peakPowerStrokeNumber: number | null;
  powerCurveJson: number[] | null;
  paceCurveJson: number[] | null;
}

export interface StrokeDataPoint {
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

export interface AiAnalysis {
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

export interface PersonalBest {
  id: string;
  category: string;
  value: number;
  achievedAt: string;
  workoutId: string;
}

export interface TrendReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  reportJson: {
    fitness_trajectory: string;
    trajectory_confidence: number;
    weekly_volume_trend: string;
    consistency_assessment: string;
    pace_trend: string;
    power_trend: string;
    key_observations: string[];
    recommended_focus_areas: string[];
    training_block_suggestion: string;
    narrative: string;
  };
  generatedAt: string;
}

export interface UserStats {
  totalMeters: number;
  totalWorkouts: number;
  currentSeasonMeters: number;
  longestStreak: number;
  currentStreak: number;
}

export interface SyncStatus {
  isImporting: boolean;
  progress: number | null;
  imported: number | null;
  total: number | null;
  lastSyncAt: string | null;
}

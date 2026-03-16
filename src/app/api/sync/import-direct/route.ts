import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption/tokens";

const CONCEPT2_BASE_URL = "https://log.concept2.com/api";

async function concept2Fetch(accessToken: string, path: string) {
  const response = await fetch(`${CONCEPT2_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.c2logbook.v1+json",
    },
  });
  return response;
}

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const accessToken = decrypt(user.accessToken);
  let page = 1;
  let totalImported = 0;
  let totalSkipped = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      console.log(`Fetching results page ${page}...`);
      const response = await concept2Fetch(
        accessToken,
        `/users/me/results?page=${page}`
      );

      if (!response.ok) {
        const text = await response.text();
        console.error(`Concept2 API error: ${response.status} ${text}`);
        break;
      }

      const body = await response.json();
      const results = body.data || [];
      const pagination = body.meta?.pagination;

      console.log(
        `Page ${page}: ${results.length} results, total_pages: ${pagination?.total_pages}`
      );

      for (const result of results) {
        const existing = await prisma.workout.findUnique({
          where: { concept2ResultId: result.id },
        });

        if (existing) {
          totalSkipped++;
          continue;
        }

        const timeTenths = result.time || 0;
        const durationSeconds = Math.round(timeTenths / 10);

        let avgSplit: number | null = null;
        if (result.distance && durationSeconds > 0) {
          avgSplit = (durationSeconds / result.distance) * 500;
        }

        await prisma.workout.create({
          data: {
            userId: user.id,
            concept2ResultId: result.id,
            workoutDate: new Date(result.date),
            workoutType: result.type || "rower",
            description: result.workout_type || null,
            distanceMeters: result.distance || null,
            durationSeconds,
            avgSplitSeconds: avgSplit,
            avgSpm: result.stroke_rate || null,
            avgWatts: null,
            totalCalories: result.calories_total || null,
            heartRateAvg: result.heart_rate?.average || null,
            heartRateMax: result.heart_rate?.max || null,
          },
        });

        totalImported++;
      }

      if (pagination) {
        hasMore = pagination.current_page < pagination.total_pages;
      } else {
        hasMore = false;
      }
      page++;

      await new Promise((r) => setTimeout(r, 200));
    }

    return NextResponse.json({
      status: "complete",
      imported: totalImported,
      skipped: totalSkipped,
      pages: page - 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Import error:", message);
    return NextResponse.json(
      {
        error: message,
        imported: totalImported,
        skipped: totalSkipped,
      },
      { status: 500 }
    );
  }
}

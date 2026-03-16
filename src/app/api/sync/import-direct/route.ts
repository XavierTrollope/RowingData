import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption/tokens";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);
const CONCEPT2_BASE_URL = "https://log.concept2.com/api";

async function getSessionFromRequest(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      id: payload.userId as string,
      concept2Id: payload.concept2Id as number,
    };
  } catch {
    return null;
  }
}

async function concept2Fetch(accessToken: string, path: string) {
  return fetch(`${CONCEPT2_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.c2logbook.v1+json",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "No session found. Please log out and log back in." },
      { status: 401 }
    );
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
        if (page === 1) {
          return NextResponse.json(
            { error: `Concept2 API error: ${response.status} - ${text}` },
            { status: 502 }
          );
        }
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

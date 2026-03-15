import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const latestReport = await prisma.trendReport.findFirst({
    where: { userId: session.id },
    orderBy: { generatedAt: "desc" },
  });

  if (!latestReport) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    id: latestReport.id,
    periodStart: latestReport.periodStart.toISOString(),
    periodEnd: latestReport.periodEnd.toISOString(),
    reportJson: latestReport.reportJson,
    narrativeText: latestReport.narrativeText,
    generatedAt: latestReport.generatedAt.toISOString(),
  });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { historicalImportQueue } from "@/lib/jobs/queues";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await historicalImportQueue.add("historical-reimport", {
    userId: session.id,
    concept2UserId: session.concept2Id,
  });

  return NextResponse.json({ status: "import_queued" });
}

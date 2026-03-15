import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.STORAGE_REGION || "us-east-1",
  endpoint: process.env.STORAGE_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY || "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.STORAGE_BUCKET || "concept2-stroke-data";

export async function uploadCsv(
  userId: string,
  workoutId: string,
  csvContent: string
): Promise<string> {
  const key = `${userId}/${workoutId}/stroke_data.csv`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: csvContent,
      ContentType: "text/csv",
    })
  );

  return key;
}

export async function downloadCsv(key: string): Promise<string> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  return response.Body?.transformToString("utf-8") ?? "";
}

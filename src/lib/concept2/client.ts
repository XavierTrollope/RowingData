import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption/tokens";

const CONCEPT2_BASE_URL = "https://log.concept2.com/api";
const CONCEPT2_AUTH_URL = "https://log.concept2.com/oauth/authorize";
const CONCEPT2_TOKEN_URL = "https://log.concept2.com/oauth/access_token";

interface Concept2TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface Concept2User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Concept2Result {
  id: number;
  user_id: number;
  date: string;
  timezone: string;
  type: string;
  workout_type: string;
  description: string;
  distance: number;
  time: number; // tenths of seconds
  time_formatted: string;
  pace: number;
  pace_formatted: string;
  stroke_rate: number;
  watts: number;
  calories: number;
  heart_rate?: {
    average: number;
    max: number;
  };
  stroke_data: boolean;
}

interface PaginatedResults {
  data: Concept2Result[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.CONCEPT2_CLIENT_ID!,
    redirect_uri: process.env.CONCEPT2_REDIRECT_URI!,
    response_type: "code",
    scope: "user:read,results:read",
  });
  return `${CONCEPT2_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<Concept2TokenResponse> {
  const response = await fetch(CONCEPT2_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.CONCEPT2_CLIENT_ID!,
      client_secret: process.env.CONCEPT2_CLIENT_SECRET!,
      redirect_uri: process.env.CONCEPT2_REDIRECT_URI!,
      scope: "user:read,results:read",
      code,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  return response.json();
}

export async function refreshAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const refreshToken = decrypt(user.refreshToken);

  const response = await fetch(CONCEPT2_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.CONCEPT2_CLIENT_ID!,
      client_secret: process.env.CONCEPT2_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const tokens: Concept2TokenResponse = await response.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (user.tokenExpiresAt < new Date(Date.now() + 60_000)) {
    return refreshAccessToken(userId);
  }

  return decrypt(user.accessToken);
}

async function concept2Fetch(
  userId: string,
  path: string,
  options?: RequestInit
): Promise<Response> {
  const token = await getValidAccessToken(userId);
  const response = await fetch(`${CONCEPT2_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (response.status === 401) {
    const newToken = await refreshAccessToken(userId);
    return fetch(`${CONCEPT2_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${newToken}`,
        Accept: "application/json",
        ...options?.headers,
      },
    });
  }

  return response;
}

export async function getCurrentUser(
  accessToken: string
): Promise<Concept2User> {
  const response = await fetch(`${CONCEPT2_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

export async function getResults(
  userId: string,
  concept2UserId: number,
  page: number = 1
): Promise<PaginatedResults> {
  const response = await concept2Fetch(
    userId,
    `/users/${concept2UserId}/results?page=${page}`
  );

  if (!response.ok) {
    throw new Error(`Failed to get results: ${response.status}`);
  }

  return response.json();
}

export async function getResultsSince(
  userId: string,
  concept2UserId: number,
  sinceDate: Date
): Promise<Concept2Result[]> {
  const allResults: Concept2Result[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const dateParam = sinceDate.toISOString().split("T")[0];
    const response = await concept2Fetch(
      userId,
      `/users/${concept2UserId}/results?from=${dateParam}&page=${page}`
    );

    if (!response.ok) break;

    const data: PaginatedResults = await response.json();
    allResults.push(...data.data);

    hasMore = data.meta.current_page < data.meta.last_page;
    page++;
  }

  return allResults;
}

export async function getStrokeData(
  userId: string,
  concept2UserId: number,
  resultId: number
): Promise<string | null> {
  const response = await concept2Fetch(
    userId,
    `/users/${concept2UserId}/results/${resultId}/stroke-data`
  );

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to get stroke data: ${response.status}`);
  }

  return response.text();
}

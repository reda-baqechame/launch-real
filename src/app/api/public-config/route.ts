import { NextResponse } from "next/server";
import {
  isClerkEnabled,
  isCloudSyncEnabled,
  isDatabaseEnabled,
  isHostedSaas,
  isLocalFreeRuntimeEnabled,
  isServerElevenLabsEnabled,
  isServerOpenAiEnabled,
  isStripeEnabled,
} from "@/lib/cloud/config";
import { isLocalFreeRequest } from "@/lib/local-free";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const localFree = isLocalFreeRequest(req);
  return NextResponse.json({
    localFree,
    hosted: isHostedSaas(),
    clerk: localFree || isClerkEnabled(),
    database: localFree || isDatabaseEnabled(),
    cloudSync: localFree || isCloudSyncEnabled(),
    stripe: localFree || isStripeEnabled(),
    serverTts: localFree || isServerOpenAiEnabled() || isServerElevenLabsEnabled(),
    serverTranscribe: localFree || isServerOpenAiEnabled(),
    localFreeAvailable: isLocalFreeRuntimeEnabled(),
  });
}

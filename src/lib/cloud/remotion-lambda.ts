import { isRemotionLambdaEnabled } from "@/lib/cloud/config";

export interface RemotionLambdaRequest {
  projectId: string;
  compositionId?: string;
  inputProps?: Record<string, unknown>;
}

export async function invokeRemotionLambda(
  req: RemotionLambdaRequest,
): Promise<{ renderId: string } | { error: string }> {
  if (!isRemotionLambdaEnabled()) {
    return { error: "Remotion Lambda is not configured. Set REMOTION_LAMBDA_* and AWS keys." };
  }

  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;

  // Stub: real deployment wires @remotion/lambda client here.
  return {
    renderId: `lambda-${functionName}-${req.projectId}-${Date.now()}`,
  };
}

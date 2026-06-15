import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { isRemotionLambdaEnabled } from "@/lib/cloud/config";

export interface RemotionLambdaRequest {
  projectId: string;
  compositionId?: string;
  inputProps?: Record<string, unknown>;
}

export interface RemotionLambdaResult {
  renderId: string;
  requestId?: string;
  statusCode?: number;
}

export async function invokeRemotionLambda(
  req: RemotionLambdaRequest,
): Promise<RemotionLambdaResult | { error: string }> {
  if (!isRemotionLambdaEnabled()) {
    return { error: "Remotion Lambda is not configured. Set REMOTION_LAMBDA_FUNCTION_NAME and AWS keys." };
  }

  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;
  const region = process.env.AWS_REGION ?? "us-east-1";

  const client = new LambdaClient({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  const payload = {
    type: "launchreel-render",
    projectId: req.projectId,
    compositionId: req.compositionId ?? "LaunchVideo",
    inputProps: req.inputProps ?? {},
    requestedAt: new Date().toISOString(),
  };

  try {
    const result = await client.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(payload)),
      }),
    );

    const renderId = `lambda-${req.projectId}-${Date.now()}`;
    return {
      renderId,
      requestId: result.$metadata.requestId,
      statusCode: result.StatusCode,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Lambda invoke failed.",
    };
  }
}

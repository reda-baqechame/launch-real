import { Suspense } from "react";
import { Eyebrow } from "@/components/ui";
import { Recorder } from "@/components/recorder";

export const metadata = { title: "Record — LaunchReel" };

export default function RecordPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Eyebrow>Record</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">Record a quick video.</h1>
      <p className="mt-2 text-ink-mute">
        Loom-style screen recording — then turn it into a product video, tutorial,
        docs, or a full launch kit.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <div className="flex min-h-[24rem] items-center justify-center text-sm text-ink-mute">
              Loading recorder…
            </div>
          }
        >
          <Recorder />
        </Suspense>
      </div>
    </div>
  );
}

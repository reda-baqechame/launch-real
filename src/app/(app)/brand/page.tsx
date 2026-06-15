import { Eyebrow } from "@/components/ui";
import { BrandKitEditor } from "@/components/brand-kit-editor";

export const metadata = { title: "Brand Kit — LaunchReel" };

export default function BrandPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Eyebrow>Brand Kit</Eyebrow>
      <h1 className="mt-3 text-3xl font-semibold text-ink">Own a small creative studio.</h1>
      <p className="mt-2 text-ink-mute">
        Set this once and every future launch kit comes out on-brand.
      </p>
      <BrandKitEditor />
    </div>
  );
}

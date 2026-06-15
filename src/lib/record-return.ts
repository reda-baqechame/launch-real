/** Build /record URL with return context from /new intake. */
export function buildRecordReturnUrl(opts: {
  returnTo?: string;
  url?: string;
  description?: string;
  prdText?: string;
}): string {
  const q = new URLSearchParams();
  q.set("return", opts.returnTo ?? "/new");
  if (opts.url?.trim()) q.set("url", opts.url.trim());
  if (opts.description?.trim()) q.set("description", opts.description.trim());
  if (opts.prdText?.trim()) q.set("prd", opts.prdText.trim());
  return `/record?${q.toString()}`;
}

export function parseRecordReturnParams(params: URLSearchParams) {
  return {
    returnTo: params.get("return"),
    url: params.get("url") ?? "",
    description: params.get("description") ?? "",
    prdText: params.get("prd") ?? "",
  };
}

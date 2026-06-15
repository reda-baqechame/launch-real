from pathlib import Path

p = Path("src/components/recorder.tsx")
t = p.read_text(encoding="utf-8")
start = t.index("  const turnIntoLaunchKit")
end = t.index("  /* --------------------------------------------------------------- Review */")
e = "elapsed"
new = f"""  const turnIntoLaunchKit = useCallback(async () => {{
    if (!videoBlob) return;
    setSaving(true);
    try {{
      const p = createProject({{
        fromRecording: true,
        url: returnCtx.url || undefined,
        description: notes.trim() || returnCtx.description || undefined,
        prdText: returnCtx.prdText || undefined,
      }});
      const key = footageKey(p.id);
      await saveBlob(key, p.id, videoBlob, "footage");
      attachFootage(p.id, {{
        projectId: p.id,
        kind: "recording",
        durationSec: {e},
        hasAudio: withMic,
        clickCount: clicksRef.current.length,
        blobKey: key,
        clicks: [...clicksRef.current],
      }});
      if (returnCtx.returnTo === "/new") {{
        router.push(`/new?project=${{p.id}}`);
        return;
      }}
      router.push(`/projects/${{p.id}}/audit`);
    }} catch (err) {{
      setError(storageErrorMessage(err));
    }} finally {{
      setSaving(false);
    }}
  }}, [videoBlob, createProject, attachFootage, notes, {e}, withMic, router, returnCtx]);

"""
p.write_text(t[:start] + new + t[end:], encoding="utf-8")
print("OK")

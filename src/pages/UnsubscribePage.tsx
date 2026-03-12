import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const i = searchParams.get("i");
    const e = searchParams.get("e");
    const s = searchParams.get("s");

    if (!i || !e || !s) {
      setStatus("error");
      setError("Invalid unsubscribe link. The link may be incomplete or expired.");
      return;
    }

    const url = new URL("/functions/v1/unsubscribe-email", import.meta.env.VITE_SUPABASE_URL);
    url.searchParams.set("i", i);
    url.searchParams.set("e", e);
    url.searchParams.set("s", s);

    fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setError(data.error ?? "Failed to unsubscribe");
        }
      })
      .catch((e) => {
        setStatus("error");
        setError(e?.message ?? "Failed to unsubscribe");
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-bold">Unsubscribing…</h1>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-xl font-bold">You&apos;re unsubscribed</h1>
            <p className="text-sm text-muted-foreground">
              You will no longer receive team invite emails from Desboard.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Could not unsubscribe</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;

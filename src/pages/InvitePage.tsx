import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { acceptTeamInvite } from "@/api/teams";
import { useTeamContext } from "@/contexts/TeamContext";
import { teamsQueryKey } from "@/hooks/useTeams";

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { setTeamId } = useTeamContext();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Invalid invite link");
      return;
    }
    acceptTeamInvite(token)
      .then((res) => {
        if (res.ok && res.team_id) {
          setStatus("success");
          setTeamId(res.team_id);
          qc.invalidateQueries({ queryKey: ["teams"] });
          setTimeout(() => navigate("/", { replace: true }), 2000);
        } else {
          setStatus("error");
          setError(res.error ?? "Failed to accept invite");
        }
      })
      .catch((e) => {
        setStatus("error");
        setError(e?.message ?? "Failed to accept invite");
      });
  }, [token, setTeamId, navigate, qc]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-xl font-bold">Joining team…</h1>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-xl font-bold">Welcome to the team!</h1>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
            <Button onClick={() => navigate("/")} className="rounded-xl">
              Go to dashboard
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Could not join team</h1>
            <p className="text-sm text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Make sure you&apos;re logged in with the email this invite was sent to.
            </p>
            <Button variant="outline" onClick={() => navigate("/login")} className="rounded-xl">
              Sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;

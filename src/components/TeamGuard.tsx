import { useEffect } from "react";
import { useTeams } from "@/hooks/useTeams";
import { useTeamContext } from "@/contexts/TeamContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { createTeam } from "@/api/teams";
import { useQueryClient } from "@tanstack/react-query";
import { teamsQueryKey } from "@/hooks/useTeams";

interface TeamGuardProps {
  children: React.ReactNode;
}

export function TeamGuard({ children }: TeamGuardProps) {
  const { data: teams, isLoading } = useTeams();
  const { teamId, setTeamId } = useTeamContext();
  const { user } = useAuthContext();

  useEffect(() => {
    if (teams?.length && !teamId) {
      setTeamId(teams[0].id);
    }
  }, [teams, teamId, setTeamId]);

  if (isLoading || (teams && teams.length > 0 && !teamId)) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (teams?.length === 0) {
    return <CreateFirstTeam userId={user?.id ?? ""} onCreated={(id) => setTeamId(id)} />;
  }

  return <>{children}</>;
}

function CreateFirstTeam({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (teamId: string) => void;
}) {
  const [name, setName] = useState("My Team");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleCreate = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const team = await createTeam(name, userId);
      qc.setQueryData(teamsQueryKey(userId), [team]);
      onCreated(team.id);
    } catch (e) {
      const msg = typeof e === "object" && e !== null && "message" in e
        ? String((e as { message: string }).message)
        : e instanceof Error
          ? e.message
          : "Failed to create team";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[300px] flex items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-4">
        <h2 className="text-xl font-semibold">Create your first team</h2>
        <p className="text-sm text-muted-foreground">
          Teams help you organize projects and collaborate.
        </p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Team name"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleCreate} disabled={loading || !userId} className="w-full">
          {loading ? "Creating…" : "Create team"}
        </Button>
      </div>
    </div>
  );
}

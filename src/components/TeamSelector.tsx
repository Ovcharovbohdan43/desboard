import { useState, useEffect } from "react";
import { Users, Plus, Check, ChevronDown, Settings, UserMinus, UserPlus, Copy, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeams, useCreateTeam, useUpdateTeam } from "@/hooks/useTeams";
import { useTeamMembers, useMyTeamRole, useUpdateTeamMemberRole, useRemoveTeamMember } from "@/hooks/useTeamMembers";
import { useTeamInvites, useCreateTeamInvite, useDeleteTeamInvite } from "@/hooks/useTeamInvites";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { sendInviteEmail, getMemberDisplayName } from "@/api/teams";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (teamId: string) => void;
}

export function CreateTeamDialog({ open, onOpenChange, onCreated }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const createMutation = useCreateTeam();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate(name.trim(), {
      onSuccess: (team) => {
        setName("");
        onCreated(team.id);
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) createMutation.reset(); }}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Team name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
            disabled={createMutation.isPending}
          />
          {createMutation.error && (
            <p className="text-sm text-destructive">
              {typeof createMutation.error === "object" && createMutation.error !== null && "message" in createMutation.error
                ? String((createMutation.error as { message: string }).message)
                : createMutation.error instanceof Error
                  ? createMutation.error.message
                  : "Failed to create team"}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2, guest: 3 };

function ManageTeamDialog({
  open,
  onOpenChange,
  teamId,
  teamName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
}) {
  const { user } = useAuthContext();
  const { data: myRole } = useMyTeamRole(teamId);
  const { data: members = [], isLoading } = useTeamMembers(teamId);
  const { data: invites = [] } = useTeamInvites(teamId);
  const updateRoleMutation = useUpdateTeamMemberRole(teamId);
  const removeMutation = useRemoveTeamMember(teamId);
  const createInviteMutation = useCreateTeamInvite(teamId);
  const deleteInviteMutation = useDeleteTeamInvite(teamId);
  const updateTeamMutation = useUpdateTeam();
  const { data: teamSettings } = useTeamSettings(teamId);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "guest">("member");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const memberCanInvite = teamSettings?.meta?.role_permissions?.member?.can_invite ?? false;
  const canManage = myRole === "owner" || myRole === "admin";
  const canInvite = canManage || (myRole === "member" && memberCanInvite);
  const [editingName, setEditingName] = useState(false);
  const [renameValue, setRenameValue] = useState(teamName);

  useEffect(() => {
    setRenameValue(teamName);
  }, [teamName, open]);

  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
  );

  const handleRemove = () => {
    if (!removeId) return;
    const isSelf = members.find((m) => m.id === removeId)?.user_id === user?.id;
    removeMutation.mutate(removeId, {
      onSuccess: () => {
        setRemoveId(null);
        toast.success(isSelf ? "You left the team" : "Member removed");
        if (isSelf) onOpenChange(false);
      },
      onError: () => toast.error("Failed to remove"),
    });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const emailToInvite = inviteEmail.trim();
    createInviteMutation.mutate(
      { email: emailToInvite, role: inviteRole },
      {
        onSuccess: async (invite) => {
          setInviteEmail("");
          setShowInviteForm(false);
          const { ok, error } = await sendInviteEmail(invite.id);
          if (ok) {
            toast.success(`Invite sent to ${emailToInvite}`);
          } else {
            navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
            toast.warning(`Invite created. Email failed: ${error ?? "unknown"}. Link copied to clipboard.`);
          }
        },
        onError: (e) => {
          const msg = e instanceof Error ? e.message : "Failed to create invite";
          toast.error(msg.includes("unique") ? "Invite already sent to this email" : msg);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Settings className="w-4 h-4 shrink-0" />
            {editingName && canManage ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-8 rounded-lg text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (renameValue.trim()) {
                        updateTeamMutation.mutate(
                          { teamId, update: { name: renameValue.trim() } },
                          {
                            onSuccess: () => {
                              toast.success("Team renamed");
                              setEditingName(false);
                            },
                            onError: () => toast.error("Failed to rename"),
                          }
                        );
                      }
                    }
                    if (e.key === "Escape") {
                      setRenameValue(teamName);
                      setEditingName(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="h-8 rounded-lg"
                  onClick={() => {
                    if (renameValue.trim()) {
                      updateTeamMutation.mutate(
                        { teamId, update: { name: renameValue.trim() } },
                        {
                          onSuccess: () => {
                            toast.success("Team renamed");
                            setEditingName(false);
                          },
                        }
                      );
                    }
                  }}
                  disabled={!renameValue.trim() || updateTeamMutation.isPending}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => { setRenameValue(teamName); setEditingName(false); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <span className="flex-1 min-w-0 truncate">
                Manage team — {teamName}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="ml-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Rename
                  </button>
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="animate-pulse h-24 bg-muted/30 rounded-xl" />
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {canInvite && (
              <div className="space-y-2 pb-2 border-b border-border/30">
                {!showInviteForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl gap-2"
                    onClick={() => setShowInviteForm(true)}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite by email
                  </Button>
                ) : (
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30">
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="rounded-lg h-9 text-sm"
                    />
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member" | "guest")}>
                      <SelectTrigger className="h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" className="rounded-lg flex-1" onClick={handleInvite} disabled={!inviteEmail.trim() || createInviteMutation.isPending}>
                        {createInviteMutation.isPending ? "Sending…" : "Send invite"}
                      </Button>
                      <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => { setShowInviteForm(false); setInviteEmail(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {invites.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-medium">Pending invites</p>
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-muted/20">
                        <span className="text-xs truncate">{inv.email}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={async () => {
                              const { ok, error } = await sendInviteEmail(inv.id);
                              toast[ok ? "success" : "error"](ok ? `Email sent to ${inv.email}` : error ?? "Failed to send");
                            }}
                            aria-label="Resend invite email"
                          >
                            <Mail className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                              toast.success("Link copied");
                            }}
                            aria-label="Copy invite link"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => deleteInviteMutation.mutate(inv.id)}
                              aria-label="Revoke invite"
                            >
                              <UserMinus className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {sortedMembers.map((m) => {
              const displayName = getMemberDisplayName(m.profiles, m.user_id);
              const isSelf = m.user_id === user?.id;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/30"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {(displayName || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground">{m.role}</p>
                  </div>
                  <Select
                    value={m.role}
                    onValueChange={(role) =>
                      updateRoleMutation.mutate({
                        memberId: m.id,
                        role: role as "owner" | "admin" | "member" | "guest",
                      })
                    }
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => setRemoveId(m.id)}
                    disabled={!canManage || (isSelf && members.filter((x) => x.role === "owner").length <= 1)}
                    title={isSelf ? "Leave team" : "Remove member"}
                    title={isSelf ? "Leave team" : "Remove member"}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Owner and Admin can add or remove members. The last owner cannot leave.
        </p>
      </DialogContent>

      <AlertDialog open={!!removeId} onOpenChange={(o) => !o && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeId && members.find((m) => m.id === removeId)?.user_id === user?.id
                ? "Leave team?"
                : "Remove member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {removeId && members.find((m) => m.id === removeId)?.user_id === user?.id
                ? "You will lose access to this team and its projects."
                : "This member will lose access to the team."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemove}
            >
              {removeId && members.find((m) => m.id === removeId)?.user_id === user?.id
                ? "Leave"
                : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

interface TeamSelectorProps {
  collapsed?: boolean;
}

export function TeamSelector({ collapsed }: TeamSelectorProps) {
  const { teamId, setTeamId } = useTeamContext();
  const { data: teams = [], isLoading } = useTeams();
  const { data: myRole } = useMyTeamRole(teamId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);

  const currentTeam = teams.find((t) => t.id === teamId);
  const canManage = myRole === "owner" || myRole === "admin";

  if (isLoading) {
    return (
      <div className={cn(
        "rounded-xl bg-muted/40 animate-pulse",
        collapsed ? "w-10 h-10 mx-2" : "h-10 mx-3 mb-4 w-[calc(100%-24px)]"
      )} />
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-xl transition-colors text-left",
              "min-w-0 max-w-full overflow-hidden bg-muted/40 hover:bg-muted/60",
              collapsed ? "w-10 h-10 justify-center mx-2 mb-3 px-0 shrink-0" : "mx-3 mb-4 w-[calc(100%-24px)] p-2.5"
            )}
            title={currentTeam ? currentTeam.name : "Select team"}
          >
            <Users className="w-4 h-4 shrink-0 text-muted-foreground flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 min-w-0 truncate text-sm font-medium">
                  {currentTeam ? currentTeam.name : "Select team"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground flex-shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="rounded-xl w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => setTeamId(team.id)}
              className="rounded-lg gap-2"
            >
              {team.id === teamId && <Check className="w-4 h-4 text-primary shrink-0" />}
              {team.id !== teamId && <span className="w-4 shrink-0" />}
              <span className="truncate">{team.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          {canManage && teamId && currentTeam && (
            <DropdownMenuItem
              onClick={() => setManageDialogOpen(true)}
              className="rounded-lg gap-2"
            >
              <Settings className="w-4 h-4 shrink-0" />
              Manage team
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="rounded-lg gap-2 text-primary focus:text-primary"
          >
            <Plus className="w-4 h-4 shrink-0" />
            Create new team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => setTeamId(id)}
      />
      {teamId && currentTeam && (
        <ManageTeamDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          teamId={teamId}
          teamName={currentTeam.name}
        />
      )}
    </>
  );
}

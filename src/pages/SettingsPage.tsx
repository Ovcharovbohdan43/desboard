import { useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Users, Sliders, Camera, Loader2, UserPlus, UserMinus, Copy, Moon, Sun, Monitor, Palette, Shield, Zap, Mail, LogOut } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTeamContext } from "@/contexts/TeamContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useTeams, useUpdateTeam } from "@/hooks/useTeams";
import { useTeamMembers, useMyTeamRole, useUpdateTeamMemberRole, useRemoveTeamMember } from "@/hooks/useTeamMembers";
import { useTeamInvites, useCreateTeamInvite, useDeleteTeamInvite } from "@/hooks/useTeamInvites";
import { useTeamSettings, useUpdateTeamSettings } from "@/hooks/useTeamSettings";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { uploadAvatar } from "@/api/profiles";
import { sendInviteEmail, getMemberDisplayName } from "@/api/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { applyTheme, type Theme } from "@/lib/theme";
import { toast } from "sonner";

type TabId = "profile" | "team" | "preferences";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "preferences", label: "Preferences", icon: Sliders },
];

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
] as const;

const ROLE_ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2, guest: 3 };

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const t = searchParams.get("tab");
    return t === "team" || t === "preferences" || t === "profile" ? t : "profile";
  });
  const { user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { teamId } = useTeamContext();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [displayName, setDisplayName] = useState("");
  const isEditingDisplayName = useRef(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: teams } = useTeams();
  const currentTeam = teams?.find((t) => t.id === teamId) ?? null;
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(teamId);
  const { data: myRole } = useMyTeamRole(teamId);
  const { data: invites = [] } = useTeamInvites(teamId);
  const updateTeamMutation = useUpdateTeam();
  const updateRoleMutation = useUpdateTeamMemberRole(teamId);
  const removeMemberMutation = useRemoveTeamMember(teamId);
  const createInviteMutation = useCreateTeamInvite(teamId);
  const deleteInviteMutation = useDeleteTeamInvite(teamId);
  const [teamNameEdit, setTeamNameEdit] = useState("");
  const [teamNameEditing, setTeamNameEditing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "guest">("member");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [logoUrlDraft, setLogoUrlDraft] = useState("");

  const { data: userSettings, isLoading: settingsLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: teamSettings } = useTeamSettings(teamId);
  const updateTeamSettings = useUpdateTeamSettings(teamId);
  const { data: automationRules = [], isLoading: rulesLoading } = useAutomationRules(teamId);

  const rolePerms = teamSettings?.meta?.role_permissions ?? {};
  const memberCanInvite = rolePerms?.member?.can_invite ?? false;

  const canManageTeam = myRole === "owner" || myRole === "admin";
  const email = user?.email ?? "";
  const fallbackDisplayName = user?.user_metadata?.display_name || email.split("@")[0] || "User";

  const BRAND_COLORS = [
    { value: "#6366f1", label: "Indigo" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#ec4899", label: "Pink" },
    { value: "#f43f5e", label: "Rose" },
    { value: "#f97316", label: "Orange" },
    { value: "#10b981", label: "Emerald" },
    { value: "#0ea5e9", label: "Sky" },
  ];

  useEffect(() => {
    if (currentTeam && !teamNameEditing) {
      setTeamNameEdit(currentTeam.name);
    }
  }, [currentTeam?.name, currentTeam, teamNameEditing]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "profile" || t === "team" || t === "preferences") {
      setActiveTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    setLogoUrlDraft(teamSettings?.logo_url ?? "");
  }, [teamSettings?.logo_url]);

  useEffect(() => {
    if (profile && !isEditingDisplayName.current) {
      setDisplayName(profile.display_name ?? fallbackDisplayName ?? "");
    }
  }, [profile?.display_name, profile, fallbackDisplayName]);

  const sortedMembers = [...members].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99)
  );

  const handleSaveTeamName = () => {
    if (!teamId || !teamNameEdit.trim()) return;
    updateTeamMutation.mutate(
      { teamId, update: { name: teamNameEdit.trim() } },
      {
        onSuccess: () => {
          toast.success("Team renamed");
          setTeamNameEditing(false);
        },
        onError: () => toast.error("Failed to rename"),
      }
    );
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

  const handleRemoveMember = () => {
    if (!removeMemberId) return;
    const isSelf = members.find((m) => m.id === removeMemberId)?.user_id === user?.id;
    removeMemberMutation.mutate(removeMemberId, {
      onSuccess: () => {
        setRemoveMemberId(null);
        toast.success(isSelf ? "You left the team" : "Member removed");
      },
      onError: () => toast.error("Failed to remove"),
    });
  };

  const isMobile = useIsMobile();
  const avatarUrl = profile?.avatar_url ?? null;
  const initials = (profile?.display_name || fallbackDisplayName).slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    const name = displayName.trim() || profile?.display_name || fallbackDisplayName;
    try {
      await updateProfile.mutateAsync({ display_name: name });
      isEditingDisplayName.current = false;
      setDisplayName(name);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      toast.error("Please select a JPG, PNG, GIF, or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2 MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile.mutateAsync({ avatar_url: url });
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="shrink-0 px-4 py-4 md:px-6 md:pb-4 border-b border-border/50">
        <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Manage your profile, team, and preferences
        </p>
        {isMobile && (
          <nav className="flex gap-1 mt-4 overflow-x-auto pb-0.5 -mx-1 scrollbar-hide">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchParams({ tab: tab.id });
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-colors shrink-0 min-h-[44px] touch-manipulation",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
        {!isMobile && (
          <nav className="w-48 shrink-0 border-r border-border/50 p-4 flex flex-col gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchParams({ tab: tab.id });
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6 overscroll-contain">
          <AnimatePresence mode="wait">
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-xl space-y-6"
              >
                <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 space-y-5 md:space-y-6">
                  <h2 className="text-base md:text-lg font-semibold">Profile</h2>

                  {profileLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading profile…</span>
                    </div>
                  ) : (
                    <>
                      <div className={cn("flex gap-4", isMobile && "flex-col sm:flex-row")}>
                        <div className="relative group shrink-0">
                          <Avatar className={cn("h-20 w-20", isMobile && "h-16 w-16")}>
                            <AvatarImage src={avatarUrl ?? undefined} alt="Avatar" />
                            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                          </Avatar>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity cursor-pointer touch-manipulation"
                            aria-label="Change avatar"
                          >
                            {avatarUploading ? (
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            ) : (
                              <Camera className="w-6 h-6 text-white" />
                            )}
                          </button>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Profile photo</p>
                          <p className="text-xs text-muted-foreground">
                            JPG, PNG, GIF or WebP. Max 2 MB.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => {
                            isEditingDisplayName.current = true;
                            setDisplayName(e.target.value);
                          }}
                          placeholder="Your name"
                          className="w-full max-w-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          disabled
                          className="w-full max-w-sm bg-muted/50 cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed here. Contact support if needed.
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving…
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </>
                  )}

                  <div className="pt-6 mt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px] touch-manipulation"
                      onClick={async () => {
                        await signOut();
                        navigate("/login", { replace: true });
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "team" && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-2xl space-y-6"
              >
                <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 space-y-5 md:space-y-6">
                  <h2 className="text-base md:text-lg font-semibold">Team</h2>

                  {!currentTeam ? (
                    <p className="text-sm text-muted-foreground">Select a team from the sidebar.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>Team name</Label>
                        {teamNameEditing && canManageTeam ? (
                          <div className={cn("flex gap-2", isMobile && "flex-col")}>
                            <Input
                              value={teamNameEdit}
                              onChange={(e) => setTeamNameEdit(e.target.value)}
                              className={cn(isMobile ? "w-full" : "max-w-xs")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveTeamName();
                                if (e.key === "Escape") {
                                  setTeamNameEdit(currentTeam.name);
                                  setTeamNameEditing(false);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveTeamName}
                              disabled={!teamNameEdit.trim() || updateTeamMutation.isPending}
                            >
                              {updateTeamMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Save"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setTeamNameEdit(currentTeam.name);
                                setTeamNameEditing(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{currentTeam.name}</p>
                            {canManageTeam && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground"
                                onClick={() => setTeamNameEditing(true)}
                              >
                                Rename
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      {canManageTeam && (
                        <div className="space-y-3 pt-2 border-t border-border/50">
                          <Label>Invite members</Label>
                          {!showInviteForm ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl gap-2"
                              onClick={() => setShowInviteForm(true)}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Invite by email
                            </Button>
                          ) : (
                            <div className="space-y-2 p-3 md:p-4 rounded-xl bg-muted/30">
                              <Input
                                placeholder="Email address"
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="rounded-lg w-full"
                              />
                              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "member" | "guest")}>
                                <SelectTrigger className="w-full rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="guest">Guest</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className={cn("flex gap-2", isMobile && "flex-col")}>
                                <Button
                                  size="sm"
                                  onClick={handleInvite}
                                  disabled={!inviteEmail.trim() || createInviteMutation.isPending}
                                >
                                  {createInviteMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    "Send invite"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setShowInviteForm(false);
                                    setInviteEmail("");
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          {invites.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Pending invites</p>
                              <div className="space-y-1.5">
                                {invites.map((inv) => (
                                  <div
                                    key={inv.id}
                                    className={cn(
                                      "flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-muted/20",
                                      isMobile && "flex-wrap"
                                    )}
                                  >
                                    <span className="text-sm truncate">{inv.email}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={async () => {
                                          const { ok, error } = await sendInviteEmail(inv.id);
                                          toast[ok ? "success" : "error"](ok ? `Email sent to ${inv.email}` : error ?? "Failed to send");
                                        }}
                                        aria-label="Resend invite email"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                                          toast.success("Link copied");
                                        }}
                                        aria-label="Copy invite link"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive"
                                        onClick={() => deleteInviteMutation.mutate(inv.id)}
                                        aria-label="Revoke invite"
                                      >
                                        <UserMinus className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <Label>Members</Label>
                        {membersLoading ? (
                          <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading…</span>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {sortedMembers.map((m) => {
                              const prof = m.profiles;
                              const displayName = getMemberDisplayName(prof, m.user_id);
                              const isSelf = m.user_id === user?.id;
                              const canChangeRole = canManageTeam;
                              const canRemove =
                                canManageTeam &&
                                (isSelf || (m.role !== "owner" || members.filter((x) => x.role === "owner").length > 1));
                              return (
                                <div
                                  key={m.id}
                                  className={cn(
                                    "flex p-3 rounded-xl bg-muted/40 border border-border/30",
                                    isMobile ? "flex-col gap-3" : "items-center gap-3"
                                  )}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Avatar className="h-9 w-9 shrink-0">
                                      <AvatarImage src={prof?.avatar_url ?? undefined} />
                                      <AvatarFallback className="text-xs font-semibold">
                                        {(displayName || "?").slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {displayName}
                                      {isSelf && (
                                        <span className="text-muted-foreground ml-1">(you)</span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{m.role}</p>
                                    </div>
                                  </div>
                                  <div className={cn("flex items-center gap-2", isMobile && "w-full justify-end")}>
                                  <Select
                                    value={m.role}
                                    onValueChange={(role) =>
                                      updateRoleMutation.mutate({
                                        memberId: m.id,
                                        role: role as "owner" | "admin" | "member" | "guest",
                                      })
                                    }
                                    disabled={!canChangeRole || m.role === "owner"}
                                  >
                                    <SelectTrigger className={cn(
                                      "h-9 text-xs rounded-lg min-h-[44px] touch-manipulation",
                                      isMobile ? "w-full min-w-0 flex-1" : "w-[100px]"
                                    )}>
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
                                    onClick={() => setRemoveMemberId(m.id)}
                                    disabled={!canRemove}
                                    title={isSelf ? "Leave team" : "Remove member"}
                                    aria-label={isSelf ? "Leave team" : `Remove ${displayName}`}
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
                      </div>

                      {canManageTeam && (
                        <div className="space-y-3 pt-4 border-t border-border/50">
                          <Label className="flex items-center gap-2">
                            <Palette className="w-4 h-4" />
                            Brand settings
                          </Label>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">Primary color</p>
                              <div className="flex flex-wrap gap-2">
                                {BRAND_COLORS.map((c) => (
                                  <button
                                    key={c.value}
                                    type="button"
                                    onClick={() =>
                                      updateTeamSettings.mutate(
                                        { primary_color: c.value },
                                        { onSuccess: () => toast.success("Color saved") }
                                      )
                                    }
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                                      (teamSettings?.primary_color ?? "#6366f1") === c.value
                                        ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground/30"
                                        : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                    aria-label={`Set color ${c.label}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Logo URL</p>
                              <Input
                                placeholder="https://…"
                                value={logoUrlDraft}
                                onChange={(e) => setLogoUrlDraft(e.target.value)}
                                onBlur={() => {
                                  const v = logoUrlDraft.trim() || null;
                                  if (v !== (teamSettings?.logo_url ?? null)) {
                                    updateTeamSettings.mutate(
                                      { logo_url: v },
                                      { onSuccess: () => toast.success("Saved") }
                                    );
                                  }
                                }}
                                className="w-full max-w-sm"
                              />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Brand colors and logo can be used in client-facing views.
                            </p>
                          </div>
                        </div>
                      )}

                      {canManageTeam && (
                        <div className="space-y-3 pt-4 border-t border-border/50">
                          <Label className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Permission rules
                          </Label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={memberCanInvite}
                                onChange={(e) => {
                                  const can_invite = e.target.checked;
                                  const next = {
                                    ...teamSettings?.meta,
                                    role_permissions: {
                                      ...rolePerms,
                                      member: { ...rolePerms?.member, can_invite },
                                    },
                                  };
                                  updateTeamSettings.mutate(
                                    { meta: next },
                                    { onSuccess: () => toast.success("Saved") }
                                  );
                                }}
                                className="rounded border-border"
                              />
                              <span className="text-sm">Members can invite new members</span>
                            </label>
                            <p className="text-[11px] text-muted-foreground">
                              By default only Owner and Admin can invite. Enable to allow Members.
                            </p>
                          </div>
                        </div>
                      )}

                      {canManageTeam && (
                        <div className="space-y-3 pt-4 border-t border-border/50">
                          <Label className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Automation rules
                          </Label>
                          {rulesLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Loading…</span>
                            </div>
                          ) : automationRules.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                              <Zap className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                              <p className="text-sm font-medium">No automations yet</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Trigger actions when events occur (e.g. project status change). Coming soon.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {automationRules.map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/30"
                                >
                                  <div>
                                    <p className="text-sm font-medium">{r.name}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {r.event_type} · {r.enabled ? "Active" : "Disabled"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "preferences" && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="max-w-xl space-y-6"
              >
                <div className="rounded-2xl border border-border/50 bg-card p-4 md:p-6 space-y-5 md:space-y-6">
                  <h2 className="text-base md:text-lg font-semibold">Preferences</h2>

                  {settingsLoading ? (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading preferences…</span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label>Theme</Label>
                        <div className="flex gap-2 flex-wrap">
                          {THEME_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const currentTheme = (userSettings?.theme ?? "system") as Theme;
                            const isActive = currentTheme === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  applyTheme(opt.value);
                                  updateSettings.mutate(
                                    { theme: opt.value },
                                    {
                                      onSuccess: () => toast.success("Theme saved"),
                                      onError: () => toast.error("Failed to save"),
                                    }
                                  );
                                }}
                                className={cn(
                                  "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors min-h-[44px] touch-manipulation",
                                  isActive
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/50 hover:bg-muted/50"
                                )}
                              >
                                <Icon className="w-4 h-4" />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Theme is synced across devices. System follows your OS preference.
                        </p>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-border/50">
                        <Label>Notifications</Label>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userSettings?.notifications?.email ?? true}
                              onChange={(e) => {
                                const email = e.target.checked;
                                updateSettings.mutate(
                                  { notifications: { ...userSettings?.notifications, email } },
                                  { onSuccess: () => toast.success("Saved") }
                                );
                              }}
                              className="rounded border-border"
                            />
                            <span className="text-sm">Email notifications</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={userSettings?.notifications?.in_app ?? true}
                              onChange={(e) => {
                                const in_app = e.target.checked;
                                updateSettings.mutate(
                                  { notifications: { ...userSettings?.notifications, in_app } },
                                  { onSuccess: () => toast.success("Saved") }
                                );
                              }}
                              className="rounded border-border"
                            />
                            <span className="text-sm">In-app notifications</span>
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Language preference coming soon.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AlertDialog open={!!removeMemberId} onOpenChange={(o) => !o && setRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {members.find((m) => m.id === removeMemberId)?.user_id === user?.id
                ? "Leave team?"
                : "Remove member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {members.find((m) => m.id === removeMemberId)?.user_id === user?.id
                ? "You will lose access to this team's projects and data."
                : "This member will lose access to the team."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveMember}
            >
              {members.find((m) => m.id === removeMemberId)?.user_id === user?.id
                ? "Leave"
                : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

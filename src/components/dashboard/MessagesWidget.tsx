import { useState, useMemo, useRef } from "react";
import {
  Send,
  Search,
  MessageSquare,
  Plus,
  Paperclip,
  X,
  FileText,
  Hash,
  UserPlus,
  Settings2,
  UserMinus,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { getSizeTier } from "./WidgetCard";
import { useTeamContext } from "@/contexts/TeamContext";
import { useAuthContext } from "@/contexts/AuthContext";
import { useMessagesPreview, useTeamChats, useChatMessages, useSendMessage, useMarkChatAsRead, useFetchOrCreateDirectChat, useTeamChatRealtime, useCreateChannel, useAddChannelParticipant, useRemoveChannelParticipant, useRenameChannel, useDeleteChat, useChatParticipants } from "@/hooks/useTeamMessages";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { formatRelativeTime, formatFileSize } from "@/lib/utils";
import { getAttachmentDownloadUrl } from "@/api/team_messages";
import type { TeamChatWithPreview, TeamChatMessageWithAttachments } from "@/api/team_messages";
import { getMemberDisplayName } from "@/api/teams";

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Preview (dashboard card) ────────────────────────────────

export const MessagesPreview = ({
  pixelSize,
}: {
  pixelSize?: { width: number; height: number };
}) => {
  const { teamId } = useTeamContext();
  const { data: preview, isLoading } = useMessagesPreview(teamId);
  const tier = getSizeTier(pixelSize);

  if (tier === "compact") return null;
  if (isLoading || !preview) {
    return (
      <div className="flex flex-col h-full gap-2 mt-1 animate-pulse">
        <div className="h-6 w-16 bg-muted rounded" />
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-muted rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = preview.unreadCount;
  const chats = preview.recentChats;
  const totalCount = preview.totalCount;

  if (tier === "standard") {
    return (
      <div className="flex flex-col h-full gap-1.5 mt-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: "var(--brand-primary)" }} />
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold tracking-tight leading-none text-primary">{unreadCount}</p>
            <p className="text-[10px] text-muted-foreground">unread</p>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 overflow-hidden">
          {chats.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No chats yet</p>
          ) : (
            chats.slice(0, 3).map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold shrink-0 bg-muted">
                  ?
                </div>
                <span className="text-[10px] truncate flex-1">
                  {c.last_message?.text?.slice(0, 40) ?? "No messages"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 mt-1">
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight leading-none text-primary">{unreadCount}</p>
          <p className="text-xs text-muted-foreground">unread</p>
        </div>
        <span className="text-[10px] text-muted-foreground">{totalCount} total</span>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        {chats.length === 0 ? (
          <p className="text-xs text-muted-foreground">No chats yet. Start a new chat.</p>
        ) : (
          chats.slice(0, 4).map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">?</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-medium", (c.unread_count ?? 0) > 0 && "font-semibold")}>Chat</span>
                  <span className="text-[8px] text-muted-foreground">
                    {c.last_message?.created_at ? formatRelativeTime(c.last_message.created_at) : ""}
                  </span>
                </div>
                <p className="text-[9px] text-muted-foreground truncate">
                  {c.last_message?.text?.slice(0, 50) ?? "No messages"}
                </p>
              </div>
              {(c.unread_count ?? 0) > 0 && (
                <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Expanded (full page) ────────────────────────────────

export const MessagesExpanded = () => {
  const { teamId } = useTeamContext();
  const { user } = useAuthContext();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: chats, isLoading: chatsLoading } = useTeamChats(teamId);
  const { data: members } = useTeamMembers(teamId);
  const { data: messages, isLoading: messagesLoading } = useChatMessages(selectedChatId);
  const sendMutation = useSendMessage(selectedChatId, teamId);
  const markReadMutation = useMarkChatAsRead(selectedChatId, teamId, user?.id ?? null);
  const fetchOrCreateMutation = useFetchOrCreateDirectChat(teamId);
  const createChannelMutation = useCreateChannel(teamId);
  const addParticipantMutation = useAddChannelParticipant(selectedChatId, teamId);
  const removeParticipantMutation = useRemoveChannelParticipant(selectedChatId, teamId);
  const renameChannelMutation = useRenameChannel(selectedChatId, teamId);
  const deleteChatMutation = useDeleteChat(teamId);
  const { data: participantIds } = useChatParticipants(selectedChatId);
  useTeamChatRealtime(selectedChatId, teamId);

  const userIdToDisplay = useMemo(() => {
    const m: Record<string, string> = {};
    for (const mem of members ?? []) {
      m[mem.user_id] = getMemberDisplayName(mem.profiles, mem.user_id);
    }
    return m;
  }, [members]);

  const selectedChat = useMemo(
    () => chats?.find((c) => c.id === selectedChatId),
    [chats, selectedChatId]
  );

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!search.trim()) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => {
      const otherName = c.other_user_id ? userIdToDisplay[c.other_user_id] ?? "" : "";
      const chatName = c.name ?? "";
      const lastName = c.last_message?.text ?? "";
      return otherName.toLowerCase().includes(q) || chatName.toLowerCase().includes(q) || lastName.toLowerCase().includes(q);
    });
  }, [chats, search, userIdToDisplay]);

  const directChats = useMemo(() => filteredChats.filter((c) => c.type === "direct"), [filteredChats]);
  const channelChats = useMemo(() => filteredChats.filter((c) => c.type === "channel"), [filteredChats]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    const chat = chats?.find((c) => c.id === chatId);
    const lastMsg = chat?.last_message;
    if (lastMsg?.created_at && user?.id) {
      markReadMutation.mutate(lastMsg.created_at);
    }
  };

  const handleSend = () => {
    const text = reply.trim();
    if (!text && selectedFiles.length === 0) return;
    sendMutation.mutate(
      { text, files: selectedFiles.length > 0 ? selectedFiles : undefined },
      {
        onSuccess: () => {
          setReply("");
          setSelectedFiles([]);
        },
      }
    );
  };

  const handleNewChatSelect = (otherUserId: string) => {
    fetchOrCreateMutation.mutate(otherUserId, {
      onSuccess: (chat) => {
        setNewChatOpen(false);
        setSelectedChatId(chat.id);
      },
    });
  };

  const handleCreateChannel = () => {
    const name = newChannelName.trim();
    if (!name) return;
    createChannelMutation.mutate(name, {
      onSuccess: (chat) => {
        setNewChannelOpen(false);
        setNewChannelName("");
        setSelectedChatId(chat.id);
      },
    });
  };

  const handleInviteToChannel = (userId: string) => {
    addParticipantMutation.mutate(userId, {
      onSuccess: () => setInviteOpen(false),
    });
  };

  const handleDeleteFromList = (chatId: string) => {
    setDeleteConfirmChatId(chatId);
    setDeleteConfirmOpen(true);
  };

  const otherDisplayName = selectedChat?.type === "channel"
    ? (selectedChat?.name ?? "Channel")
    : selectedChat?.other_user_id
      ? userIdToDisplay[selectedChat.other_user_id] ?? "Chat"
      : "Chat";
  const isChannel = selectedChat?.type === "channel";

  // Chat view (selected chat open) — fixed height, messages scroll internally
  if (selectedChatId) {
    return (
      <div className="flex flex-1 flex-col min-h-0 h-0 overflow-hidden w-full">
        {/* Chat header — compact, professional */}
        <div className="shrink-0 flex items-center gap-3 py-3 px-1">
          <button
            onClick={() => setSelectedChatId(null)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Back to chats"
          >
            <span className="text-sm">← Back</span>
          </button>
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback className="text-xs">
              {isChannel ? <Hash className="w-4 h-4" /> : getInitials(otherDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{otherDisplayName}</p>
            <p className="text-[11px] text-muted-foreground">{isChannel ? "Channel" : "Direct chat"}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            {isChannel && (
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="rounded-lg h-8 text-xs">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Invite
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRenameValue(selectedChat?.name ?? "");
                setSettingsOpen(true);
              }}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              title={isChannel ? "Channel settings" : "Chat settings"}
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages area — generous padding, messenger-style */}
        <div className="flex-1 min-h-0 shrink-0 flex flex-col overflow-hidden rounded-2xl bg-muted/20 border border-border/30">
          <div
            className="h-full min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain chat-scrollbar px-5 py-6 touch-pan-y"
            tabIndex={0}
            role="log"
            aria-label="Chat messages"
          >
            <div className="space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-12 text-sm text-muted-foreground">Loading…</div>
          ) : !messages?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">No messages yet.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Say hello to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) =>
              (msg.message_type === "system" ? (
                <SystemMessageBubble key={msg.id} msg={msg} userIdToDisplay={userIdToDisplay} />
              ) : (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.from_user_id === user?.id}
                  userIdToDisplay={userIdToDisplay}
                />
              ))
            )
          )}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-3 pt-4 pb-1">
          {selectedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs bg-muted/80 px-2.5 py-1.5 rounded-lg border border-border/30"
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate max-w-[140px]">{f.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(f.size)})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="ml-0.5 p-0.5 rounded hover:bg-muted hover:text-destructive transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setSelectedFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Message…"
              className="rounded-2xl flex-1 h-11 px-4 bg-muted/30 border-border/40 focus-visible:ring-2"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              size="icon"
              className="shrink-0 h-11 w-11 rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invite to channel dialog — must be in chat view for Invite button to work */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite to channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-1 max-h-64 overflow-auto">
              {members
                ?.filter((m) => m.user_id !== user?.id)
                .map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => handleInviteToChannel(m.user_id)}
                    disabled={addParticipantMutation.isPending}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(getMemberDisplayName(m.profiles, m.user_id) || null)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {getMemberDisplayName(m.profiles, m.user_id)}
                    </span>
                  </button>
                ))}
              {members && members.filter((m) => m.user_id !== user?.id).length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No other team members to invite.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Chat settings: rename + participants (channel), delete (both) */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isChannel ? "Channel settings" : "Chat settings"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {isChannel && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Channel name</label>
                    <div className="flex gap-2 mt-1.5">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder="Channel name"
                        className="flex-1"
                      />
                      <Button
                        onClick={() => {
                          const n = renameValue.trim();
                          if (n) renameChannelMutation.mutate(n, { onSuccess: () => setSettingsOpen(false) });
                        }}
                        disabled={!renameValue.trim() || renameChannelMutation.isPending || renameValue.trim() === (selectedChat?.name ?? "")}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Participants</label>
                    <div className="space-y-1 max-h-48 overflow-auto mt-1.5">
                      {participantIds
                        ?.map((uid) => ({
                          userId: uid,
                          name: getMemberDisplayName(members?.find((m) => m.user_id === uid)?.profiles ?? null, uid),
                        }))
                        .map(({ userId, name }) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between gap-2 py-2 px-2 rounded-lg hover:bg-muted/50"
                          >
                            <span className="text-sm truncate">{name}</span>
                            {userId !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeParticipantMutation.mutate(userId)}
                                disabled={removeParticipantMutation.isPending}
                              >
                                <UserMinus className="w-3.5 h-3.5 mr-1" />
                                Remove
                              </Button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}
              <div className="pt-2 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSettingsOpen(false);
                    setDeleteConfirmChatId(null);
                    setDeleteConfirmOpen(true);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  {isChannel ? "Delete channel" : "Delete chat"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {isChannel ? "Delete channel?" : "Delete chat?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isChannel
                  ? "This will permanently delete the channel and all messages. This cannot be undone."
                  : "This will permanently delete the chat and all messages. This cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (selectedChatId) {
                    deleteChatMutation.mutate(selectedChatId, {
                      onSuccess: () => {
                        setSelectedChatId(null);
                        setDeleteConfirmOpen(false);
                      },
                    });
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="pl-9 rounded-xl"
          />
        </div>
        <div className="flex gap-1">
          <Button onClick={() => setNewChatOpen(true)} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Chat
          </Button>
          <Button onClick={() => setNewChannelOpen(true)} size="sm">
            <Hash className="w-4 h-4 mr-1" />
            Channel
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {chatsLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filteredChats.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {search ? "No chats match your search." : "No chats yet. Start a direct chat or create a channel!"}
          </div>
        ) : (
          <>
            {directChats.length > 0 && (
              <div className="py-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Direct</p>
                <div className="space-y-1">
                  {directChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      userIdToDisplay={userIdToDisplay}
                      onSelect={() => handleSelectChat(chat.id)}
                      onDelete={() => handleDeleteFromList(chat.id)}
                      isChannel={false}
                    />
                  ))}
                </div>
              </div>
            )}
            {channelChats.length > 0 && (
              <div className="py-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
                <div className="space-y-1">
                  {channelChats.map((chat) => (
                    <ChatListItem
                      key={chat.id}
                      chat={chat}
                      userIdToDisplay={userIdToDisplay}
                      onSelect={() => handleSelectChat(chat.id)}
                      onDelete={() => handleDeleteFromList(chat.id)}
                      isChannel
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* New chat dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 max-h-64 overflow-auto">
            {members
              ?.filter((m) => m.user_id !== user?.id)
              .map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => handleNewChatSelect(m.user_id)}
                  disabled={fetchOrCreateMutation.isPending}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(getMemberDisplayName(m.profiles, m.user_id) || null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {getMemberDisplayName(m.profiles, m.user_id)}
                  </span>
                </button>
              ))}
            {members && members.filter((m) => m.user_id !== user?.id).length === 0 && (
              <p className="text-sm text-muted-foreground py-4">No other team members to chat with.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New channel dialog */}
      <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Channel name"
              onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewChannelOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim() || createChannelMutation.isPending}>
                Create
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation from list */}
      <AlertDialog
        open={deleteConfirmOpen && !!deleteConfirmChatId}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmChatId(null);
          setDeleteConfirmOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat and all messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmChatId) {
                  deleteChatMutation.mutate(deleteConfirmChatId, {
                    onSuccess: () => {
                      setDeleteConfirmChatId(null);
                      setDeleteConfirmOpen(false);
                    },
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function ChatListItem({
  chat,
  userIdToDisplay,
  onSelect,
  onDelete,
  isChannel = false,
}: {
  chat: TeamChatWithPreview;
  userIdToDisplay: Record<string, string>;
  onSelect: () => void;
  onDelete: () => void;
  isChannel?: boolean;
}) {
  const displayName = isChannel
    ? (chat.name ?? "Channel")
    : chat.other_user_id
      ? userIdToDisplay[chat.other_user_id] ?? "Unknown"
      : "Chat";
  const preview = chat.last_message?.text?.slice(0, 60) ?? "No messages";
  const unread = (chat.unread_count ?? 0) > 0;
  return (
    <div
      className={cn(
        "group w-full flex items-center gap-2 p-3 rounded-xl transition-colors",
        unread ? "bg-secondary/20 hover:bg-secondary/40" : "hover:bg-secondary/30"
      )}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left flex items-start gap-3 min-w-0"
      >
        {isChannel ? (
          <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <Hash className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="text-xs">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm", unread && "font-semibold")}>{displayName}</span>
            <span className="text-[10px] text-muted-foreground">
              {chat.last_message?.created_at ? formatRelativeTime(chat.last_message.created_at) : ""}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
        </div>
        {unread && <div className="w-2 h-2 rounded-full bg-foreground/40 shrink-0 mt-2" />}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete chat"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function SystemMessageBubble({
  msg,
  userIdToDisplay,
}: {
  msg: TeamChatMessageWithAttachments;
  userIdToDisplay: Record<string, string>;
}) {
  const actorName = userIdToDisplay[msg.from_user_id] ?? "Someone";
  const targetName = msg.system_target_id ? (userIdToDisplay[msg.system_target_id] ?? "Unknown") : null;
  let text = "";
  if (msg.system_action === "member_invited" && targetName) {
    text = `${actorName} invited ${targetName}`;
  } else if (msg.system_action === "member_removed" && targetName) {
    text = `${actorName} removed ${targetName}`;
  } else if (msg.system_action === "channel_renamed" && msg.text) {
    text = `${actorName} renamed the channel to ${msg.text}`;
  } else {
    text = "—";
  }
  return (
    <div className="flex justify-center items-center gap-2 py-2">
      <span className="text-[11px] text-muted-foreground/80 px-2 py-1 rounded-md bg-muted/30">
        {text}
      </span>
      <span className="text-[10px] text-muted-foreground/50">{formatRelativeTime(msg.created_at)}</span>
    </div>
  );
}

function MessageBubble({
  msg,
  isOwn,
  userIdToDisplay,
}: {
  msg: TeamChatMessageWithAttachments;
  isOwn: boolean;
  userIdToDisplay: Record<string, string>;
}) {
  const fromName = userIdToDisplay[msg.from_user_id] ?? "Unknown";
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

  const handleAttachmentClick = async (storagePath: string) => {
    setLoadingUrl(storagePath);
    try {
      const url = await getAttachmentDownloadUrl(storagePath, 120);
      window.open(url, "_blank");
    } finally {
      setLoadingUrl(null);
    }
  };

  return (
    <div className={cn("flex items-end gap-1.5", isOwn ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[78%] min-w-0 rounded-xl px-3 py-2",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-background/90 dark:bg-muted/50 border border-border/30 rounded-bl-sm"
        )}
      >
        {!isOwn && (
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{fromName}</p>
        )}
        {msg.text && (
          <p className="text-sm leading-snug whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        {msg.attachments?.length ? (
          <div className={cn("flex flex-col gap-1.5", msg.text && "mt-2")}>
            {msg.attachments.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAttachmentClick(a.storage_path)}
                disabled={loadingUrl === a.storage_path}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                  isOwn
                    ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                    : "bg-muted/60 hover:bg-muted/80"
                )}
              >
                <FileText className="w-3.5 h-3.5 shrink-0 opacity-80" />
                <span className="text-xs truncate flex-1 min-w-0">{a.name}</span>
                <span className="text-[10px] opacity-70 shrink-0">{formatFileSize(a.size_bytes)}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <span className="text-[10px] text-muted-foreground/70 shrink-0 self-end pb-0.5">
        {formatRelativeTime(msg.created_at)}
      </span>
    </div>
  );
}

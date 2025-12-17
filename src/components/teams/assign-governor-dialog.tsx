"use client";

import * as React from "react";
import { Loader2, Shield, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { LeagueMember, Governor } from "@/hooks/use-league-teams";

interface AssignGovernorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: LeagueMember[];
  currentGovernor: Governor | null;
  hostUserId: string;
  onAssignGovernor: (userId: string) => Promise<boolean>;
}

export function AssignGovernorDialog({
  open,
  onOpenChange,
  members,
  currentGovernor,
  hostUserId,
  onAssignGovernor,
}: AssignGovernorDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  // Filter out host from eligible members (host is identified by host_user_id, not roles)
  const eligibleMembers = React.useMemo(() => {
    return members.filter((m) => m.user_id !== hostUserId);
  }, [members, hostUserId]);

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedUserId(currentGovernor?.user_id || null);
    }
  }, [open, currentGovernor]);

  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return eligibleMembers;
    const query = searchQuery.toLowerCase();
    return eligibleMembers.filter(
      (m) =>
        m.username.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query)
    );
  }, [eligibleMembers, searchQuery]);

  const handleAssign = async () => {
    if (!selectedUserId || selectedUserId === currentGovernor?.user_id) {
      onOpenChange(false);
      return;
    }

    setIsLoading(true);
    try {
      const success = await onAssignGovernor(selectedUserId);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5 text-blue-500" />
            Assign Governor
          </DialogTitle>
          <DialogDescription>
            Select a league member to be the governor. The governor has oversight
            of all teams and can validate any submission. Only one governor can
            be assigned per league.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search league members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-[300px] rounded-md border">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Shield className="size-10 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No eligible members</p>
                <p className="text-xs text-muted-foreground">
                  The host cannot be assigned as governor
                </p>
              </div>
            ) : (
              <RadioGroup
                value={selectedUserId || ""}
                onValueChange={setSelectedUserId}
                className="p-2 space-y-1"
              >
                {filteredMembers.map((member) => {
                  const isCurrent = member.user_id === currentGovernor?.user_id;
                  const isGovernor = member.roles.includes("governor");

                  return (
                    <div
                      key={member.user_id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedUserId === member.user_id
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem
                        value={member.user_id}
                        id={`gov-${member.user_id}`}
                      />
                      <Label
                        htmlFor={`gov-${member.user_id}`}
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="size-9">
                            <AvatarFallback>
                              {member.username
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {isGovernor && (
                            <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-background">
                              <Shield className="size-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {member.roles
                            .filter((r) => r !== "player")
                            .map((role) => (
                              <Badge
                                key={role}
                                variant="outline"
                                className={
                                  role === "governor"
                                    ? "bg-blue-500/10 text-blue-600 border-blue-200"
                                    : role === "captain"
                                    ? "bg-amber-500/10 text-amber-600 border-amber-200"
                                    : ""
                                }
                              >
                                {role}
                              </Badge>
                            ))}
                          {isCurrent && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">
                              Current
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isLoading || !selectedUserId || eligibleMembers.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Shield className="mr-2 size-4" />
                Assign Governor
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AssignGovernorDialog;

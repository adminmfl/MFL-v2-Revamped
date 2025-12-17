"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import type { AdminRole } from "@/types/admin";

// ============================================================================
// Types
// ============================================================================

interface RoleFormData {
  role_name: string;
}

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AdminRole | null;
  onSubmit: (data: RoleFormData) => void | Promise<void>;
}

// ============================================================================
// RoleFormDialog Component
// ============================================================================

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
}: RoleFormDialogProps) {
  const isEditing = !!role;
  const [isLoading, setIsLoading] = React.useState(false);

  const [formData, setFormData] = React.useState<RoleFormData>({
    role_name: "",
  });

  React.useEffect(() => {
    if (open && role) {
      setFormData({
        role_name: role.role_name,
      });
    } else if (open && !role) {
      setFormData({
        role_name: "",
      });
    }
  }, [role, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Role" : "Create Role"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the role name below."
              : "Enter a name for the new role."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role_name">Role Name *</Label>
              <Input
                id="role_name"
                value={formData.role_name}
                onChange={(e) =>
                  setFormData({ ...formData, role_name: e.target.value })
                }
                placeholder="e.g., Manager"
                required
              />
              <p className="text-xs text-muted-foreground">
                Role names are automatically converted to lowercase
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update Role"
              ) : (
                "Create Role"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RoleFormDialog;

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
import { Textarea } from "@/components/ui/textarea";
import type { AdminActivity } from "@/types/admin";

// ============================================================================
// Types
// ============================================================================

interface ActivityFormData {
  activity_name: string;
  description: string;
}

interface ActivityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: AdminActivity | null;
  onSubmit: (data: ActivityFormData) => void | Promise<void>;
}

// ============================================================================
// ActivityFormDialog Component
// ============================================================================

export function ActivityFormDialog({
  open,
  onOpenChange,
  activity,
  onSubmit,
}: ActivityFormDialogProps) {
  const isEditing = !!activity;
  const [isLoading, setIsLoading] = React.useState(false);

  const [formData, setFormData] = React.useState<ActivityFormData>({
    activity_name: "",
    description: "",
  });

  React.useEffect(() => {
    if (open && activity) {
      setFormData({
        activity_name: activity.activity_name,
        description: activity.description || "",
      });
    } else if (open && !activity) {
      setFormData({
        activity_name: "",
        description: "",
      });
    }
  }, [activity, open]);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Activity" : "Create Activity"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the activity details below."
              : "Fill in the details to create a new activity."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activity_name">Activity Name *</Label>
              <Input
                id="activity_name"
                value={formData.activity_name}
                onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
                placeholder="Running"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the activity..."
                rows={4}
              />
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
                "Update Activity"
              ) : (
                "Create Activity"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ActivityFormDialog;

"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  Plus,
  Search,
  Pencil,
  Trash2,
  Zap,
  Loader2,
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFormDialog } from "./activity-form-dialog";
import { useAdminActivities } from "@/hooks/admin";
import type { AdminActivity } from "@/types/admin";

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ActivitiesTable Component
// ============================================================================

export function ActivitiesTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 });

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [editingActivity, setEditingActivity] = React.useState<AdminActivity | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [activityToDelete, setActivityToDelete] = React.useState<AdminActivity | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Fetch activities with hook
  const { activities, isLoading, error, createActivity, updateActivity, deleteActivity, refetch } =
    useAdminActivities();

  const handleAddActivity = () => {
    setEditingActivity(null);
    setFormDialogOpen(true);
  };

  const handleEditActivity = (activity: AdminActivity) => {
    setEditingActivity(activity);
    setFormDialogOpen(true);
  };

  const handleDeleteClick = (activity: AdminActivity) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (activityToDelete) {
      setIsDeleting(true);
      const success = await deleteActivity(activityToDelete.activity_id);
      setIsDeleting(false);

      if (success) {
        toast.success(`Activity "${activityToDelete.activity_name}" deleted successfully`);
        setDeleteDialogOpen(false);
        setActivityToDelete(null);
      } else {
        toast.error("Failed to delete activity. It may be in use by leagues.");
      }
    }
  };

  const handleFormSubmit = async (activityData: {
    activity_name: string;
    description?: string;
  }) => {
    if (editingActivity) {
      // Edit existing activity
      const result = await updateActivity(editingActivity.activity_id, {
        activity_name: activityData.activity_name,
        description: activityData.description || null,
      });

      if (result) {
        toast.success("Activity updated successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to update activity");
      }
    } else {
      // Add new activity
      const result = await createActivity({
        activity_name: activityData.activity_name,
        description: activityData.description,
      });

      if (result) {
        toast.success("Activity created successfully");
        setFormDialogOpen(false);
      } else {
        toast.error("Failed to create activity");
      }
    }
  };

  const columns: ColumnDef<AdminActivity>[] = [
    {
      accessorKey: "activity_name",
      header: "Activity",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="size-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.original.activity_name}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-2 max-w-[300px]">
          {row.original.description || "No description"}
        </span>
      ),
    },
    {
      accessorKey: "created_date",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleEditActivity(row.original)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDeleteClick(row.original)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: displayData,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  // Use empty array if there's an error
  const displayData = error ? [] : activities;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Management</h1>
          <p className="text-muted-foreground">Create and manage trackable activities</p>
        </div>
        <Button onClick={handleAddActivity}>
          <Plus className="mr-2 size-4" />
          Add Activity
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search activities..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                      <Zap className="size-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No activities found</p>
                      <p className="text-sm text-muted-foreground">
                        {error
                          ? "Unable to load activities. Please try again."
                          : "Get started by creating a new activity."}
                      </p>
                    </div>
                    {!error && (
                      <Button size="sm" onClick={handleAddActivity}>
                        <Plus className="mr-2 size-4" />
                        Add Activity
                      </Button>
                    )}
                    {error && (
                      <Button size="sm" variant="outline" onClick={refetch}>
                        Try Again
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} activity(ies) total
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page" className="text-sm">
              Rows per page
            </Label>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => setPagination({ ...pagination, pageSize: Number(value) })}
            >
              <SelectTrigger className="w-16" id="rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm">
            Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <ActivityFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        activity={editingActivity}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activityToDelete?.activity_name}"? This action cannot be
              undone. Note: Activities that are in use by leagues cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ActivitiesTable;

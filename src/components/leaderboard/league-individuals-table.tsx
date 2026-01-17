/**
 * League Individuals Table
 * DataTable component for displaying individual player rankings in the leaderboard.
 */
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Trophy,
  User,
  Star,
  Medal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import type { IndividualRanking } from '@/hooks/use-league-leaderboard';

// ============================================================================
// Rank Badge
// ============================================================================

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Trophy className="size-4 text-yellow-600" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <Medal className="size-4 text-gray-500" />
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
        <Medal className="size-4 text-orange-600" />
      </div>
    );

  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-muted">
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeagueIndividualsTable({
  individuals,
  showAvgRR = false,
}: {
  individuals: IndividualRanking[];
  showAvgRR?: boolean;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = React.useMemo<ColumnDef<IndividualRanking>[]>(() => [
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }) => <RankBadge rank={row.original.rank} />,
      size: 60,
    },
    {
      accessorKey: 'username',
      header: 'Player',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{row.original.username}</p>
            {row.original.team_name && (
              <p className="text-xs text-muted-foreground">
                {row.original.team_name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'points',
      header: 'Points',
      cell: ({ row }) => (
        <span className="text-lg font-bold text-primary">
          {row.original.points}
        </span>
      ),
    },
    ...(showAvgRR
      ? [
          {
            accessorKey: 'avg_rr',
            header: 'RR',
            cell: ({ row }) => (
              <div className="flex items-center gap-1.5">
                <Star className="size-4 text-yellow-500" />
                <span className="font-medium">
                  {row.original.avg_rr.toFixed(2)}
                </span>
              </div>
            ),
          },
        ]
      : []),
    {
      accessorKey: 'submission_count',
      header: 'Submissions',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.submission_count}</Badge>
      ),
    },
  ], [showAvgRR]);

  const table = useReactTable({
    data: individuals,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount() || 1;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(row.original.rank <= 3 && 'bg-muted/30')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No players found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalRows > 0 && (
          <div className="border-t px-4 py-4 space-y-3">

            {/* Top count (centered) */}
            <div className="text-center text-sm text-muted-foreground">
              {totalRows} submission{totalRows === 1 ? '' : 's'}
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-center gap-6 flex-wrap">

              {/* Rows per page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Select
                  value={String(pagination.pageSize)}
                  onValueChange={(value) =>
                    setPagination({ pageIndex: 0, pageSize: Number(value) })
                  }
                >
                  <SelectTrigger className="h-9 w-[72px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Page info */}
              <div className="text-sm font-medium">
                Page {pagination.pageIndex + 1} / {pageCount}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronsLeft className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="size-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => table.setPageIndex(pageCount - 1)}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeagueIndividualsTable;

import { DataTablePagination } from '@/components/shared/data-table/data-table-pagination';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isFetching?: boolean;
  totalEntries?: number;
  children?: React.ReactNode;
  className?: string;
  isDashboard?: boolean;
  selectedRows?: RowSelectionState;
  setSelectedRows?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  footer?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isFetching = false,
  totalEntries,
  children,
  className,
  isDashboard = false,
  selectedRows = {},
  setSelectedRows,
  footer,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { open, isMobile } = useSidebar();
  const page = Number(searchParams.get('page') ?? 1);
  const pageSize = Number(searchParams.get('pageSize') ?? 10);
  const sort = searchParams.get('sort') ?? '';
  const query = searchParams.get('query') ?? '';

  const [sorting, setSorting] = useState<SortingState>(
    sort ? [{ desc: sort.startsWith('-'), id: sort.replaceAll('-', '') }] : [],
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page ? page - 1 : 0,
    pageSize: pageSize || 10,
  });

  useEffect(() => {
    const { pageIndex, pageSize } = pagination;
    const nextParams = new URLSearchParams(searchParams.toString());
    const nextPage = pageIndex === 0 ? '' : String(pageIndex + 1);
    const nextPageSize = pageSize === 10 ? '' : String(pageSize);
    const nextSort =
      sorting.length === 0
        ? ''
        : `${sorting[0].desc ? '-' : ''}${sorting[0].id}`;

    if (nextPage) nextParams.set('page', nextPage);
    else nextParams.delete('page');

    if (nextPageSize) nextParams.set('pageSize', nextPageSize);
    else nextParams.delete('pageSize');

    if (nextSort) nextParams.set('sort', nextSort);
    else nextParams.delete('sort');

    const nextSearch = nextParams.toString();
    const currentSearch = searchParams.toString();

    if (nextSearch !== currentSearch) {
      router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, {
        scroll: false,
      });
    }
  }, [pathname, router, searchParams, sorting, pagination]);

  const table = useReactTable({
    data,
    columns,
    getSubRows: (row) => (row as { children?: TData[] }).children,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: {
      sorting,
      pagination,
      globalFilter: query,
      rowSelection: selectedRows,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onRowSelectionChange: setSelectedRows,
    pageCount: undefined,
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
  });

  return (
    <div
      className={cn(
        'space-y-4',
        !isDashboard && 'my-4',
        isMobile
          ? ''
          : open
            ? 'max-w-[calc(100dvw-288px)]'
            : 'max-w-[calc(100dvw-112px)]',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        {children}
        <DataTablePagination table={table} />
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'odd:bg-gray-50 dark:odd:bg-gray-800',
                    isFetching ? 'opacity-60' : '',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footer && footer}
        </Table>
      </div>
    </div>
  );
}

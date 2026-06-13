import Pagination from '@/components/shared/pagination';

import { type Table } from '@tanstack/react-table';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <Pagination
      page={table.getState().pagination.pageIndex + 1}
      pageSize={table.getState().pagination.pageSize}
      pageCount={table.getPageCount()}
      onPageChange={(page) => table.setPageIndex(page - 1)}
      onPageSizeChange={table.setPageSize}
      hasPreviousPage={table.getCanPreviousPage()}
      hasNextPage={table.getCanNextPage()}
    />
  );
}

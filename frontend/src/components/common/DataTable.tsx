import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  Box,
  Typography,
  Skeleton,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';

interface Column {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  minWidth?: number;
  render?: (item: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  totalItems?: number;
  currentPage?: number;
  totalPages?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  emptyMessage?: string;
  emptySubMessage?: string;
  enablePagination?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  totalItems = 0,
  currentPage = 1,
  totalPages = 1,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onSort,
  sortBy,
  sortOrder = 'asc',
  emptyMessage = 'Nenhum dado encontrado',
  emptySubMessage = 'Não há dados para exibir',
  enablePagination = true,
  stickyHeader = false,
  maxHeight,
}) => {
  const handleSort = (columnId: string) => {
    if (onSort && columns.find(col => col.id === columnId)?.sortable) {
      onSort(columnId);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage + 1); // TablePagination uses 0-based indexing
    }
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(parseInt(event.target.value, 10));
    }
  };

  const renderCell = (column: Column, item: any, index: number) => {
    if (loading) {
      return <Skeleton animation="wave" height={40} />;
    }

    if (column.render) {
      return column.render(item);
    }

    return item[column.id] || '-';
  };

  const renderEmptyState = () => (
    <TableRow>
      <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {emptyMessage}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {emptySubMessage}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  const renderLoadingRows = () => {
    return Array.from({ length: rowsPerPage }).map((_, index) => (
      <TableRow key={index}>
        {columns.map((column) => (
          <TableCell key={column.id}>
            <Skeleton animation="wave" height={40} />
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  // Garantir que data é sempre um array válido
  const safeData = Array.isArray(data) ? data : [];

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: maxHeight }}>
        <Table stickyHeader={stickyHeader} aria-label="data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  style={{ minWidth: column.minWidth }}
                  sortDirection={sortBy === column.id ? sortOrder : false}
                >
                  {column.sortable && onSort ? (
                    <TableSortLabel
                      active={sortBy === column.id}
                      direction={sortBy === column.id ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                      {sortBy === column.id ? (
                        <Box component="span" sx={visuallyHidden}>
                          {sortOrder === 'desc'
                            ? 'sorted descending'
                            : 'sorted ascending'}
                        </Box>
                      ) : null}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && safeData.length === 0
              ? renderLoadingRows()
              : safeData.length === 0
              ? renderEmptyState()
              : safeData.map((item, index) => (
                  <TableRow hover key={item.id || index} tabIndex={-1}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align || 'left'}
                      >
                        {renderCell(column, item, index)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>

      {enablePagination && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalItems}
          rowsPerPage={rowsPerPage}
          page={currentPage - 1} // TablePagination uses 0-based indexing
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Itens por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      )}
    </Paper>
  );
}; 
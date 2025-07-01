import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronLeftIcon, ChevronRightIcon, Search } from "lucide-react";

interface DataTableProps<T> {
  columns: {
    header: string;
    accessorKey: keyof T | ((row: T) => React.ReactNode);
    enableSorting?: boolean;
    cell?: (row: T) => React.ReactNode;
  }[];
  data: T[];
  searchField?: keyof T;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  searchField,
  isLoading = false,
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const itemsPerPage = 10;
  
  // Filter data based on search term
  const filteredData = searchField
    ? data.filter((item) => {
        const value = item[searchField];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      })
    : data;
  
  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });
  
  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Handle sorting
  const handleSort = (column: keyof T) => {
    if (!columns.find((col) => col.accessorKey === column)?.enableSorting) {
      return;
    }
    
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-64 h-10 bg-gray-200 animate-pulse rounded-md"></div>
        </div>
        <div className="border rounded-md">
          <div className="h-12 border-b bg-gray-100"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-b animate-pulse bg-gray-50"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {searchField && (
        <div className="flex items-center">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      )}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, i) => (
                <TableHead
                  key={i}
                  className={
                    typeof column.accessorKey === "string" && column.enableSorting
                      ? "cursor-pointer select-none"
                      : ""
                  }
                  onClick={() => {
                    if (typeof column.accessorKey === "string") {
                      handleSort(column.accessorKey);
                    }
                  }}
                >
                  <div className="flex items-center">
                    {column.header}
                    {typeof column.accessorKey === "string" &&
                      sortColumn === column.accessorKey && (
                        <span className="ml-1">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex}>
                      {column.cell
                        ? column.cell(row)
                        : typeof column.accessorKey === "function"
                        ? column.accessorKey(row)
                        : String(row[column.accessorKey] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(Math.max(1, currentPage - 1));
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Show first, last, current and 1 on each side of current
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              }
              
              // Show ellipsis for pages that are not shown
              if (
                (page === 2 && currentPage > 3) ||
                (page === totalPages - 1 && currentPage < totalPages - 2)
              ) {
                return (
                  <PaginationItem key={page}>
                    <span className="px-2">...</span>
                  </PaginationItem>
                );
              }
              
              return null;
            })}
            
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

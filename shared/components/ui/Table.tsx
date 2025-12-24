import React, { ReactNode } from 'react';

export const Table: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="min-w-full divide-y divide-border-color">{children}</table>
  </div>
);

export const TableHeader: React.FC<{ children: ReactNode }> = ({ children }) => (
  <thead className="bg-gray-50">
    <tr>{children}</tr>
  </thead>
);

export const TableHeaderCell: React.FC<{
  children: ReactNode;
  align?: 'left' | 'right';
  isAction?: boolean;
}> = ({ children, align = 'left', isAction = false }) => (
  <th
    className={`px-3 sm:px-6 py-2 sm:py-3 ${align === 'right' ? 'text-right' : 'text-left'} text-xs font-medium text-text-secondary uppercase tracking-wider ${isAction ? 'relative' : ''}`}
  >
    {children}
  </th>
);

export const TableBody: React.FC<{ children: ReactNode }> = ({ children }) => (
  <tbody className="bg-white divide-y divide-border-color">{children}</tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement> & { children: ReactNode }> = ({
  children,
  ...props
}) => <tr {...props}>{children}</tr>;

export const TableCell: React.FC<{ children: ReactNode; align?: 'left' | 'right' }> = ({
  children,
  align = 'left',
}) => (
  <td
    className={`px-3 sm:px-6 py-3 sm:py-4 whitespace-normal sm:whitespace-nowrap text-sm text-text-primary ${align === 'right' ? 'text-right' : 'text-left'}`}
  >
    {children}
  </td>
);

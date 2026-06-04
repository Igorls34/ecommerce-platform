import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProductsTable } from './ProductsTable';

const product = {
  id: 1,
  name: 'Anel Aurora',
  description: 'Banho dourado',
  price: 199.9,
  stock: 3,
  category: {
    name: 'Aneis',
  },
};

describe('ProductsTable', () => {
  it('mostra estado vazio quando nao ha produtos', () => {
    render(<ProductsTable products={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument();
  });

  it('renderiza controles de paginacao quando ha mais de uma pagina', () => {
    const onPageChange = vi.fn();

    render(
      <ProductsTable
        products={[product]}
        pagination={{
          currentPage: 2,
          pageSize: 10,
          totalItems: 21,
          totalPages: 3,
          onPageChange,
        }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('11-20 de 21 item(ns)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Anel Aurora' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

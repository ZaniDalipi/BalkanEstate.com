import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateImportPicker } from './CreateImportPicker';
import { sheetFileProblem } from './inventory/import/checkSheetFile';

const Harness = () => {
  const [file, setFile] = useState<File | null>(null);
  return <CreateImportPicker file={file} onChange={setFile} />;
};
const choose = (file: File) => fireEvent.change(screen.getByLabelText('wizard.importChoose'), { target: { files: [file] } });

describe('sheetFileProblem', () => {
  it('accepts .xlsx and .csv up to 10 MB, and says what is wrong otherwise', () => {
    expect(sheetFileProblem({ name: 'Units.XLSX', size: 1000 })).toBeNull();
    expect(sheetFileProblem({ name: 'units.csv', size: 1000 })).toBeNull();
    expect(sheetFileProblem({ name: 'units.xls', size: 1000 })).toBe('oldExcel');
    expect(sheetFileProblem({ name: 'plan.pdf', size: 1000 })).toBe('wrongType');
    expect(sheetFileProblem({ name: 'big.xlsx', size: 11 * 1024 * 1024 })).toBe('tooBig');
  });
});

describe('CreateImportPicker', () => {
  it('refuses a file it cannot read, with the reason, and keeps a good one until removed', () => {
    render(<Harness />);
    choose(new File(['%PDF'], 'plan.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('alert')).toHaveTextContent('import.error.wrongType');

    choose(new File(['Unit;Floor\nA1;1'], 'units.csv', { type: 'text/csv' }));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('units.csv')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'wizard.importRemove' }));
    expect(screen.queryByText('units.csv')).toBeNull();
  });
});

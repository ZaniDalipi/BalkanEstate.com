import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, userEvent, waitFor } from '@/src/tests/test-utils';
import type { UnitImportSummary } from '../../../../types';

vi.mock('../../../../api/developmentsApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, importUnits: vi.fn() };
});

import * as api from '../../../../api/developmentsApi';
import { ImportUnitsDialog } from './ImportUnitsDialog';

const summary = (over: Partial<UnitImportSummary> = {}): UnitImportSummary => ({
  rows: 3, buildingsCreated: [], floorsCreated: 2, unitsCreated: 3, unitsUpdated: 0, unchanged: 0, skippedExisting: 0, errors: [], dryRun: true, ...over,
});

const csv = 'Stan;Sprat;Kvadratura;Cijena;Status\n101;1;45,5;45.000 €;Slobodno\n102;1;52;;Prodato\n201;2;60;61.000;Rezervisano\n';

describe('ImportUnitsDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the file, previews with a dry run, then imports', async () => {
    vi.mocked(api.importUnits).mockImplementation(async (_id, body) => summary({ dryRun: body.dryRun }));
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ImportUnitsDialog developmentId="d1" defaultBuildingName="Object A" onClose={onClose} />);

    await user.upload(screen.getByLabelText(/import.drop/), new File([csv], 'units.csv', { type: 'text/csv' }));

    // Columns recognised and the building for all rows offered (no building column).
    expect(await screen.findByLabelText('import.buildingForAll')).toHaveValue('Object A');
    await waitFor(() => expect(api.importUnits).toHaveBeenCalledWith('d1', expect.objectContaining({ dryRun: true })));
    const sent = vi.mocked(api.importUnits).mock.calls[0][1];
    expect(sent.rows[0]).toMatchObject({ unitNumber: '101', building: 'Object A', level: 1, fields: { totalArea: 45.5, price: 45000, availability: 'available', currency: 'EUR' } });
    expect(sent.rows.map((r) => r.fields.availability)).toEqual(['available', 'sold', 'reserved']);

    const confirm = await screen.findByRole('button', { name: 'import.confirm' });
    await waitFor(() => expect(confirm).toBeEnabled()); // only once the dry run is back
    await user.click(confirm);
    await waitFor(() => expect(api.importUnits).toHaveBeenCalledWith('d1', expect.objectContaining({ dryRun: false })));
    expect(await screen.findByText('import.done')).toBeInTheDocument();
  });

  it('explains a file it cannot use', async () => {
    const user = userEvent.setup();
    render(<ImportUnitsDialog developmentId="d1" defaultBuildingName="" onClose={vi.fn()} />);
    await user.upload(screen.getByLabelText(/import.drop/), new File(['only a header'], 'x.csv', { type: 'text/csv' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('import.error.empty');
    expect(api.importUnits).not.toHaveBeenCalled();
  });
});

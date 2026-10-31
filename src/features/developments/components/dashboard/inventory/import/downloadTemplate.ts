import { buildTemplateCsv } from '../../../../utils/csvImport';

/** Save the fill-in template (with a BOM so Excel reads the letters correctly). */
export const downloadTemplate = (): void => {
  const url = URL.createObjectURL(new Blob(['﻿', buildTemplateCsv()], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'units-template.csv' });
  a.click();
  URL.revokeObjectURL(url);
};

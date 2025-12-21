import BankExport from '../models/BankExport';
import PaymentRecord from '../models/PaymentRecord';
import { SubscriptionStore } from '../models/Subscription';

/**
 * Bank Export Service
 * Handles exporting payment records to various formats for accounting
 */

interface ExportOptions {
  startDate: Date;
  endDate: Date;
  stores?: SubscriptionStore[];
  minAmount?: number;
  maxAmount?: number;
  format?: 'csv' | 'json' | 'xml' | 'quickbooks' | 'xero';
  processedBy?: string;
}

/**
 * Create a new bank export batch
 */
export async function createBankExport(options: ExportOptions): Promise<any> {
  const {
    startDate,
    endDate,
    stores,
    minAmount,
    maxAmount,
    format = 'csv',
    processedBy,
  } = options;

  try {
    // Build query for payment records
    const query: any = {
      transactionDate: {
        $gte: startDate,
        $lte: endDate,
      },
      status: 'completed',
      exported: false, // Only export records that haven't been exported yet
    };

    if (stores && stores.length > 0) {
      query.store = { $in: stores };
    }

    if (minAmount !== undefined) {
      query.amount = { ...query.amount, $gte: minAmount };
    }

    if (maxAmount !== undefined) {
      query.amount = { ...query.amount, $lte: maxAmount };
    }

    // Fetch payment records
    const paymentRecords = await PaymentRecord.find(query).sort({ transactionDate: 1 });

    if (paymentRecords.length === 0) {
      throw new Error('No payment records found for the specified criteria');
    }

    // Calculate totals
    const totalAmount = paymentRecords.reduce((sum, record) => sum + record.amount, 0);
    const currency = paymentRecords[0].currency; // Assume all same currency

    // Generate batch ID
    const batchId = `EXPORT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create export records
    const exportRecords = paymentRecords.map((payment) => ({
      paymentRecordId: payment._id,
      transactionId: payment.storeTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      transactionDate: payment.transactionDate,
    }));

    // Create bank export document
    const bankExport = await BankExport.create({
      batchId,
      exportDate: new Date(),
      startDate,
      endDate,
      status: 'pending',
      format,
      stores,
      minAmount,
      maxAmount,
      recordCount: paymentRecords.length,
      totalAmount,
      currency,
      records: exportRecords,
      processedBy,
    });

    console.log(`Created bank export batch: ${batchId} with ${paymentRecords.length} records`);

    // Generate the export file
    const fileContent = await generateExportFile(bankExport, format);

    // Update export with file info
    const fileName = `${batchId}.${format}`;
    bankExport.status = 'completed';
    bankExport.processedAt = new Date();
    bankExport.fileName = fileName;
    bankExport.fileSize = Buffer.byteLength(fileContent);

    // In production, upload to S3 or cloud storage
    // For now, we'll just save the file info
    // bankExport.fileUrl = await uploadToS3(fileName, fileContent);
    // bankExport.downloadUrl = await generateSignedUrl(bankExport.fileUrl);

    await bankExport.save();

    // Mark payment records as exported
    await PaymentRecord.updateMany(
      { _id: { $in: paymentRecords.map((r) => r._id) } },
      {
        $set: {
          exported: true,
          exportedAt: new Date(),
          exportBatchId: batchId,
        },
      }
    );

    console.log(`Bank export completed: ${batchId}`);

    return {
      batchId,
      recordCount: paymentRecords.length,
      totalAmount,
      currency,
      fileName,
      fileContent, // Return content for download
    };
  } catch (error: any) {
    console.error('Error creating bank export:', error);
    throw error;
  }
}

/**
 * Generate export file in the specified format
 */
async function generateExportFile(bankExport: any, format: string): Promise<string> {
  switch (format) {
    case 'csv':
      return generateCSV(bankExport);
    case 'json':
      return generateJSON(bankExport);
    case 'xml':
      return generateXML(bankExport);
    case 'quickbooks':
      return generateQuickBooks(bankExport);
    case 'xero':
      return generateXero(bankExport);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate CSV format
 */
function generateCSV(bankExport: any): string {
  const headers = ['Transaction ID', 'Date', 'Amount', 'Currency', 'Payment Record ID'];
  const rows = bankExport.records.map((record: any) => [
    record.transactionId,
    record.transactionDate.toISOString(),
    record.amount.toFixed(2),
    record.currency,
    record.paymentRecordId.toString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row: any[]) => row.join(',')),
    '',
    `Total Records,${bankExport.recordCount}`,
    `Total Amount,${bankExport.totalAmount.toFixed(2)}`,
    `Currency,${bankExport.currency}`,
    `Export Date,${bankExport.exportDate.toISOString()}`,
    `Batch ID,${bankExport.batchId}`,
  ].join('\n');

  return csv;
}

/**
 * Generate JSON format
 */
function generateJSON(bankExport: any): string {
  const json = {
    batchId: bankExport.batchId,
    exportDate: bankExport.exportDate,
    startDate: bankExport.startDate,
    endDate: bankExport.endDate,
    recordCount: bankExport.recordCount,
    totalAmount: bankExport.totalAmount,
    currency: bankExport.currency,
    transactions: bankExport.records.map((record: any) => ({
      transactionId: record.transactionId,
      date: record.transactionDate,
      amount: record.amount,
      currency: record.currency,
      paymentRecordId: record.paymentRecordId,
    })),
  };

  return JSON.stringify(json, null, 2);
}

/**
 * Generate XML format
 */
function generateXML(bankExport: any): string {
  const transactions = bankExport.records
    .map(
      (record: any) => `
    <Transaction>
      <TransactionId>${record.transactionId}</TransactionId>
      <Date>${record.transactionDate.toISOString()}</Date>
      <Amount>${record.amount.toFixed(2)}</Amount>
      <Currency>${record.currency}</Currency>
      <PaymentRecordId>${record.paymentRecordId}</PaymentRecordId>
    </Transaction>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BankExport>
  <BatchId>${bankExport.batchId}</BatchId>
  <ExportDate>${bankExport.exportDate.toISOString()}</ExportDate>
  <StartDate>${bankExport.startDate.toISOString()}</StartDate>
  <EndDate>${bankExport.endDate.toISOString()}</EndDate>
  <RecordCount>${bankExport.recordCount}</RecordCount>
  <TotalAmount>${bankExport.totalAmount.toFixed(2)}</TotalAmount>
  <Currency>${bankExport.currency}</Currency>
  <Transactions>${transactions}
  </Transactions>
</BankExport>`;

  return xml;
}

/**
 * Generate QuickBooks IIF format
 */
function generateQuickBooks(bankExport: any): string {
  // QuickBooks IIF format
  const lines = [
    '!TRNS\tTRNSID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO',
    '!SPL\tSPLID\tTRNSTYPE\tDATE\tACCNT\tAMOUNT\tMEMO',
    '!ENDTRNS',
  ];

  bankExport.records.forEach((record: any, index: number) => {
    lines.push(
      `TRNS\t${index + 1}\tDEPOSIT\t${record.transactionDate.toLocaleDateString()}\tBank Account\t${record.amount.toFixed(2)}\t${record.transactionId}`
    );
    lines.push(
      `SPL\t${index + 1}\tDEPOSIT\t${record.transactionDate.toLocaleDateString()}\tSales Income\t-${record.amount.toFixed(2)}\t${record.transactionId}`
    );
    lines.push('ENDTRNS');
  });

  return lines.join('\n');
}

/**
 * Generate Xero CSV format
 */
function generateXero(bankExport: any): string {
  const headers = [
    '*ContactName',
    '*InvoiceNumber',
    '*InvoiceDate',
    '*DueDate',
    'Total',
    'TaxAmount',
    '*Description',
    '*Quantity',
    '*UnitAmount',
    '*AccountCode',
    '*TaxType',
  ];

  const rows = bankExport.records.map((record: any) => [
    'Subscription Revenue',
    record.transactionId,
    record.transactionDate.toISOString().split('T')[0],
    record.transactionDate.toISOString().split('T')[0],
    record.amount.toFixed(2),
    '0.00',
    'Subscription Payment',
    '1',
    record.amount.toFixed(2),
    '200', // Revenue account code
    'Tax Exempt',
  ]);

  const csv = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');

  return csv;
}

/**
 * Get export history
 */
export async function getExportHistory(options?: {
  limit?: number;
  skip?: number;
  status?: string;
}): Promise<any[]> {
  const { limit = 50, skip = 0, status } = options || {};

  const query: any = {};
  if (status) {
    query.status = status;
  }

  const exports = await BankExport.find(query)
    .sort({ exportDate: -1 })
    .limit(limit)
    .skip(skip);

  return exports;
}

/**
 * Get a specific export by batch ID
 */
export async function getExportByBatchId(batchId: string): Promise<any> {
  const bankExport = await BankExport.findOne({ batchId });

  if (!bankExport) {
    throw new Error(`Export not found: ${batchId}`);
  }

  return bankExport;
}

export default {
  createBankExport,
  getExportHistory,
  getExportByBatchId,
};

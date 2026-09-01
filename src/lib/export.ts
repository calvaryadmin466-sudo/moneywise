import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Transaction, Budget, Goal, Debt, Asset, Currency, formatCurrency as formatCurrencyFn, CATEGORIES } from './finance';

type FormatCurrencyFn = typeof formatCurrencyFn;

const HEADER_STYLES = {
  fillColor: [15, 23, 42] as [number, number, number],
  textColor: 255,
  fontStyle: 'bold' as const,
  fontSize: 10,
};

function formatISODate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export interface ExportContext {
  transactions: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  debts?: Debt[];
  assets?: Asset[];
  selectedMonth: string;
  currency: Currency;
  formatCurrency: FormatCurrencyFn;
  categories: typeof CATEGORIES;
}

export function exportTransactionsCSV(transactions: Transaction[], currency: Currency, formatCurrency: FormatCurrencyFn, filename: string = 'transactions') {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Formatted Amount', 'Note', 'Recurring', 'Income Source'];
  const rows = transactions.map((t) => [
    t.date,
    t.type,
    t.category,
    String(t.amount),
    formatCurrency(Number(t.amount), currency),
    t.note || '',
    t.is_recurring ? 'Yes' : 'No',
    t.income_source || '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportFinancialPDF(ctx: ExportContext) {
  const { transactions, budgets = [], goals = [], debts = [], assets = [], selectedMonth, currency, formatCurrency, categories } = ctx;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let yCursor = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MoneyWise Financial Report', pageWidth / 2, yCursor, { align: 'center' });
  yCursor += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const [year, month] = selectedMonth.split('-');
  doc.text(`Reporting period: ${month}/${year}   Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yCursor, { align: 'center' });
  yCursor += 20;

  const filtered = transactions.filter((t) => t.date.startsWith(selectedMonth));
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpenses;

  const summaryHeaders = [['Metric', 'Amount']];
  const summaryRows = [
    ['Total Income', formatCurrency(totalIncome, currency)],
    ['Total Expenses', formatCurrency(totalExpenses, currency)],
    ['Net Balance', formatCurrency(netBalance, currency)],
    ['Transaction count', String(filtered.length)],
    ['Budget categories', String(budgets.filter((b) => (b as any).month === selectedMonth || (b as any).period_key === selectedMonth).length)],
    ['Active goals', String(goals.length)],
    ['Open debts', String(debts.filter((d) => !d.is_paid).length)],
  ];

  autoTable(doc, {
    startY: yCursor,
    head: summaryHeaders,
    body: summaryRows,
    theme: 'grid',
    headStyles: HEADER_STYLES,
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
    tableWidth: 'wrap',
  });

  yCursor = (doc as any).lastAutoTable.finalY + 30;

  const spendingMap: Record<string, number> = {};
  filtered
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      spendingMap[t.category] = (spendingMap[t.category] || 0) + Number(t.amount);
    });

  const totalSpent = Object.values(spendingMap).reduce((a, b) => a + b, 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Spending Breakdown by Category', margin, yCursor);
  yCursor += 16;

  const catHeaders = [['Category', 'Amount', '% of Total']];
  const catRows = Object.entries(spendingMap)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => [
      cat,
      formatCurrency(amt, currency),
      totalSpent > 0 ? `${((amt / totalSpent) * 100).toFixed(1)}%` : '0%',
    ]);

  if (catRows.length === 0) {
    catRows.push(['No expenses recorded', '-', '-']);
  }

  autoTable(doc, {
    startY: yCursor,
    head: catHeaders,
    body: catRows,
    theme: 'striped',
    headStyles: HEADER_STYLES,
    styles: { fontSize: 10, cellPadding: 6 },
    margin: { left: margin, right: margin },
  });

  yCursor = (doc as any).lastAutoTable.finalY + 30;

  const needNewPage = yCursor > 720;
  if (needNewPage) {
    doc.addPage();
    yCursor = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Transaction Register', margin, yCursor);
  yCursor += 16;

  const txHeaders = [['Date', 'Type', 'Category', 'Amount', 'Note']];
  const txRows = filtered
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [
      formatISODate(t.date),
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      t.category,
      formatCurrency(Number(t.amount), currency),
      (t.note || '').slice(0, 60),
    ]);

  autoTable(doc, {
    startY: yCursor,
    head: txHeaders,
    body: txRows.length > 0 ? txRows : [['-', '-', 'No transactions', '-', '-']],
    theme: 'striped',
    headStyles: HEADER_STYLES,
    styles: { fontSize: 9, cellPadding: 5 },
    margin: { left: margin, right: margin },
  });

  const [yFinal, mFinal] = selectedMonth.split('-');
  doc.save(`moneywise-report-${mFinal}-${yFinal}.pdf`);
}

export function exportWorkbook(ctx: ExportContext) {
  const { transactions, budgets = [], goals = [], debts = [], assets = [], selectedMonth, currency, formatCurrency } = ctx;
  const wb = XLSX.utils.book_new();
  const filtered = transactions.filter((t) => t.date.startsWith(selectedMonth));

  const txData = filtered.map((t) => ({
    Date: t.date,
    Type: t.type,
    Category: t.category,
    Amount: Number(t.amount),
    'Formatted Amount': formatCurrency(Number(t.amount), currency),
    Note: t.note || '',
    Recurring: t.is_recurring ? 'Yes' : 'No',
    'Income Source': t.income_source || '',
    'Linked Asset': t.asset_id || '',
  }));
  const txSheet = XLSX.utils.json_to_sheet(txData.length > 0 ? txData : [{ Date: '', Type: '', Category: '', Amount: 0, 'Formatted Amount': '', Note: '', Recurring: '', 'Income Source': '', 'Linked Asset': '' }]);
  XLSX.utils.book_append_sheet(wb, txSheet, 'Transactions');

  const spendingMap: Record<string, number> = {};
  const incomeMap: Record<string, number> = {};
  filtered.forEach((t) => {
    if (t.type === 'expense') spendingMap[t.category] = (spendingMap[t.category] || 0) + Number(t.amount);
    else incomeMap[t.category] = (incomeMap[t.category] || 0) + Number(t.amount);
  });
  const totalExp = Object.values(spendingMap).reduce((a, b) => a + b, 0);
  const totalInc = Object.values(incomeMap).reduce((a, b) => a + b, 0);

  const summaryData = [
    { Metric: 'Total Income', Value: formatCurrency(totalInc, currency), Numeric: totalInc },
    { Metric: 'Total Expenses', Value: formatCurrency(totalExp, currency), Numeric: totalExp },
    { Metric: 'Net Balance', Value: formatCurrency(totalInc - totalExp, currency), Numeric: totalInc - totalExp },
    { Metric: 'Transactions', Value: String(filtered.length), Numeric: filtered.length },
  ];
  const sumSheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, sumSheet, 'Summary');

  const pivotData = Object.entries(spendingMap)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => ({
      Category: cat,
      Spent: Number(amt),
      'Spent (formatted)': formatCurrency(amt, currency),
      'Share %': totalExp > 0 ? Number(((amt / totalExp) * 100).toFixed(2)) : 0,
      'Budget Limit': '-',
      'Remaining': '-',
    }));
  budgets
    .filter((b) => (b as any).month === selectedMonth || (b as any).period_key === selectedMonth)
    .forEach((b) => {
      const row = pivotData.find((r) => r.Category === b.category);
      if (row) {
        row['Budget Limit'] = formatCurrency(Number(b.monthly_limit), currency);
        row['Remaining'] = formatCurrency(Math.max(0, Number(b.monthly_limit) - row.Spent), currency);
      }
    });
  const pivotSheet = XLSX.utils.json_to_sheet(pivotData.length > 0 ? pivotData : [{ Category: '', Spent: 0, 'Spent (formatted)': '', 'Share %': 0, 'Budget Limit': '', 'Remaining': '' }]);
  XLSX.utils.book_append_sheet(wb, pivotSheet, 'Category Pivot');

  if (goals.length > 0) {
    const goalsData = goals.map((g) => ({
      Goal: g.name,
      Target: formatCurrency(Number(g.target_amount), currency),
      Saved: formatCurrency(Number(g.saved_amount), currency),
      Progress: Number(g.target_amount) > 0 ? `${((Number(g.saved_amount) / Number(g.target_amount)) * 100).toFixed(1)}%` : '0%',
      Deadline: g.deadline || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(goalsData), 'Goals');
  }

  if (debts.length > 0) {
    const debtsData = debts.map((d) => ({
      Name: d.name,
      Direction: d.direction === 'i_owe' ? 'I owe' : 'Owed to me',
      Amount: formatCurrency(Number(d.amount), currency),
      Paid: d.is_paid ? 'Yes' : 'No',
      'Due date': d.due_date || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtsData), 'Debts');
  }

  if (assets.length > 0) {
    const assetsData = assets.map((a) => ({
      Name: a.name,
      Type: a.type,
      Balance: formatCurrency(Number(a.balance), currency),
      Currency: a.currency,
      Institution: (a as any).bank_name || (a as any).broker_name || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(assetsData), 'Assets');
  }

  const [y, m] = selectedMonth.split('-');
  XLSX.writeFile(wb, `moneywise-workbook-${m}-${y}.xlsx`);
}

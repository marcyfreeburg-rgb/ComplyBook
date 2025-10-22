import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FileText, Download, ArrowUpRight, ArrowDownRight, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { Organization, Transaction, Category } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface ReportsProps {
  currentOrganization: Organization;
}

interface ProfitLossData {
  totalIncome: string;
  totalExpenses: string;
  netIncome: string;
  incomeByCategory: Array<{ categoryName: string; amount: string }>;
  expensesByCategory: Array<{ categoryName: string; amount: string }>;
}

interface BalanceSheetData {
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  assetsByCategory: Array<{ categoryName: string; amount: string }>;
  liabilitiesByCategory: Array<{ categoryName: string; amount: string }>;
  equityByCategory: Array<{ categoryName: string; amount: string }>;
}

export default function Reports({ currentOrganization }: ReportsProps) {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<'profit-loss' | 'balance-sheet' | 'transactions'>('profit-loss');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // CSV Export Functions
  const exportProfitLossCSV = () => {
    if (!profitLoss) return;
    
    const rows = [
      ['Profit & Loss Statement'],
      [`${currentOrganization.name}`],
      [`Period: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`],
      [''],
      ['Income'],
      ['Category', 'Amount'],
      ...profitLoss.incomeByCategory.map(item => [item.categoryName || 'Uncategorized', item.amount]),
      ['Total Income', profitLoss.totalIncome],
      [''],
      ['Expenses'],
      ['Category', 'Amount'],
      ...profitLoss.expensesByCategory.map(item => [item.categoryName || 'Uncategorized', item.amount]),
      ['Total Expenses', profitLoss.totalExpenses],
      [''],
      ['Net Income', profitLoss.netIncome]
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `profit-loss-${startDate}-to-${endDate}.csv`);
  };

  const exportBalanceSheetCSV = () => {
    if (!balanceSheet) return;
    
    const rows = [
      ['Balance Sheet'],
      [`${currentOrganization.name}`],
      [`As of ${format(new Date(endDate), 'MMM dd, yyyy')}`],
      [''],
      ['Assets'],
      ['Category', 'Amount'],
      ...balanceSheet.assetsByCategory.map(item => [item.categoryName, item.amount]),
      ['Total Assets', balanceSheet.totalAssets],
      [''],
      ['Liabilities'],
      ['Category', 'Amount'],
      ...balanceSheet.liabilitiesByCategory.map(item => [item.categoryName, item.amount]),
      ['Total Liabilities', balanceSheet.totalLiabilities],
      [''],
      ['Equity'],
      ['Category', 'Amount'],
      ...balanceSheet.equityByCategory.map(item => [item.categoryName, item.amount]),
      ['Total Equity', balanceSheet.totalEquity]
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `balance-sheet-${endDate}.csv`);
  };

  const exportTransactionsCSV = () => {
    if (!transactions || transactions.length === 0) return;
    
    const filteredTrans = transactions.filter(t => {
      const typeMatch = filterType === 'all' || t.type === filterType;
      const catMatch = filterCategory === 'all' || t.categoryId?.toString() === filterCategory;
      return typeMatch && catMatch;
    });

    const rows = [
      ['Transaction History'],
      [`${currentOrganization.name}`],
      [`Period: ${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`],
      [''],
      ['Date', 'Description', 'Type', 'Category', 'Amount'],
      ...filteredTrans.map(t => {
        const category = categories?.find(c => c.id === t.categoryId);
        return [
          format(new Date(t.date), 'MM/dd/yyyy'),
          t.description,
          t.type,
          category?.name || 'Uncategorized',
          t.amount
        ];
      })
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    downloadCSV(csv, `transactions-${startDate}-to-${endDate}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Successful",
      description: `Report exported as ${filename}`,
    });
  };

  // PDF Export Functions
  const exportProfitLossPDF = () => {
    if (!profitLoss) return;
    
    const content = generateProfitLossPDFContent();
    downloadPDF(content, `profit-loss-${startDate}-to-${endDate}.pdf`);
  };

  const exportBalanceSheetPDF = () => {
    if (!balanceSheet) return;
    
    const content = generateBalanceSheetPDFContent();
    downloadPDF(content, `balance-sheet-${endDate}.pdf`);
  };

  const exportTransactionsPDF = () => {
    if (!transactions || transactions.length === 0) return;
    
    const content = generateTransactionsPDFContent();
    downloadPDF(content, `transactions-${startDate}-to-${endDate}.pdf`);
  };

  const generateProfitLossPDFContent = () => {
    if (!profitLoss) return '';
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
            h2 { color: #666; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .org-name { color: #666; font-size: 14px; }
            .date-range { color: #888; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; padding: 8px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: monospace; }
            .total { font-weight: bold; border-top: 2px solid #333; }
            .net-income { background-color: #f0f0f0; font-size: 18px; font-weight: bold; padding: 15px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Profit & Loss Statement</h1>
            <div class="org-name">${currentOrganization.name}</div>
            <div class="date-range">${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}</div>
          </div>
          
          <h2>Income</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${profitLoss.incomeByCategory.map(item => `
                <tr>
                  <td>${item.categoryName || 'Uncategorized'}</td>
                  <td class="amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total Income</td>
                <td class="amount">$${parseFloat(profitLoss.totalIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <h2>Expenses</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${profitLoss.expensesByCategory.map(item => `
                <tr>
                  <td>${item.categoryName || 'Uncategorized'}</td>
                  <td class="amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total Expenses</td>
                <td class="amount">$${parseFloat(profitLoss.totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="net-income">
            <table>
              <tr>
                <td>Net Income</td>
                <td class="amount">$${parseFloat(profitLoss.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;
    return html;
  };

  const generateBalanceSheetPDFContent = () => {
    if (!balanceSheet) return '';
    
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
            h2 { color: #666; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .org-name { color: #666; font-size: 14px; }
            .date-range { color: #888; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; padding: 8px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; }
            td { padding: 8px; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: monospace; }
            .total { font-weight: bold; border-top: 2px solid #333; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Balance Sheet</h1>
            <div class="org-name">${currentOrganization.name}</div>
            <div class="date-range">As of ${format(new Date(endDate), 'MMM dd, yyyy')}</div>
          </div>
          
          <h2>Assets</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${balanceSheet.assetsByCategory.map(item => `
                <tr>
                  <td>${item.categoryName}</td>
                  <td class="amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total Assets</td>
                <td class="amount">$${parseFloat(balanceSheet.totalAssets).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <h2>Liabilities</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${balanceSheet.liabilitiesByCategory.map(item => `
                <tr>
                  <td>${item.categoryName}</td>
                  <td class="amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total Liabilities</td>
                <td class="amount">$${parseFloat(balanceSheet.totalLiabilities).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
          
          <h2>Equity</h2>
          <table>
            <thead>
              <tr><th>Category</th><th class="amount">Amount</th></tr>
            </thead>
            <tbody>
              ${balanceSheet.equityByCategory.map(item => `
                <tr>
                  <td>${item.categoryName}</td>
                  <td class="amount">$${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total Equity</td>
                <td class="amount">$${parseFloat(balanceSheet.totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;
    return html;
  };

  const generateTransactionsPDFContent = () => {
    if (!transactions || transactions.length === 0) return '';
    
    const filteredTrans = transactions.filter(t => {
      const typeMatch = filterType === 'all' || t.type === filterType;
      const catMatch = filterCategory === 'all' || t.categoryId?.toString() === filterCategory;
      return typeMatch && catMatch;
    });

    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; font-size: 24px; margin-bottom: 10px; }
            .header { margin-bottom: 30px; }
            .org-name { color: #666; font-size: 14px; }
            .date-range { color: #888; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { text-align: left; padding: 6px; background-color: #f5f5f5; border-bottom: 2px solid #ddd; }
            td { padding: 6px; border-bottom: 1px solid #eee; }
            .amount { text-align: right; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Transaction History</h1>
            <div class="org-name">${currentOrganization.name}</div>
            <div class="date-range">${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Category</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTrans.map(t => {
                const category = categories?.find(c => c.id === t.categoryId);
                return `
                  <tr>
                    <td>${format(new Date(t.date), 'MM/dd/yyyy')}</td>
                    <td>${t.description}</td>
                    <td>${t.type}</td>
                    <td>${category?.name || 'Uncategorized'}</td>
                    <td class="amount">$${parseFloat(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    return html;
  };

  const downloadPDF = (htmlContent: string, filename: string) => {
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      toast({
        title: "PDF Ready",
        description: "Use the print dialog to save as PDF",
      });
    }
  };

  const { data: profitLoss, isLoading, error } = useQuery<ProfitLossData>({
    queryKey: [`/api/reports/profit-loss/${currentOrganization.id}?startDate=${startDate}&endDate=${endDate}`],
    retry: false,
    enabled: reportType === 'profit-loss',
  });

  const { data: balanceSheet, isLoading: balanceSheetLoading } = useQuery<BalanceSheetData>({
    queryKey: [`/api/reports/balance-sheet/${currentOrganization.id}?asOfDate=${endDate}`],
    retry: false,
    enabled: reportType === 'balance-sheet',
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`/api/reports/transactions/${currentOrganization.id}?startDate=${startDate}&endDate=${endDate}`],
    retry: false,
    enabled: reportType === 'transactions',
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: [`/api/categories/${currentOrganization.id}`],
    enabled: reportType === 'transactions',
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  const setDateRange = (range: 'this-month' | 'last-month' | 'this-year') => {
    const now = new Date();
    switch (range) {
      case 'this-month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'this-year':
        setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
        setEndDate(format(new Date(now.getFullYear(), 11, 31), 'yyyy-MM-dd'));
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentOrganization.name}
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" size="sm" data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Settings</CardTitle>
          <CardDescription>
            Choose your report type and date range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Report Type</Label>
              <Select
                value={reportType}
                onValueChange={(value: 'profit-loss' | 'balance-sheet' | 'transactions') => setReportType(value)}
              >
                <SelectTrigger id="reportType" data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="profit-loss">Profit & Loss Statement</SelectItem>
                  <SelectItem value="balance-sheet">Balance Sheet</SelectItem>
                  <SelectItem value="transactions">Transaction History</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quick Ranges</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange('this-month')}
                  data-testid="button-this-month"
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange('last-month')}
                  data-testid="button-last-month"
                >
                  Last Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange('this-year')}
                  data-testid="button-this-year"
                >
                  This Year
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                data-testid="input-start-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="input-end-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profit & Loss Report */}
      {reportType === 'profit-loss' && (
        <>
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : profitLoss ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Profit & Loss Statement</CardTitle>
                    <CardDescription className="mt-2">
                      {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportProfitLossCSV} data-testid="button-export-pl-csv">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportProfitLossPDF} data-testid="button-export-pl-pdf">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Income Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Income</h3>
                  {profitLoss.incomeByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No income recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {profitLoss.incomeByCategory.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                          <span className="text-sm text-foreground">{item.categoryName || 'Uncategorized'}</span>
                          <span className="text-sm font-mono font-medium text-foreground">
                            ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-base font-semibold text-foreground">Total Income</span>
                        <span className="text-base font-mono font-semibold text-chart-2">
                          ${parseFloat(profitLoss.totalIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Expenses Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Expenses</h3>
                  {profitLoss.expensesByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No expenses recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {profitLoss.expensesByCategory.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                          <span className="text-sm text-foreground">{item.categoryName || 'Uncategorized'}</span>
                          <span className="text-sm font-mono font-medium text-foreground">
                            ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-base font-semibold text-foreground">Total Expenses</span>
                        <span className="text-base font-mono font-semibold text-chart-3">
                          ${parseFloat(profitLoss.totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="border-t-2" />

                {/* Net Income */}
                <div className="flex justify-between py-3 bg-muted/50 px-4 rounded-md">
                  <span className="text-xl font-semibold text-foreground">Net Income</span>
                  <span className={`text-xl font-mono font-semibold ${
                    parseFloat(profitLoss.netIncome) >= 0 ? 'text-chart-2' : 'text-chart-3'
                  }`} data-testid="text-net-income-report">
                    ${parseFloat(profitLoss.netIncome).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No data available for this period</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Balance Sheet Report */}
      {reportType === 'balance-sheet' && (
        <>
          {balanceSheetLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : balanceSheet ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Balance Sheet</CardTitle>
                    <CardDescription className="mt-2">
                      As of {format(new Date(endDate), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportBalanceSheetCSV} data-testid="button-export-bs-csv">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportBalanceSheetPDF} data-testid="button-export-bs-pdf">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assets Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Assets</h3>
                  {balanceSheet.assetsByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No assets recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceSheet.assetsByCategory.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                          <span className="text-sm text-foreground">{item.categoryName}</span>
                          <span className="text-sm font-mono font-medium text-foreground">
                            ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-base font-semibold text-foreground">Total Assets</span>
                        <span className="text-base font-mono font-semibold text-chart-2" data-testid="text-total-assets">
                          ${parseFloat(balanceSheet.totalAssets).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Liabilities Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Liabilities</h3>
                  {balanceSheet.liabilitiesByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No liabilities recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceSheet.liabilitiesByCategory.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                          <span className="text-sm text-foreground">{item.categoryName}</span>
                          <span className="text-sm font-mono font-medium text-foreground">
                            ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-base font-semibold text-foreground">Total Liabilities</span>
                        <span className="text-base font-mono font-semibold text-chart-3" data-testid="text-total-liabilities">
                          ${parseFloat(balanceSheet.totalLiabilities).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Equity Section */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Equity</h3>
                  {balanceSheet.equityByCategory.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No equity recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceSheet.equityByCategory.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-2">
                          <span className="text-sm text-foreground">{item.categoryName}</span>
                          <span className="text-sm font-mono font-medium text-foreground">
                            ${parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between py-2">
                        <span className="text-base font-semibold text-foreground">Total Equity</span>
                        <span className="text-base font-mono font-semibold text-chart-2" data-testid="text-total-equity">
                          ${parseFloat(balanceSheet.totalEquity).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator className="border-t-2" />

                {/* Accounting Equation Validation */}
                <div className="bg-muted/50 px-4 py-3 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Assets</span>
                    <span className="text-sm font-mono text-foreground">
                      ${parseFloat(balanceSheet.totalAssets).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Liabilities + Equity</span>
                    <span className="text-sm font-mono text-foreground">
                      ${(parseFloat(balanceSheet.totalLiabilities) + parseFloat(balanceSheet.totalEquity)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-foreground">Balance</span>
                    <span className={`text-base font-mono font-semibold ${
                      Math.abs(parseFloat(balanceSheet.totalAssets) - (parseFloat(balanceSheet.totalLiabilities) + parseFloat(balanceSheet.totalEquity))) < 0.01
                        ? 'text-chart-2'
                        : 'text-chart-3'
                    }`} data-testid="text-balance-check">
                      {Math.abs(parseFloat(balanceSheet.totalAssets) - (parseFloat(balanceSheet.totalLiabilities) + parseFloat(balanceSheet.totalEquity))) < 0.01
                        ? 'Balanced ✓'
                        : `Out of balance by $${Math.abs(parseFloat(balanceSheet.totalAssets) - (parseFloat(balanceSheet.totalLiabilities) + parseFloat(balanceSheet.totalEquity))).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No data available for this date</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Transaction History Report */}
      {reportType === 'transactions' && (
        <>
          {transactionsLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Loading transactions...</p>
                </div>
              </CardContent>
            </Card>
          ) : transactions && transactions.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">Transaction History</CardTitle>
                    <CardDescription className="mt-2">
                      {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportTransactionsCSV} data-testid="button-export-txn-csv">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportTransactionsPDF} data-testid="button-export-txn-pdf">
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-40" data-testid="select-filter-type">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income Only</SelectItem>
                      <SelectItem value="expense">Expense Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48" data-testid="select-filter-category">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactions
                    .filter((t) => filterType === 'all' || t.type === filterType)
                    .filter((t) => filterCategory === 'all' || (t.categoryId && t.categoryId.toString() === filterCategory))
                    .map((transaction) => {
                      const category = categories?.find((c) => c.id === transaction.categoryId);
                      return (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                          data-testid={`transaction-history-${transaction.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                              transaction.type === 'income' ? 'bg-chart-2/10' : 'bg-chart-3/10'
                            }`}>
                              {transaction.type === 'income' ? (
                                <ArrowUpRight className="h-4 w-4 text-chart-2" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-chart-3" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {transaction.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                                </p>
                                {category && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <p className="text-xs text-muted-foreground">{category.name}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className={`text-base font-mono font-medium ${
                            transaction.type === 'income' ? 'text-chart-2' : 'text-chart-3'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            ${parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No transactions for this period</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Coming Soon Messages */}
      {reportType === 'balance-sheet' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                This report type will be available in a future update
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

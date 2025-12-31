import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  ExternalLink,
  ArrowRight,
  Info,
  Loader2,
  FileText
} from "lucide-react";
import { SiQuickbooks } from "react-icons/si";
import type { Organization, Category } from "@shared/schema";

interface AccountingImportsProps {
  organizationId: number;
}

interface ImportResult {
  message: string;
  created: number;
  skipped: number;
  errors: number;
  createdTransactions?: any[];
  skippedDetails?: string[];
  errorDetails?: string[];
}

export default function AccountingImports({ organizationId }: AccountingImportsProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState<'quickbooks' | 'xero'>('quickbooks');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: organization } = useQuery<Organization>({
    queryKey: ['/api/organizations', organizationId],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories', organizationId],
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/transactions/import-accounting/${organizationId}?source=${importSource}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setSelectedFile(null);
      // Invalidate both query key formats to ensure cache is refreshed
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${organizationId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', organizationId] });
      toast({
        title: "Import Complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    importMutation.mutate(formData);
  };

  const downloadTemplate = (source: 'quickbooks' | 'xero') => {
    let csvContent = '';
    let filename = '';
    
    if (source === 'quickbooks') {
      csvContent = `Date,Transaction Type,Num,Name,Memo/Description,Account,Split,Debit,Credit
01/15/2024,Check,1001,Office Depot,Office supplies,Checking,Office Supplies,125.50,
01/16/2024,Deposit,,Client ABC,Invoice payment,Checking,Accounts Receivable,,2500.00
01/18/2024,Bill,INV-456,Acme Supplies,Monthly supplies,Accounts Payable,Supplies,350.00,
01/20/2024,Payment,1002,Acme Supplies,Bill payment,Checking,Accounts Payable,350.00,`;
      filename = 'quickbooks_import_template.csv';
    } else {
      csvContent = `*Date,*Amount,Payee,Description,Reference,Account Code,Tax Rate
2024-01-15,-125.50,Office Depot,Office supplies,CHK-1001,200,No Tax
2024-01-16,2500.00,Client ABC,Invoice payment,DEP-001,090,No Tax
2024-01-18,-350.00,Acme Supplies,Monthly supplies,BILL-456,300,No Tax
2024-01-20,-350.00,Acme Supplies,Bill payment,CHK-1002,200,No Tax`;
      filename = 'xero_import_template.csv';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Import from Accounting Software</h1>
        <p className="text-muted-foreground mt-2">
          Import transactions from QuickBooks or Xero into {organization?.name || 'your organization'}
        </p>
      </div>

      <Tabs value={importSource} onValueChange={(v) => {
        setImportSource(v as 'quickbooks' | 'xero');
        setSelectedFile(null);
        setImportResult(null);
      }}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="quickbooks" className="flex items-center gap-2" data-testid="tab-quickbooks">
            <SiQuickbooks className="h-4 w-4" />
            QuickBooks
          </TabsTrigger>
          <TabsTrigger value="xero" className="flex items-center gap-2" data-testid="tab-xero">
            <FileSpreadsheet className="h-4 w-4" />
            Xero
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quickbooks" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SiQuickbooks className="h-5 w-5 text-green-600" />
                  QuickBooks Export Instructions
                </CardTitle>
                <CardDescription>
                  Follow these steps to export your data from QuickBooks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">1</Badge>
                    <div>
                      <p className="font-medium">Open QuickBooks Desktop or Online</p>
                      <p className="text-sm text-muted-foreground">Log in to your QuickBooks account</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                    <div>
                      <p className="font-medium">Go to Reports</p>
                      <p className="text-sm text-muted-foreground">
                        Navigate to Reports → Accountant & Taxes → Transaction Detail by Account
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                    <div>
                      <p className="font-medium">Set Date Range</p>
                      <p className="text-sm text-muted-foreground">
                        Select the date range you want to import
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">4</Badge>
                    <div>
                      <p className="font-medium">Export to Excel/CSV</p>
                      <p className="text-sm text-muted-foreground">
                        Click Export → Export to Excel, then save as CSV
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Supported Formats</AlertTitle>
                  <AlertDescription>
                    We support QuickBooks Transaction Detail, General Ledger, and Check Detail reports exported as CSV.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => downloadTemplate('quickbooks')}
                  data-testid="button-download-qb-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload QuickBooks Export
                </CardTitle>
                <CardDescription>
                  Upload your QuickBooks CSV export file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer transition-colors"
                  onClick={() => document.getElementById('qb-file-input')?.click()}
                  data-testid="dropzone-quickbooks"
                >
                  <input
                    id="qb-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-qb-file"
                  />
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Click to upload</p>
                      <p className="text-sm text-muted-foreground">
                        CSV files only (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full"
                  disabled={!selectedFile || importMutation.isPending}
                  onClick={handleImport}
                  data-testid="button-import-qb"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Transactions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="xero" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  Xero Export Instructions
                </CardTitle>
                <CardDescription>
                  Follow these steps to export your data from Xero
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">1</Badge>
                    <div>
                      <p className="font-medium">Log in to Xero</p>
                      <p className="text-sm text-muted-foreground">Access your Xero organization dashboard</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                    <div>
                      <p className="font-medium">Go to Accounting → Reports</p>
                      <p className="text-sm text-muted-foreground">
                        Select Account Transactions or General Ledger
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                    <div>
                      <p className="font-medium">Set Date Range</p>
                      <p className="text-sm text-muted-foreground">
                        Choose the period you want to export
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">4</Badge>
                    <div>
                      <p className="font-medium">Export to CSV</p>
                      <p className="text-sm text-muted-foreground">
                        Click Export → CSV to download the file
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Supported Formats</AlertTitle>
                  <AlertDescription>
                    We support Xero Bank Statement, Account Transactions, and General Ledger exports in CSV format.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => downloadTemplate('xero')}
                  data-testid="button-download-xero-template"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Xero Export
                </CardTitle>
                <CardDescription>
                  Upload your Xero CSV export file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer transition-colors"
                  onClick={() => document.getElementById('xero-file-input')?.click()}
                  data-testid="dropzone-xero"
                >
                  <input
                    id="xero-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-xero-file"
                  />
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  {selectedFile ? (
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">Click to upload</p>
                      <p className="text-sm text-muted-foreground">
                        CSV files only (max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full"
                  disabled={!selectedFile || importMutation.isPending}
                  onClick={handleImport}
                  data-testid="button-import-xero"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Transactions
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.errors === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-2xl font-bold text-green-600" data-testid="text-imported-count">{importResult.created}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-skipped-count">{importResult.skipped}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                <p className="text-2xl font-bold text-red-600" data-testid="text-error-count">{importResult.errors}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            {importResult.skippedDetails && importResult.skippedDetails.length > 0 && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Skipped Transactions</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    {importResult.skippedDetails.slice(0, 5).map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                    {importResult.skippedDetails.length > 5 && (
                      <li>...and {importResult.skippedDetails.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.errorDetails && importResult.errorDetails.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                    {importResult.errorDetails.slice(0, 5).map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                    {importResult.errorDetails.length > 5 && (
                      <li>...and {importResult.errorDetails.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Column Mapping Reference
          </CardTitle>
          <CardDescription>
            How we map columns from {importSource === 'quickbooks' ? 'QuickBooks' : 'Xero'} to ComplyBook
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">{importSource === 'quickbooks' ? 'QuickBooks' : 'Xero'} Column</th>
                  <th className="text-center py-2 px-4"></th>
                  <th className="text-left py-2 px-4">ComplyBook Field</th>
                </tr>
              </thead>
              <tbody>
                {importSource === 'quickbooks' ? (
                  <>
                    <tr className="border-b">
                      <td className="py-2 px-4">Date</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Transaction Date</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Memo/Description</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Description</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Debit / Credit</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Amount & Type</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Name</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Vendor/Client (if matched)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Split / Account</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Category (if matched)</td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr className="border-b">
                      <td className="py-2 px-4">*Date</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Transaction Date</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Description</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Description</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">*Amount</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Amount & Type (positive=income, negative=expense)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Payee</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Vendor/Client (if matched)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-4">Account Code</td>
                      <td className="text-center py-2 px-4"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                      <td className="py-2 px-4">Category (if matched)</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

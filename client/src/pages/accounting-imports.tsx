import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  FileText,
  Users,
  Building2,
  Receipt,
  Heart,
  BookOpen,
  Gift
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

type ImportSource = 'quickbooks' | 'xero' | 'aplos';
type ImportDataType = 'transactions' | 'vendors' | 'customers' | 'chart_of_accounts' | 'bills' | 'invoices' | 'donors' | 'funds';

const dataTypeLabels: Record<ImportDataType, { label: string; icon: any; description: string }> = {
  transactions: { label: 'Transactions', icon: Receipt, description: 'Import income and expense transactions' },
  vendors: { label: 'Vendors/Suppliers', icon: Building2, description: 'Import vendor/supplier contact list' },
  customers: { label: 'Customers/Clients', icon: Users, description: 'Import customer/client contact list' },
  chart_of_accounts: { label: 'Chart of Accounts', icon: BookOpen, description: 'Import account categories and structure' },
  bills: { label: 'Bills', icon: Receipt, description: 'Import vendor bills and invoices' },
  invoices: { label: 'Invoices', icon: FileText, description: 'Import customer invoices' },
  donors: { label: 'Donors', icon: Heart, description: 'Import donor contact list (nonprofit)' },
  funds: { label: 'Funds', icon: Gift, description: 'Import fund/program structure (nonprofit)' },
};

export default function AccountingImports({ organizationId }: AccountingImportsProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState<ImportSource>('quickbooks');
  const [importDataType, setImportDataType] = useState<ImportDataType>('transactions');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: organization } = useQuery<Organization>({
    queryKey: ['/api/organizations', organizationId],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories', organizationId],
  });

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Get CSRF token from cookie for file upload
      const csrfToken = document.cookie.split(';').find(c => c.trim().startsWith('csrf_token='))?.split('=')[1];
      const response = await fetch(`/api/transactions/import-accounting/${organizationId}?source=${importSource}&dataType=${importDataType}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
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

  const downloadTemplate = (source: ImportSource) => {
    let csvContent = '';
    let filename = '';
    
    if (source === 'quickbooks') {
      if (importDataType === 'transactions') {
        csvContent = `Date,Transaction Type,Num,Name,Memo/Description,Account,Split,Debit,Credit
01/15/2024,Check,1001,Office Depot,Office supplies,Checking,Office Supplies,125.50,
01/16/2024,Deposit,,Client ABC,Invoice payment,Checking,Accounts Receivable,,2500.00
01/18/2024,Bill,INV-456,Acme Supplies,Monthly supplies,Accounts Payable,Supplies,350.00,
01/20/2024,Payment,1002,Acme Supplies,Bill payment,Checking,Accounts Payable,350.00,`;
        filename = 'quickbooks_transactions_template.csv';
      } else if (importDataType === 'vendors') {
        csvContent = `Vendor,Company,Email,Phone,Address,City,State,ZIP,Tax ID
Acme Corp,Acme Corporation,ap@acme.com,555-0100,123 Main St,New York,NY,10001,12-3456789
Office Plus,Office Plus Inc,orders@officeplus.com,555-0200,456 Oak Ave,Chicago,IL,60601,98-7654321`;
        filename = 'quickbooks_vendors_template.csv';
      } else if (importDataType === 'customers') {
        csvContent = `Customer,Company,Email,Phone,Bill to Address,City,State,ZIP,Tax ID
John Smith,ABC Industries,john@abc.com,555-1234,100 Corporate Dr,Boston,MA,02101,11-2223333
Jane Doe,XYZ LLC,jane@xyz.com,555-5678,200 Business Blvd,Seattle,WA,98101,44-5556666`;
        filename = 'quickbooks_customers_template.csv';
      } else if (importDataType === 'chart_of_accounts') {
        csvContent = `Account,Type,Detail Type,Description,Balance
1000 - Checking,Bank,Checking,Main operating account,25000.00
2000 - Accounts Payable,Other Current Liability,Accounts Payable,Vendor payables,5000.00
4000 - Sales Revenue,Income,Sales of Product Income,Product sales,0.00
5000 - Cost of Goods Sold,Cost of Goods Sold,Supplies & Materials - COGS,Direct costs,0.00`;
        filename = 'quickbooks_chart_of_accounts_template.csv';
      } else {
        csvContent = `Date,Type,Num,Name,Memo,Amount
01/15/2024,Invoice,INV-001,Client ABC,Services rendered,2500.00`;
        filename = `quickbooks_${importDataType}_template.csv`;
      }
    } else if (source === 'xero') {
      if (importDataType === 'transactions') {
        csvContent = `*Date,*Amount,Payee,Description,Reference,Account Code,Tax Rate
2024-01-15,-125.50,Office Depot,Office supplies,CHK-1001,200,No Tax
2024-01-16,2500.00,Client ABC,Invoice payment,DEP-001,090,No Tax
2024-01-18,-350.00,Acme Supplies,Monthly supplies,BILL-456,300,No Tax`;
        filename = 'xero_transactions_template.csv';
      } else if (importDataType === 'vendors' || importDataType === 'customers') {
        csvContent = `ContactName,EmailAddress,AccountNumber,FirstName,LastName,TaxNumber,AddressLine1,City,Region,PostalCode
Acme Corp,ap@acme.com,ACME001,John,Smith,12-3456789,123 Main St,New York,NY,10001`;
        filename = `xero_${importDataType}_template.csv`;
      } else {
        csvContent = `*Date,*Amount,Payee,Description,Reference,Account Code
2024-01-15,-125.50,Office Depot,Office supplies,REF-001,200`;
        filename = `xero_${importDataType}_template.csv`;
      }
    } else if (source === 'aplos') {
      if (importDataType === 'transactions') {
        csvContent = `Date,Account,Contact,Description,Debit,Credit,Fund,Tag
01/15/2024,1000 - Checking,Donor ABC,Donation received,,500.00,General Fund,Unrestricted
01/16/2024,1000 - Checking,Office Supply Co,Office supplies,75.00,,General Fund,Operations`;
        filename = 'aplos_transactions_template.csv';
      } else if (importDataType === 'donors') {
        csvContent = `First Name,Last Name,Organization,Email,Phone,Address,City,State,ZIP,Lifetime Giving,Last Donation Date,Notes
John,Smith,,john@email.com,555-1234,100 Main St,Boston,MA,02101,5000.00,2024-01-15,Major donor
,,"ABC Foundation",giving@abc.org,555-5678,200 Corp Dr,Chicago,IL,60601,25000.00,2024-02-01,Foundation grant`;
        filename = 'aplos_donors_template.csv';
      } else if (importDataType === 'funds') {
        csvContent = `Fund Name,Fund Type,Description,Starting Balance,Is Restricted
General Fund,Operating,Unrestricted operating funds,50000.00,false
Building Fund,Capital,Capital campaign for new building,125000.00,true
Program Fund,Program,Education program restricted,15000.00,true`;
        filename = 'aplos_funds_template.csv';
      } else if (importDataType === 'vendors') {
        csvContent = `Vendor Name,Email,Phone,Address,City,State,ZIP,Tax ID,Payment Terms
Office Supply Co,orders@officesupply.com,555-0100,123 Main St,New York,NY,10001,12-3456789,Net 30
Utility Company,billing@utility.com,555-0200,456 Power Ave,Chicago,IL,60601,98-7654321,Net 15`;
        filename = 'aplos_vendors_template.csv';
      } else {
        csvContent = `Date,Type,Description,Amount,Fund
2024-01-15,Donation,Monthly giving,100.00,General Fund`;
        filename = `aplos_${importDataType}_template.csv`;
      }
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

      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">What would you like to import?</Label>
        <Select value={importDataType} onValueChange={(v: ImportDataType) => {
          setImportDataType(v);
          setSelectedFile(null);
          setImportResult(null);
        }}>
          <SelectTrigger className="w-full max-w-md" data-testid="select-data-type">
            <SelectValue placeholder="Select data type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="transactions">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Transactions
              </div>
            </SelectItem>
            <SelectItem value="vendors">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendors/Suppliers
              </div>
            </SelectItem>
            <SelectItem value="customers">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customers/Clients
              </div>
            </SelectItem>
            <SelectItem value="chart_of_accounts">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Chart of Accounts
              </div>
            </SelectItem>
            <SelectItem value="bills">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Bills
              </div>
            </SelectItem>
            <SelectItem value="invoices">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </div>
            </SelectItem>
            {organization?.type === 'nonprofit' && (
              <>
                <SelectItem value="donors">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    Donors
                  </div>
                </SelectItem>
                <SelectItem value="funds">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Funds
                  </div>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground mt-1">{dataTypeLabels[importDataType]?.description}</p>
      </div>

      <Tabs value={importSource} onValueChange={(v) => {
        setImportSource(v as ImportSource);
        setSelectedFile(null);
        setImportResult(null);
      }}>
        <TabsList className={`grid w-full max-w-lg ${organization?.type === 'nonprofit' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="quickbooks" className="flex items-center gap-2" data-testid="tab-quickbooks">
            <SiQuickbooks className="h-4 w-4" />
            QuickBooks
          </TabsTrigger>
          <TabsTrigger value="xero" className="flex items-center gap-2" data-testid="tab-xero">
            <FileSpreadsheet className="h-4 w-4" />
            Xero
          </TabsTrigger>
          {organization?.type === 'nonprofit' && (
            <TabsTrigger value="aplos" className="flex items-center gap-2" data-testid="tab-aplos">
              <Heart className="h-4 w-4" />
              Aplos
            </TabsTrigger>
          )}
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
                      Import {dataTypeLabels[importDataType]?.label}
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
                      Import {dataTypeLabels[importDataType]?.label}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {organization?.type === 'nonprofit' && (
        <TabsContent value="aplos" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-purple-600" />
                  Aplos Export Instructions
                </CardTitle>
                <CardDescription>
                  Follow these steps to export your data from Aplos (nonprofit accounting)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">1</Badge>
                    <div>
                      <p className="font-medium">Log in to Aplos</p>
                      <p className="text-sm text-muted-foreground">Access your Aplos organization account</p>
                    </div>
                  </div>
                  
                  {importDataType === 'transactions' && (
                    <>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                        <div>
                          <p className="font-medium">Go to Register</p>
                          <p className="text-sm text-muted-foreground">
                            Navigate to Accounts → Register, filter by date range
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                        <div>
                          <p className="font-medium">Export to CSV</p>
                          <p className="text-sm text-muted-foreground">
                            Click Export → CSV/Excel to download transactions
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {importDataType === 'donors' && (
                    <>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                        <div>
                          <p className="font-medium">Go to Donor Management</p>
                          <p className="text-sm text-muted-foreground">
                            Navigate to Fundraising → Donor Management → Donations by Contact
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                        <div>
                          <p className="font-medium">Export Contact List</p>
                          <p className="text-sm text-muted-foreground">
                            Use Reports → Contact Details, add fields, then Export
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {importDataType === 'funds' && (
                    <>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                        <div>
                          <p className="font-medium">Go to Data Visualizer</p>
                          <p className="text-sm text-muted-foreground">
                            Navigate to Reports → Data Visualizer → Fund Report
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                        <div>
                          <p className="font-medium">Export Fund Data</p>
                          <p className="text-sm text-muted-foreground">
                            Export as CSV/XLSX with fund names, types, and balances
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {(importDataType === 'vendors' || importDataType === 'bills') && (
                    <>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">2</Badge>
                        <div>
                          <p className="font-medium">Go to Accounts Payable</p>
                          <p className="text-sm text-muted-foreground">
                            Navigate to Accounts Payable → Bills to Pay or Vendor List
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center shrink-0">3</Badge>
                        <div>
                          <p className="font-medium">Export Data</p>
                          <p className="text-sm text-muted-foreground">
                            Click Export to download CSV with vendor/bill details
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nonprofit-Focused</AlertTitle>
                  <AlertDescription>
                    Aplos specializes in nonprofit accounting. We support fund, donor, and donation exports with tag/fund mapping.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => downloadTemplate('aplos')}
                  data-testid="button-download-aplos-template"
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
                  Upload Aplos Export
                </CardTitle>
                <CardDescription>
                  Upload your Aplos CSV export file
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer transition-colors"
                  onClick={() => document.getElementById('aplos-file-input')?.click()}
                  data-testid="dropzone-aplos"
                >
                  <input
                    id="aplos-file-input"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-aplos-file"
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
                  data-testid="button-import-aplos"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {dataTypeLabels[importDataType]?.label}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}
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

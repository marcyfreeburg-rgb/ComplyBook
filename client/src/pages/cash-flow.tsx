import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, BarChart3 } from "lucide-react";
import type { Organization, CashFlowScenario, CashFlowProjection, InsertCashFlowScenario } from "@shared/schema";
import { insertCashFlowScenarioSchema } from "@shared/schema";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface CashFlowProps {
  currentOrganization: Organization;
}

export default function CashFlow({ currentOrganization }: CashFlowProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);

  const form = useForm<InsertCashFlowScenario>({
    resolver: zodResolver(insertCashFlowScenarioSchema.omit({ organizationId: true, createdBy: true })),
    defaultValues: {
      name: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      incomeGrowthRate: "0",
      expenseGrowthRate: "0",
      assumptions: "",
    },
  });

  const { data: scenarios, isLoading: scenariosLoading } = useQuery<CashFlowScenario[]>({
    queryKey: ['/api/cash-flow-scenarios', currentOrganization.id],
    enabled: !!currentOrganization.id,
  });

  const { data: projections } = useQuery<CashFlowProjection[]>({
    queryKey: ['/api/cash-flow-projections', selectedScenario],
    enabled: !!selectedScenario,
  });

  const createScenarioMutation = useMutation({
    mutationFn: async (data: InsertCashFlowScenario) => {
      return await apiRequest(`/api/cash-flow-scenarios/${currentOrganization.id}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow-scenarios', currentOrganization.id] });
      toast({ title: "Cash flow scenario created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create scenario", variant: "destructive" });
    },
  });

  const generateProjectionsMutation = useMutation({
    mutationFn: async (scenarioId: number) => {
      return await apiRequest(`/api/cash-flow-projections/${scenarioId}/generate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow-projections', selectedScenario] });
      toast({ title: "Projections generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate projections", variant: "destructive" });
    },
  });

  const deleteScenarioMutation = useMutation({
    mutationFn: async (scenarioId: number) => {
      return await apiRequest(`/api/cash-flow-scenarios/${scenarioId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cash-flow-scenarios', currentOrganization.id] });
      toast({ title: "Scenario deleted successfully" });
      if (selectedScenario) {
        setSelectedScenario(null);
      }
    },
    onError: () => {
      toast({ title: "Failed to delete scenario", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertCashFlowScenario) => {
    createScenarioMutation.mutate(data);
  };

  const handleGenerateProjections = (scenarioId: number) => {
    generateProjectionsMutation.mutate(scenarioId);
  };

  const chartData = projections?.map(p => ({
    month: format(new Date(p.month), 'MMM yyyy'),
    income: parseFloat(p.projectedIncome),
    expenses: parseFloat(p.projectedExpenses),
    balance: parseFloat(p.projectedBalance),
  })) || [];

  const currentScenario = scenarios?.find(s => s.id === selectedScenario);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cash Flow Forecasting</h1>
          <p className="text-muted-foreground">
            Project future cash flow based on historical data and growth assumptions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-scenario">
              <Plus className="mr-2 h-4 w-4" />
              New Scenario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Cash Flow Scenario</DialogTitle>
              <DialogDescription>
                Define assumptions for cash flow forecasting
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scenario Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Conservative 2024" data-testid="input-scenario-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''}
                          placeholder="Describe this scenario..." 
                          data-testid="input-scenario-description" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="incomeGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Income Growth Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            placeholder="e.g., 5"
                            data-testid="input-income-growth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expenseGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Growth Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            {...field}
                            value={field.value || ''}
                            placeholder="e.g., 3"
                            data-testid="input-expense-growth"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="assumptions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assumptions</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value || ''}
                          placeholder="Document your assumptions..." 
                          data-testid="input-assumptions" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createScenarioMutation.isPending} data-testid="button-save-scenario">
                    {createScenarioMutation.isPending ? "Creating..." : "Create Scenario"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scenarios</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-scenarios-count">
              {scenarios?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Scenarios</CardTitle>
            <CardDescription>Select a scenario to view projections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {scenariosLoading ? (
              <div className="text-sm text-muted-foreground">Loading scenarios...</div>
            ) : scenarios && scenarios.length > 0 ? (
              scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`p-4 rounded-md border cursor-pointer hover-elevate ${
                    selectedScenario === scenario.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedScenario(scenario.id)}
                  data-testid={`scenario-card-${scenario.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{scenario.name}</h3>
                      {scenario.description && (
                        <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(scenario.startDate), 'MMM d, yyyy')} - {format(new Date(scenario.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScenarioMutation.mutate(scenario.id);
                      }}
                      data-testid={`button-delete-scenario-${scenario.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No scenarios yet. Create one to get started.</div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cash Flow Projection</CardTitle>
                <CardDescription>
                  {currentScenario ? currentScenario.name : 'Select a scenario to view projections'}
                </CardDescription>
              </div>
              {selectedScenario && (
                <Button
                  onClick={() => handleGenerateProjections(selectedScenario)}
                  disabled={generateProjectionsMutation.isPending}
                  data-testid="button-generate-projections"
                >
                  {generateProjectionsMutation.isPending ? "Generating..." : "Generate Projections"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedScenario ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Select a scenario to view projections
              </div>
            ) : !projections || projections.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <p>No projections yet for this scenario</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleGenerateProjections(selectedScenario)}
                  disabled={generateProjectionsMutation.isPending}
                >
                  Generate Projections
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Income" />
                    <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} name="Running Balance" />
                  </LineChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  <h3 className="font-semibold">Monthly Projections</h3>
                  <div className="space-y-2">
                    {projections.map((projection, idx) => (
                      <div key={projection.id} className="flex items-center justify-between p-3 bg-muted rounded-md" data-testid={`projection-row-${idx}`}>
                        <span className="font-medium">{format(new Date(projection.month), 'MMMM yyyy')}</span>
                        <div className="flex gap-6 text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">${parseFloat(projection.projectedIncome).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600">${parseFloat(projection.projectedExpenses).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-600 font-semibold">${parseFloat(projection.projectedBalance).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

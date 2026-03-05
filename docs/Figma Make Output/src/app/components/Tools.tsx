import { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Download, TrendingUp, PieChart as PieChartIcon, Calendar, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, addMonths, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function Tools() {
  const context = useContext(AppContext);

  const categoryData = useMemo(() => {
    if (!context) return [];

    const activeSubscriptions = context.subscriptions.filter(s => s.status === 'active');
    const categoryMap = new Map<string, number>();

    activeSubscriptions.forEach(sub => {
      let monthlyAmount = sub.amount;
      if (sub.billingCycle === 'yearly') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.billingCycle === 'weekly') {
        monthlyAmount = sub.amount * 4.33;
      } else if (sub.billingCycle === 'quarterly') {
        monthlyAmount = sub.amount / 3;
      }

      const current = categoryMap.get(sub.category) || 0;
      categoryMap.set(sub.category, current + monthlyAmount);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: parseFloat(value.toFixed(2)),
    }));
  }, [context?.subscriptions]);

  const projectionData = useMemo(() => {
    if (!context) return [];

    const activeSubscriptions = context.subscriptions.filter(s => s.status === 'active');
    const monthlyTotal = activeSubscriptions.reduce((sum, sub) => {
      let monthlyAmount = sub.amount;
      if (sub.billingCycle === 'yearly') {
        monthlyAmount = sub.amount / 12;
      } else if (sub.billingCycle === 'weekly') {
        monthlyAmount = sub.amount * 4.33;
      } else if (sub.billingCycle === 'quarterly') {
        monthlyAmount = sub.amount / 3;
      }
      return sum + monthlyAmount;
    }, 0);

    const projections = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const month = addMonths(now, i);
      projections.push({
        month: format(month, 'MMM yyyy'),
        amount: parseFloat(monthlyTotal.toFixed(2)),
      });
    }

    return projections;
  }, [context?.subscriptions]);

  const duplicates = useMemo(() => {
    if (!context) return [];

    const nameMap = new Map<string, number>();
    context.subscriptions.forEach(sub => {
      const normalized = sub.name.toLowerCase().trim();
      nameMap.set(normalized, (nameMap.get(normalized) || 0) + 1);
    });

    return Array.from(nameMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([name, count]) => ({ name, count }));
  }, [context?.subscriptions]);

  const handleExportCSV = () => {
    if (!context) return;

    const headers = ['Name', 'Amount', 'Currency', 'Billing Cycle', 'Next Charge', 'Category', 'Status'];
    const rows = context.subscriptions.map(sub => [
      sub.name,
      sub.amount.toString(),
      sub.currency,
      sub.billingCycle,
      sub.nextChargeDate,
      sub.category,
      sub.status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  if (!context) return null;

  const currencySymbol = context.settings.currency === 'USD' ? '$' : 
                        context.settings.currency === 'EUR' ? '€' : 
                        context.settings.currency === 'GBP' ? '£' : '$';

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#14b8a6'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Tools</h1>
        <p className="text-muted-foreground">
          Analyze spending patterns and export data
        </p>
      </div>

      <div className="space-y-6">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Spending by Category
            </CardTitle>
            <CardDescription>
              Monthly spending breakdown by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No active subscriptions to analyze
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${currencySymbol}${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${currencySymbol}${value}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Cost Projection
            </CardTitle>
            <CardDescription>
              Estimated spending over the next 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectionData.length === 0 || projectionData[0].amount === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No active subscriptions to project
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${currencySymbol}${value}`} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cost Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {context.subscriptions.filter(s => s.status === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active subscriptions to analyze
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Active Subscriptions</span>
                    <span className="font-medium">
                      {context.subscriptions.filter(s => s.status === 'active').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Yearly Cost (Est.)</span>
                    <span className="font-medium">
                      {currencySymbol}
                      {(projectionData[0]?.amount * 12 || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average per Subscription</span>
                    <span className="font-medium">
                      {currencySymbol}
                      {context.subscriptions.filter(s => s.status === 'active').length > 0
                        ? ((projectionData[0]?.amount || 0) / context.subscriptions.filter(s => s.status === 'active').length).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Most Expensive Category</span>
                    <span className="font-medium capitalize">
                      {categoryData.length > 0
                        ? categoryData.reduce((max, cat) => cat.value > max.value ? cat : max).name
                        : '--'}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Duplicate Detector
              </CardTitle>
            </CardHeader>
            <CardContent>
              {duplicates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No duplicate subscriptions detected
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-3">
                    Potential duplicate subscriptions found:
                  </p>
                  {duplicates.map(dup => (
                    <div key={dup.name} className="flex items-center justify-between p-2 rounded bg-muted">
                      <span className="text-sm capitalize">{dup.name}</span>
                      <span className="text-sm font-medium">{dup.count} instances</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Export Tools</CardTitle>
            <CardDescription>
              Download your subscription data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
            <p className="text-sm text-muted-foreground">
              Export your subscription data as a CSV file for use in spreadsheet applications
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

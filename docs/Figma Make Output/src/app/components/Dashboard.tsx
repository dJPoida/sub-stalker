import { useContext, useMemo } from 'react';
import { Link } from 'react-router';
import { AppContext, Subscription } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, TrendingUp, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { format, addDays, parseISO, isBefore, isAfter } from 'date-fns';
import AddSubscriptionDialog from './AddSubscriptionDialog';
import { useState } from 'react';

export default function Dashboard() {
  const context = useContext(AppContext);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const stats = useMemo(() => {
    if (!context) return null;

    const activeSubscriptions = context.subscriptions.filter(s => s.status === 'active');
    const totalActive = activeSubscriptions.length;

    // Calculate estimated monthly spend
    const monthlySpend = activeSubscriptions.reduce((sum, sub) => {
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

    // Find next charge
    const sortedByDate = [...activeSubscriptions].sort((a, b) => 
      new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime()
    );
    const nextCharge = sortedByDate[0];

    return {
      totalActive,
      monthlySpend,
      nextCharge,
    };
  }, [context?.subscriptions]);

  const upcomingCharges = useMemo(() => {
    if (!context) return [];

    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);

    return context.subscriptions
      .filter(s => s.status === 'active')
      .filter(s => {
        const chargeDate = parseISO(s.nextChargeDate);
        return isAfter(chargeDate, now) && isBefore(chargeDate, thirtyDaysFromNow);
      })
      .sort((a, b) => 
        new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime()
      );
  }, [context?.subscriptions]);

  const reminders = useMemo(() => {
    if (!context) return [];

    const now = new Date();
    const reminderDate = addDays(now, context.settings.reminderDays);

    return context.subscriptions
      .filter(s => s.status === 'active')
      .filter(s => {
        const chargeDate = parseISO(s.nextChargeDate);
        return isBefore(chargeDate, reminderDate);
      })
      .slice(0, 3);
  }, [context?.subscriptions, context?.settings.reminderDays]);

  if (!context) return null;

  const currencySymbol = context.settings.currency === 'USD' ? '$' : 
                        context.settings.currency === 'EUR' ? '€' : 
                        context.settings.currency === 'GBP' ? '£' : '$';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your subscription activity
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats?.totalActive || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Est. Monthly Spend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {currencySymbol}{stats?.monthlySpend.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Next Charge</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats?.nextCharge ? (
              <>
                <div className="text-2xl">
                  {currencySymbol}{stats.nextCharge.amount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.nextCharge.name} on {format(parseISO(stats.nextCharge.nextChargeDate), 'MMM d')}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl">--</div>
                <p className="text-xs text-muted-foreground mt-1">No upcoming charges</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Charges */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Charges (Next 30 Days)</CardTitle>
            <CardDescription>
              Charges scheduled in the next month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingCharges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No charges scheduled in the next 30 days
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingCharges.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(sub.nextChargeDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {currencySymbol}{sub.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {sub.billingCycle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
            <CardDescription>
              Charges within {context.settings.reminderDays} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No action required at this time
              </p>
            ) : (
              <div className="space-y-3">
                {reminders.map(sub => (
                  <div key={sub.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {currencySymbol}{sub.amount.toFixed(2)} charges on {format(parseISO(sub.nextChargeDate), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest subscription updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {context.subscriptions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  No subscriptions yet
                </p>
                <Button onClick={() => setShowAddDialog(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Subscription
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {[...context.subscriptions]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map(sub => (
                    <div key={sub.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{sub.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Added {format(parseISO(sub.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sub.status}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Subscription
            </Button>
            <Link to="/subscriptions">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                View All Subscriptions
              </Button>
            </Link>
            <Link to="/tools">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze Spending
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Configure Reminders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <AddSubscriptionDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}

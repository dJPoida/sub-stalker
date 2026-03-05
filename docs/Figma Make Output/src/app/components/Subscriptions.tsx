import { useContext, useState, useMemo } from 'react';
import { AppContext, Subscription } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Search, Filter, Edit, Trash2, Archive } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import AddSubscriptionDialog from './AddSubscriptionDialog';
import EditSubscriptionDialog from './EditSubscriptionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { toast } from 'sonner';

export default function Subscriptions() {
  const context = useContext(AppContext);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'date'>('name');

  const filteredSubscriptions = useMemo(() => {
    if (!context) return [];

    let filtered = [...context.subscriptions];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(sub =>
        sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(sub => sub.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else {
        return new Date(a.nextChargeDate).getTime() - new Date(b.nextChargeDate).getTime();
      }
    });

    return filtered;
  }, [context?.subscriptions, searchQuery, statusFilter, categoryFilter, sortBy]);

  const categories = useMemo(() => {
    if (!context) return [];
    const cats = new Set(context.subscriptions.map(s => s.category));
    return Array.from(cats);
  }, [context?.subscriptions]);

  const handleDeactivate = (id: string) => {
    context?.updateSubscription(id, { status: 'inactive' });
    toast.success('Subscription deactivated');
  };

  const handleActivate = (id: string) => {
    context?.updateSubscription(id, { status: 'active' });
    toast.success('Subscription activated');
  };

  const handleDelete = () => {
    if (deletingId) {
      context?.deleteSubscription(deletingId);
      toast.success('Subscription deleted');
      setDeletingId(null);
    }
  };

  if (!context) return null;

  const currencySymbol = context.settings.currency === 'USD' ? '$' : 
                        context.settings.currency === 'EUR' ? '€' : 
                        context.settings.currency === 'GBP' ? '£' : '$';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage all your recurring subscriptions
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subscription
        </Button>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
                <SelectItem value="date">Sort by Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'No subscriptions match your filters'
                : 'No subscriptions yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && categoryFilter === 'all' && (
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Subscription
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubscriptions.map(sub => (
            <Card key={sub.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{sub.name}</CardTitle>
                    <p className="text-sm text-muted-foreground capitalize mt-1">
                      {sub.category}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    sub.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {sub.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-semibold">
                      {currencySymbol}{sub.amount.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground capitalize">
                      per {sub.billingCycle.replace('ly', '')}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next Charge</p>
                    <p className="font-medium">
                      {format(parseISO(sub.nextChargeDate), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditingSubscription(sub)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    {sub.status === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeactivate(sub.id)}
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivate(sub.id)}
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingId(sub.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddSubscriptionDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />

      {editingSubscription && (
        <EditSubscriptionDialog
          subscription={editingSubscription}
          open={!!editingSubscription}
          onOpenChange={(open) => !open && setEditingSubscription(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscription? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

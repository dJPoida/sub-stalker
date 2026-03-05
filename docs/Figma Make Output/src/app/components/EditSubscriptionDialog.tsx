import { useContext, useState, useEffect } from 'react';
import { AppContext, Subscription } from '../App';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface EditSubscriptionDialogProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSubscriptionDialog({ subscription, open, onOpenChange }: EditSubscriptionDialogProps) {
  const context = useContext(AppContext);
  const [name, setName] = useState(subscription.name);
  const [amount, setAmount] = useState(subscription.amount.toString());
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'weekly' | 'quarterly'>(subscription.billingCycle);
  const [nextChargeDate, setNextChargeDate] = useState(subscription.nextChargeDate);
  const [category, setCategory] = useState(subscription.category);

  useEffect(() => {
    setName(subscription.name);
    setAmount(subscription.amount.toString());
    setBillingCycle(subscription.billingCycle);
    setNextChargeDate(subscription.nextChargeDate);
    setCategory(subscription.category);
  }, [subscription]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !amount || !nextChargeDate || !category) {
      toast.error('Please fill in all required fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    context?.updateSubscription(subscription.id, {
      name,
      amount: numAmount,
      billingCycle,
      nextChargeDate,
      category,
    });

    toast.success('Subscription updated successfully');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Subscription</DialogTitle>
          <DialogDescription>
            Update the details of your subscription
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Subscription Name *</Label>
              <Input
                id="edit-name"
                placeholder="Netflix, Spotify, etc."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-billingCycle">Billing Cycle *</Label>
              <Select value={billingCycle} onValueChange={(value: any) => setBillingCycle(value)}>
                <SelectTrigger id="edit-billingCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nextChargeDate">Next Charge Date *</Label>
              <Input
                id="edit-nextChargeDate"
                type="date"
                value={nextChargeDate}
                onChange={(e) => setNextChargeDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="health">Health & Fitness</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

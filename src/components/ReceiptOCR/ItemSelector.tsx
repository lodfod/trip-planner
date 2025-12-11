import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { ParsedReceipt, GroupMember } from "../../lib/types";
import { formatCurrency } from "../../lib/exchangeRate";

interface ItemSelectorProps {
  receipt: ParsedReceipt;
  groupMembers: GroupMember[];
  onComplete: (
    payerAmounts: Record<string, number>,
    totalWithExtras: number
  ) => void;
  onCancel: () => void;
}

type TipSplitMode = "equal" | "proportional";

export function ItemSelector({
  receipt,
  groupMembers,
  onComplete,
  onCancel,
}: ItemSelectorProps) {
  // Track which users are assigned to each item
  // Key: item index, Value: array of user IDs
  const [itemAssignments, setItemAssignments] = useState<
    Record<number, string[]>
  >(() => {
    // Initialize with empty assignments
    const initial: Record<number, string[]> = {};
    receipt.items.forEach((_, index) => {
      initial[index] = [];
    });
    return initial;
  });

  // Additional tip/tax handling
  const [additionalTip, setAdditionalTip] = useState<string>(
    receipt.tip?.toString() || ""
  );
  const [tipSplitMode, setTipSplitMode] = useState<TipSplitMode>("equal");

  // Toggle user assignment for an item
  const toggleUserForItem = (itemIndex: number, userId: string) => {
    setItemAssignments((prev) => {
      const current = prev[itemIndex] || [];
      const isAssigned = current.includes(userId);

      return {
        ...prev,
        [itemIndex]: isAssigned
          ? current.filter((id) => id !== userId)
          : [...current, userId],
      };
    });
  };

  // Select all users for an item
  const selectAllForItem = (itemIndex: number) => {
    setItemAssignments((prev) => ({
      ...prev,
      [itemIndex]: groupMembers.map((m) => m.id),
    }));
  };

  // Clear all users for an item
  const clearAllForItem = (itemIndex: number) => {
    setItemAssignments((prev) => ({
      ...prev,
      [itemIndex]: [],
    }));
  };

  // Calculate per-person amounts
  const calculations = useMemo(() => {
    const perPersonTotals: Record<string, number> = {};
    groupMembers.forEach((m) => {
      perPersonTotals[m.id] = 0;
    });

    let itemsSubtotal = 0;

    // Calculate item costs per person
    receipt.items.forEach((item, index) => {
      const assignedUsers = itemAssignments[index] || [];
      if (assignedUsers.length === 0) return;

      const itemTotal = item.price * (item.quantity || 1);
      itemsSubtotal += itemTotal;
      const perPersonCost = itemTotal / assignedUsers.length;

      assignedUsers.forEach((userId) => {
        perPersonTotals[userId] += perPersonCost;
      });
    });

    // Add tax proportionally to people who ordered items
    if (receipt.tax && itemsSubtotal > 0) {
      Object.entries(perPersonTotals).forEach(([userId, amount]) => {
        if (amount > 0) {
          const taxShare = (amount / itemsSubtotal) * receipt.tax!;
          perPersonTotals[userId] += taxShare;
        }
      });
    }

    // Add tip
    const tipAmount = parseFloat(additionalTip) || 0;
    if (tipAmount > 0) {
      const peopleWithOrders = Object.entries(perPersonTotals).filter(
        ([, amount]) => amount > 0
      );

      if (peopleWithOrders.length > 0) {
        if (tipSplitMode === "equal") {
          const tipPerPerson = tipAmount / peopleWithOrders.length;
          peopleWithOrders.forEach(([userId]) => {
            perPersonTotals[userId] += tipPerPerson;
          });
        } else {
          // Proportional
          const subtotalBeforeTip = peopleWithOrders.reduce(
            (sum, [, amount]) => sum + amount,
            0
          );
          peopleWithOrders.forEach(([userId, amount]) => {
            const tipShare = (amount / subtotalBeforeTip) * tipAmount;
            perPersonTotals[userId] += tipShare;
          });
        }
      }
    }

    // Round to 2 decimal places
    Object.keys(perPersonTotals).forEach((userId) => {
      perPersonTotals[userId] = Math.round(perPersonTotals[userId] * 100) / 100;
    });

    const grandTotal = Object.values(perPersonTotals).reduce(
      (sum, val) => sum + val,
      0
    );

    return {
      perPersonTotals,
      grandTotal,
      itemsSubtotal,
    };
  }, [itemAssignments, receipt, groupMembers, additionalTip, tipSplitMode]);

  // Check if any items are assigned
  const hasAssignments = Object.values(itemAssignments).some(
    (users) => users.length > 0
  );

  const handleComplete = () => {
    // Filter out users with zero amounts
    const nonZeroAmounts: Record<string, number> = {};
    Object.entries(calculations.perPersonTotals).forEach(([userId, amount]) => {
      if (amount > 0) {
        nonZeroAmounts[userId] = amount;
      }
    });

    onComplete(nonZeroAmounts, calculations.grandTotal);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Assign Items</span>
          {receipt.merchantName && (
            <span className="text-sm font-normal text-muted-foreground">
              {receipt.merchantName}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Items list */}
        <div className="space-y-4">
          {receipt.items.map((item, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.quantity && item.quantity > 1 && (
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity}
                    </p>
                  )}
                </div>
                <p className="font-medium">
                  {formatCurrency(
                    item.price * (item.quantity || 1),
                    receipt.currency
                  )}
                </p>
              </div>

              {/* User selection for this item */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => selectAllForItem(index)}
                >
                  All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => clearAllForItem(index)}
                >
                  None
                </Button>
                <div className="w-px h-6 bg-border" />
                {groupMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`item-${index}-${member.id}`}
                      checked={itemAssignments[index]?.includes(member.id)}
                      onCheckedChange={() => toggleUserForItem(index, member.id)}
                    />
                    <Label
                      htmlFor={`item-${index}-${member.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {member.display_name || member.full_name.split(" ")[0]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tax display */}
        {receipt.tax && receipt.tax > 0 && (
          <div className="flex justify-between items-center py-2 border-t">
            <span className="text-muted-foreground">Tax (included)</span>
            <span>{formatCurrency(receipt.tax, receipt.currency)}</span>
          </div>
        )}

        {/* Tip/Service charge */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="tip">Tip / Service Charge</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tip"
                type="number"
                value={additionalTip}
                onChange={(e) => setAdditionalTip(e.target.value)}
                className="w-24"
                placeholder="0"
                min="0"
                step={receipt.currency === "JPY" ? "1" : "0.01"}
              />
              <span className="text-sm text-muted-foreground">
                {receipt.currency === "JPY" ? "¥" : "$"}
              </span>
            </div>
          </div>
          {parseFloat(additionalTip) > 0 && (
            <div className="flex items-center gap-4">
              <Label className="text-sm text-muted-foreground">Split tip:</Label>
              <Select
                value={tipSplitMode}
                onValueChange={(v: TipSplitMode) => setTipSplitMode(v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equally</SelectItem>
                  <SelectItem value="proportional">By item cost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Per-person breakdown */}
        {hasAssignments && (
          <div className="border-t pt-4 space-y-2">
            <h4 className="font-medium">Per Person</h4>
            <div className="grid gap-2">
              {groupMembers
                .filter((m) => calculations.perPersonTotals[m.id] > 0)
                .map((member) => (
                  <div
                    key={member.id}
                    className="flex justify-between items-center py-1"
                  >
                    <span>{member.display_name || member.full_name}</span>
                    <span className="font-medium">
                      {formatCurrency(
                        calculations.perPersonTotals[member.id],
                        receipt.currency
                      )}
                    </span>
                  </div>
                ))}
              <div className="flex justify-between items-center py-2 border-t font-bold">
                <span>Total</span>
                <span>
                  {formatCurrency(calculations.grandTotal, receipt.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!hasAssignments}
            className="flex-1"
          >
            Create Expense
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

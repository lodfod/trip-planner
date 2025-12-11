import { useMemo, useState } from "react";
import { ProcessedExpense, GroupMember } from "../lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface ShowTotalsProps {
  expenses: ProcessedExpense[];
  groupMembers: GroupMember[];
}

interface DebtSummary {
  from: GroupMember;
  to: GroupMember;
  amount: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ShowTotalsFinal({ expenses, groupMembers }: ShowTotalsProps) {
  // Combine groupMembers with any payers from expenses who aren't in groupMembers
  const allMembers = useMemo(() => {
    if (!expenses?.length) return groupMembers || [];

    const memberMap = new Map<string, GroupMember>();

    groupMembers?.forEach((m) => {
      if (m?.id) memberMap.set(m.id, m);
    });

    expenses.forEach((expense) => {
      expense.payers?.forEach((payer) => {
        if (payer?.id && !memberMap.has(payer.id)) {
          memberMap.set(payer.id, {
            id: payer.id,
            full_name: payer.full_name,
            email: "",
            isPending: payer.isPending,
          });
        }
      });
    });

    return Array.from(memberMap.values());
  }, [expenses, groupMembers]);

  const reconciledDebts = useMemo((): DebtSummary[] => {
    if (!allMembers?.length || !expenses?.length) {
      return [];
    }

    // Build debt map
    const debtMap: Record<string, Record<string, number>> = {};

    allMembers.forEach((creditor) => {
      if (creditor?.id) {
        debtMap[creditor.id] = {};
        allMembers.forEach((debtor) => {
          if (debtor?.id) {
            debtMap[creditor.id][debtor.id] = 0;
          }
        });
      }
    });

    // Calculate initial debts
    expenses.forEach((expense) => {
      const mainPayer = expense.payers.find((p) => p.id === expense.creator);
      if (!mainPayer) return;

      expense.payers.forEach((debtor) => {
        if (debtor.id !== mainPayer.id && debtor.amount > 0) {
          if (
            debtMap[mainPayer.id] &&
            debtMap[mainPayer.id][debtor.id] !== undefined
          ) {
            debtMap[mainPayer.id][debtor.id] += debtor.amount;
          }
        }
      });
    });

    // Reconcile bidirectional debts
    allMembers.forEach((person1) => {
      allMembers.forEach((person2) => {
        if (person1.id && person2.id && person1.id < person2.id) {
          const debt1to2 = debtMap[person2.id]?.[person1.id] || 0;
          const debt2to1 = debtMap[person1.id]?.[person2.id] || 0;

          if (debt1to2 > 0 && debt2to1 > 0) {
            if (debt1to2 > debt2to1) {
              debtMap[person2.id][person1.id] = debt1to2 - debt2to1;
              debtMap[person1.id][person2.id] = 0;
            } else {
              debtMap[person1.id][person2.id] = debt2to1 - debt1to2;
              debtMap[person2.id][person1.id] = 0;
            }
          }
        }
      });
    });

    // Convert to list of non-zero debts
    const debtList: DebtSummary[] = [];
    allMembers.forEach((creditor) => {
      allMembers.forEach((debtor) => {
        if (creditor.id !== debtor.id) {
          const amount = debtMap[creditor.id]?.[debtor.id] || 0;
          if (amount > 0) {
            debtList.push({
              from: debtor,
              to: creditor,
              amount,
            });
          }
        }
      });
    });

    return debtList.sort((a, b) => b.amount - a.amount);
  }, [expenses, allMembers]);

  const [isOpen, setIsOpen] = useState(true);

  if (!allMembers?.length) {
    return null;
  }

  const totalToSettle = reconciledDebts.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="p-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-md text-left flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Settle Up
              </CardTitle>
              {reconciledDebts.length > 0 && (
                <span className="text-sm text-green-600 font-medium">
                  {reconciledDebts.length} payment
                  {reconciledDebts.length !== 1 ? "s" : ""} · $
                  {totalToSettle.toFixed(2)}
                </span>
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {reconciledDebts.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                All settled up! No outstanding debts.
              </div>
            ) : (
              <div className="space-y-2">
                {reconciledDebts.map((debt, index) => {
                  const fromName =
                    debt.from.display_name || debt.from.full_name;
                  const toName = debt.to.display_name || debt.to.full_name;

                  return (
                    <div
                      key={`${debt.from.id}-${debt.to.id}-${index}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                    >
                      {/* People flow */}
                      <div className="flex items-center gap-2">
                        {/* From person */}
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            className="h-8 w-8 flex-shrink-0"
                            title={fromName}
                          >
                            <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                              {getInitials(fromName)}
                            </AvatarFallback>
                          </Avatar>
                          {debt.from.isPending && (
                            <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm hidden sm:inline">
                            {fromName}
                          </span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                        {/* To person */}
                        <div className="flex items-center gap-1.5">
                          <Avatar
                            className="h-8 w-8 flex-shrink-0"
                            title={toName}
                          >
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {getInitials(toName)}
                            </AvatarFallback>
                          </Avatar>
                          {debt.to.isPending && (
                            <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm hidden sm:inline">
                            {toName}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <span className="font-semibold text-base text-green-700 dark:text-green-400 flex-shrink-0">
                        ${debt.amount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

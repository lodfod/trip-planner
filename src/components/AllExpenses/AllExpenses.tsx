import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import supabase from "../../lib/createClient";

import { Expense, GroupMember } from "../../lib/types";
import { useState, useEffect, useContext } from "react";

import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { ExternalLink, Trash2, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import { UUID } from "crypto";
import { ShowTotals } from "../ShowTotals";
import { ShowTotalsFinal } from "../ShowTotalsFinal";
import { SessionContext } from "../../App";
import { useToast } from "../../hooks/use-toast";

export function AllExpenses() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>();
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const session = useContext(SessionContext);
  const currentUserId = session?.user?.id;
  const { toast } = useToast();

  // Add a new useEffect to fetch group members
  useEffect(() => {
    const fetchGroupMembers = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) {
        console.log("Error fetching group members:", error);
      } else {
        setGroupMembers(data);
      }
    };

    fetchGroupMembers();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase.from("expenses").select(`
        *,
        profiles:creator (
          full_name,
          display_name
        ),
        payer_amounts (
          user_id,
          pending_member_id,
          amount,
          original_amount,
          profiles:user_id (
            full_name,
            display_name
          ),
          pending_members:pending_member_id (
            display_name,
            email
          )
        )
      `);

    if (error) {
      console.log("Error fetching expenses:", error);
    } else {
      const processedExpenses = data.map((expense) => ({
        ...expense,
        expenseName: expense.name,
        creatorName:
          expense.profiles?.display_name ||
          expense.profiles?.full_name ||
          "Unknown User",
        creator: expense.creator,
        date: format(new Date(expense.created_at), "MM/dd/yyyy HH:mm"),
        payers: expense.payer_amounts.map(
          (pa: {
            user_id: UUID | null;
            pending_member_id: UUID | null;
            profiles: { full_name: string; display_name?: string } | null;
            pending_members: { display_name: string; email: string } | null;
            amount: number;
            original_amount?: number;
          }) => ({
            id: pa.user_id || pa.pending_member_id,
            full_name:
              pa.profiles?.display_name ||
              pa.profiles?.full_name ||
              pa.pending_members?.display_name ||
              "Unknown User",
            amount: pa.amount,
            original_amount: pa.original_amount,
            isPending: pa.pending_member_id !== null,
          })
        ),
      }));
      setAllExpenses(processedExpenses);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Delete an expense (only for creators)
  const handleDeleteExpense = async (expenseId: string) => {
    setDeletingExpenseId(expenseId);
    try {
      // First delete payer_amounts (should cascade, but being explicit)
      const { error: payerError } = await supabase
        .from("payer_amounts")
        .delete()
        .eq("expense_id", expenseId);

      if (payerError) throw payerError;

      // Then delete the expense
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      toast({
        title: "Expense deleted",
        description: "The expense has been removed",
      });

      // Close the popover and refresh
      setOpenPopoverId(null);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    } finally {
      setDeletingExpenseId(null);
    }
  };

  // Helper function to format currency
  const formatCurrency = (
    amount: number,
    currency: "JPY" | "USD" | string
  ): string => {
    if (currency === "JPY") {
      return `¥${Math.round(amount).toLocaleString()}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  // Helper function to get initials
  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="container mx-auto">
      {groupMembers.length > 0 && (
        <div className="flex flex-col gap-4 pb-6">
          <ShowTotals expenses={allExpenses!} groupMembers={groupMembers} />
          <ShowTotalsFinal
            expenses={allExpenses!}
            groupMembers={groupMembers}
          />
        </div>
      )}

      <h1 className="text-lg text-left font-bold tracking-tighter pb-2">
        All Expenses
      </h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Expense</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allExpenses?.map((expense) => (
            <Popover
              key={expense.id}
              open={openPopoverId === expense.id}
              onOpenChange={(open) =>
                setOpenPopoverId(open ? expense.id : null)
              }
            >
              <PopoverTrigger asChild>
                <TableRow className="text-left cursor-pointer hover:bg-muted/50">
                  <TableCell className="pr-0">
                    <Avatar className="h-7 w-7" title={expense.creatorName}>
                      <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                        {getInitials(expense.creatorName)}
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{expense.expenseName}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(
                      expense.original_amount,
                      expense.original_currency
                    )}
                    {expense.original_currency === "JPY" && (
                      <span className="text-xs text-muted-foreground block sm:inline sm:ml-1">
                        (${expense.cost.toFixed(2)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">{expense.date}</TableCell>
                  <TableCell className="hidden lg:table-cell">{expense.category}</TableCell>
                  <TableCell className="hidden lg:table-cell">{expense.location}</TableCell>
                </TableRow>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Payers</h4>
                    <p className="text-sm text-muted-foreground">
                      List of people who owe money for this expense
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {expense.payers.length > 1 ? (
                      expense.payers.map(
                        (payer, index) =>
                          payer.id !== expense.creator && (
                            <div
                              key={index}
                              className="grid grid-cols-2 items-center gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <div className="font-medium">
                                  {payer.full_name}
                                </div>
                              </div>
                              <div className="text-right font-medium">
                                {/* Show in USD (base currency) */}$
                                {payer.amount.toFixed(2)}
                              </div>
                            </div>
                          )
                      )
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No additional payers
                      </div>
                    )}
                  </div>
                  {expense.receipt_url && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          window.open(expense.receipt_url, "_blank")
                        }
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Receipt
                      </Button>
                    </div>
                  )}

                  {/* Delete button - only show for expense creator */}
                  {currentUserId === expense.creator && (
                    <div className="pt-2 border-t">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="w-full"
                            disabled={deletingExpenseId === expense.id}
                          >
                            {deletingExpenseId === expense.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Expense
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete this expense?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "
                              {expense.expenseName}" and remove all associated
                              payment records.
                              <br />
                              <br />
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Paperclip, Loader2, DollarSign, RefreshCw, Clock, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useToast } from "../hooks/use-toast";
import supabase from "../lib/createClient";
import { Session } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  getJPYtoUSDRate,
  convertToUSD,
  ExchangeRateResult,
} from "../lib/exchangeRate";

import { ExpenseItem, Currency, GroupMember } from "../lib/types";
import { ReceiptOCR } from "./ReceiptOCR";
import { InviteMember } from "./Settings/InviteMember";

// Yen icon component since lucide doesn't have one
const YenIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 2v20" />
    <path d="M17 8H7" />
    <path d="M17 12H7" />
    <path d="M6 20l6-8 6 8" />
  </svg>
);

interface TravelCostCalculatorProps {
  groupMembers: GroupMember[];
  locations: string[];
  categories: string[];
  session: Session;
  onExpenseAdded?: () => void;
  onMemberInvited?: () => void;
}

export default function TravelCostCalculator({
  groupMembers,
  locations,
  categories,
  session,
  onExpenseAdded,
  onMemberInvited,
}: TravelCostCalculatorProps) {
  const [itemName, setItemName] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [payers, setPayers] = useState<
    Record<string, { selected: boolean; amount?: number }>
  >(() =>
    Object.fromEntries(
      groupMembers.map((member) => [member.id, { selected: false }])
    )
  );
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "uploading" | "saving" | "success" | "error"
  >("idle");
  const [activeTab, setActiveTab] = useState("manual-input");

  const { toast } = useToast();

  // Currency state - changed default to JPY for Japan trip
  const [currency, setCurrency] = useState<Currency>("JPY");

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<ExchangeRateResult | null>(
    null
  );
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  // Fetch exchange rate on mount
  useEffect(() => {
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setIsLoadingRate(true);
    try {
      const rate = await getJPYtoUSDRate();
      setExchangeRate(rate);
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
      toast({
        title: "Exchange rate warning",
        description: "Using fallback exchange rate. Rates may not be current.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRate(false);
    }
  };

  const calculateSplitAmounts = (
    totalAmount: number,
    count: number
  ): number[] => {
    // Convert to cents to avoid floating point precision issues
    const totalCents = Math.round(totalAmount * 100);
    const baseAmountCents = Math.floor(totalCents / count);
    const remainderCents = totalCents % count;

    // Initialize all amounts with the base amount
    const amounts = Array(count).fill(baseAmountCents);

    // Distribute the remaining cents
    for (let i = 0; i < remainderCents; i++) {
      amounts[i]++;
    }

    // Convert back to dollars/yen with 2 decimal places
    return amounts.map((cents) => Number((cents / 100).toFixed(2)));
  };

  const handleSelectAll = (checked: boolean | "indeterminate") => {
    if (checked) {
      const splitAmounts = calculateSplitAmounts(
        parseFloat(itemCost || "0"),
        groupMembers.length
      );

      setPayers(
        Object.fromEntries(
          groupMembers.map((member, index) => [
            member.id,
            {
              selected: true,
              amount: splitAmounts[index],
            },
          ])
        )
      );
    } else {
      setPayers(
        Object.fromEntries(
          groupMembers.map((member) => [
            member.id,
            { selected: false, amount: undefined },
          ])
        )
      );
    }
  };

  const handleAmountChange = (id: string, amount: string) => {
    setPayers((prev) => ({
      ...prev,
      [id]: { ...prev[id], amount: amount ? parseFloat(amount) : undefined },
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) {
        // 20MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 20MB.",
          variant: "destructive",
        });
        return;
      }
      setAttachment(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (itemName.trim().length === 0) {
      newErrors.itemName = "Item name is required";
    } else if (itemName.trim().length > 100) {
      newErrors.itemName = "Item name must be 100 characters or less";
    }

    if (itemCost.trim().length === 0) {
      newErrors.itemCost = "Cost is required";
    } else {
      const cost = parseFloat(itemCost);
      if (isNaN(cost) || cost <= 0) {
        newErrors.itemCost = "Cost must be a positive number";
      } else if (cost > 10000000) {
        // Increased for JPY (100,000 USD equivalent)
        newErrors.itemCost = "Cost must be less than or equal to 10,000,000";
      }
    }

    if (!location) {
      newErrors.location = "Location is required";
    }

    if (!category) {
      newErrors.category = "Category is required";
    }

    const selectedPayers = Object.entries(payers).filter(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ([_, value]) => value.selected
    );
    if (selectedPayers.length === 0) {
      newErrors.payers = "At least one payer must be selected";
    }

    const totalAmount = selectedPayers.reduce(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (sum, [_, value]) => sum + (value.amount || 0),
      0
    );
    if (Math.abs(totalAmount - parseFloat(itemCost)) > 0.01) {
      newErrors.payers = "Total amounts must equal the expense cost";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file);

      if (uploadError) {
        toast({
          title: "Upload failed",
          description: uploadError.message,
          variant: "destructive",
        });
        return null;
      }

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      let receiptUrl: string | null = null;
      if (attachment) {
        setSubmitStatus("uploading");
        receiptUrl = await uploadReceipt(attachment);
        if (!receiptUrl) {
          setSubmitStatus("error");
          return;
        }
      }

      setSubmitStatus("saving");

      // Convert amount to USD (base currency) before saving
      const originalAmount = parseFloat(itemCost);
      const { amountUSD, rateUsed } = await convertToUSD(
        originalAmount,
        currency
      );

      // First, insert the expense (payers are stored in payer_amounts table, not here)
      const expenseInsert = {
        name: itemName,
        cost: amountUSD, // Save in USD (base currency)
        location,
        category,
        creator: session?.user.id,
        receipt_url: receiptUrl || undefined,
        original_currency: currency,
        original_amount: originalAmount,
        exchange_rate_used: rateUsed,
      };

      console.log("Inserting expense:", expenseInsert);
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .insert(expenseInsert)
        .select()
        .single();

      if (expenseError) {
        console.error("Expense insert error:", expenseError);
        throw expenseError;
      }

      // Then, insert the payer amounts (also convert to USD)
      const payerAmounts = await Promise.all(
        Object.entries(payers)
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          .filter(([_, value]) => value.selected)
          .map(async ([memberId, value]) => {
            const originalPayerAmount =
              value.amount ||
              parseFloat(itemCost) /
                Object.values(payers).filter((p) => p.selected).length;
            const { amountUSD: payerAmountUSD } = await convertToUSD(
              originalPayerAmount,
              currency
            );

            // Check if this is a pending member
            const member = groupMembers.find((m) => m.id === memberId);
            const isPending = member?.isPending ?? false;

            return {
              expense_id: expenseData.id,
              user_id: isPending ? null : memberId,
              pending_member_id: isPending ? memberId : null,
              amount: payerAmountUSD,
              original_amount: originalPayerAmount,
            };
          })
      );

      console.log("Inserting payer amounts:", payerAmounts);
      const { error: amountsError } = await supabase
        .from("payer_amounts")
        .insert(payerAmounts);

      if (amountsError) {
        console.error("Payer amounts insert error:", amountsError);
        throw amountsError;
      }

      setSubmitStatus("success");
      toast({
        title: "Success",
        description: "Expense added successfully",
      });

      // Reset form
      setItemName("");
      setItemCost("");
      setLocation("");
      setCategory("");
      setPayers(
        Object.fromEntries(
          groupMembers.map((member) => [member.id, { selected: false }])
        )
      );
      setAttachment(null);
      setErrors({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSubmitStatus("idle");

      // Notify parent that expense was added
      onExpenseAdded?.();
    } catch (error) {
      setSubmitStatus("error");
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    }
  };

  // Calculate USD equivalent for display
  const getUSDEquivalent = (): string => {
    if (!exchangeRate || currency === "USD") return "";
    const amount = parseFloat(itemCost || "0");
    const usdAmount = amount / exchangeRate.rate;
    return `$${usdAmount.toFixed(2)}`;
  };

  // Calculate JPY equivalent for display
  const getJPYEquivalent = (): string => {
    if (!exchangeRate || currency === "JPY") return "";
    const amount = parseFloat(itemCost || "0");
    const jpyAmount = Math.round(amount * exchangeRate.rate);
    return `¥${jpyAmount.toLocaleString()}`;
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="w-full max-w-2xl mx-auto">
        <CollapsibleTrigger asChild>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-start">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Expense
              </CardTitle>
              {/* Exchange rate indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                {isLoadingRate ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading exchange rate...
                  </span>
                ) : exchangeRate ? (
                  <span>
                    1 USD = ¥{exchangeRate.rate.toFixed(2)}
                    {exchangeRate.isStale && " (cached)"}
                  </span>
                ) : null}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual-input">Cost Input</TabsTrigger>
            <TabsTrigger value="receipt-reader">Receipt Scanner</TabsTrigger>
          </TabsList>

          <TabsContent value="manual-input">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
              {/* Item Name - full width */}
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="itemName" className="text-left">Item Name</Label>
                <Input
                  id="itemName"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                  placeholder="e.g. Dinner at Ichiran"
                  aria-invalid={!!errors.itemName}
                  aria-describedby={
                    errors.itemName ? "itemName-error" : undefined
                  }
                />
                {errors.itemName && (
                  <p id="itemName-error" className="text-sm text-red-500">
                    {errors.itemName}
                  </p>
                )}
              </div>

              {/* Cost - full width with better proportions */}
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="itemCost" className="text-left">Cost</Label>
                <div className="flex w-full gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Input
                      id="itemCost"
                      type="number"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      required
                      min="0"
                      step={currency === "JPY" ? "1" : "0.01"}
                      placeholder={currency === "JPY" ? "1000" : "10.00"}
                      className="pr-8"
                      aria-invalid={!!errors.itemCost}
                      aria-describedby={
                        errors.itemCost ? "itemCost-error" : undefined
                      }
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {currency === "JPY" ? (
                        <YenIcon className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <Select
                    value={currency}
                    onValueChange={(value: Currency) => setCurrency(value)}
                  >
                    <SelectTrigger className="w-[72px] flex-shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {itemCost && exchangeRate && (
                  <p className="text-xs text-muted-foreground">
                    {currency === "JPY"
                      ? `≈ ${getUSDEquivalent()}`
                      : `≈ ${getJPYEquivalent()}`}
                  </p>
                )}
                {errors.itemCost && (
                  <p id="itemCost-error" className="text-sm text-red-500">
                    {errors.itemCost}
                  </p>
                )}
              </div>

              {/* Location & Category - stack on mobile, side by side on larger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="location" className="text-left">Location</Label>
                  <Select value={location} onValueChange={setLocation} required>
                    <SelectTrigger
                      id="location"
                      aria-invalid={!!errors.location}
                      aria-describedby={
                        errors.location ? "location-error" : undefined
                      }
                    >
                      <SelectValue placeholder="Select Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.location && (
                    <p id="location-error" className="text-sm text-red-500">
                      {errors.location}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category" className="text-left">Category</Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger
                      id="category"
                      aria-invalid={!!errors.category}
                      aria-describedby={
                        errors.category ? "category-error" : undefined
                      }
                    >
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p id="category-error" className="text-sm text-red-500">
                      {errors.category}
                    </p>
                  )}
                </div>
              </div>
              {/* Who should be charged */}
              <div className="flex flex-col gap-2 text-left">
                <div className="flex items-center justify-between">
                  <Label className="text-left">Split between</Label>
                  {onMemberInvited && (
                    <InviteMember
                      currentUserId={session.user.id}
                      onMemberInvited={onMemberInvited}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-0">
                  {/* Split Equally option */}
                  <div className="flex items-center gap-3 py-2 px-1">
                    <Checkbox
                      id="selectAll"
                      checked={
                        Object.values(payers).length > 0 &&
                        Object.values(payers).every((p) => p.selected)
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all payers"
                    />
                    <Label htmlFor="selectAll" className="flex-1 cursor-pointer font-medium text-sm">
                      Split Equally
                    </Label>
                  </div>
                  {/* Individual members */}
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 py-2 px-1">
                      <Checkbox
                        id={member.id}
                        checked={payers[member.id]?.selected}
                        onCheckedChange={(checked) =>
                          setPayers((prev) => {
                            const newPayers = {
                              ...prev,
                              [member.id]: {
                                ...prev[member.id],
                                selected: checked === true,
                                amount: undefined,
                              },
                            };

                            const selectedPayers = Object.values(
                              newPayers
                            ).filter((p) => p.selected);
                            if (selectedPayers.length > 0) {
                              const splitAmounts = calculateSplitAmounts(
                                parseFloat(itemCost || "0"),
                                selectedPayers.length
                              );

                              let amountIndex = 0;
                              return Object.fromEntries(
                                Object.entries(newPayers).map(
                                  ([key, value]) => [
                                    key,
                                    {
                                      ...value,
                                      amount: value.selected
                                        ? splitAmounts[amountIndex++]
                                        : undefined,
                                    },
                                  ]
                                )
                              );
                            }

                            return newPayers;
                          })
                        }
                      />
                      <Label htmlFor={member.id} className="flex items-center gap-1.5 flex-1 cursor-pointer text-sm">
                        {member.display_name || member.full_name}
                        {member.isPending && (
                          <Clock className="h-3.5 w-3.5 text-yellow-500" title="Invited but not signed up yet" />
                        )}
                      </Label>
                      {payers[member.id]?.selected && (
                        <Input
                          type="number"
                          value={payers[member.id]?.amount?.toString() || ""}
                          onChange={(e) =>
                            handleAmountChange(member.id, e.target.value)
                          }
                          className="w-20 h-8 text-right"
                          placeholder="0"
                          min="0"
                          step={currency === "JPY" ? "1" : "0.01"}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {errors.payers && (
                  <p className="text-sm text-red-500">{errors.payers}</p>
                )}
              </div>

              {/* Attachment */}
              <div className="flex flex-col gap-2 text-left">
                <Label htmlFor="attachment" className="text-left">Attachment (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="attachment"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/*,.pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    {attachment ? "Change File" : "Upload File"}
                  </Button>
                  {attachment && (
                    <span className="text-sm text-muted-foreground">
                      {attachment.name}
                    </span>
                  )}
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="receipt-reader">
            <ReceiptOCR
              groupMembers={groupMembers}
              onExpenseData={async (data) => {
                // Auto-fill the form with OCR data
                setItemName(data.name);
                setItemCost(data.total.toString());
                setCurrency(data.currency);

                // Set up payers from the OCR assignment
                const newPayers: Record<
                  string,
                  { selected: boolean; amount?: number }
                > = {};
                groupMembers.forEach((member) => {
                  const amount = data.payerAmounts[member.id];
                  newPayers[member.id] = {
                    selected: amount !== undefined && amount > 0,
                    amount: amount,
                  };
                });
                setPayers(newPayers);

                // Switch to manual input tab to review/submit
                setActiveTab("manual-input");
                toast({
                  title: "Receipt processed",
                  description:
                    "Review the details and click Add Expense to save.",
                });
              }}
            />
          </TabsContent>
        </Tabs>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              onClick={handleSubmit}
              disabled={submitStatus !== "idle" && submitStatus !== "error"}
            >
              {submitStatus === "idle" && "Add Expense"}
              {submitStatus === "uploading" && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Receipt...
                </>
              )}
              {submitStatus === "saving" && (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Expense...
                </>
              )}
              {submitStatus === "success" && "Success!"}
              {submitStatus === "error" && "Error - Try Again"}
            </Button>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

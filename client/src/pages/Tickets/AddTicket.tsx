import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, AlertCircle, Clock, User, Sparkles, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format, addDays, addWeeks } from "date-fns";

const URGENCY_OPTIONS = [
  { value: "low", label: "Low", color: "text-slate-700", bgColor: "bg-slate-200" },
  { value: "medium", label: "Medium", color: "text-yellow-700", bgColor: "bg-yellow-200" },
  { value: "high", label: "High", color: "text-orange-700", bgColor: "bg-orange-200" },
  { value: "urgent", label: "Urgent", color: "text-red-700", bgColor: "bg-red-200" },
];

export default function AddTicket() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [notifyDate, setNotifyDate] = useState("");
  const [isGeneratingSubject, setIsGeneratingSubject] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });
  
  // Memoize notify date options to prevent recalculation on every render
  const notifyDateOptions = useMemo(() => {
    const today = new Date();
    return [
      { value: format(addDays(today, 1), "yyyy-MM-dd"), label: "Tomorrow" },
      { value: format(addDays(today, 2), "yyyy-MM-dd"), label: "In 2 days" },
      { value: format(addDays(today, 3), "yyyy-MM-dd"), label: "In 3 days" },
      { value: format(addDays(today, 5), "yyyy-MM-dd"), label: "In 5 days" },
      { value: format(addWeeks(today, 1), "yyyy-MM-dd"), label: "In 1 week" },
      { value: format(addWeeks(today, 2), "yyyy-MM-dd"), label: "In 2 weeks" },
      { value: format(addWeeks(today, 3), "yyyy-MM-dd"), label: "In 3 weeks" },
      { value: format(addWeeks(today, 4), "yyyy-MM-dd"), label: "In 1 month" },
    ];
  }, []);

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tickets", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
      navigate("/tickets");
    },
    onError: (error: any) => {
      console.error("Ticket creation error:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers.filter((customer: any) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 8);

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };
  
  const selectedUrgency = URGENCY_OPTIONS.find(opt => opt.value === urgency);
  const selectedNotifyLabel = notifyDateOptions.find(opt => opt.value === notifyDate)?.label || 
                               (notifyDate === "NONE" ? "No reminder" : 
                                notifyDate === "custom" ? "Custom date..." : 
                                notifyDate ? format(new Date(notifyDate), "MMM d, yyyy") : "");

  const generateSubject = async (descriptionText: string) => {
    if (!descriptionText.trim() || descriptionText.length < 10) return;

    setIsGeneratingSubject(true);
    try {
      const response = await apiRequest("POST", "/api/tickets/generate-subject", {
        description: descriptionText,
      });

      const generatedSubject = response.subject || "";
      if (generatedSubject) {
        setSubject(generatedSubject);
      }
    } catch (error) {
      console.error("Error generating subject:", error);
      toast({
        title: "AI Generation Failed",
        description: "Could not auto-generate subject. Please enter manually.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSubject(false);
    }
  };

  // Auto-generate subject when description changes (debounced)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (description.trim().length > 20 && !subject) {
      debounceTimerRef.current = setTimeout(() => {
        generateSubject(description);
      }, 1500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [description]);

  const handleManualGenerate = () => {
    if (description.trim().length < 10) {
      toast({
        title: "Need More Details",
        description: "Please write at least a few sentences in the description first.",
        variant: "destructive",
      });
      return;
    }
    generateSubject(description);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createTicketMutation.mutate({
      customerId: selectedCustomer?.id || null,
      title: subject || "Untitled Ticket",
      description: description || "",
      priority: urgency,
      status: "open",
      category: "general",
      dueDate: notifyDate && notifyDate !== "NONE" && notifyDate !== "custom" ? notifyDate : null,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tickets">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Ticket</h1>
          <p className="text-slate-600">Quick ticket entry for customer support</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Ticket Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Customer Autocomplete */}
            <div className="space-y-2">
              <Label htmlFor="customer" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="customer"
                  placeholder="Start typing customer name..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                    if (!e.target.value) setSelectedCustomer(null);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full"
                  data-testid="input-customer-search"
                />
                {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-64 overflow-auto">
                    {filteredCustomers.map((customer: any) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleCustomerSelect(customer)}
                        className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <span className="font-medium">{customer.name}</span>
                        {customer.email && (
                          <span className="text-xs text-slate-500">{customer.email}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="text-sm text-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded border border-slate-200 dark:border-slate-700">
                  Selected: <span className="font-medium">{selectedCustomer.name}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-base font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the situation in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                className="resize-none text-base"
                data-testid="textarea-description"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject" className="text-base font-semibold">
                  Subject
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleManualGenerate}
                  disabled={isGeneratingSubject || description.length < 10}
                  className="h-7 text-xs"
                >
                  {isGeneratingSubject ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Generate
                    </>
                  )}
                </Button>
              </div>
              <Input
                id="subject"
                placeholder="AI will auto-generate from description..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="text-lg"
                data-testid="input-subject"
              />
              {isGeneratingSubject && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                  AI is generating a concise subject...
                </p>
              )}
            </div>

            {/* Urgency and Notify Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Urgency */}
              <div className="space-y-2">
                <Label htmlFor="urgency" className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Urgency
                </Label>
                <Select value={urgency} onValueChange={setUrgency}>
                  <SelectTrigger id="urgency" data-testid="select-urgency" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {URGENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedUrgency && (
                  <div className={`flex items-center gap-2 text-sm font-medium ${selectedUrgency.color} mt-1`}>
                    <span className={`w-2 h-2 rounded-full ${selectedUrgency.bgColor}`}></span>
                    {selectedUrgency.label} priority selected
                  </div>
                )}
              </div>

              {/* Notify Date */}
              <div className="space-y-2">
                <Label htmlFor="notifyDate" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Notify Date (Optional)
                </Label>
                <Select value={notifyDate} onValueChange={setNotifyDate}>
                  <SelectTrigger id="notifyDate" data-testid="select-notify-date" className="h-10">
                    <SelectValue placeholder="Set reminder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No reminder</SelectItem>
                    {notifyDateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom date...</SelectItem>
                  </SelectContent>
                </Select>
                {selectedNotifyLabel && notifyDate && notifyDate !== "NONE" && (
                  <p className="text-sm text-slate-600 mt-1">
                    Notify on: <span className="font-medium">{selectedNotifyLabel}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Custom date picker if selected */}
            {notifyDate === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customDate">Custom Notify Date</Label>
                <Input
                  id="customDate"
                  type="date"
                  onChange={(e) => setNotifyDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  data-testid="input-custom-date"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={createTicketMutation.isPending}
                data-testid="button-create-ticket"
              >
                {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
              </Button>
              <Link href="/tickets">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

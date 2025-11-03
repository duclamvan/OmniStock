import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface PopularCarton {
  id: string;
  name: string;
  innerLengthCm: string;
  innerWidthCm: string;
  innerHeightCm: string;
  maxWeightKg: string;
  usageCount: number;
  lastUsedAt: string | null;
  score: number;
}

interface CartonTypeAutocompleteProps {
  value: string;
  onValueChange: (value: string, cartonData?: PopularCarton) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowFreeText?: boolean;
}

export function CartonTypeAutocomplete({
  value,
  onValueChange,
  placeholder = "Select or type carton...",
  disabled = false,
  className,
  allowFreeText = true,
}: CartonTypeAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [displayValue, setDisplayValue] = useState(value);

  const { data: popularCartons = [], isLoading } = useQuery<PopularCarton[]>({
    queryKey: ['/api/cartons/popular'],
  });

  useEffect(() => {
    // If value looks like a UUID (carton ID), look up the carton name
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    
    if (value === "non-company") {
      setDisplayValue("Non-Company Carton");
    } else if (isUUID && popularCartons.length > 0) {
      const carton = popularCartons.find(c => c.id === value);
      if (carton) {
        setDisplayValue(carton.name);
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue(value);
    }
  }, [value, popularCartons]);

  const mostUsed = popularCartons.slice(0, 5);
  const allCartons = popularCartons;

  const fuzzySearch = (text: string, query: string): boolean => {
    if (!query) return true;
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    
    if (normalizedText.includes(normalizedQuery)) {
      return true;
    }
    
    let queryIndex = 0;
    for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
      if (normalizedText[i] === normalizedQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === normalizedQuery.length;
  };

  const filteredMostUsed = mostUsed.filter((carton) =>
    fuzzySearch(carton.name, searchValue)
  );

  const filteredAllCartons = allCartons.filter((carton) =>
    fuzzySearch(carton.name, searchValue)
  );

  const handleSelect = (cartonId: string) => {
    const selectedCarton = allCartons.find((c) => c.id === cartonId);
    if (selectedCarton) {
      setDisplayValue(selectedCarton.name);
      onValueChange(selectedCarton.id, selectedCarton);
      setOpen(false);
      setSearchValue("");
    }
  };

  const handleFreeTextInput = (text: string) => {
    setDisplayValue(text);
    setSearchValue(text);
    if (allowFreeText) {
      onValueChange(text, undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowFreeText && searchValue) {
      e.preventDefault();
      setDisplayValue(searchValue);
      onValueChange(searchValue, undefined);
      setOpen(false);
      setSearchValue("");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
            data-testid="button-carton-selector"
          >
            <span className="truncate">
              {displayValue || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start" data-testid="popover-carton-list">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search cartons..."
              value={searchValue}
              onValueChange={handleFreeTextInput}
              onKeyDown={handleKeyDown}
              data-testid="input-carton-search"
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm" data-testid="text-loading">
                  Loading cartons...
                </div>
              ) : (
                <>
                  {/* Non-Company Carton Option - Always Visible */}
                  <CommandGroup data-testid="group-non-company">
                    <CommandItem
                      value="non-company"
                      onSelect={() => {
                        setDisplayValue("Non-Company Carton");
                        onValueChange("non-company", undefined);
                        setOpen(false);
                        setSearchValue("");
                      }}
                      data-testid="item-carton-non-company"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === "non-company" || displayValue === "Non-Company Carton" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-gray-600">Non-Company Carton</span>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                  
                  {(filteredMostUsed.length > 0 || filteredAllCartons.length > 0) && <CommandSeparator />}
                  
                  {filteredMostUsed.length === 0 && filteredAllCartons.length === 0 ? (
                    <CommandEmpty data-testid="text-no-results">
                      {allowFreeText ? (
                        <div className="py-2">
                          <p className="text-sm text-muted-foreground mb-2">
                            No cartons found.
                          </p>
                          {searchValue && (
                            <p className="text-sm">
                              Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted rounded">Enter</kbd> to use "{searchValue}" as non-company carton
                            </p>
                          )}
                        </div>
                      ) : (
                        "No cartons found."
                      )}
                    </CommandEmpty>
                  ) : (
                    <>
                      {filteredMostUsed.length > 0 && (
                        <CommandGroup heading="Most Used" data-testid="group-most-used">
                          {filteredMostUsed.map((carton) => (
                            <CommandItem
                              key={carton.id}
                              value={carton.id}
                              onSelect={handleSelect}
                              data-testid={`item-carton-${carton.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  displayValue === carton.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{carton.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {carton.innerLengthCm} × {carton.innerWidthCm} × {carton.innerHeightCm} cm, Max: {carton.maxWeightKg} kg
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground ml-2">
                                Used {carton.usageCount}×
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}

                      {filteredMostUsed.length > 0 && filteredAllCartons.length > filteredMostUsed.length && (
                        <CommandSeparator />
                      )}

                      {filteredAllCartons.length > 0 && (
                        <CommandGroup heading="All Cartons" data-testid="group-all-cartons">
                          {filteredAllCartons
                            .filter((carton) => !mostUsed.some((mu) => mu.id === carton.id))
                            .map((carton) => (
                              <CommandItem
                                key={carton.id}
                                value={carton.id}
                                onSelect={handleSelect}
                                data-testid={`item-carton-${carton.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    displayValue === carton.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col flex-1">
                                  <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{carton.name}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {carton.innerLengthCm} × {carton.innerWidthCm} × {carton.innerHeightCm} cm, Max: {carton.maxWeightKg} kg
                                  </span>
                                </div>
                                {carton.usageCount > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    Used {carton.usageCount}×
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}

                      {allowFreeText && searchValue && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Custom" data-testid="group-custom">
                            <CommandItem
                              value="custom"
                              onSelect={() => {
                                setDisplayValue(searchValue);
                                onValueChange(searchValue, undefined);
                                setOpen(false);
                                setSearchValue("");
                              }}
                              data-testid="item-carton-custom"
                            >
                              <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                              <span>Use "{searchValue}" (non-company carton)</span>
                            </CommandItem>
                          </CommandGroup>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Category } from "@shared/schema";

export const CATEGORY_SENTINEL_NO_CHANGE = -999999;

interface CategoryComboboxProps {
  categories: Category[];
  value?: number | null;
  onValueChange: (value: number | null | undefined) => void;
  type?: Category['type'];
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  noneSentinel?: number | null | undefined;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
}

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  type,
  placeholder = "Select a category",
  allowNone = true,
  noneLabel = "No category",
  noneSentinel = null,
  allowClear = false,
  clearLabel = "Clear category",
  disabled = false,
  className,
  testId = "category-combobox",
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);

  // Filter and organize categories hierarchically
  const typeFilteredCategories = categories.filter(c => !type || c.type === type);
  
  // Build a map of category id to category for parent lookups
  const categoryMap = new Map<number, Category>();
  typeFilteredCategories.forEach(cat => {
    categoryMap.set(cat.id, cat);
  });
  
  // Helper to get full display name with parent prefix
  const getFullCategoryName = (category: Category): string => {
    if (category.parentCategoryId) {
      const parent = categoryMap.get(category.parentCategoryId);
      if (parent) {
        return `${parent.name} - ${category.name}`;
      }
    }
    return category.name;
  };
  
  // Build a map for quick child lookups
  const childrenMap = new Map<number | null, Category[]>();
  typeFilteredCategories.forEach(cat => {
    const key = cat.parentCategoryId;
    if (!childrenMap.has(key)) {
      childrenMap.set(key, []);
    }
    childrenMap.get(key)!.push(cat);
  });

  // Sort children within each parent alphabetically
  childrenMap.forEach(children => {
    children.sort((a, b) => a.name.localeCompare(b.name));
  });

  // Recursively build hierarchical list
  const buildHierarchy = (parentId: number | null): Category[] => {
    const result: Category[] = [];
    const children = childrenMap.get(parentId) || [];
    
    children.forEach(child => {
      result.push(child);
      // Recursively add descendants
      result.push(...buildHierarchy(child.id));
    });
    
    return result;
  };

  const hierarchicalCategories = buildHierarchy(null);
  const selectedCategory = (value !== undefined && value !== null) ? categories.find(c => c.id === value) : null;
  
  // Determine what to show in the trigger
  const getTriggerLabel = () => {
    // Show full category name (with parent prefix) if selected
    if (selectedCategory) return getFullCategoryName(selectedCategory);
    
    // Check for explicitly selected "clear" option (separate from "none")
    if (value === null && allowClear && noneSentinel !== null) {
      return clearLabel;
    }
    
    // Check for explicitly selected "none" sentinel
    if (value === noneSentinel && allowNone && value !== undefined) {
      return noneLabel;
    }
    
    // Default to placeholder for pristine state (undefined)
    return placeholder;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
          disabled={disabled}
          data-testid={testId}
        >
          <span className="truncate">{getTriggerLabel()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => {
                    onValueChange(noneSentinel);
                    setOpen(false);
                  }}
                  data-testid={`${testId}-option-none`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === noneSentinel ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {noneLabel}
                </CommandItem>
              )}
              {allowClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                  data-testid={`${testId}-option-clear`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {clearLabel}
                </CommandItem>
              )}
              {hierarchicalCategories.map((category) => {
                const isSubcategory = category.parentCategoryId !== null;
                const displayName = getFullCategoryName(category);
                return (
                  <CommandItem
                    key={category.id}
                    value={displayName}
                    onSelect={() => {
                      onValueChange(category.id);
                      setOpen(false);
                    }}
                    data-testid={`${testId}-option-${category.id}`}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === category.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className={cn(isSubcategory && "ml-4")}>
                      {displayName}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import TonIcon from "./ton-icon";

interface FilterModalProps {
  trigger: React.ReactNode;
  title?: string;
  onApply?: (filters: { from: string; to: string }) => void;
}

const FilterModal = ({ trigger, title = "Price Filter", onApply }: FilterModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fromPrice, setFromPrice] = useState("");
  const [toPrice, setToPrice] = useState("");

  const handleApply = () => {
    onApply?.({ from: fromPrice, to: toPrice });
    setIsOpen(false);
  };

  const handleClear = () => {
    setFromPrice("");
    setToPrice("");
    onApply?.({ from: "", to: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-auto rounded-xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-text-primary">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* From Price */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              From (TON)
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={fromPrice}
                onChange={(e) => setFromPrice(e.target.value)}
                className="pr-12"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <TonIcon size="xs" />
                <span className="text-xs text-text-muted">TON</span>
              </div>
            </div>
          </div>

          {/* To Price */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              To (TON)
            </label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={toPrice}
                onChange={(e) => setToPrice(e.target.value)}
                className="pr-12"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <TonIcon size="xs" />
                <span className="text-xs text-text-muted">TON</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={handleClear}
            className="flex-1"
          >
            Clear
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1"
          >
            Apply
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterModal;
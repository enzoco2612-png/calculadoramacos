import type { CalculatorEvent } from "../calculator";

interface MemoryControlsProps {
  onEvent: (event: CalculatorEvent) => void;
}

const MEMORY_KEYS = [
  {
    id: "memory-add",
    label: "m+",
    ariaLabel: "Memory Add",
    event: { type: "memoryAdd" } as const,
  },
  {
    id: "memory-subtract",
    label: "m-",
    ariaLabel: "Memory Subtract",
    event: { type: "memorySubtract" } as const,
  },
  {
    id: "memory-recall",
    label: "mr",
    ariaLabel: "Memory Recall",
    event: { type: "memoryRecall" } as const,
  },
] as const;

export function MemoryControls({ onEvent }: MemoryControlsProps) {
  return (
    <div className="memory-controls" role="group" aria-label="Memory Controls">
      {MEMORY_KEYS.map((key) => (
        <button
          key={key.id}
          type="button"
          className="memory-key"
          aria-label={key.ariaLabel}
          data-key={key.id}
          onClick={() => onEvent(key.event)}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}

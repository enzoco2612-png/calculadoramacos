import type { ReactNode } from "react";
import type { CalculatorEvent, Operator } from "../calculator";

type KeyVariant = "function" | "number" | "operator";

interface KeyDef {
  id: string;
  label: ReactNode;
  variant: KeyVariant;
  event: CalculatorEvent | null;
  ariaLabel: string;
  className?: string;
}

const KEYS: KeyDef[][] = [
  [
    {
      id: "backspace",
      label: <BackspaceIcon />,
      variant: "function",
      event: { type: "backspace" },
      ariaLabel: "Backspace",
    },
    {
      id: "ac",
      label: "AC",
      variant: "function",
      event: { type: "clear" },
      ariaLabel: "All Clear",
      className: "calc-key--ac",
    },
    {
      id: "percent",
      label: "%",
      variant: "function",
      event: { type: "percent" },
      ariaLabel: "Percentual",
      className: "calc-key--percent",
    },
    {
      id: "divide",
      label: "÷",
      variant: "operator",
      event: { type: "operator", op: "÷" satisfies Operator },
      ariaLabel: "Dividir",
      className: "calc-key--op-symbol",
    },
  ],
  [
    digit("7"),
    digit("8"),
    digit("9"),
    {
      id: "multiply",
      label: "×",
      variant: "operator",
      event: { type: "operator", op: "×" },
      ariaLabel: "Multiplicar",
    },
  ],
  [
    digit("4"),
    digit("5"),
    digit("6"),
    {
      id: "subtract",
      label: <span className="calc-key__minus" aria-hidden="true" />,
      variant: "operator",
      event: { type: "operator", op: "-" },
      ariaLabel: "Subtrair",
    },
  ],
  [
    digit("1"),
    digit("2"),
    digit("3"),
    {
      id: "add",
      label: "+",
      variant: "operator",
      event: { type: "operator", op: "+" },
      ariaLabel: "Somar",
      className: "calc-key--op-symbol",
    },
  ],
  [
    {
      id: "sign",
      label: "+/−",
      variant: "number",
      event: { type: "sign" },
      ariaLabel: "Trocar sinal",
      className: "calc-key--sign",
    },
    digit("0"),
    {
      id: "decimal",
      label: ",",
      variant: "number",
      event: { type: "decimal" },
      ariaLabel: "Vírgula decimal",
    },
    {
      id: "equals",
      label: "=",
      variant: "operator",
      event: { type: "equals" },
      ariaLabel: "Igual",
      className: "calc-key--equals",
    },
  ],
];

function digit(d: string): KeyDef {
  return {
    id: `digit-${d}`,
    label: d,
    variant: "number",
    event: { type: "digit", digit: d },
    ariaLabel: d,
  };
}

function BackspaceIcon() {
  return (
    <svg
      className="calc-key__backspace"
      width="32"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M8 4.8l-5.8 7.2 5.8 7.2h12.3c1.1 0 1.9-0.8 1.9-1.9v-10.6c0-1.1-0.8-1.9-1.9-1.9h-12.3z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        d="M12.1 8.1l1.8 0 4.6 7.8-1.8 0z m4.6 0l1.8 0-4.6 7.8-1.8 0z"
        fill="#717171"
      />
    </svg>
  );
}

interface KeypadProps {
  onEvent: (event: CalculatorEvent) => void;
}

export function Keypad({ onEvent }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Teclado">
      {KEYS.map((row, rowIndex) => (
        <div className="keypad__row" key={rowIndex}>
          {row.map((key) => (
            <button
              key={key.id}
              type="button"
              className={`calc-key calc-key--${key.variant}${key.className ? ` ${key.className}` : ""}`}
              aria-label={key.ariaLabel}
              data-key={key.id}
              onClick={() => {
                if (key.event) onEvent(key.event);
              }}
            >
              {key.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

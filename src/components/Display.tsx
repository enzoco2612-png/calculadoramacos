interface DisplayProps {
  expression: string;
  result: string;
}

export function Display({ expression, result }: DisplayProps) {
  return (
    <section className="display" aria-label="Display">
      <div className="display__expression" aria-live="polite" data-testid="expression">
        {expression}
      </div>
      <div className="display__result" aria-live="polite" data-testid="result">
        {result}
      </div>
    </section>
  );
}

import { CalculatorWindow } from "./components/CalculatorWindow";
import { useCalculator } from "./hooks/useCalculator";
import { useKeyboard } from "./hooks/useKeyboard";

function App() {
  const { ctx, dispatch } = useCalculator();
  useKeyboard(dispatch);

  return (
    <main className="app">
      <CalculatorWindow
        expression={ctx.expression}
        display={ctx.display}
        onEvent={dispatch}
      />
    </main>
  );
}

export default App;

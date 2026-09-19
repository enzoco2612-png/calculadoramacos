import { getCurrentWindow } from "@tauri-apps/api/window";

async function withWindow(action: (win: ReturnType<typeof getCurrentWindow>) => Promise<void>) {
  try {
    await action(getCurrentWindow());
  } catch {
    // Outside Tauri (Vite/tests): no-op.
  }
}

export function WindowControls() {
  return (
    <div className="window-controls" aria-label="Controles da janela">
      <button
        type="button"
        className="traffic traffic--close"
        aria-label="Fechar"
        onClick={() => void withWindow((w) => w.close())}
      />
      <button
        type="button"
        className="traffic traffic--minimize"
        aria-label="Minimizar"
        onClick={() => void withWindow((w) => w.minimize())}
      />
      <button
        type="button"
        className="traffic traffic--inactive"
        aria-label="Maximizar (indisponível)"
        disabled
        tabIndex={-1}
      />
    </div>
  );
}

/** Centralized runtime detection — keep platform branches out of UI/Engine/SM. */

export function isTauriRuntime(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    Boolean((globalThis as { isTauri?: boolean }).isTauri)
  );
}

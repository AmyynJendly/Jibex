import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import type { ConfirmOptions } from './ConfirmDialog.types';
import { ConfirmDialogView } from './ConfirmDialogView';

interface ConfirmContextValue {
  /** Shows a blocking confirm dialog and resolves to whether the user confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Blocking Cancel/Confirm dialog — for actions (like zeroing a real total)
 * that shouldn't fire on a single mis-tap. On iOS it's the system's own
 * confirmation dialog; `Alert.alert` isn't used because it's a no-op on
 * react-native-web, so web and Android get a drawn equivalent.
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Settles once: a native dialog reports both the button tap and its own
  // dismissal afterwards, and only the first of those is the answer.
  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialogView options={options} onResolve={resolve} />
    </ConfirmContext.Provider>
  );
}

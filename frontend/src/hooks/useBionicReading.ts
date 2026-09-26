import { useCallback } from 'react';
import { useReader } from '../context/ReaderContext';

const STORAGE_KEY = 'reader_bionicReading';

/**
 * Global bionic-reading preference (localStorage-backed via ReaderContext).
 * Single-user-per-browser — revisit with a profile API when accounts exist.
 */
export function useBionicReading() {
  const { bionicReading, setBionicReading } = useReader();

  const toggle = useCallback(() => {
    setBionicReading(!bionicReading);
  }, [bionicReading, setBionicReading]);

  return {
    enabled: bionicReading,
    setEnabled: setBionicReading,
    toggle,
    storageKey: STORAGE_KEY,
  };
}

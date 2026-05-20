import { useEffect, useRef, useCallback } from 'react';

/**
 * Generic polling hook with automatic cleanup.
 * 
 * @param {Function} callback - Async function to call on each interval
 * @param {number} intervalMs - Polling interval in milliseconds
 * @param {boolean} enabled - Whether polling is active
 */
export default function usePolling(callback, intervalMs = 3000, enabled = true) {
    const savedCallback = useRef(callback);
    const intervalRef = useRef(null);

    // Update ref when callback changes (avoids stale closures)
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    const startPolling = useCallback(() => {
        if (intervalRef.current) return; // Already polling
        intervalRef.current = setInterval(() => {
            savedCallback.current();
        }, intervalMs);
    }, [intervalMs]);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (enabled) {
            // Initial fetch
            savedCallback.current();
            startPolling();
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [enabled, startPolling, stopPolling]);

    return { startPolling, stopPolling };
}

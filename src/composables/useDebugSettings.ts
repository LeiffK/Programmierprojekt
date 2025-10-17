import { ref, watch } from "vue";

/**
 * Handles the persisted debug toggle for the application.
 * Keeps backwards compatibility with the legacy localStorage key.
 */
export function useDebugSettings(options?: { storageKey?: string }) {
  const storageKey = options?.storageKey ?? "banditstudio.debug";
  const legacyKey = "banditlab.debug";

  const debugEnabled = ref(false);

  try {
    const stored = localStorage.getItem(storageKey);
    const legacy = localStorage.getItem(legacyKey);
    const source = stored ?? legacy;
    debugEnabled.value = source ? JSON.parse(source) === true : false;
  } catch {
    debugEnabled.value = false;
  }

  watch(
    () => debugEnabled.value,
    (value) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(!!value));
      } catch {
        /* ignore storage errors */
      }
    },
    { immediate: true },
  );

  function toggleDebug() {
    debugEnabled.value = !debugEnabled.value;
  }

  return {
    debugEnabled,
    toggleDebug,
  };
}

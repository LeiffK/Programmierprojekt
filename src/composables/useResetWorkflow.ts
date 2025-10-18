import { nextTick, ref } from "vue";
import { resetSeriesStore } from "../services/seriesStore";

/**
 * Encapsulates the reset modal state and the full reset workflow.
 * Used by App.vue to keep the template logic lean.
 */
export function useResetWorkflow() {
  const showReset = ref(false);
  const resetBtnRef = ref<HTMLButtonElement | null>(null);

  const openResetModal = () => {
    showReset.value = true;
  };

  const closeResetModal = () => {
    showReset.value = false;
    nextTick(() => resetBtnRef.value?.focus?.());
  };

  const confirmReset = async () => {
    await executeFullReset();
  };

  async function executeFullReset() {
    try {
      window.dispatchEvent(new CustomEvent("bandit:reset:before"));
    } catch {}

    try {
      localStorage.clear();
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}

    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {}

    try {
      resetSeriesStore();
    } catch {}

    try {
      window.dispatchEvent(new CustomEvent("bandit:reset:after"));
    } catch {}

    window.location.reload();
  }

  return {
    showReset,
    resetBtnRef,
    openResetModal,
    closeResetModal,
    confirmReset,
  };
}

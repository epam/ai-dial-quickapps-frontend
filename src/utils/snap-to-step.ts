const getStepPrecision = (step: number): number => (step.toString().split('.')[1] ?? '').length;

/**
 * Clamps a typed value into `[min, max]` and snaps it to the nearest step — the values a range
 * thumb can take. Mirrors the ui-kit Slider's `snapToStep` until its `showValueInput` ships.
 */
export const snapToStep = (value: number, min: number, max: number, step: number): number => {
  const clamped = Math.min(max, Math.max(min, value));
  if (step <= 0) {
    return clamped;
  }
  // 0.35 / 0.1 is 3.4999999999999996; trimming the ratio first rounds it to 4.
  const steps = Math.round(Number(((clamped - min) / step).toFixed(9)));
  // Rounding to the step's precision drops float noise (0.30000000000000004).
  return Number(Math.min(max, min + steps * step).toFixed(getStepPrecision(step)));
};

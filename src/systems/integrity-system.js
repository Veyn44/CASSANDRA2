// Environmental integrity profiles. The base roll is 2–10 integrity points;
// each material scales that neutral amount through integrityChangeModifier.
export const MATERIAL_INTEGRITY_PROFILES = Object.freeze({
  aluminium: Object.freeze({
    environmentalDegradation: true,
    integrityChangeModifier: 1,
  }),
  titanium: Object.freeze({
    environmentalDegradation: false,
    integrityChangeModifier: 0,
  }),
});

export function createIntegrityContext() {
  return { processed: new Map() };
}

export function applyIntegrityChange(
  target,
  { entityId, materialFamily, source, context, field = 'integrity' }
) {
  if (!target || !entityId || !source || !context) return null;
  const profile = MATERIAL_INTEGRITY_PROFILES[materialFamily];
  if (!profile?.environmentalDegradation) return null;

  const processedForSource = context.processed.get(source) ?? new Set();
  if (processedForSource.has(entityId)) return null;
  processedForSource.add(entityId);
  context.processed.set(source, processedForSource);

  const baseChange = 2 + Math.floor(Math.random() * 9);
  const damage = Math.max(1, Math.round(baseChange * profile.integrityChangeModifier));
  const before = target[field] ?? 100;
  const after = Math.max(25, before - damage);
  target[field] = after;
  return { damage: before - after, before, after };
}

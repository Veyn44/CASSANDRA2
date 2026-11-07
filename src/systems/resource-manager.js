export function getResourceAmount(s, id) {
  return s.devMode ? Infinity : (s.resources[id] ?? 0);
}
export function hasResource(s, id, amount = 1) {
  return s.devMode || getResourceAmount(s, id) >= amount;
}
export function consumeResource(s, id, amount = 1) {
  if (s.devMode) return true;
  if (!hasResource(s, id, amount)) return false;
  s.resources[id] -= amount;
  return true;
}
export function addResource(s, id, amount) {
  s.resources[id] = (s.resources[id] ?? 0) + amount;
  return s.resources[id];
}

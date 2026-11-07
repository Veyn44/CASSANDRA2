import { advanceEnvironment } from './section-manager.js';
export function endTurn(s) {
  s.turn++;
  if ((s.turn - 1) % 2 === 0) s.day++;
  advanceEnvironment(s);
  s.pawn.op = s.pawn.maxOP;
  return { message: 'TURN ADVANCED · ENVIRONMENT UPDATED · OPERATIONAL POINTS RESTORED' };
}

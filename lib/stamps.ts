const configuredGoal = Number(process.env.NEXT_PUBLIC_STAMP_GOAL);
export const STAMP_GOAL = Number.isInteger(configuredGoal) && configuredGoal >= 2 && configuredGoal <= 20
  ? configuredGoal
  : 6;
export const STAMP_REWARD = process.env.NEXT_PUBLIC_STAMP_REWARD?.trim() || "Recompensa de lealtad";
export const STAMP_REWARD_SLUG = "recompensa-sellos";

export function availableStamps(cliente: { visitas: number; sellosCanjeados: number }) {
  return Math.max(0, cliente.visitas - cliente.sellosCanjeados);
}

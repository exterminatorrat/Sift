import { colors } from "../constants/colors";
import { RiskLevel } from "../types/risk";

export const riskMeta: Record<
  RiskLevel,
  { label: string; action: string; color: string; background: string }
> = {
  low_risk: {
    label: "Low Risk",
    action: "Confirm if severe",
    color: colors.low,
    background: colors.lowSoft
  },
  ask_staff: {
    label: "Ask Staff",
    action: "Ask before ordering",
    color: colors.ask,
    background: colors.askSoft
  },
  high_risk: {
    label: "High Risk",
    action: "Avoid unless confirmed",
    color: colors.high,
    background: colors.highSoft
  },
  avoid_unless_confirmed: {
    label: "Avoid Unless Confirmed",
    action: "Confirm ingredients first",
    color: colors.avoid,
    background: colors.avoidSoft
  },
  unclear: {
    label: "Unclear",
    action: "Retake or ask directly",
    color: colors.unclear,
    background: colors.unclearSoft
  }
};

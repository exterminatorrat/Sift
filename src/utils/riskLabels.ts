import { colors } from "../constants/colors";
import { TranslationKey } from "../i18n/translations";
import { RiskLevel } from "../types/risk";

type RiskMeta = { label: string; action: string; color: string; background: string };
type RiskMetaKeys = {
  labelKey: TranslationKey;
  actionKey: TranslationKey;
  color: string;
  background: string;
};

const riskMetaKeys: Record<RiskLevel, RiskMetaKeys> = {
  low_risk: {
    labelKey: "risk.lowRisk",
    actionKey: "risk.lowRiskAction",
    color: colors.low,
    background: colors.lowSoft
  },
  ask_staff: {
    labelKey: "risk.askStaff",
    actionKey: "risk.askStaffAction",
    color: colors.ask,
    background: colors.askSoft
  },
  high_risk: {
    labelKey: "risk.highRisk",
    actionKey: "risk.highRiskAction",
    color: colors.high,
    background: colors.highSoft
  },
  avoid_unless_confirmed: {
    labelKey: "risk.avoidUnlessConfirmed",
    actionKey: "risk.avoidUnlessConfirmedAction",
    color: colors.avoid,
    background: colors.avoidSoft
  },
  unclear: {
    labelKey: "risk.unclear",
    actionKey: "risk.unclearAction",
    color: colors.unclear,
    background: colors.unclearSoft
  }
};

export const riskMeta: Record<
  RiskLevel,
  RiskMeta
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

export function getRiskMeta(level: RiskLevel, t: (key: TranslationKey) => string): RiskMeta {
  const meta = riskMetaKeys[level];
  return {
    ...meta,
    action: t(meta.actionKey),
    label: t(meta.labelKey)
  };
}

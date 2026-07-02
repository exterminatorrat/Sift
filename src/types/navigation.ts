export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  ScanCapture: undefined;
  ImagePreview: undefined;
  AnalysisLoading: undefined;
  Results: { scanId: string };
  DishDetail: { scanId: string; dishId: string };
  Settings: undefined;
  SettingsSubscription: undefined;
  SettingsNotifications: undefined;
  SettingsLanguage: undefined;
  SettingsSafety: undefined;
  SettingsHelp: undefined;
};

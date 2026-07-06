export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Home: undefined;
  ScanCapture: undefined;
  ImagePreview: undefined;
  AnalysisLoading: undefined;
  Results: { scanId: string; from?: "history" };
  DishDetail: { scanId: string; dishId: string };
  Settings: undefined;
  SettingsSubscription: undefined;
  SettingsLanguage: undefined;
  SettingsSafety: undefined;
  SettingsHelp: undefined;
};

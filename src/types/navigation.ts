export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Profile: undefined;
  ScanCapture: undefined;
  ImagePreview: undefined;
  AnalysisLoading: undefined;
  Results: { scanId: string };
  DishDetail: { scanId: string; dishId: string };
  History: undefined;
  Settings: undefined;
};

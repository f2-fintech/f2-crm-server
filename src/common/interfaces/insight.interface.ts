export interface InsightAction {
  label: string;
  href: string;
}

export interface Insight {
  title: string;
  metric: string | number;
  explanation: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  action?: InsightAction;
  context?: string;
}

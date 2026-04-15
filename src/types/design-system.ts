export interface ColorToken {
  hex: string;
  usage: string;
  contrastOnWhite: number;
  contrastOnBlack: number;
}

export interface TypographyToken {
  family: string;
  size: string;
  weight: string;
  lineHeight: string;
  usage: string;
}

export interface ShadowToken {
  value: string;
  usage: string;
}

export interface RadiusToken {
  value: string;
  usage: string;
}

export interface AntiPatternEntry {
  type: "contrast-failure" | "missing-alt" | "missing-label";
  selector: string;
  detail: string;
  stepIndex: number;
}

export interface PageBreadcrumb {
  stepIndex: number;
  url: string;
  pageTitle: string;
  urlSlug: string;
}

export interface DesignSystem {
  sessionId: string;
  capturedAt: number;
  colors: ColorToken[];
  typography: TypographyToken[];
  shadows: ShadowToken[];
  radii: RadiusToken[];
  antiPatterns: AntiPatternEntry[];
  pageBreadcrumbs: PageBreadcrumb[];
}

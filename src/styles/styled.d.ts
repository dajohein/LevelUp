import '@emotion/react';
import { theme } from './theme';

type ThemeType = typeof theme;

declare module '@emotion/react' {
  export interface Theme extends ThemeType {
    readonly _brand?: never;
  }
}

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface FunctionComponent<P = object> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: PropsWithChildren<P>, context?: any): ReactElement<any, any> | null;
  }
}

export type { ThemeType };

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          style?: React.CSSProperties;
          "camera-orbit"?: string;
          "camera-target"?: string;
          loading?: string;
          "disable-zoom"?: boolean;
          "interaction-prompt"?: string;
          poster?: string;
          "ar-button-style"?: string;
        },
        HTMLElement
      >;
    }
  }
}

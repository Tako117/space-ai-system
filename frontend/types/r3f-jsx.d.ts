import type { ThreeElements } from "@react-three/fiber";

// This is the most reliable way with React 18 types:
declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
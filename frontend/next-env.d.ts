/// <reference types="next" />
/// <reference types="next/image-types/global" />

import { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
export const motion = {
  easing: {
    spring: "cubic-bezier(.34,1.56,.64,1)",
    ease: "cubic-bezier(.22,1,.36,1)",
  },
  duration: {
    press: 90,
    fast: 120,
    base: 200,
    slow: 260,
    wiggle: 460,
    jelly: 480,
    toastIn: 220,
    toastOut: 160,
    overlayIn: 120,
    pop: 360,
  },
};

export type MotionEasingName = keyof typeof motion.easing;
export type MotionDurationName = keyof typeof motion.duration;

import { Variants } from 'framer-motion'

// Fade up — for cards, sections
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.05, ease: [0.25, 0.1, 0.25, 1] }
  })
}

// Stagger container
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
}

// Scale on hover
export const hoverLift: Variants = {
  rest: { y: 0, boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' },
  hover: { y: -2, boxShadow: '0 8px 24px rgb(0 0 0 / 0.10)', transition: { duration: 0.2, ease: 'easeOut' } }
}

// Fade in
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
}

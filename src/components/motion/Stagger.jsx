import { createContext, useContext, useRef } from 'react'
import { MOTION } from '../../config/motion'
import { useMotionEnabled } from '../../hooks/useMotionEnabled'

const StaggerContext = createContext(null)

/**
 * Staggered entrance container. Provides an incremental entrance delay to each
 * descendant <StaggerItem> on mount using compositor-driven CSS keyframes
 * (`animate-stagger-in`) so cards always settle at opacity: 1.
 */
export function Stagger({ as: Comp = 'div', nested = false, delay = 0, className, children, ...rest }) {
  const parentNextDelay = useContext(StaggerContext)
  let index = 0
  const nextDelay = () => {
    if (nested && parentNextDelay) return parentNextDelay()
    const d = MOTION.stagger.delayChildren + delay + index * MOTION.stagger.gap
    index += 1
    return Math.min(d, 0.55)
  }

  return (
    <StaggerContext.Provider value={nextDelay}>
      <Comp className={className} {...rest}>
        {children}
      </Comp>
    </StaggerContext.Provider>
  )
}

export function StaggerItem({ as: Comp = 'div', className = '', style, children, ...rest }) {
  const enabled = useMotionEnabled()
  const nextDelay = useContext(StaggerContext)
  const delayRef = useRef(null)
  if (delayRef.current === null) {
    delayRef.current = nextDelay ? nextDelay() : 0
  }

  return (
    <Comp
      className={`${enabled ? 'animate-stagger-in' : ''} ${className}`.trim()}
      style={
        enabled && delayRef.current > 0
          ? { ...style, animationDelay: `${Math.round(delayRef.current * 1000)}ms` }
          : style
      }
      {...rest}
    >
      {children}
    </Comp>
  )
}

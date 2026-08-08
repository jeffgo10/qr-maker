import { createElement, type CSSProperties } from 'react'
import r2wc from '@r2wc/react-to-web-component'
import { LiteShadeBrand } from '@jeffgo10/helpers/brand'
import { ScrambleRevealProvider } from '@jeffgo10/helpers/text'

export type LiteShadeBrandElementProps = {
  color?: string
  size?: number
  referral?: string
  href?: string
  gap?: string
}

/**
 * React tree mounted inside the `<liteshade-brand>` custom element.
 * Includes ScrambleRevealProvider because LiteShadeBrand expects a consumer-owned provider.
 */
function LiteShadeBrandElement({
  color = 'currentColor',
  size = 18,
  referral = 'beacon',
  href,
  gap = '0.45rem',
}: LiteShadeBrandElementProps) {
  return createElement(
    ScrambleRevealProvider,
    null,
    createElement(LiteShadeBrand, {
      color,
      size,
      referral,
      gap,
      href: href || undefined,
      style: {
        fontSize: '0.8rem',
        letterSpacing: '0.2em',
        verticalAlign: 'middle',
      } satisfies CSSProperties,
    }),
  )
}

const LiteShadeBrandWebComponent = r2wc(LiteShadeBrandElement, {
  props: {
    color: 'string',
    size: 'number',
    referral: 'string',
    href: 'string',
    gap: 'string',
  },
})

const TAG = 'liteshade-brand'

export function registerLiteShadeBrandElement() {
  if (typeof window === 'undefined') return
  if (customElements.get(TAG)) return
  customElements.define(TAG, LiteShadeBrandWebComponent)
}

registerLiteShadeBrandElement()

export { LiteShadeBrandElement, LiteShadeBrandWebComponent }

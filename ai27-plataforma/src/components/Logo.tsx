/**
 * Logotipo oficial de AI27 (wordmark, public/logo.png, fondo transparente).
 * `height` controla el tamaño; el ancho se ajusta solo (proporción 3.12:1).
 * `variant="light"` lo pinta en blanco para fondos oscuros (cotización, cierre, etc.).
 */
export function Logo({ height = 26, variant = 'color' }: { height?: number; variant?: 'color' | 'light' }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="AI27"
      height={height}
      style={{ height, width: 'auto', display: 'block', flexShrink: 0, alignSelf: 'flex-start', filter: variant === 'light' ? 'brightness(0) invert(1)' : undefined }}
    />
  )
}

/** Logotipo oficial de AI27 (public/logo.jpg) como ícono cuadrado con esquinas redondeadas. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.jpg`}
      alt="AI27"
      width={size}
      height={size}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), objectFit: 'cover', flexShrink: 0, display: 'block' }}
    />
  )
}

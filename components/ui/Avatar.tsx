import Image from 'next/image'

export type AvatarSize = 'sm' | 'md' | 'lg'

export interface AvatarProps {
  nombre: string
  size?: AvatarSize
  src?: string
}

const sizeConfig: Record<AvatarSize, { px: number; classes: string; textClass: string }> = {
  sm: { px: 28, classes: 'w-7 h-7',    textClass: 'text-xs' },
  md: { px: 36, classes: 'w-9 h-9',    textClass: 'text-sm' },
  lg: { px: 48, classes: 'w-12 h-12',  textClass: 'text-base' },
}

function getInitials(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function Avatar({ nombre, size = 'md', src }: AvatarProps) {
  const { px, classes, textClass } = sizeConfig[size]

  if (src) {
    return (
      <Image
        src={src}
        alt={nombre}
        width={px}
        height={px}
        className={`${classes} rounded-full object-cover`}
      />
    )
  }

  return (
    <span
      aria-label={nombre}
      className={`${classes} ${textClass} inline-flex items-center justify-center rounded-full bg-primary font-semibold text-primary-fg shrink-0`}
    >
      {getInitials(nombre)}
    </span>
  )
}

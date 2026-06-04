import React from 'react'

type CardAs = 'div' | 'article' | 'section'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: CardAs
}

export default function Card({
  as: Tag = 'div',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-[--radius-lg] border border-[--color-surface-border]',
        'bg-[--color-surface] p-6 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  )
}

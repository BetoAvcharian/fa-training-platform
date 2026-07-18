import Image from 'next/image'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`${className ?? ''} inline-block rounded-full overflow-hidden bg-white shrink-0`}>
      <Image src="/logo.jpg" alt="ENTRENAME" width={64} height={64} className="w-full h-full object-cover" />
    </span>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="20" cy="20" r="19" stroke="#C6A55C" strokeWidth="1.5" />
      <path
        d="M9 27c3-8 6-14 11-14s8 6 11 14"
        stroke="#C6A55C"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M12 27c2.5-6.5 5-11 8-11s5.5 4.5 8 11"
        stroke="#C6A55C"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <circle cx="20" cy="13" r="2.2" fill="#C6A55C" />
    </svg>
  )
}

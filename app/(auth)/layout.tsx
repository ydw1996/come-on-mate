export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-muted/30">
      {children}
    </div>
  )
}

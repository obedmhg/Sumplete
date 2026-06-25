import { SumpleteSwitcher } from "@/components/sumplete-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="w-full flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <SumpleteSwitcher />
      </div>
    </main>
  )
}

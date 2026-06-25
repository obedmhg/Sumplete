"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sumplete } from "@/components/sumplete"
import { Sumplete3D } from "@/components/sumplete-3d"

type Version = "3d" | "plain"

export function SumpleteSwitcher() {
  const [version, setVersion] = useState<Version>("3d")

  // Restore the last chosen version.
  useEffect(() => {
    const saved = localStorage.getItem("sumplete-version")
    if (saved === "3d" || saved === "plain") setVersion(saved)
  }, [])

  function choose(next: Version) {
    setVersion(next)
    localStorage.setItem("sumplete-version", next)
  }

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="inline-flex rounded-lg border border-gray-700 p-1">
        <Button variant={version === "3d" ? "default" : "ghost"} size="sm" onClick={() => choose("3d")}>
          3D
        </Button>
        <Button variant={version === "plain" ? "default" : "ghost"} size="sm" onClick={() => choose("plain")}>
          Plain
        </Button>
      </div>

      {version === "3d" ? <Sumplete3D /> : <Sumplete />}
    </div>
  )
}

import { useEffect, useCallback } from "react"

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  action: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      // Check if modifiers match
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey
      const altMatch = shortcut.alt ? event.altKey : !event.altKey
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey

      // Check if key matches
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown])

  return shortcuts
}

// Hook for showing keyboard shortcuts help
export function useKeyboardHelp(shortcuts: KeyboardShortcut[]) {
  const getShortcutText = (shortcut: KeyboardShortcut) => {
    const keys = []
    if (shortcut.ctrl) keys.push("Ctrl")
    if (shortcut.alt) keys.push("Alt")
    if (shortcut.shift) keys.push("Shift")
    keys.push(shortcut.key.toUpperCase())
    return keys.join(" + ")
  }

  const shortcutsWithText = shortcuts.map(s => ({
    ...s,
    shortcutText: getShortcutText(s)
  }))

  return shortcutsWithText
}
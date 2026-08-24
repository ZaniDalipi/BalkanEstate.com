"use client"
import { useEffect, useRef, useState } from "react"

interface TypewriterProps {
  words: string[]
  speed?: number
  delayBetweenWords?: number
  cursor?: boolean
  cursorChar?: string
  className?: string
}

export function Typewriter({
  words,
  speed = 100,
  delayBetweenWords = 2000,
  cursor = true,
  cursorChar = "|",
  className,
}: TypewriterProps) {
  // Show the first word immediately to avoid blank text during LCP
  const [displayText, setDisplayText] = useState(words[0] || "")
  const [isDeleting, setIsDeleting] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [charIndex, setCharIndex] = useState(words[0]?.length || 0)
  const [showCursor, setShowCursor] = useState(true)
  const isFirstRender = useRef(true)

  const currentWord = words[wordIndex]

  useEffect(() => {
    // On first render, wait for delayBetweenWords before starting to delete
    if (isFirstRender.current) {
      isFirstRender.current = false
      const initialDelay = setTimeout(() => {
        setIsDeleting(true)
      }, delayBetweenWords)
      return () => clearTimeout(initialDelay)
    }

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (charIndex < currentWord.length) {
            setDisplayText(currentWord.substring(0, charIndex + 1))
            setCharIndex(charIndex + 1)
          } else {
            setTimeout(() => {
              setIsDeleting(true)
            }, delayBetweenWords)
          }
        } else {
          if (charIndex > 0) {
            setDisplayText(currentWord.substring(0, charIndex - 1))
            setCharIndex(charIndex - 1)
          } else {
            setIsDeleting(false)
            setWordIndex((prev) => (prev + 1) % words.length)
          }
        }
      },
      isDeleting ? speed / 2 : speed,
    )

    return () => clearTimeout(timeout)
  }, [charIndex, currentWord, isDeleting, speed, delayBetweenWords, wordIndex, words])

  useEffect(() => {
    if (!cursor) return
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)
    return () => clearInterval(cursorInterval)
  }, [cursor])

  /*
   * The width is reserved for the longest word, so nothing around the
   * typewriter moves while it types.
   *
   * Letting the span size itself to the current text means its width changes
   * on every keystroke, and everything after it on the line shifts with it. In
   * a heading that is enough to change where the line wraps, so the whole
   * block jumps a line taller and shorter as the words cycle — reading as a
   * constant flicker rather than as an animation.
   *
   * Every word is rendered invisibly, stacked in one grid cell with the live
   * text. The cell takes the width of its widest child, which measures the
   * real glyphs in the real font, so it stays correct in any translation —
   * unlike a `min-width` in `ch`, which only approximates a proportional font
   * and would need re-guessing per locale.
   */
  /*
   * `className` lands on the span holding the live text, not on the wrapper.
   *
   * The caller styles this with `background-clip: text`, which clips an
   * element's own background to the glyphs *that element* renders. Putting it
   * on the wrapper while the text sat in a nested grid item left the clip with
   * no text to clip to, and since the colour is transparent the word vanished
   * entirely. Styling the element that actually carries the glyphs is what
   * makes that technique work.
   */
  return (
    <span className="relative inline-grid">
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden
          className="invisible col-start-1 row-start-1 whitespace-pre"
        >
          {word}
          {cursor ? cursorChar : ""}
        </span>
      ))}
      <span className={`col-start-1 row-start-1 whitespace-pre text-left ${className ?? ""}`}>
        {displayText}
        {cursor && (
          <span
            className="transition-opacity duration-75"
            style={{ opacity: showCursor ? 1 : 0 }}
          >
            {cursorChar}
          </span>
        )}
      </span>
    </span>
  )
}

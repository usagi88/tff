import { useState } from 'react'
import Tesseract from 'tesseract.js'

export const useOCR = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractText = async (file: File) => {
    setLoading(true); setError(null)
    try {
      const { data } = await Tesseract.recognize(file, 'eng', { logger: m => console.log(m) })
      setLoading(false)
      return data.text
    } catch (e:any) {
      console.error(e); setError('Failed to process image')
      setLoading(false); return null
    }
  }
  return { extractText, loading, error }
}

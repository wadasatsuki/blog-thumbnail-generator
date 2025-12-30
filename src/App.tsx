import { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'

const CANVAS_WIDTH = 1280
const CANVAS_HEIGHT = 670

interface ScatteredText {
  text: string
  fontSize: number
  x: number
  y: number
  angle: number
  isVertical: boolean
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<fabric.Canvas | null>(null)

  const [title, setTitle] = useState('読書感想文')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [titleColor, setTitleColor] = useState('#6b46c1')
  const [highlightColor, setHighlightColor] = useState('#48bb78')
  const [segmentColor, setSegmentColor] = useState('#6b46c1')
  const [content, setContent] = useState(`虚構と現実
シュルレアリズム
現実と現実が混ざり合う
酩酊感
逃げる希望
気分悪くなる
吐きそうな気持ちにもなった
イノチ
多様性を許容する
誰が誰で誰が誰？
息苦しい
私は資本主義に合意した覚えない
あ、共感してすみません
エゴ
他人`)
  const [titleFontSize, setTitleFontSize] = useState(120)
  const [segmentMinSize, setSegmentMinSize] = useState(16)
  const [segmentMaxSize, setSegmentMaxSize] = useState(40)

  const generateScatteredPositions = useCallback((segments: string[]): ScatteredText[] => {
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    const titleWidth = title.length * titleFontSize * 0.9
    const titleHeight = titleFontSize * 1.2

    const exclusionZone = {
      left: centerX - titleWidth / 2 - 20,
      right: centerX + titleWidth / 2 + 20,
      top: centerY - titleHeight / 2 - 20,
      bottom: centerY + titleHeight / 2 + 20,
    }

    const positions: ScatteredText[] = []
    const padding = 30

    segments.forEach((text) => {
      const fontSize = Math.floor(Math.random() * (segmentMaxSize - segmentMinSize + 1)) + segmentMinSize
      const isVertical = Math.random() > 0.7

      let x: number, y: number
      let attempts = 0
      const maxAttempts = 100

      do {
        x = padding + Math.random() * (CANVAS_WIDTH - padding * 2)
        y = padding + Math.random() * (CANVAS_HEIGHT - padding * 2)
        attempts++

        if (attempts >= maxAttempts) break
      } while (
        x > exclusionZone.left - 50 &&
        x < exclusionZone.right + 50 &&
        y > exclusionZone.top - 30 &&
        y < exclusionZone.bottom + 30
      )

      positions.push({
        text,
        fontSize,
        x,
        y,
        angle: isVertical ? 0 : 0,
        isVertical,
      })
    })

    return positions
  }, [title, titleFontSize, segmentMaxSize, segmentMinSize])

  const renderCanvas = useCallback(() => {
    if (!fabricRef.current) return

    const canvas = fabricRef.current
    canvas.clear()
    canvas.backgroundColor = backgroundColor

    const segments = content.split('\n').filter(s => s.trim())
    const scatteredTexts = generateScatteredPositions(segments)

    scatteredTexts.forEach(({ text, fontSize, x, y, isVertical }) => {
      if (isVertical) {
        const chars = text.split('')
        let offsetY = 0
        chars.forEach((char) => {
          const charText = new fabric.FabricText(char, {
            left: x,
            top: y + offsetY,
            fontSize: fontSize,
            fill: segmentColor,
            fontFamily: 'Hiragino Kaku Gothic ProN, Meiryo, sans-serif',
            selectable: true,
          })
          canvas.add(charText)
          offsetY += fontSize * 1.1
        })
      } else {
        const textObj = new fabric.FabricText(text, {
          left: x,
          top: y,
          fontSize: fontSize,
          fill: segmentColor,
          fontFamily: 'Hiragino Kaku Gothic ProN, Meiryo, sans-serif',
          selectable: true,
        })
        canvas.add(textObj)
      }
    })

    const titleWidth = title.length * titleFontSize * 0.85
    const highlightRect = new fabric.Rect({
      left: CANVAS_WIDTH / 2 - titleWidth / 2 - 10,
      top: CANVAS_HEIGHT / 2 - titleFontSize / 2 + 10,
      width: titleWidth + 20,
      height: titleFontSize * 0.9,
      fill: highlightColor,
      selectable: true,
    })
    canvas.add(highlightRect)

    const titleText = new fabric.FabricText(title, {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      fontSize: titleFontSize,
      fill: titleColor,
      fontFamily: 'Hiragino Kaku Gothic ProN, Meiryo, sans-serif',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      selectable: true,
    })
    canvas.add(titleText)

    canvas.renderAll()
  }, [backgroundColor, content, generateScatteredPositions, highlightColor, segmentColor, title, titleColor, titleFontSize])

  useEffect(() => {
    if (canvasRef.current && !fabricRef.current) {
      fabricRef.current = new fabric.Canvas(canvasRef.current, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: backgroundColor,
      })
    }

    return () => {
      fabricRef.current?.dispose()
      fabricRef.current = null
    }
  }, [])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const handleExport = () => {
    if (!fabricRef.current) return

    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    })

    const link = document.createElement('a')
    link.download = 'thumbnail.png'
    link.href = dataURL
    link.click()
  }

  const handleRegenerate = () => {
    renderCanvas()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Blog Thumbnail Generator</h1>

        <div className="flex gap-8">
          {/* Canvas Preview */}
          <div className="flex-shrink-0">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="border border-gray-300 overflow-hidden" style={{ width: CANVAS_WIDTH / 2, height: CANVAS_HEIGHT / 2 }}>
                <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  <canvas ref={canvasRef} />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">Preview (50% scale) - Actual size: {CANVAS_WIDTH}x{CANVAS_HEIGHT}px</p>
            </div>

            <div className="mt-4 flex gap-4">
              <button
                onClick={handleRegenerate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Regenerate Layout
              </button>
              <button
                onClick={handleExport}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Export PNG
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Title Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title Font Size: {titleFontSize}px
                </label>
                <input
                  type="range"
                  min="60"
                  max="180"
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title Color</label>
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => setTitleColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Highlight Color</label>
                  <input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Segment Color</label>
                  <input
                    type="color"
                    value={segmentColor}
                    onChange={(e) => setSegmentColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Segment Font Size Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Segment Font Size Range: {segmentMinSize}px - {segmentMaxSize}px
                </label>
                <div className="flex gap-4 items-center">
                  <span className="text-sm">Min:</span>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={segmentMinSize}
                    onChange={(e) => setSegmentMinSize(Math.min(Number(e.target.value), segmentMaxSize))}
                    className="flex-1"
                  />
                  <span className="text-sm">Max:</span>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={segmentMaxSize}
                    onChange={(e) => setSegmentMaxSize(Math.max(Number(e.target.value), segmentMinSize))}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Content/Segments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Segments (one per line)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter keywords or phrases, one per line..."
                />
              </div>

              <p className="text-sm text-gray-500">
                Tip: You can drag and resize text elements directly on the canvas for fine-tuning.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

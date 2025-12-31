import { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '16:9', label: '16:9', width: 1280, height: 720 },
] as const

type AspectRatioId = typeof ASPECT_RATIOS[number]['id']
type CropPosition = 'top' | 'center' | 'bottom' | 'left' | 'right'

const FONT_OPTIONS = [
  { value: 'Hiragino Kaku Gothic ProN, sans-serif', label: 'Hiragino Kaku Gothic ProN' },
  { value: 'Hiragino Mincho ProN, serif', label: 'Hiragino Mincho ProN' },
  { value: 'Noto Sans JP, sans-serif', label: 'Noto Sans JP' },
  { value: 'Noto Serif JP, serif', label: 'Noto Serif JP' },
  { value: 'YuGothic, sans-serif', label: 'YuGothic' },
  { value: 'YuMincho, serif', label: 'YuMincho' },
]

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
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>('16:9')
  const [cropPosition, setCropPosition] = useState<CropPosition>('center')

  const currentRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[2]
  const CANVAS_WIDTH = currentRatio.width
  const CANVAS_HEIGHT = currentRatio.height

  const [title, setTitle] = useState('Sample Title')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [titleColor, setTitleColor] = useState('#6b46c1')
  const [highlightColor, setHighlightColor] = useState<string | null>('#48bb78')
  const [segmentColor, setSegmentColor] = useState('#6b46c1')
  const [content, setContent] = useState(`Design
Creative
Inspiration
Ideas
Style
Modern
Minimal
Concept
Vision
Art`)
  const [titleFontSize, setTitleFontSize] = useState(120)
  const [segmentMinSize, setSegmentMinSize] = useState(16)
  const [segmentMaxSize, setSegmentMaxSize] = useState(40)
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value)
  const [scatteredPositions, setScatteredPositions] = useState<ScatteredText[]>([])
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

  const generateScatteredPositions = useCallback((segments: string[]): ScatteredText[] => {
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    const titleWidth = title.length * titleFontSize * 0.9
    const titleHeight = titleFontSize * 1.2

    const exclusionZone = {
      left: centerX - titleWidth / 2 - 60,
      right: centerX + titleWidth / 2 + 60,
      top: centerY - titleHeight / 2 - 40,
      bottom: centerY + titleHeight / 2 + 40,
    }

    const positions: ScatteredText[] = []
    const padding = 15
    const frameThickness = 80

    const totalSegments = segments.length
    const topCount = Math.ceil(totalSegments * 0.3)
    const bottomCount = Math.ceil(totalSegments * 0.3)
    const leftCount = Math.ceil(totalSegments * 0.2)

    segments.forEach((text, index) => {
      const fontSize = Math.floor(Math.random() * (segmentMaxSize - segmentMinSize + 1)) + segmentMinSize

      let zone: number
      if (index < topCount) {
        zone = 0
      } else if (index < topCount + bottomCount) {
        zone = 1
      } else if (index < topCount + bottomCount + leftCount) {
        zone = 2
      } else {
        zone = 3
      }

      const isVertical = zone === 2 || zone === 3

      let x = 0
      let y = 0
      let attempts = 0
      const maxAttempts = 100

      do {
        switch (zone) {
          case 0:
            x = padding + Math.random() * (CANVAS_WIDTH - padding * 2)
            y = padding + Math.random() * frameThickness
            break
          case 1:
            x = padding + Math.random() * (CANVAS_WIDTH - padding * 2)
            y = CANVAS_HEIGHT - padding - frameThickness + Math.random() * frameThickness
            break
          case 2:
            x = padding + Math.random() * frameThickness
            y = padding + frameThickness + Math.random() * (CANVAS_HEIGHT - padding * 2 - frameThickness * 2)
            break
          default:
            x = CANVAS_WIDTH - padding - frameThickness + Math.random() * frameThickness
            y = padding + frameThickness + Math.random() * (CANVAS_HEIGHT - padding * 2 - frameThickness * 2)
            break
        }
        attempts++

        if (attempts >= maxAttempts) break
      } while (
        x > exclusionZone.left &&
        x < exclusionZone.right &&
        y > exclusionZone.top &&
        y < exclusionZone.bottom
      )

      positions.push({
        text,
        fontSize,
        x,
        y,
        angle: 0,
        isVertical,
      })
    })

    return positions
  }, [title, titleFontSize, segmentMaxSize, segmentMinSize, CANVAS_WIDTH, CANVAS_HEIGHT])

  const renderCanvas = useCallback(async () => {
    if (!fabricRef.current) return

    const canvas = fabricRef.current
    canvas.clear()

    if (backgroundImage) {
      const img = await fabric.FabricImage.fromURL(backgroundImage)
      const imgWidth = img.width || 1
      const imgHeight = img.height || 1
      const scaleX = CANVAS_WIDTH / imgWidth
      const scaleY = CANVAS_HEIGHT / imgHeight
      const scale = Math.max(scaleX, scaleY)

      const scaledWidth = imgWidth * scale
      const scaledHeight = imgHeight * scale

      let left = CANVAS_WIDTH / 2
      let top = CANVAS_HEIGHT / 2

      if (scaledWidth > CANVAS_WIDTH) {
        if (cropPosition === 'left') {
          left = scaledWidth / 2
        } else if (cropPosition === 'right') {
          left = CANVAS_WIDTH - scaledWidth / 2
        }
      }

      if (scaledHeight > CANVAS_HEIGHT) {
        if (cropPosition === 'top') {
          top = scaledHeight / 2
        } else if (cropPosition === 'bottom') {
          top = CANVAS_HEIGHT - scaledHeight / 2
        }
      }

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: left,
        top: top,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      })
      canvas.add(img)
      canvas.sendObjectToBack(img)
    } else {
      canvas.backgroundColor = backgroundColor
    }

    scatteredPositions.forEach(({ text, fontSize, x, y, isVertical }) => {
      if (isVertical) {
        const chars = text.split('')
        let offsetY = 0
        chars.forEach((char) => {
          const charText = new fabric.FabricText(char, {
            left: x,
            top: y + offsetY,
            fontSize: fontSize,
            fill: segmentColor,
            fontFamily: fontFamily,
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
          fontFamily: fontFamily,
          selectable: true,
        })
        canvas.add(textObj)
      }
    })

    const titleLines = title.split('\n')
    const lineHeight = titleFontSize * 1.2
    const totalTitleHeight = titleLines.length * lineHeight
    const startY = CANVAS_HEIGHT / 2 - totalTitleHeight / 2 + lineHeight / 2

    titleLines.forEach((line, index) => {
      const lineWidth = line.length * titleFontSize * 0.85
      const lineY = startY + index * lineHeight
      const highlightHeight = titleFontSize * 0.5

      if (highlightColor) {
        const highlightRect = new fabric.Rect({
          left: CANVAS_WIDTH / 2 - lineWidth / 2 - 50,
          top: lineY - highlightHeight / 2 + titleFontSize * 0.2,
          width: lineWidth + 100,
          height: highlightHeight,
          fill: highlightColor,
          selectable: true,
        })
        canvas.add(highlightRect)
      }

      const titleText = new fabric.FabricText(line, {
        left: CANVAS_WIDTH / 2,
        top: lineY,
        fontSize: titleFontSize,
        fill: titleColor,
        fontFamily: fontFamily,
        fontWeight: 'bold',
        originX: 'center',
        originY: 'center',
        selectable: true,
      })
      canvas.add(titleText)
    })

    canvas.renderAll()

    setTimeout(() => {
      if (fabricRef.current) {
        const dataUrl = fabricRef.current.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1,
        })
        setPreviewImageUrl(dataUrl)
      }
    }, 100)
  }, [backgroundColor, backgroundImage, cropPosition, scatteredPositions, highlightColor, segmentColor, title, titleColor, titleFontSize, fontFamily, CANVAS_WIDTH, CANVAS_HEIGHT])

  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.dispose()
      fabricRef.current = null
    }

    if (canvasRef.current) {
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
  }, [CANVAS_WIDTH, CANVAS_HEIGHT])

  useEffect(() => {
    const segments = content.split('\n').filter(s => s.trim())
    if (segments.length > 0 && scatteredPositions.length === 0) {
      setScatteredPositions(generateScatteredPositions(segments))
    }
  }, [content, scatteredPositions.length, generateScatteredPositions])

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

  const handleChangeLayout = () => {
    const segments = content.split('\n').filter(s => s.trim())
    setScatteredPositions(generateScatteredPositions(segments))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setBackgroundImage(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setBackgroundImage(null)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-8">Blog Thumbnail Generator</h1>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-8">
          {/* Canvas Preview */}
          <div className="w-full lg:flex-shrink-0 lg:w-auto">
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-lg">
              <div
                className="border border-gray-300 overflow-hidden w-full lg:w-auto"
                style={{
                  width: '100%',
                  maxWidth: CANVAS_WIDTH / 2,
                }}
              >
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt="Thumbnail preview"
                    className="w-full h-auto"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div
                    style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
                    className="bg-gray-100 flex items-center justify-center"
                  >
                    <span className="text-gray-400">Loading...</span>
                  </div>
                )}
              </div>
              <div className="hidden">
                <canvas ref={canvasRef} />
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-2">
                Long-press image to save • Actual size: {CANVAS_WIDTH}x{CANVAS_HEIGHT}px
              </p>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 md:gap-4">
              <button
                onClick={handleChangeLayout}
                className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm md:text-base"
              >
                Change Layout
              </button>
              <button
                onClick={handleExport}
                className="flex-1 sm:flex-none px-4 md:px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm md:text-base"
              >
                Export PNG
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 bg-white p-4 md:p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6">Settings</h2>

            <div className="space-y-6">
              {/* Aspect Ratio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                <div className="flex gap-2">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => {
                        setAspectRatio(ratio.id)
                        setScatteredPositions([])
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        aspectRatio === ratio.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div>{ratio.label}</div>
                      <div className="text-xs opacity-75">{ratio.width}×{ratio.height}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (use Enter for line breaks)</label>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Font Family</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Background */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
                <div className="flex gap-2">
                  <label className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer text-center">
                    {backgroundImage ? 'Change Image' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {backgroundImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {backgroundImage && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Crop Position</label>
                    <div className="flex gap-2">
                      {(['left', 'center', 'right'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setCropPosition(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                            cropPosition === pos
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      {(['top', 'center', 'bottom'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setCropPosition(pos)}
                          className={`flex-1 px-3 py-1.5 rounded text-sm transition-colors ${
                            cropPosition === pos
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                    disabled={!!backgroundImage}
                  />
                  {backgroundImage && (
                    <p className="text-xs text-gray-400 mt-1">Remove image to use color</p>
                  )}
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
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={highlightColor || '#48bb78'}
                      onChange={(e) => setHighlightColor(e.target.value)}
                      className="flex-1 h-10 rounded cursor-pointer"
                      disabled={!highlightColor}
                    />
                    <button
                      onClick={() => setHighlightColor(highlightColor ? null : '#48bb78')}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        highlightColor
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      {highlightColor ? 'None' : 'Enable'}
                    </button>
                  </div>
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

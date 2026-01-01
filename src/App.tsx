import { useEffect, useRef, useState, useCallback } from 'react'
import * as fabric from 'fabric'

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '16:9', label: '16:9', width: 1280, height: 720 },
] as const

type AspectRatioId = typeof ASPECT_RATIOS[number]['id']

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
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageZoom, setImageZoom] = useState(1)
  const [naturalImageSize, setNaturalImageSize] = useState({ width: 0, height: 0 })

  const [showCropModal, setShowCropModal] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [tempImageSize, setTempImageSize] = useState({ width: 0, height: 0 })
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 })
  const [tempZoom, setTempZoom] = useState(1)

  const currentRatio = ASPECT_RATIOS.find(r => r.id === aspectRatio) || ASPECT_RATIOS[2]
  const CANVAS_WIDTH = currentRatio.width
  const CANVAS_HEIGHT = currentRatio.height

  const [title, setTitle] = useState('読書感想文')
  const [backgroundColor, setBackgroundColor] = useState('#ffffff')
  const [titleColor, setTitleColor] = useState('#6125f3')
  const [highlightColor, setHighlightColor] = useState<string | null>('#7bf580')
  const [segmentColor, setSegmentColor] = useState('#6125f3')
  const [content, setContent] = useState(`虚構と現実
シュルレアリスム
現実と現実が混ざり合う
酩酊感
誰が誰で誰が誰?
息苦しい
逃げる希望
気分悪くなる
吐きそうな気持ちになったけど、
なぜか楽しい
エゴと他人
私は資本主義に合意した覚えない
あ、共感してすみません
イノチダイジニ
多様性を許容する`)
  const [titleFontSize, setTitleFontSize] = useState(200)
  const [segmentMinSize, setSegmentMinSize] = useState(20)
  const [segmentMaxSize, setSegmentMaxSize] = useState(50)
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[1].value)
  const [scatteredPositions, setScatteredPositions] = useState<ScatteredText[]>([])
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

  const generateScatteredPositions = useCallback((segments: string[]): ScatteredText[] => {
    const centerX = CANVAS_WIDTH / 2
    const centerY = CANVAS_HEIGHT / 2
    const titleWidth = title.length * titleFontSize * 0.9
    const titleHeight = titleFontSize * 1.2

    // Larger exclusion zone around the title
    const exclusionZone = {
      left: centerX - titleWidth / 2 - 100,
      right: centerX + titleWidth / 2 + 100,
      top: centerY - titleHeight / 2 - 80,
      bottom: centerY + titleHeight / 2 + 80,
    }

    const positions: ScatteredText[] = []
    const padding = 30
    const frameThickness = CANVAS_HEIGHT * 0.35 // Use more of the canvas

    // Divide canvas into grid sections for even distribution
    const gridCols = 4
    const gridRows = 3
    const sectionWidth = CANVAS_WIDTH / gridCols
    const sectionHeight = CANVAS_HEIGHT / gridRows
    const sectionCounts: number[][] = Array(gridRows).fill(null).map(() => Array(gridCols).fill(0))

    // Get which grid section a position falls into
    const getSection = (x: number, y: number) => {
      const col = Math.min(Math.floor(x / sectionWidth), gridCols - 1)
      const row = Math.min(Math.floor(y / sectionHeight), gridRows - 1)
      return { row, col }
    }

    // Find the least populated section in a zone
    const getLeastPopulatedSection = (zone: number): { targetRow: number; targetCol: number } => {
      let minCount = Infinity
      let candidates: { row: number; col: number }[] = []

      switch (zone) {
        case 0: // Top zone - row 0
          for (let col = 0; col < gridCols; col++) {
            if (sectionCounts[0][col] < minCount) {
              minCount = sectionCounts[0][col]
              candidates = [{ row: 0, col }]
            } else if (sectionCounts[0][col] === minCount) {
              candidates.push({ row: 0, col })
            }
          }
          break
        case 1: // Bottom zone - row 2
          for (let col = 0; col < gridCols; col++) {
            if (sectionCounts[gridRows - 1][col] < minCount) {
              minCount = sectionCounts[gridRows - 1][col]
              candidates = [{ row: gridRows - 1, col }]
            } else if (sectionCounts[gridRows - 1][col] === minCount) {
              candidates.push({ row: gridRows - 1, col })
            }
          }
          break
        case 2: // Left zone - col 0
          for (let row = 0; row < gridRows; row++) {
            if (sectionCounts[row][0] < minCount) {
              minCount = sectionCounts[row][0]
              candidates = [{ row, col: 0 }]
            } else if (sectionCounts[row][0] === minCount) {
              candidates.push({ row, col: 0 })
            }
          }
          break
        default: // Right zone - col 3
          for (let row = 0; row < gridRows; row++) {
            if (sectionCounts[row][gridCols - 1] < minCount) {
              minCount = sectionCounts[row][gridCols - 1]
              candidates = [{ row, col: gridCols - 1 }]
            } else if (sectionCounts[row][gridCols - 1] === minCount) {
              candidates.push({ row, col: gridCols - 1 })
            }
          }
          break
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)]
      return { targetRow: chosen.row, targetCol: chosen.col }
    }

    // Helper to get bounding box of a text segment
    const getBoundingBox = (pos: { x: number; y: number; text: string; fontSize: number; isVertical: boolean }) => {
      const charWidth = pos.fontSize * 0.8
      const charHeight = pos.fontSize * 1.2
      if (pos.isVertical) {
        return {
          left: pos.x,
          right: pos.x + charWidth,
          top: pos.y,
          bottom: pos.y + pos.text.length * charHeight,
        }
      } else {
        return {
          left: pos.x,
          right: pos.x + pos.text.length * charWidth,
          top: pos.y,
          bottom: pos.y + charHeight,
        }
      }
    }

    // Check if two bounding boxes overlap
    const boxesOverlap = (a: ReturnType<typeof getBoundingBox>, b: ReturnType<typeof getBoundingBox>) => {
      return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
    }

    // Check if candidate overlaps with title
    const overlapsWithTitle = (candidate: { x: number; y: number; text: string; fontSize: number; isVertical: boolean }) => {
      const candidateBox = getBoundingBox(candidate)
      return boxesOverlap(candidateBox, exclusionZone)
    }

    // Count how many existing positions overlap with a candidate position
    const countOverlaps = (candidate: { x: number; y: number; text: string; fontSize: number; isVertical: boolean }) => {
      const candidateBox = getBoundingBox(candidate)
      let count = 0
      for (const pos of positions) {
        const posBox = getBoundingBox(pos)
        if (boxesOverlap(candidateBox, posBox)) {
          count++
        }
      }
      return count
    }

    // Shuffle segments for random distribution
    const shuffledIndices = segments.map((_, i) => i).sort(() => Math.random() - 0.5)

    segments.forEach((text, originalIndex) => {
      const fontSize = Math.floor(Math.random() * (segmentMaxSize - segmentMinSize + 1)) + segmentMinSize

      // Use round-robin to evenly distribute across 4 zones
      const shuffledPosition = shuffledIndices.indexOf(originalIndex)
      const zone = shuffledPosition % 4

      // Vertical for left/right zones, horizontal for top/bottom zones
      const isVertical = zone === 2 || zone === 3

      // Get target section for even distribution
      const { targetRow, targetCol } = getLeastPopulatedSection(zone)

      let x = 0
      let y = 0
      let attempts = 0
      const maxAttempts = 150
      let overlapCount = 0

      // First try to find a position with no overlaps
      let bestX = 0
      let bestY = 0
      let bestOverlapCount = Infinity

      do {
        // Place within target section with some randomness
        const sectionX = targetCol * sectionWidth
        const sectionY = targetRow * sectionHeight

        switch (zone) {
          case 0: // Top zone
            x = sectionX + padding + Math.random() * (sectionWidth - padding * 2)
            y = padding + Math.random() * Math.min(frameThickness, sectionHeight - padding)
            break
          case 1: // Bottom zone
            x = sectionX + padding + Math.random() * (sectionWidth - padding * 2)
            y = CANVAS_HEIGHT - padding - frameThickness + Math.random() * frameThickness
            break
          case 2: // Left zone
            x = padding + Math.random() * (frameThickness * 0.6)
            y = sectionY + padding + Math.random() * (sectionHeight - padding * 2)
            break
          default: // Right zone
            x = CANVAS_WIDTH - padding - frameThickness * 0.6 + Math.random() * (frameThickness * 0.6)
            y = sectionY + padding + Math.random() * (sectionHeight - padding * 2)
            break
        }
        attempts++

        // Skip if overlaps with title
        if (overlapsWithTitle({ x, y, text, fontSize, isVertical })) {
          continue
        }

        // Count overlaps with existing segments
        overlapCount = countOverlaps({ x, y, text, fontSize, isVertical })

        // Track best position (prefer no overlaps, then fewer overlaps)
        if (overlapCount < bestOverlapCount) {
          bestOverlapCount = overlapCount
          bestX = x
          bestY = y
        }

        // Found a position with no overlaps - use it
        if (overlapCount === 0) break

        if (attempts >= maxAttempts) break
      } while (
        overlapsWithTitle({ x, y, text, fontSize, isVertical }) ||
        overlapCount > 1 // Max 2 lines overlapping (this segment + 1 other)
      )

      // Use the best position found
      if (bestOverlapCount < overlapCount) {
        x = bestX
        y = bestY
        overlapCount = bestOverlapCount
      }

      // Update section count
      const { row, col } = getSection(x, y)
      sectionCounts[row][col]++

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

    if (backgroundImage && naturalImageSize.width > 0) {
      const img = await fabric.FabricImage.fromURL(backgroundImage)
      const baseScaleX = CANVAS_WIDTH / naturalImageSize.width
      const baseScaleY = CANVAS_HEIGHT / naturalImageSize.height
      const baseScale = Math.max(baseScaleX, baseScaleY)
      const scale = baseScale * imageZoom

      img.set({
        scaleX: scale,
        scaleY: scale,
        left: CANVAS_WIDTH / 2 + imagePosition.x,
        top: CANVAS_HEIGHT / 2 + imagePosition.y,
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
  }, [backgroundColor, backgroundImage, imagePosition, imageZoom, naturalImageSize, scatteredPositions, highlightColor, segmentColor, title, titleColor, titleFontSize, fontFamily, CANVAS_WIDTH, CANVAS_HEIGHT])

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
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        setTempImageSize({ width: img.width, height: img.height })
        setTempImageUrl(dataUrl)
        setTempPosition({ x: 0, y: 0 })
        setTempZoom(1)
        setShowCropModal(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleCropApply = () => {
    setBackgroundImage(tempImageUrl)
    setNaturalImageSize(tempImageSize)
    setImagePosition(tempPosition)
    setImageZoom(tempZoom)
    setShowCropModal(false)
    setTempImageUrl(null)
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setTempImageUrl(null)
    setTempPosition({ x: 0, y: 0 })
    setTempZoom(1)
  }

  const handleEditCrop = () => {
    if (backgroundImage) {
      setTempImageUrl(backgroundImage)
      setTempImageSize(naturalImageSize)
      setTempPosition(imagePosition)
      setTempZoom(imageZoom)
      setShowCropModal(true)
    }
  }

  const handleRemoveImage = () => {
    setBackgroundImage(null)
    setNaturalImageSize({ width: 0, height: 0 })
    setImagePosition({ x: 0, y: 0 })
    setImageZoom(1)
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
                  max="500"
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
                  <button
                    onClick={handleEditCrop}
                    className="mt-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                  >
                    Edit Crop
                  </button>
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
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={segmentColor}
                      onChange={(e) => setSegmentColor(e.target.value)}
                      className="flex-1 h-10 rounded cursor-pointer"
                    />
                    <button
                      onClick={() => setSegmentColor(titleColor)}
                      className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap"
                    >
                      Link to Title Color
                    </button>
                  </div>
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

      {/* Crop Modal */}
      {showCropModal && tempImageUrl && (() => {
        const baseScaleX = CANVAS_WIDTH / tempImageSize.width
        const baseScaleY = CANVAS_HEIGHT / tempImageSize.height
        const baseScale = Math.max(baseScaleX, baseScaleY)
        const effectiveScale = baseScale * tempZoom

        const scaledWidth = tempImageSize.width * effectiveScale
        const scaledHeight = tempImageSize.height * effectiveScale

        const maxOffsetX = Math.max(0, (scaledWidth - CANVAS_WIDTH) / 2)
        const maxOffsetY = Math.max(0, (scaledHeight - CANVAS_HEIGHT) / 2)

        const clampPosition = (pos: { x: number; y: number }) => ({
          x: Math.max(-maxOffsetX, Math.min(maxOffsetX, pos.x)),
          y: Math.max(-maxOffsetY, Math.min(maxOffsetY, pos.y)),
        })

        const clampedPosition = clampPosition(tempPosition)

        return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col">
            {/* Crop Area */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
              <div
                className="relative overflow-hidden cursor-move select-none touch-none"
                style={{
                  width: '100%',
                  maxWidth: '90vh',
                  aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}`,
                  backgroundColor: '#000',
                }}
                onMouseDown={(e) => {
                  const startX = e.clientX
                  const startY = e.clientY
                  const startPos = { ...tempPosition }
                  const rect = e.currentTarget.getBoundingClientRect()
                  const displayScale = CANVAS_WIDTH / rect.width

                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const dx = (moveEvent.clientX - startX) * displayScale
                    const dy = (moveEvent.clientY - startY) * displayScale
                    const newPos = { x: startPos.x + dx, y: startPos.y + dy }
                    setTempPosition(clampPosition(newPos))
                  }

                  const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove)
                    window.removeEventListener('mouseup', handleMouseUp)
                  }

                  window.addEventListener('mousemove', handleMouseMove)
                  window.addEventListener('mouseup', handleMouseUp)
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0]
                  const startX = touch.clientX
                  const startY = touch.clientY
                  const startPos = { ...tempPosition }
                  const rect = e.currentTarget.getBoundingClientRect()
                  const displayScale = CANVAS_WIDTH / rect.width

                  const handleTouchMove = (moveEvent: TouchEvent) => {
                    const moveTouch = moveEvent.touches[0]
                    const dx = (moveTouch.clientX - startX) * displayScale
                    const dy = (moveTouch.clientY - startY) * displayScale
                    const newPos = { x: startPos.x + dx, y: startPos.y + dy }
                    setTempPosition(clampPosition(newPos))
                  }

                  const handleTouchEnd = () => {
                    window.removeEventListener('touchmove', handleTouchMove)
                    window.removeEventListener('touchend', handleTouchEnd)
                  }

                  window.addEventListener('touchmove', handleTouchMove, { passive: true })
                  window.addEventListener('touchend', handleTouchEnd)
                }}
              >
                {/* Image - accurately matches final render */}
                <img
                  src={tempImageUrl}
                  alt="Crop preview"
                  className="absolute pointer-events-none"
                  draggable={false}
                  style={{
                    width: `${(scaledWidth / CANVAS_WIDTH) * 100}%`,
                    height: `${(scaledHeight / CANVAS_HEIGHT) * 100}%`,
                    left: `calc(50% + ${(clampedPosition.x / CANVAS_WIDTH) * 100}%)`,
                    top: `calc(50% + ${(clampedPosition.y / CANVAS_HEIGHT) * 100}%)`,
                    transform: 'translate(-50%, -50%)',
                    objectFit: 'cover',
                  }}
                />
                {/* Grid overlay (rule of thirds) */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                  <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                  <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-black/80">
              {/* Zoom Slider */}
              <div className="flex items-center gap-4 max-w-md mx-auto mb-4">
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
                <input
                  type="range"
                  min="100"
                  max="300"
                  value={tempZoom * 100}
                  onChange={(e) => {
                    const newZoom = Number(e.target.value) / 100
                    setTempZoom(newZoom)
                    const newBaseScale = Math.max(baseScaleX, baseScaleY)
                    const newEffectiveScale = newBaseScale * newZoom
                    const newScaledWidth = tempImageSize.width * newEffectiveScale
                    const newScaledHeight = tempImageSize.height * newEffectiveScale
                    const newMaxOffsetX = Math.max(0, (newScaledWidth - CANVAS_WIDTH) / 2)
                    const newMaxOffsetY = Math.max(0, (newScaledHeight - CANVAS_HEIGHT) / 2)
                    setTempPosition({
                      x: Math.max(-newMaxOffsetX, Math.min(newMaxOffsetX, tempPosition.x)),
                      y: Math.max(-newMaxOffsetY, Math.min(newMaxOffsetY, tempPosition.y)),
                    })
                  }}
                  className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                />
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCropCancel}
                  className="px-6 py-2 text-white/80 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropApply}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

export default App

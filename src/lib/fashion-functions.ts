import { z } from 'zod'

// Function parameter schemas for validation
export const MeasurementCalculatorSchema = z.object({
  garmentType: z.enum(['dress', 'skirt', 'blouse', 'pants', 'jacket']),
  measurements: z.object({
    bust: z.number().min(20).max(60).optional(),
    waist: z.number().min(15).max(50).optional(),
    hip: z.number().min(25).max(65).optional(),
    length: z.number().min(10).max(80).optional()
  }),
  ease: z.object({
    bust: z.number().min(0).max(8).optional(),
    waist: z.number().min(0).max(6).optional(),
    hip: z.number().min(0).max(6).optional()
  }).optional(),
  seamAllowance: z.number().min(0.25).max(1.5).default(0.625), // 5/8" default
  fabricWidth: z.number().min(36).max(60).default(45) // inches
})

export const TechniqueGuideSchema = z.object({
  technique: z.enum([
    'bust_dart', 'waist_dart', 'sleeve_setting', 'bias_draping', 'french_seam',
    'invisible_zipper', 'button_holes', 'hem_techniques', 'collar_construction',
    'gathering', 'pleating', 'pattern_matching'
  ]),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  fabricType: z.enum(['woven', 'knit', 'silk', 'denim', 'wool']).optional(),
  specificIssue: z.string().max(200).optional()
})

export const IllustratorHelpSchema = z.object({
  task: z.enum([
    'technical_flat', 'fashion_illustration', 'color_palette', 'textile_pattern',
    'presentation_board', 'vector_tracing', 'pattern_repeat', 'fabric_rendering'
  ]),
  toolPreference: z.enum(['pen_tool', 'brush_tool', 'shape_tools', 'pathfinder', 'live_paint']).optional(),
  outputType: z.enum(['print', 'digital', 'portfolio']).default('digital'),
  complexity: z.enum(['basic', 'intermediate', 'advanced']).default('basic')
})

// Function result types
export interface MeasurementResult {
  fabricYardage: number
  patternPieces: {
    name: string
    width: number
    length: number
    quantity: number
  }[]
  cuttingLayout: string
  totalEase: {
    bust: number
    waist: number
    hip: number
  }
  notes: string[]
}

export interface TechniqueGuideResult {
  title: string
  steps: {
    stepNumber: number
    instruction: string
    tips: string[]
    commonMistakes: string[]
  }[]
  tools: string[]
  timeEstimate: string
  difficultyLevel: string
  relatedTechniques: string[]
  troubleshooting: {
    problem: string
    solution: string
  }[]
}

export interface IllustratorHelpResult {
  title: string
  overview: string
  tools: string[]
  stepByStep: {
    step: number
    action: string
    details: string
    shortcuts: string[]
  }[]
  tips: string[]
  commonIssues: {
    problem: string
    solution: string
  }[]
  fileSpecs: {
    size: string
    colorMode: string
    resolution: string
  }
}

// Function implementations
export class FashionFunctions {
  
  /**
   * Calculate fabric requirements and measurements for garment construction
   */
  static calculateMeasurements(params: z.infer<typeof MeasurementCalculatorSchema>): MeasurementResult {
    const { garmentType, measurements, ease = {}, seamAllowance, fabricWidth } = params
    
    // Apply default ease if not provided
    const appliedEase = {
      bust: ease.bust ?? 3,
      waist: ease.waist ?? 1.5,
      hip: ease.hip ?? 2.5
    }
    
    // Calculate finished measurements with ease
    const finishedMeasurements = {
      bust: (measurements.bust ?? 36) + appliedEase.bust,
      waist: (measurements.waist ?? 28) + appliedEase.waist,
      hip: (measurements.hip ?? 38) + appliedEase.hip,
      length: measurements.length ?? 36
    }
    
    // Calculate pattern pieces based on garment type
    let patternPieces: MeasurementResult['patternPieces'] = []
    let fabricYardage = 0
    
    switch (garmentType) {
      case 'dress':
        patternPieces = [
          { name: 'Front Bodice', width: finishedMeasurements.bust / 2 + 2, length: 16, quantity: 1 },
          { name: 'Back Bodice', width: finishedMeasurements.bust / 2 + 2, length: 16, quantity: 1 },
          { name: 'Front Skirt', width: finishedMeasurements.hip / 2 + 4, length: finishedMeasurements.length - 16, quantity: 1 },
          { name: 'Back Skirt', width: finishedMeasurements.hip / 2 + 4, length: finishedMeasurements.length - 16, quantity: 1 }
        ]
        fabricYardage = Math.ceil((finishedMeasurements.length + 8) / 36 * 2.5)
        break
        
      case 'skirt':
        patternPieces = [
          { name: 'Front Skirt', width: finishedMeasurements.hip / 2 + 4, length: finishedMeasurements.length, quantity: 1 },
          { name: 'Back Skirt', width: finishedMeasurements.hip / 2 + 4, length: finishedMeasurements.length, quantity: 1 },
          { name: 'Waistband', width: finishedMeasurements.waist + 4, length: 3, quantity: 1 }
        ]
        fabricYardage = Math.ceil((finishedMeasurements.length + 6) / 36 * 1.5)
        break
        
      case 'blouse':
        patternPieces = [
          { name: 'Front', width: finishedMeasurements.bust / 2 + 3, length: finishedMeasurements.length, quantity: 1 },
          { name: 'Back', width: finishedMeasurements.bust / 2 + 3, length: finishedMeasurements.length, quantity: 1 },
          { name: 'Sleeve', width: 16, length: 24, quantity: 2 },
          { name: 'Collar', width: 18, length: 4, quantity: 2 }
        ]
        fabricYardage = Math.ceil((finishedMeasurements.length + 12) / 36 * 2)
        break
        
      default:
        patternPieces = [
          { name: 'Main Pattern', width: finishedMeasurements.bust / 2 + 4, length: finishedMeasurements.length, quantity: 2 }
        ]
        fabricYardage = Math.ceil((finishedMeasurements.length + 8) / 36 * 2)
    }
    
    // Add seam allowances to all pieces
    patternPieces = patternPieces.map(piece => ({
      ...piece,
      width: piece.width + (seamAllowance * 2),
      length: piece.length + (seamAllowance * 2)
    }))
    
    const cuttingLayout = fabricWidth >= 45 ? 
      "Use standard 45\" fabric width with lengthwise grain layout" :
      "May require crosswise layout or additional yardage for narrow fabric"
    
    const notes = [
      `Seam allowance: ${seamAllowance}\" included in all measurements`,
      `Total ease added: Bust ${appliedEase.bust}\", Waist ${appliedEase.waist}\", Hip ${appliedEase.hip}\"`,
      "Pre-wash fabric before cutting",
      "Check pattern layout before cutting to optimize fabric usage"
    ]
    
    return {
      fabricYardage,
      patternPieces,
      cuttingLayout,
      totalEase: appliedEase,
      notes
    }
  }
  
  /**
   * Provide step-by-step guidance for fashion construction techniques
   */
  static getTechniqueGuide(params: z.infer<typeof TechniqueGuideSchema>): TechniqueGuideResult {
    const { technique, skillLevel, fabricType, specificIssue } = params
    
    // Technique database with detailed instructions
    const techniqueDatabase: Record<string, Omit<TechniqueGuideResult, 'troubleshooting'>> = {
      bust_dart: {
        title: "Constructing a Bust Dart",
        steps: [
          {
            stepNumber: 1,
            instruction: "Mark dart legs and point accurately from pattern",
            tips: ["Use a ruler to ensure straight dart legs", "Mark dart point with small dot"],
            commonMistakes: ["Not transferring dart markings accurately", "Making dart legs uneven"]
          },
          {
            stepNumber: 2,
            instruction: "Fold dart with right sides together, matching dart legs",
            tips: ["Pin dart legs together before stitching", "Ensure dart point aligns perfectly"],
            commonMistakes: ["Folding dart with wrong sides together", "Misaligning dart legs"]
          },
          {
            stepNumber: 3,
            instruction: "Stitch from wide end toward point in one continuous line",
            tips: ["Use backstitch at wide end only", "Taper stitching to nothing at point"],
            commonMistakes: ["Backstitching at dart point (causes dimpling)", "Not tapering to point properly"]
          },
          {
            stepNumber: 4,
            instruction: "Press dart toward center front or as pattern indicates",
            tips: ["Use ham for curved pressing", "Steam press for crisp edge"],
            commonMistakes: ["Pressing dart flat instead of to one side", "Over-pressing and creating shine"]
          }
        ],
        tools: ["Pins", "Ruler", "Fabric scissors", "Iron", "Ham"],
        timeEstimate: "10-15 minutes per dart",
        difficultyLevel: skillLevel === 'beginner' ? "Beginner-friendly" : "Standard technique",
        relatedTechniques: ["Waist darts", "Princess seams", "Dart manipulation"]
      },
      
      sleeve_setting: {
        title: "Setting a Sleeve",
        steps: [
          {
            stepNumber: 1,
            instruction: "Prepare sleeve by easing sleeve cap between notches",
            tips: ["Use long machine stitches just inside seam line", "Ease evenly, don't gather"],
            commonMistakes: ["Creating gathers instead of ease", "Uneven ease distribution"]
          },
          {
            stepNumber: 2,
            instruction: "Match sleeve to armhole at key points (shoulder, notches, underarm)",
            tips: ["Pin at shoulder point first", "Match all notches before pinning between"],
            commonMistakes: ["Not matching notches properly", "Rushing the pinning process"]
          },
          {
            stepNumber: 3,
            instruction: "Distribute ease evenly around sleeve cap",
            tips: ["Most ease goes in back of cap", "No ease at underarm or shoulder point"],
            commonMistakes: ["Putting ease at shoulder point", "Uneven ease distribution"]
          },
          {
            stepNumber: 4,
            instruction: "Stitch with sleeve side up, using small stitches",
            tips: ["Keep ease smooth while stitching", "Go slowly around curves"],
            commonMistakes: ["Stitching with bodice side up", "Catching unwanted pleats in stitching"]
          }
        ],
        tools: ["Pins", "Sewing machine", "Small scissors", "Seam ripper"],
        timeEstimate: "20-30 minutes per sleeve",
        difficultyLevel: skillLevel === 'beginner' ? "Challenging for beginners" : "Intermediate technique",
        relatedTechniques: ["Armhole finishing", "Sleeve hemming", "Raglan sleeves"]
      },
      
      bias_draping: {
        title: "Bias Draping Technique",
        steps: [
          {
            stepNumber: 1,
            instruction: "Cut fabric on true bias (45 degrees to grain)",
            tips: ["Use rotary cutter for accuracy", "Cut larger than needed for adjustments"],
            commonMistakes: ["Not cutting on true bias", "Cutting pieces too small"]
          },
          {
            stepNumber: 2,
            instruction: "Allow fabric to hang and relax for 24 hours before draping",
            tips: ["Hang fabric vertically", "Let bias naturally stretch"],
            commonMistakes: ["Rushing to drape immediately", "Not allowing for natural stretch"]
          },
          {
            stepNumber: 3,
            instruction: "Begin draping at center front, working gently",
            tips: ["Use minimal pins", "Don't stretch fabric while pinning"],
            commonMistakes: ["Over-pinning", "Pulling or stretching fabric during process"]
          },
          {
            stepNumber: 4,
            instruction: "Work systematically around form, maintaining grain",
            tips: ["Check bias grain frequently", "Allow fabric to fall naturally"],
            commonMistakes: ["Forcing fabric into position", "Losing track of bias grain"]
          }
        ],
        tools: ["Sharp scissors", "Rotary cutter", "Fine pins", "Dress form"],
        timeEstimate: "2-3 hours including rest time",
        difficultyLevel: "Advanced technique",
        relatedTechniques: ["Grain understanding", "Draping fundamentals", "Pattern transfer"]
      }
    }
    
    const baseGuide = techniqueDatabase[technique] || techniqueDatabase.bust_dart
    
    // Add fabric-specific troubleshooting
    const troubleshooting: TechniqueGuideResult['troubleshooting'] = []
    
    if (technique === 'bust_dart') {
      troubleshooting.push(
        { problem: "Dart creates dimple at point", solution: "Don't backstitch at dart point, taper stitching to nothing" },
        { problem: "Dart doesn't lie flat", solution: "Check dart placement and press over ham to maintain curve" }
      )
    }
    
    if (technique === 'sleeve_setting') {
      troubleshooting.push(
        { problem: "Sleeve cap has wrinkles", solution: "Check ease distribution, may need to adjust or redistribute" },
        { problem: "Armhole is too tight", solution: "Check that adequate ease was added to sleeve cap" }
      )
    }
    
    if (fabricType === 'silk') {
      troubleshooting.push(
        { problem: "Fabric frays easily", solution: "Use sharp scissors, seal edges with fray check if needed" }
      )
    }
    
    if (specificIssue) {
      troubleshooting.push(
        { problem: `Student reported: ${specificIssue}`, solution: "Review technique steps carefully, check fabric grain and tool quality" }
      )
    }
    
    return {
      ...baseGuide,
      troubleshooting
    }
  }
  
  /**
   * Provide Adobe Illustrator guidance for fashion design tasks
   */
  static getIllustratorHelp(params: z.infer<typeof IllustratorHelpSchema>): IllustratorHelpResult {
    const { task, toolPreference, outputType, complexity } = params
    
    const illustratorDatabase: Record<string, IllustratorHelpResult> = {
      technical_flat: {
        title: "Creating Technical Flats in Illustrator",
        overview: "Technical flats are precise, proportional drawings of garments without a fashion figure. They communicate construction details clearly.",
        tools: ["Pen Tool", "Direct Selection Tool", "Stroke Panel", "Pathfinder"],
        stepByStep: [
          {
            step: 1,
            action: "Set up document with appropriate dimensions",
            details: "Create 11\"x17\" document, CMYK color mode, 300 DPI for print quality",
            shortcuts: ["Cmd/Ctrl + N for new document"]
          },
          {
            step: 2,
            action: "Start with basic garment silhouette using Pen Tool",
            details: "Draw outer silhouette first, use smooth curves for natural garment lines",
            shortcuts: ["P for Pen Tool", "Alt + click to break curve handles"]
          },
          {
            step: 3,
            action: "Add construction lines with appropriate stroke weights",
            details: "Outer silhouette: 2-3pt, seam lines: 1-2pt, details: 0.5-1pt",
            shortcuts: ["Window > Stroke to open stroke panel"]
          },
          {
            step: 4,
            action: "Add design details (pockets, buttons, topstitching)",
            details: "Use consistent line weights, show all functional and decorative elements",
            shortcuts: ["Shift + drag to constrain proportions"]
          }
        ],
        tips: [
          "Maintain realistic proportions, not fashion figure proportions",
          "Use consistent line weights throughout design",
          "Show garments as they would actually fit on body",
          "Include all construction details for pattern maker"
        ],
        commonIssues: [
          { problem: "Lines look jagged or rough", solution: "Use Pen Tool with smooth curves, avoid too many anchor points" },
          { problem: "Proportions look unrealistic", solution: "Reference actual garment measurements, not fashion illustrations" }
        ],
        fileSpecs: {
          size: outputType === 'print' ? "11\"x17\" or 8.5\"x11\"" : "1920x1080 pixels",
          colorMode: outputType === 'print' ? "CMYK" : "RGB",
          resolution: outputType === 'print' ? "300 DPI" : "72 DPI"
        }
      },
      
      textile_pattern: {
        title: "Creating Seamless Textile Patterns",
        overview: "Design repeating patterns for fabric printing, ensuring seamless edges and appropriate scale.",
        tools: ["Pattern Tool", "Transform Panel", "Pathfinder", "Swatches Panel"],
        stepByStep: [
          {
            step: 1,
            action: "Design individual pattern motifs",
            details: "Create design elements that will repeat, consider scale and spacing",
            shortcuts: ["Use grid view for alignment (Cmd/Ctrl + ')"]
          },
          {
            step: 2,
            action: "Arrange motifs in desired repeat structure",
            details: "Consider straight repeat, half-drop, or brick repeat patterns",
            shortcuts: ["Alt + drag to duplicate objects"]
          },
          {
            step: 3,
            action: "Create seamless edges using Pattern Options",
            details: "Object > Pattern > Make, adjust spacing and ensure edges connect",
            shortcuts: ["Pattern Options panel automatically opens"]
          },
          {
            step: 4,
            action: "Test pattern by creating swatches and applying to shapes",
            details: "Save as pattern swatch, apply to rectangle to test seamless repeat",
            shortcuts: ["Drag pattern to Swatches panel to save"]
          }
        ],
        tips: [
          "Consider scale - pattern should be appropriate for intended garment",
          "Test pattern at actual size before finalizing",
          "Ensure colors are suitable for fabric printing process",
          "Save working file and final pattern file separately"
        ],
        commonIssues: [
          { problem: "Pattern edges don't line up", solution: "Use Pattern Options to adjust spacing, ensure motifs don't cross boundaries" },
          { problem: "Pattern looks too busy when repeated", solution: "Reduce number of elements or increase spacing between motifs" }
        ],
        fileSpecs: {
          size: "Variable based on repeat size",
          colorMode: "CMYK for textile printing",
          resolution: "300 DPI minimum"
        }
      },
      
      color_palette: {
        title: "Building Fashion Color Palettes",
        overview: "Create cohesive color schemes for fashion collections using color theory principles.",
        tools: ["Color Guide Panel", "Swatches Panel", "Eyedropper Tool", "Recolor Artwork"],
        stepByStep: [
          {
            step: 1,
            action: "Start with inspiration or base color",
            details: "Choose primary color that sets mood and direction for collection",
            shortcuts: ["Double-click color swatch to edit"]
          },
          {
            step: 2,
            action: "Use Color Guide to generate harmonious colors",
            details: "Window > Color Guide, choose harmony rule (analogous, complementary, etc.)",
            shortcuts: ["Click harmony icons in Color Guide panel"]
          },
          {
            step: 3,
            action: "Refine colors and create variations",
            details: "Adjust saturation and brightness for variety while maintaining harmony",
            shortcuts: ["Shift + click in Color Guide for variations"]
          },
          {
            step: 4,
            action: "Save final palette to Swatches panel",
            details: "Select all colors and save as color group for easy access",
            shortcuts: ["Click folder icon in Swatches panel to create group"]
          }
        ],
        tips: [
          "Consider seasonal appropriateness of color choices",
          "Include neutrals (black, white, gray, beige) for balance",
          "Test colors together by applying to sample shapes",
          "Consider how colors will look in different fabrics"
        ],
        commonIssues: [
          { problem: "Colors clash when used together", solution: "Adjust saturation levels, ensure proper color temperature balance" },
          { problem: "Palette looks too monochromatic", solution: "Add accent colors or vary saturation and brightness more" }
        ],
        fileSpecs: {
          size: "Standard document size",
          colorMode: outputType === 'print' ? "CMYK" : "RGB",
          resolution: "72 DPI for color reference"
        }
      }
    }
    
    const guide = illustratorDatabase[task] || illustratorDatabase.technical_flat
    
    // Adjust complexity based on user level
    if (complexity === 'basic') {
      guide.stepByStep = guide.stepByStep.slice(0, 3) // Show fewer steps for basic level
      guide.tips = guide.tips.slice(0, 2) // Fewer tips to avoid overwhelm
    }
    
    return guide
  }
}

// Export function schemas for validation
export const FashionFunctionSchemas = {
  measurement_calculator: MeasurementCalculatorSchema,
  technique_guide: TechniqueGuideSchema,
  illustrator_help: IllustratorHelpSchema
} as const

export type FashionFunctionName = keyof typeof FashionFunctionSchemas
import { z } from 'zod'
import { FashionFunctions, FashionFunctionSchemas, type FashionFunctionName } from './fashion-functions'

// Enhanced function calling system with intent detection
export class FunctionCallingSystem {
  private openai: any
  private functionRegistry: Map<string, FunctionDefinition> = new Map()

  constructor() {
    // Lazy initialization to avoid module loading issues
    this.initializeOpenAI()

    // Register fashion functions
    this.registerFashionFunctions()
  }

  private initializeOpenAI() {
    try {
      const OpenAI = require('openai')
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    } catch (error) {
      console.warn('OpenAI initialization failed:', error)
      this.openai = null
    }
  }

  private registerFashionFunctions() {
    // Register measurement calculator
    this.functionRegistry.set('calculate_measurements', {
      name: 'calculate_measurements',
      description: 'Calculate fabric requirements, pattern pieces, and cutting layouts for garment construction. Use when users ask about fabric yardage, pattern layout, or construction measurements.',
      parameters: {
        type: 'object',
        properties: {
          garmentType: {
            type: 'string',
            enum: ['dress', 'skirt', 'blouse', 'pants', 'jacket'],
            description: 'Type of garment to calculate measurements for'
          },
          measurements: {
            type: 'object',
            properties: {
              bust: { type: 'number', minimum: 20, maximum: 60, description: 'Bust measurement in inches' },
              waist: { type: 'number', minimum: 15, maximum: 50, description: 'Waist measurement in inches' },
              hip: { type: 'number', minimum: 25, maximum: 65, description: 'Hip measurement in inches' },
              length: { type: 'number', minimum: 10, maximum: 80, description: 'Garment length in inches' }
            },
            required: ['bust', 'waist', 'hip'],
            description: 'Body measurements for the garment'
          },
          ease: {
            type: 'object',
            properties: {
              bust: { type: 'number', minimum: 0, maximum: 8, description: 'Bust ease in inches' },
              waist: { type: 'number', minimum: 0, maximum: 6, description: 'Waist ease in inches' },
              hip: { type: 'number', minimum: 0, maximum: 6, description: 'Hip ease in inches' }
            },
            description: 'Ease allowances (optional, defaults will be applied)'
          },
          seamAllowance: {
            type: 'number',
            minimum: 0.25,
            maximum: 1.5,
            default: 0.625,
            description: 'Seam allowance in inches (defaults to 5/8 inch)'
          },
          fabricWidth: {
            type: 'number',
            minimum: 36,
            maximum: 60,
            default: 45,
            description: 'Fabric width in inches (defaults to 45 inches)'
          }
        },
        required: ['garmentType', 'measurements']
      },
      handler: (params: any) => FashionFunctions.calculateMeasurements(params)
    })

    // Register technique guide
    this.functionRegistry.set('get_technique_guide', {
      name: 'get_technique_guide',
      description: 'Provide step-by-step guidance for specific fashion construction techniques. Use when users need help with sewing techniques, pattern construction, or troubleshooting construction issues.',
      parameters: {
        type: 'object',
        properties: {
          technique: {
            type: 'string',
            enum: ['bust_dart', 'waist_dart', 'sleeve_setting', 'bias_draping', 'french_seam', 'invisible_zipper', 'button_holes', 'hem_techniques', 'collar_construction', 'gathering', 'pleating', 'pattern_matching'],
            description: 'Specific technique to get guidance for'
          },
          skillLevel: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner',
            description: 'User skill level to tailor instructions'
          },
          fabricType: {
            type: 'string',
            enum: ['woven', 'knit', 'silk', 'denim', 'wool'],
            description: 'Type of fabric being used (optional)'
          },
          specificIssue: {
            type: 'string',
            maxLength: 200,
            description: 'Specific issue or problem the user is facing (optional)'
          }
        },
        required: ['technique']
      },
      handler: (params: any) => FashionFunctions.getTechniqueGuide(params)
    })

    // Register Illustrator help
    this.functionRegistry.set('get_illustrator_help', {
      name: 'get_illustrator_help',
      description: 'Provide Adobe Illustrator guidance for fashion design tasks. Use when users need help with technical drawings, fashion illustrations, or Illustrator-specific questions.',
      parameters: {
        type: 'object',
        properties: {
          task: {
            type: 'string',
            enum: ['technical_flat', 'fashion_illustration', 'color_palette', 'textile_pattern', 'presentation_board', 'vector_tracing', 'pattern_repeat', 'fabric_rendering'],
            description: 'Specific Illustrator task to get help with'
          },
          toolPreference: {
            type: 'string',
            enum: ['pen_tool', 'brush_tool', 'shape_tools', 'pathfinder', 'live_paint'],
            description: 'Preferred Illustrator tool (optional)'
          },
          outputType: {
            type: 'string',
            enum: ['print', 'digital', 'portfolio'],
            default: 'digital',
            description: 'Intended output type'
          },
          complexity: {
            type: 'string',
            enum: ['basic', 'intermediate', 'advanced'],
            default: 'basic',
            description: 'Complexity level desired'
          }
        },
        required: ['task']
      },
      handler: (params: any) => FashionFunctions.getIllustratorHelp(params)
    })
  }

  /**
   * Analyze query to determine if function calling is needed
   */
  async analyzeQueryForFunctions(query: string, context: string): Promise<{
    shouldUseFunctions: boolean
    suggestedFunctions: string[]
    confidence: number
  }> {
    // Fallback to keyword-based if OpenAI not available
    if (!this.openai) {
      return this.keywordBasedDetection(query)
    }

    const analysisPrompt = `Analyze this fashion design query to determine if it needs function calling:

Query: "${query}"
Available Context: "${context.substring(0, 500)}"

Available Functions:
1. calculate_measurements - For fabric calculations, yardage, pattern layout
2. get_technique_guide - For step-by-step sewing/construction help
3. get_illustrator_help - For Adobe Illustrator assistance

Determine:
1. Should use functions? (yes/no and why)
2. Which functions? (list by name)
3. Confidence level (0-1)

Respond in JSON format:
{
  "shouldUseFunctions": boolean,
  "suggestedFunctions": ["function_name"],
  "confidence": 0.95,
  "reasoning": "explanation"
}`

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content
      if (!content) throw new Error('No analysis response')

      const analysis = JSON.parse(content)
      return {
        shouldUseFunctions: analysis.shouldUseFunctions || false,
        suggestedFunctions: analysis.suggestedFunctions || [],
        confidence: analysis.confidence || 0
      }
    } catch (error) {
      console.error('Function analysis error:', error)
      // Fallback to keyword-based detection
      return this.keywordBasedDetection(query)
    }
  }

  /**
   * Fallback function detection using keywords
   */
  private keywordBasedDetection(query: string): {
    shouldUseFunctions: boolean
    suggestedFunctions: string[]
    confidence: number
  } {
    const lowerQuery = query.toLowerCase()
    const functions: string[] = []

    // Check for measurement/calculation keywords
    if (/\b(fabric|yardage|yards?|measurements?|pattern|cutting|layout|ease|seam allowance)\b/.test(lowerQuery)) {
      functions.push('calculate_measurements')
    }

    // Check for technique keywords
    if (/\b(dart|sleeve|bias|draping|seam|zipper|hem|collar|gather|pleat|technique|how to|step.*step)\b/.test(lowerQuery)) {
      functions.push('get_technique_guide')
    }

    // Check for Illustrator keywords
    if (/\b(illustrator|technical flat|fashion illustration|adobe|pen tool|vector|color palette)\b/.test(lowerQuery)) {
      functions.push('get_illustrator_help')
    }

    return {
      shouldUseFunctions: functions.length > 0,
      suggestedFunctions: functions,
      confidence: functions.length > 0 ? 0.7 : 0.1
    }
  }

  /**
   * Enhanced function calling with OpenAI Tools API
   */
  async callWithFunctions(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    availableFunctions: string[] = []
  ): Promise<{
    content: string
    functionCalls: Array<{
      name: string
      arguments: any
      result: any
    }>
    tokenUsage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }> {
    // Return error if OpenAI not available
    if (!this.openai) {
      throw new Error('OpenAI client not initialized - function calling unavailable')
    }
    const functionsToInclude = availableFunctions.length > 0
      ? availableFunctions
      : Array.from(this.functionRegistry.keys())

    const tools = functionsToInclude
      .filter(name => this.functionRegistry.has(name))
      .map(name => {
        const func = this.functionRegistry.get(name)!
        return {
          type: 'function' as const,
          function: {
            name: func.name,
            description: func.description,
            parameters: func.parameters
          }
        }
      })

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
        temperature: 0.3,
        max_tokens: 2000
      })

      const message = response.choices[0]?.message
      if (!message) throw new Error('No response from OpenAI')

      const functionCalls: Array<{
        name: string
        arguments: any
        result: any
      }> = []

      // Handle function calls if present
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            const functionName = toolCall.function.name
            const functionArgs = JSON.parse(toolCall.function.arguments)

            const functionDef = this.functionRegistry.get(functionName)
            if (functionDef) {
              try {
                const result = await functionDef.handler(functionArgs)
                functionCalls.push({
                  name: functionName,
                  arguments: functionArgs,
                  result
                })
              } catch (error) {
                console.error(`Function ${functionName} error:`, error)
                functionCalls.push({
                  name: functionName,
                  arguments: functionArgs,
                  result: { error: `Function execution failed: ${error}` }
                })
              }
            }
          }
        }

        // If functions were called, make second call with results
        if (functionCalls.length > 0) {
          const toolMessages = functionCalls.map(fc => ({
            role: 'tool' as const,
            tool_call_id: message.tool_calls?.find(tc =>
              tc.type === 'function' && tc.function.name === fc.name
            )?.id || 'unknown',
            content: JSON.stringify(fc.result)
          }))

          const followUpResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              ...messages,
              message,
              ...toolMessages
            ],
            temperature: 0.3,
            max_tokens: 2000
          })

          return {
            content: followUpResponse.choices[0]?.message?.content || '',
            functionCalls,
            tokenUsage: {
              promptTokens: (response.usage?.prompt_tokens || 0) + (followUpResponse.usage?.prompt_tokens || 0),
              completionTokens: (response.usage?.completion_tokens || 0) + (followUpResponse.usage?.completion_tokens || 0),
              totalTokens: (response.usage?.total_tokens || 0) + (followUpResponse.usage?.total_tokens || 0)
            }
          }
        }
      }

      return {
        content: message.content || '',
        functionCalls,
        tokenUsage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      }

    } catch (error) {
      console.error('Function calling error:', error)
      throw error
    }
  }
}

interface FunctionDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  handler: (params: any) => Promise<any> | any
}
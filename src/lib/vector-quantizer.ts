/**
 * Vector Quantization Implementation
 * 
 * Reduces memory usage by compressing 32-bit float vectors to 8-bit integers
 * while maintaining acceptable similarity search accuracy.
 * 
 * Memory savings: ~6KB per vector → ~1.5KB per vector (75% reduction)
 */

export interface QuantizedVector {
  quantized: Uint8Array
  scale: number
  offset: number
}

export interface QuantizerStats {
  compressionRatio: number
  memoryReduction: number
  avgQuantizationError: number
}

export class VectorQuantizer {
  private quantizationBits = 8
  private maxValue = (1 << this.quantizationBits) - 1 // 255 for 8-bit

  /**
   * Quantize a full-precision vector to 8-bit representation
   */
  quantize(vector: number[]): QuantizedVector {
    if (vector.length === 0) {
      throw new Error('Cannot quantize empty vector')
    }

    // Find min and max values for scaling
    let min = vector[0]
    let max = vector[0]
    
    for (let i = 1; i < vector.length; i++) {
      if (vector[i] < min) min = vector[i]
      if (vector[i] > max) max = vector[i]
    }

    // Calculate scale and offset
    const range = max - min
    const scale = range > 0 ? range / this.maxValue : 1
    const offset = min

    // Quantize each component
    const quantized = new Uint8Array(vector.length)
    for (let i = 0; i < vector.length; i++) {
      const normalized = (vector[i] - offset) / scale
      quantized[i] = Math.round(Math.max(0, Math.min(this.maxValue, normalized)))
    }

    return { quantized, scale, offset }
  }

  /**
   * Dequantize back to full precision (for similarity calculations)
   */
  dequantize(quantizedVector: QuantizedVector): number[] {
    const { quantized, scale, offset } = quantizedVector
    const vector = new Array(quantized.length)
    
    for (let i = 0; i < quantized.length; i++) {
      vector[i] = quantized[i] * scale + offset
    }
    
    return vector
  }

  /**
   * Calculate cosine similarity directly on quantized vectors (optimized)
   */
  calculateQuantizedSimilarity(a: QuantizedVector, b: QuantizedVector): number {
    if (a.quantized.length !== b.quantized.length) {
      throw new Error('Vectors must have the same length')
    }

    // For better accuracy, dequantize for similarity calculation
    // In production, this could be optimized to work directly on quantized values
    const vecA = this.dequantize(a)
    const vecB = this.dequantize(b)

    return this.cosineSimilarity(vecA, vecB)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Batch quantize multiple vectors with shared statistics
   */
  batchQuantize(vectors: number[][]): QuantizedVector[] {
    if (vectors.length === 0) return []

    // Option 1: Individual quantization (better accuracy)
    return vectors.map(vector => this.quantize(vector))

    // Option 2: Global quantization (better compression, lower accuracy)
    // Could be implemented for even better memory savings
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(originalVectorCount: number, vectorDimensions: number): QuantizerStats {
    // Original: 32-bit floats (4 bytes per dimension)
    const originalMemory = originalVectorCount * vectorDimensions * 4

    // Quantized: 8-bit integers + scale/offset (4 bytes each)
    const quantizedMemory = originalVectorCount * (vectorDimensions * 1 + 4 + 4)

    const memoryReduction = originalMemory - quantizedMemory
    const compressionRatio = originalMemory / quantizedMemory

    return {
      compressionRatio,
      memoryReduction,
      avgQuantizationError: 0 // Would need test data to calculate
    }
  }

  /**
   * Adaptive quantization based on vector characteristics
   */
  adaptiveQuantize(vector: number[]): QuantizedVector {
    // For vectors with low variance, use standard quantization
    const variance = this.calculateVariance(vector)
    
    if (variance < 0.01) {
      // Low variance - standard quantization is fine
      return this.quantize(vector)
    } else {
      // High variance - might need more careful quantization
      // For now, use standard approach but could implement:
      // - Non-uniform quantization
      // - Higher bit depths for important components
      // - Perceptual quantization
      return this.quantize(vector)
    }
  }

  private calculateVariance(vector: number[]): number {
    const mean = vector.reduce((sum, val) => sum + val, 0) / vector.length
    const variance = vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vector.length
    return variance
  }

  /**
   * Test quantization quality on a sample vector
   */
  testQuantizationQuality(originalVector: number[]): {
    originalVector: number[]
    quantizedVector: QuantizedVector
    reconstructedVector: number[]
    similarity: number
    memoryReduction: number
  } {
    const quantized = this.quantize(originalVector)
    const reconstructed = this.dequantize(quantized)
    const similarity = this.cosineSimilarity(originalVector, reconstructed)
    
    const originalSize = originalVector.length * 4 // 4 bytes per float
    const quantizedSize = quantized.quantized.length + 8 // 1 byte per quantized + 8 bytes for scale/offset
    const memoryReduction = 1 - (quantizedSize / originalSize)

    return {
      originalVector,
      quantizedVector: quantized,
      reconstructedVector: reconstructed,
      similarity,
      memoryReduction
    }
  }
}

// Singleton instance
export const vectorQuantizer = new VectorQuantizer()
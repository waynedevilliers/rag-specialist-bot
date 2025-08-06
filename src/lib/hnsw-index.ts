/**
 * Hierarchical Navigable Small World (HNSW) Index Implementation
 * 
 * This implementation provides approximate nearest neighbor search with O(log n) complexity
 * instead of the current O(n) brute-force approach. Based on the paper:
 * "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs"
 */

import { SecurityValidator, SecurityError } from './security-validator'

export interface HNSWNode {
  id: string
  vector: number[]
  connections: Map<number, Set<string>> // layer -> connected node IDs
}

export interface SearchResult {
  id: string
  distance: number
}

export class HNSWIndex {
  private nodes = new Map<string, HNSWNode>()
  private entryPoint: string | null = null
  private maxLayers = 5
  private maxConnections = 16 // M parameter
  private maxConnectionsLayer0 = 32 // M_L parameter  
  private efConstruction = 200 // ef parameter during construction
  private ml = 1 / Math.log(2) // level generation factor
  
  constructor(options?: {
    maxConnections?: number
    maxConnectionsLayer0?: number
    efConstruction?: number
    maxLayers?: number
  }) {
    if (options) {
      this.maxConnections = options.maxConnections ?? this.maxConnections
      this.maxConnectionsLayer0 = options.maxConnectionsLayer0 ?? this.maxConnectionsLayer0
      this.efConstruction = options.efConstruction ?? this.efConstruction
      this.maxLayers = options.maxLayers ?? this.maxLayers
    }
  }

  /**
   * Add a vector to the index
   */
  insert(id: string, vector: number[]): void {
    // **SECURITY FIX**: Validate input parameters
    if (!id || typeof id !== 'string') {
      throw new SecurityError('Invalid node ID')
    }
    
    SecurityValidator.validateVector(vector)
    
    // **SECURITY FIX**: Check node count limits
    if (this.nodes.size >= SecurityValidator.MAX_NODES) {
      throw new SecurityError('Maximum node capacity reached')
    }
    
    const level = this.getRandomLevel()
    
    const node: HNSWNode = {
      id,
      vector,
      connections: new Map()
    }
    
    // Initialize connections for each layer
    for (let layer = 0; layer <= level; layer++) {
      node.connections.set(layer, new Set())
    }
    
    this.nodes.set(id, node)
    
    if (!this.entryPoint) {
      this.entryPoint = id
      return
    }
    
    // Search for closest nodes at each layer
    let currentClosest = [{ id: this.entryPoint, distance: this.calculateDistance(vector, this.nodes.get(this.entryPoint)!.vector) }]
    
    // Search from top layer to level + 1
    const entryLevel = this.getNodeLevel(this.entryPoint)
    for (let layer = entryLevel; layer > level; layer--) {
      currentClosest = this.searchLayer(vector, currentClosest, 1, layer)
    }
    
    // Search and connect from level down to 0
    for (let layer = Math.min(level, entryLevel); layer >= 0; layer--) {
      const candidates = this.searchLayer(vector, currentClosest, this.efConstruction, layer)
      
      // Select neighbors and create bidirectional connections
      const maxConns = layer === 0 ? this.maxConnectionsLayer0 : this.maxConnections
      const selectedNeighbors = this.selectNeighbors(candidates, maxConns)
      
      for (const neighbor of selectedNeighbors) {
        // Add bidirectional connection
        node.connections.get(layer)!.add(neighbor.id)
        this.nodes.get(neighbor.id)!.connections.get(layer)!.add(id)
        
        // Prune connections if necessary
        this.pruneConnections(neighbor.id, layer)
      }
      
      currentClosest = candidates
    }
    
    // Update entry point if necessary
    if (level > this.getNodeLevel(this.entryPoint)) {
      this.entryPoint = id
    }
  }

  /**
   * Search for k nearest neighbors
   */
  search(queryVector: number[], k: number, ef: number = 50): SearchResult[] {
    // **SECURITY FIX**: Validate search parameters
    SecurityValidator.validateVector(queryVector)
    const sanitizedParams = SecurityValidator.validateSearchParams(k, ef)
    k = sanitizedParams.k
    ef = sanitizedParams.ef
    
    if (!this.entryPoint || this.nodes.size === 0) {
      return []
    }
    
    // Start from entry point
    let currentClosest = [{ 
      id: this.entryPoint, 
      distance: this.calculateDistance(queryVector, this.nodes.get(this.entryPoint)!.vector) 
    }]
    
    // Search from top layer to layer 1
    const entryLevel = this.getNodeLevel(this.entryPoint)
    for (let layer = entryLevel; layer > 0; layer--) {
      currentClosest = this.searchLayer(queryVector, currentClosest, 1, layer)
    }
    
    // Search layer 0 with higher ef
    const candidates = this.searchLayer(queryVector, currentClosest, Math.max(ef, k), 0)
    
    // Return top k results
    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
  }

  private searchLayer(queryVector: number[], entryPoints: SearchResult[], numClosest: number, layer: number): SearchResult[] {
    const visited = new Set<string>()
    const candidates = new Set<string>()
    const w = new Map<string, number>() // dynamic list of closest nodes
    
    // Initialize with entry points
    for (const entry of entryPoints) {
      w.set(entry.id, entry.distance)
      candidates.add(entry.id)
      visited.add(entry.id)
    }
    
    while (candidates.size > 0) {
      // Get closest unvisited candidate
      let closest: string | null = null
      let closestDistance = Infinity
      
      for (const candidate of candidates) {
        const distance = w.get(candidate)!
        if (distance < closestDistance) {
          closest = candidate
          closestDistance = distance
        }
      }
      
      if (!closest) break
      candidates.delete(closest)
      
      // Check if we should continue (closest candidate is farther than furthest result)
      const furthestDistance = Math.max(...Array.from(w.values()).slice(-numClosest))
      if (closestDistance > furthestDistance && w.size >= numClosest) {
        break
      }
      
      // Examine neighbors
      const connections = this.nodes.get(closest)?.connections.get(layer)
      if (connections) {
        for (const neighborId of connections) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId)
            const distance = this.calculateDistance(queryVector, this.nodes.get(neighborId)!.vector)
            
            if (w.size < numClosest || distance < Math.max(...Array.from(w.values()))) {
              candidates.add(neighborId)
              w.set(neighborId, distance)
              
              // Keep only numClosest closest nodes
              if (w.size > numClosest) {
                const entries = Array.from(w.entries()).sort((a, b) => a[1] - b[1])
                w.clear()
                for (let i = 0; i < numClosest; i++) {
                  w.set(entries[i][0], entries[i][1])
                }
              }
            }
          }
        }
      }
    }
    
    return Array.from(w.entries()).map(([id, distance]) => ({ id, distance }))
  }

  private selectNeighbors(candidates: SearchResult[], maxConnections: number): SearchResult[] {
    if (candidates.length <= maxConnections) {
      return candidates
    }
    
    // Simple heuristic: select closest nodes
    // In a full implementation, this would use more sophisticated selection
    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxConnections)
  }

  private pruneConnections(nodeId: string, layer: number): void {
    const node = this.nodes.get(nodeId)
    if (!node) return
    
    const connections = node.connections.get(layer)!
    const maxConns = layer === 0 ? this.maxConnectionsLayer0 : this.maxConnections
    
    if (connections.size <= maxConns) return
    
    // Calculate distances to all connected nodes
    const connectionDistances = Array.from(connections).map(connId => ({
      id: connId,
      distance: this.calculateDistance(node.vector, this.nodes.get(connId)!.vector)
    }))
    
    // Keep only the closest connections
    const toKeep = connectionDistances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxConns)
      .map(conn => conn.id)
    
    // Remove excess connections (bidirectionally)
    for (const connId of connections) {
      if (!toKeep.includes(connId)) {
        connections.delete(connId)
        this.nodes.get(connId)?.connections.get(layer)?.delete(nodeId)
      }
    }
  }

  private getRandomLevel(): number {
    let level = 0
    while (Math.random() < 0.5 && level < this.maxLayers - 1) {
      level++
    }
    return level
  }

  private getNodeLevel(nodeId: string): number {
    const node = this.nodes.get(nodeId)
    if (!node) return 0
    return Math.max(...Array.from(node.connections.keys()))
  }

  private calculateDistance(a: number[], b: number[]): number {
    // Using cosine distance (1 - cosine similarity) for consistency with existing system
    if (a.length !== b.length) {
      throw new SecurityError('Vectors must have the same length')
    }

    // **SECURITY FIX**: Validate mathematical operations
    SecurityValidator.validateMathOperation('cosine distance', [...a, ...b])

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      const aVal = a[i]
      const bVal = b[i]
      
      // Check for overflow in intermediate calculations
      if (!Number.isFinite(aVal * bVal)) {
        throw new SecurityError('Numerical overflow in distance calculation')
      }
      
      dotProduct += aVal * bVal
      normA += aVal * aVal
      normB += bVal * bVal
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0 || !Number.isFinite(normA) || !Number.isFinite(normB)) {
      return 1 // Maximum distance for zero or invalid vectors
    }

    const denominator = normA * normB
    if (denominator === 0 || !Number.isFinite(denominator)) {
      return 1
    }

    const cosineSimilarity = dotProduct / denominator
    if (!Number.isFinite(cosineSimilarity)) {
      return 1
    }

    return Math.max(0, Math.min(1, 1 - cosineSimilarity)) // Clamp result to [0,1]
  }

  // Utility methods
  getSize(): number {
    return this.nodes.size
  }

  clear(): void {
    this.nodes.clear()
    this.entryPoint = null
  }

  /**
   * Remove a node from the index
   */
  remove(id: string): boolean {
    const node = this.nodes.get(id)
    if (!node) {
      return false // Node doesn't exist
    }

    try {
      // Remove connections from this node to other nodes
      for (const [layer, connections] of node.connections.entries()) {
        for (const connId of connections) {
          const connectedNode = this.nodes.get(connId)
          if (connectedNode) {
            // Remove reverse connection
            const reverseConnections = connectedNode.connections.get(layer)
            if (reverseConnections) {
              reverseConnections.delete(id)
            }
          }
        }
      }

      // Remove the node itself
      this.nodes.delete(id)

      // Update entry point if necessary
      if (this.entryPoint === id) {
        // Find a new entry point (node with highest level)
        let newEntryPoint: string | null = null
        let maxLevel = -1

        for (const [nodeId, node] of this.nodes.entries()) {
          const nodeLevel = Math.max(...Array.from(node.connections.keys()))
          if (nodeLevel > maxLevel) {
            maxLevel = nodeLevel
            newEntryPoint = nodeId
          }
        }

        this.entryPoint = newEntryPoint
      }

      return true
    } catch (error) {
      console.error(`Error removing node ${id} from HNSW index:`, error)
      return false
    }
  }

  getStats(): {
    nodeCount: number
    avgConnectionsLayer0: number
    maxLevel: number
    entryPointLevel: number
  } {
    if (this.nodes.size === 0) {
      return { nodeCount: 0, avgConnectionsLayer0: 0, maxLevel: 0, entryPointLevel: 0 }
    }

    let totalConnectionsLayer0 = 0
    let maxLevel = 0

    for (const node of this.nodes.values()) {
      const layer0Connections = node.connections.get(0)?.size || 0
      totalConnectionsLayer0 += layer0Connections
      
      const nodeLevel = Math.max(...Array.from(node.connections.keys()))
      maxLevel = Math.max(maxLevel, nodeLevel)
    }

    return {
      nodeCount: this.nodes.size,
      avgConnectionsLayer0: totalConnectionsLayer0 / this.nodes.size,
      maxLevel,
      entryPointLevel: this.entryPoint ? this.getNodeLevel(this.entryPoint) : 0
    }
  }
}
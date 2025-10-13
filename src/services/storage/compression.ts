/**
 * Data Compression Utilities
 * 
 * Provides compression for storage optimization
 * Backend-ready: works with both local and remote storage
 */

import { CompressionProvider, CompressedData } from './interfaces';
import { logger } from '../logger';

// Compression thresholds and settings
const COMPRESSION_CONFIG = {
  MIN_SIZE_BYTES: 1024,        // Only compress data larger than 1KB
  TARGET_RATIO: 0.7,           // Target 30% compression minimum
  MAX_COMPRESSION_TIME: 100,    // Max 100ms for compression
  ALGORITHMS: ['gzip', 'lz4'] as const,
} as const;

export class CompressionService implements CompressionProvider {
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  /**
   * Compress data using the best available algorithm
   */
  async compress<T>(data: T): Promise<CompressedData> {
    const serialized = JSON.stringify(data);
    const originalSize = this.textEncoder.encode(serialized).length;

    // Skip compression for small data
    if (originalSize < COMPRESSION_CONFIG.MIN_SIZE_BYTES) {
      return {
        data: serialized,
        algorithm: 'none',
        originalSize,
        compressedSize: originalSize,
      };
    }

    const startTime = performance.now();

    try {
      // Try compression with available algorithms
      const compressionResult = await this.compressWithBestAlgorithm(serialized, originalSize);
      
      const compressionTime = performance.now() - startTime;
      
      // If compression took too long or didn't save enough space, return uncompressed
      if (compressionTime > COMPRESSION_CONFIG.MAX_COMPRESSION_TIME ||
          compressionResult.compressedSize / originalSize > COMPRESSION_CONFIG.TARGET_RATIO) {
        return {
          data: serialized,
          algorithm: 'none',
          originalSize,
          compressedSize: originalSize,
        };
      }

      logger.debug(`🗜️ Compressed data: ${originalSize} → ${compressionResult.compressedSize} bytes (${Math.round(compressionResult.compressedSize / originalSize * 100)}%)`);
      
      return compressionResult;
    } catch (error) {
      logger.warn('Compression failed, storing uncompressed:', error);
      return {
        data: serialized,
        algorithm: 'none',
        originalSize,
        compressedSize: originalSize,
      };
    }
  }

  /**
   * Decompress data back to original format
   */
  async decompress<T>(compressed: CompressedData): Promise<T> {
    try {
      let decompressed: string;

      switch (compressed.algorithm) {
        case 'none':
          decompressed = compressed.data as string;
          break;
        
        case 'gzip':
          decompressed = await this.decompressGzip(compressed.data);
          break;
        
        case 'lz4':
          decompressed = await this.decompressLZ4(compressed.data);
          break;
        
        default:
          throw new Error(`Unsupported compression algorithm: ${compressed.algorithm}`);
      }

      return JSON.parse(decompressed);
    } catch (error) {
      logger.error('Decompression failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to decompress data: ${errorMessage}`);
    }
  }

  /**
   * Calculate compression ratio for given data
   */
  async getCompressionRatio(data: any): Promise<number> {
    const compressed = await this.compress(data);
    return compressed.compressedSize / compressed.originalSize;
  }

  /**
   * Determine if compression would be beneficial
   */
  async isCompressionWorthwhile(data: any): Promise<boolean> {
    const serialized = JSON.stringify(data);
    const size = this.textEncoder.encode(serialized).length;
    
    // Don't compress small data
    if (size < COMPRESSION_CONFIG.MIN_SIZE_BYTES) {
      return false;
    }

    // Estimate compression ratio quickly
    const estimatedRatio = await this.estimateCompressionRatio(serialized);
    return estimatedRatio <= COMPRESSION_CONFIG.TARGET_RATIO;
  }

  /**
   * Compress with the best available algorithm
   */
  private async compressWithBestAlgorithm(data: string, originalSize: number): Promise<CompressedData> {
    // Try gzip first (widely supported)
    if (typeof CompressionStream !== 'undefined') {
      try {
        const compressed = await this.compressGzip(data);
        return {
          data: compressed,
          algorithm: 'gzip',
          originalSize,
          compressedSize: compressed.length,
        };
      } catch (error) {
        logger.debug('Gzip compression failed, trying fallback');
      }
    }

    // Fallback to simple string compression
    const compressed = await this.compressSimple(data);
    return {
      data: compressed,
      algorithm: 'lz4',
      originalSize,
      compressedSize: compressed.length,
    };
  }

  /**
   * Gzip compression using browser APIs (simplified)
   */
  private async compressGzip(data: string): Promise<Uint8Array> {
    // For now, use a simpler approach that works reliably
    const encoded = this.textEncoder.encode(data);
    
    // If CompressionStream is not available or causes issues, return the encoded data
    if (typeof CompressionStream === 'undefined') {
      return encoded;
    }

    try {
      const stream = new CompressionStream('gzip');
      const compressed = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoded);
            controller.close();
          }
        }).pipeThrough(stream)
      );
      
      const buffer = await compressed.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      logger.debug('Gzip compression failed, returning uncompressed:', error);
      return encoded;
    }
  }

  /**
   * Gzip decompression using browser APIs (simplified)
   */
  private async decompressGzip(data: Uint8Array | any): Promise<string> {
    // Convert data to Uint8Array if it's a plain object with numeric keys (from JSON deserialization)
    let uint8Data: Uint8Array;
    if (data instanceof Uint8Array) {
      uint8Data = data;
    } else if (typeof data === 'object' && data !== null) {
      // Handle case where data was serialized/deserialized and became {0: 31, 1: 139, ...}
      const keys = Object.keys(data);
      if (keys.length > 0 && keys.every(key => /^\d+$/.test(key))) {
        const values = keys.map(key => data[key]);
        uint8Data = new Uint8Array(values);
      } else {
        throw new Error('Invalid compressed data format');
      }
    } else {
      throw new Error('Invalid data type for decompression');
    }

    // If DecompressionStream is not available, assume data is uncompressed
    if (typeof DecompressionStream === 'undefined') {
      return this.textDecoder.decode(uint8Data);
    }

    try {
      const stream = new DecompressionStream('gzip');
      const decompressed = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(uint8Data);
            controller.close();
          }
        }).pipeThrough(stream)
      );
      
      const text = await decompressed.text();
      return text;
    } catch (error) {
      logger.debug('Gzip decompression failed, assuming uncompressed:', error);
      return this.textDecoder.decode(uint8Data);
    }
  }

  /**
   * Simple LZ4-style compression fallback
   */
  private async compressSimple(data: string): Promise<Uint8Array> {
    // Simple dictionary-based compression
    const dictionary = this.buildDictionary(data);
    const compressed = this.compressWithDictionary(data, dictionary);
    
    // Serialize dictionary + compressed data
    const result = {
      dict: dictionary,
      data: compressed,
    };
    
    return this.textEncoder.encode(JSON.stringify(result));
  }

  /**
   * Simple LZ4-style decompression
   */
  private async decompressLZ4(data: Uint8Array | any): Promise<string> {
    // Convert data to Uint8Array if it's a plain object with numeric keys (from JSON deserialization)
    let uint8Data: Uint8Array;
    if (data instanceof Uint8Array) {
      uint8Data = data;
    } else if (typeof data === 'object' && data !== null) {
      // Handle case where data was serialized/deserialized and became {0: 31, 1: 139, ...}
      const keys = Object.keys(data);
      if (keys.length > 0 && keys.every(key => /^\d+$/.test(key))) {
        const values = keys.map(key => data[key]);
        uint8Data = new Uint8Array(values);
      } else {
        throw new Error('Invalid compressed data format');
      }
    } else {
      throw new Error('Invalid data type for decompression');
    }

    const decoded = this.textDecoder.decode(uint8Data);
    const { dict, data: compressed } = JSON.parse(decoded);
    
    return this.decompressWithDictionary(compressed, dict);
  }

  /**
   * Build compression dictionary from frequent patterns
   */
  private buildDictionary(data: string): Record<string, string> {
    const patterns = new Map<string, number>();
    
    // Find frequent substrings (simple approach)
    for (let length = 3; length <= 10; length++) {
      for (let i = 0; i <= data.length - length; i++) {
        const substr = data.substr(i, length);
        patterns.set(substr, (patterns.get(substr) || 0) + 1);
      }
    }
    
    // Build dictionary from most frequent patterns
    const dictionary: Record<string, string> = {};
    let dictKey = 0;
    
    Array.from(patterns.entries())
      .filter(([pattern, count]) => count > 2 && pattern.length > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100) // Top 100 patterns
      .forEach(([pattern]) => {
        dictionary[pattern] = `§${dictKey++}§`;
      });
    
    return dictionary;
  }

  /**
   * Compress using dictionary substitution
   */
  private compressWithDictionary(data: string, dictionary: Record<string, string>): string {
    let compressed = data;
    
    // Replace patterns with dictionary keys
    Object.entries(dictionary).forEach(([pattern, key]) => {
      compressed = compressed.replace(new RegExp(this.escapeRegex(pattern), 'g'), key);
    });
    
    return compressed;
  }

  /**
   * Decompress using dictionary substitution
   */
  private decompressWithDictionary(compressed: string, dictionary: Record<string, string>): string {
    let decompressed = compressed;
    
    // Replace dictionary keys back with original patterns
    Object.entries(dictionary).forEach(([pattern, key]) => {
      decompressed = decompressed.replace(new RegExp(this.escapeRegex(key), 'g'), pattern);
    });
    
    return decompressed;
  }

  /**
   * Estimate compression ratio without actually compressing
   */
  private async estimateCompressionRatio(data: string): Promise<number> {
    // Simple heuristic: count repeated characters and patterns
    const charFreq = new Map<string, number>();
    
    for (const char of data) {
      charFreq.set(char, (charFreq.get(char) || 0) + 1);
    }
    
    // Calculate entropy-based estimate
    const entropy = Array.from(charFreq.values())
      .map(freq => {
        const prob = freq / data.length;
        return -prob * Math.log2(prob);
      })
      .reduce((sum, val) => sum + val, 0);
    
    // Estimate compression ratio from entropy
    const theoreticalRatio = entropy / 8; // 8 bits per byte
    const practicalRatio = Math.max(0.3, theoreticalRatio * 1.2); // Add overhead
    
    return practicalRatio;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const compressionService = new CompressionService();
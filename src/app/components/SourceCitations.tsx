import { DocumentSource } from '@/lib/rag-system'
import { BookOpen, ExternalLink } from 'lucide-react'

interface SourceCitationsProps {
  sources: DocumentSource[]
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pattern-making':
        return 'P'
      case 'illustrator-fashion':
        return 'I'
      case 'draping':
        return 'D'
      case 'construction':
        return 'C'
      default:
        return 'M'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pattern-making':
        return 'bg-purple-600 text-white'
      case 'illustrator-fashion':
        return 'bg-pink-600 text-white'
      case 'draping':
        return 'bg-green-600 text-white'
      case 'construction':
        return 'bg-blue-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-3 w-3 text-gray-500" />
        <span className="text-xs font-medium text-gray-600">
          Sources ({sources.length})
        </span>
      </div>
      
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div 
            key={index}
            className="bg-white p-2 rounded border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{getTypeIcon(source.type)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getTypeColor(source.type)}`}>
                    Course {source.courseNumber}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    Module {source.moduleNumber}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    {source.relevanceScore}
                  </span>
                </div>
                
                <h4 className="text-xs font-medium text-gray-900 mb-1">
                  {source.section}
                </h4>
                
                <p className="text-xs text-gray-600 leading-relaxed">
                  {source.excerpt.length > 100 ? source.excerpt.substring(0, 100) + '...' : source.excerpt}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                <button 
                  className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="View source"
                  onClick={() => {
                    console.log('Source clicked:', source)
                  }}
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Sources used to generate this response
        </p>
      </div>
    </div>
  )
}
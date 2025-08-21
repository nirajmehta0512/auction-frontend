// frontend/src/lib/artwork-preview.ts

import { Artwork } from './artworks-api'
import { Artist } from './artists-api'
import { Client } from './clients-api'

export interface ArtworkPreviewOptions {
  includeTitle?: boolean
  includeDescription?: boolean
  includeArtist?: boolean
  includeArtistBiography?: boolean
  includeArtistDescription?: boolean
  includeArtistKeyDescription?: boolean
  includeArtistExtraInfo?: boolean
  includeDimensions?: boolean
  includeCondition?: boolean
  includeMaterials?: boolean
  includeProvenance?: boolean
  includeEstimates?: boolean
  includeConsigner?: boolean
}

export interface ArtworkPreviewData extends Artwork {
  // Enhanced data with related entities
  artist?: Artist
  consigner_client?: Client
  // Form-specific data
  include_artist_biography?: boolean
  include_artist_description?: boolean
  include_artist_key_description?: boolean
  include_artist_extra_info?: boolean
  dimensions_inches?: string
  dimensions_cm?: string
  artwork_subject?: string
  signature_placement?: string
  medium?: string
  condition_report?: string
  gallery_certification?: boolean
  artist_certification?: boolean
  artist_family_certification?: boolean
  restoration_done?: boolean
  restoration_by?: string
}

/**
 * Generate a formatted preview description for an artwork
 * This follows the format: "$Title<br><br>$Artwork description<br><br>$Artist (checkbox only info)<br>Dimension: $DATA"
 */
export const generateArtworkPreview = (
  artwork: ArtworkPreviewData,
  options: ArtworkPreviewOptions = {}
): string => {
  const parts: string[] = []
  
  // Default options - include everything unless specified otherwise
  const opts = {
    includeTitle: true,
    includeDescription: true,
    includeArtist: true,
    includeArtistBiography: true,
    includeArtistDescription: true,
    includeArtistKeyDescription: true,
    includeArtistExtraInfo: true,
    includeDimensions: true,
    includeCondition: false,
    includeMaterials: false,
    includeProvenance: false,
    includeEstimates: false,
    includeConsigner: false,
    ...options
  }
  
  // Title
  if (opts.includeTitle && artwork.title?.trim()) {
    parts.push(artwork.title.trim())
  }
  
  // Artwork description
  if (opts.includeDescription && artwork.description?.trim()) {
    parts.push(artwork.description.trim())
  }
  
  // Artist info (if checkboxes are selected and artist data available)
  if (opts.includeArtist && artwork.artist) {
    const artistParts: string[] = []
    
    // Artist biography (birth/death years)
    if ((opts.includeArtistBiography || artwork.include_artist_biography) && artwork.artist.birth_year) {
      artistParts.push(
        `Born: ${artwork.artist.birth_year}${
          artwork.artist.death_year ? `, Died: ${artwork.artist.death_year}` : ''
        }`
      )
    }
    
    // Artist description
    if ((opts.includeArtistDescription || artwork.include_artist_description) && artwork.artist.description) {
      artistParts.push(artwork.artist.description)
    }

    // Artist key description
    if ((opts.includeArtistKeyDescription || artwork.include_artist_key_description) && artwork.artist.key_description) {
      artistParts.push(artwork.artist.key_description)
    }
    
    // Artist extra info
    if (opts.includeArtistExtraInfo || artwork.include_artist_extra_info) {
      if (artwork.artist.nationality) {
        artistParts.push(`Nationality: ${artwork.artist.nationality}`)
      }
      if (artwork.artist.art_movement) {
        artistParts.push(`Movement: ${artwork.artist.art_movement}`)
      }
    }
    
    if (artistParts.length > 0) {
      parts.push(artistParts.join('. '))
    }
  }
  
  // Dimensions
  if (opts.includeDimensions) {
    let dimensionText = ''
    
    // Check form-specific dimension fields first
    if (artwork.dimensions_inches || artwork.dimensions_cm) {
      dimensionText = 'Dimensions: '
      if (artwork.dimensions_inches) {
        dimensionText += artwork.dimensions_inches
        if (artwork.dimensions_cm) {
          dimensionText += ` (${artwork.dimensions_cm})`
        }
      } else if (artwork.dimensions_cm) {
        dimensionText += artwork.dimensions_cm
      }
    } else if (artwork.dimensions) {
      dimensionText = `Dimensions: ${artwork.dimensions}`
    }
    
    if (dimensionText) {
      parts.push(dimensionText)
    }
  }
  
  // Condition (optional)
  if (opts.includeCondition && artwork.condition) {
    parts.push(`Condition: ${artwork.condition}`)
  }
  
  // Materials (optional)
  if (opts.includeMaterials && artwork.materials) {
    parts.push(`Materials: ${artwork.materials}`)
  }
  
  // Provenance (optional)
  if (opts.includeProvenance && artwork.provenance) {
    parts.push(`Provenance: ${artwork.provenance}`)
  }
  
  // Estimates (optional)
  if (opts.includeEstimates && artwork.low_est && artwork.high_est) {
    parts.push(`Estimate: $${artwork.low_est.toLocaleString()} - $${artwork.high_est.toLocaleString()}`)
  }
  
  // Consigner (optional)
  if (opts.includeConsigner && artwork.consigner_client) {
    parts.push(`Consigner: ${artwork.consigner_client.first_name} ${artwork.consigner_client.last_name}`)
  }
  
  return parts.join('<br><br>')
}

/**
 * Generate a plain text version of the artwork preview (for exports, emails, etc.)
 */
export const generateArtworkPreviewPlainText = (
  artwork: ArtworkPreviewData,
  options: ArtworkPreviewOptions = {}
): string => {
  return generateArtworkPreview(artwork, options)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Remove any other HTML tags
}

/**
 * Generate a concise artwork preview for lists/tables
 */
export const generateArtworkPreviewConcise = (artwork: ArtworkPreviewData): string => {
  const parts: string[] = []
  
  if (artwork.title) {
    parts.push(artwork.title)
  }
  
  if (artwork.artist?.name) {
    parts.push(`by ${artwork.artist.name}`)
  }
  
  if (artwork.dimensions_inches || artwork.dimensions_cm || artwork.dimensions) {
    const dimension = artwork.dimensions_inches || artwork.dimensions_cm || artwork.dimensions
    if (dimension) {
      parts.push(dimension)
    }
  }
  
  return parts.join(' • ')
}

/**
 * Generate artwork preview with custom format
 */
export const generateArtworkPreviewCustom = (
  artwork: ArtworkPreviewData,
  template: string
): string => {
  let result = template
  
  // Replace placeholders
  result = result.replace(/\$title/gi, artwork.title || '')
  result = result.replace(/\$description/gi, artwork.description || '')
  result = result.replace(/\$artist/gi, artwork.artist?.name || '')
  result = result.replace(/\$dimensions/gi, artwork.dimensions_inches || artwork.dimensions_cm || artwork.dimensions || '')
  result = result.replace(/\$condition/gi, artwork.condition || '')
  result = result.replace(/\$materials/gi, artwork.materials || '')
  result = result.replace(/\$provenance/gi, artwork.provenance || '')
  result = result.replace(/\$low_est/gi, artwork.low_est?.toString() || '')
  result = result.replace(/\$high_est/gi, artwork.high_est?.toString() || '')
  result = result.replace(/\$lot_num/gi, artwork.lot_num || '')
  
  return result
}

/**
 * Default template for artwork catalogs
 */
export const DEFAULT_CATALOG_TEMPLATE = `$title<br><br>$description<br><br>$artist<br>Dimensions: $dimensions`

/**
 * Templates for different platforms
 */
export const PLATFORM_TEMPLATES = {
  liveauctioneers: `$title<br><br>$description<br><br>Artist: $artist<br>Dimensions: $dimensions<br>Condition: $condition`,
  easylive: `$title<br>$description<br>Dimensions: $dimensions`,
  thesaleroom: `$title<br><br>$description<br><br>$artist<br>Dimensions: $dimensions<br>Materials: $materials`,
  invaluable: `$title<br><br>$description<br><br>$artist<br>Dimensions: $dimensions`
}

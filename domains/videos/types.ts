export type VideoSourceType = 'upload' | 'link'
export type VideoCategory = 'carreras' | 'tecnica' | 'musculacion' | 'entrenamientos'

export interface Video {
  id: string
  organizationId: string
  title: string
  description: string | null
  sourceType: VideoSourceType
  category: VideoCategory
  url: string
  createdAt: string
}

export interface CreateVideoInput {
  organizationId: string
  title: string
  description?: string
  sourceType: VideoSourceType
  category: VideoCategory
  url: string
}

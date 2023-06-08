/**
 * Defines an interface for creating a new CreateImageResponse
 * Response format: https://platform.openai.com/docs/api-reference/images/create
 */
export interface CreateImageResponseConfiguration {
  created: number,
  data: { url: string }[] | { b64_json: string }[],
}
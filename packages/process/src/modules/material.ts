import type { PromptModule } from '@moduler-prompt/core';

/**
 * Material context interface
 */
export interface MaterialContext {
  materials?: Array<{
    id: string;
    title: string;
    content: string;
    usage?: number;
  }>;
}

/**
 * Material module - handles external materials/documents
 */
export const withMaterials: PromptModule<MaterialContext> = {
  terms: [
    'Materials: the content of a web page or other text that has been imported into the system.',
    'Material ID: An ID representing a material used for manipulating the material, described as "[<title>](<material ID>)".',
    'The Learned Knowledge: Knowledge that you, the ChatGPT, have already learned.',
    'Prepared Contextual Materials: Materials retrieved from the DB and explicitly provided. Materials that are not prepared cannot be accessed.'
  ],
  materials: [
    (context) => {
      if (!context.materials || context.materials.length === 0) return null;
      
      return context.materials.map(material => {
        const { id, title, content, usage } = material;
        return {
          type: 'material' as const,
          id,
          title,
          content,
          usage
        };
      });
    }
  ]
};

/**
 * Material module with reference citation requirements
 */
export const answerWithReferences: PromptModule<MaterialContext> = {
  ...withMaterials,
  instructions: [
    ...withMaterials.instructions || [],
    'Ensure that responses to questions clearly distinguish between information derived from prepared materials and learned knowledge.',
    'Always include the ID of the material when referencing information from prepared materials, using the format "(refs:<Material ID>)".',
    'Even in the absence of prepared materials or specific references, or when the response is based on learned knowledge, always indicate the source of the information as "(refs:learned-knowledge)".',
    'If information from multiple sources is used, each source should be cited accordingly.',
    'If materials present different perspectives or conflicting information, report the facts that can be inferred from the materials. Avoid forcing a summary.'
  ]
};
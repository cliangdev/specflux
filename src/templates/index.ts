// Template registry and definitions
export {
  TEMPLATE_REGISTRY,
  getTemplate,
  getTemplatesByCategory,
  type TemplateDefinition,
} from "./registry";

// Template content (bundled markdown files)
export { TEMPLATE_CONTENT, getTemplateContent } from "./templateContent";

// Project structure initialization and syncing
export {
  initProjectStructure,
  isProjectInitialized,
  syncTemplates,
  getTemplateStatus,
  type SyncResult,
  type SyncOptions,
  type TemplateStatus,
} from "./initProjectStructure";

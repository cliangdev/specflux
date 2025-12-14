/**
 * Generate context-aware initial prompts for Claude Code agent
 * These prompts help Claude understand the context and ask the user what they want to do
 */

export type AgentContextType = "prd" | "prd-workshop" | "epic" | "task" | "release" | "project";

interface AgentPromptOptions {
  type: AgentContextType;
  title: string;
  displayKey?: string;
  description?: string;
}

/**
 * Generate the initial command to launch Claude Code with a context-aware prompt
 */
export function generateAgentCommand(options: AgentPromptOptions): string {
  const prompt = generateContextPrompt(options);
  // Escape double quotes and wrap in quotes for shell
  const escapedPrompt = prompt.replace(/"/g, '\\"');
  return `claude "${escapedPrompt}"`;
}

/**
 * Generate a context-aware prompt based on entity type
 */
function generateContextPrompt(options: AgentPromptOptions): string {
  const { type, title, displayKey } = options;
  const entityLabel = displayKey ? `${displayKey}: ${title}` : title;

  switch (type) {
    case "prd":
      return `You are working on the PRD: "${entityLabel}"

What would you like me to help you with?

**Suggested actions:**
1. **/prd refine** - Refine and improve this PRD
2. **/epic** - Break down this PRD into epics
3. **Review** - Review the PRD for completeness
4. **Other** - Describe what you need

Please select an option or describe your task:`;

    case "prd-workshop":
      return `Welcome to the PRD Workshop!

I'm ready to help you create a new Product Requirements Document.

**What would you like to do?**
1. **/prd** - Create a new PRD from scratch
2. **Brainstorm** - Discuss ideas before writing the PRD
3. **Import** - Help structure an existing document into a PRD
4. **Other** - Describe what you need

Please select an option or describe your task:`;

    case "epic":
      return `You are working on the Epic: "${entityLabel}"

What would you like me to help you with?

**Suggested actions:**
1. **/implement** - Start implementing this epic
2. **/task** - Create a task for this epic
3. **/design** - Create a design document
4. **Review** - Review the epic's scope and requirements
5. **Other** - Describe what you need

Please select an option or describe your task:`;

    case "task":
      return `You are working on the Task: "${entityLabel}"

What would you like me to help you with?

**Suggested actions:**
1. **/task ${displayKey || ""}** - Start working on this task
2. **Implement** - Begin implementation
3. **Review code** - Review existing implementation
4. **Write tests** - Add or update tests
5. **Other** - Describe what you need

Please select an option or describe your task:`;

    case "release":
      return `You are working on the Release: "${entityLabel}"

What would you like me to help you with?

**Suggested actions:**
1. **/implement** - Implement features for this release
2. **/epic** - Create a new epic for this release
3. **Review** - Review release progress and blockers
4. **Other** - Describe what you need

Please select an option or describe your task:`;

    case "project":
      return `You are working on the Project: "${entityLabel}"

What would you like me to help you with?

**Suggested actions:**
1. **/prd** - Create a new PRD
2. **/epic** - Define a new epic
3. **/task** - Start a task
4. **Explore** - Explore the codebase
5. **Other** - Describe what you need

Please select an option or describe your task:`;

    default:
      return `What would you like me to help you with?`;
  }
}

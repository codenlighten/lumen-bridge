import { signedStructuredResponse } from '../structured-json.js';

const TOOL_CHOICE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    tool_choice: {
      type: 'object',
      properties: {
        tool_name: { type: 'string', description: 'The name of the tool to use.' },
        tool_input: {
          type: 'object',
          description: 'The input parameters for the tool.',
        },
      },
      required: ['tool_name', 'tool_input'],
    },
  },
  required: ['tool_choice'],
};
class ToolChoice {
  constructor(tools) {
    this.tools = tools;
  }

  async planResponse(agentInput, runManager) {
    const response = await signedStructuredResponse(
      agentInput,
      TOOL_CHOICE_RESPONSE_SCHEMA,
      {
        tools: this.tools,
      },
      runManager
    );
    return response.tool_choice;
  }
}

export { ToolChoice };
import { Node, mergeAttributes } from '@tiptap/core';
import { isApiVariable } from '@/utils/variableUtils';

export interface VariableOptions {
  HTMLAttributes: Record<string, any>;
  onLinkedInVariableClick?: (variableId: string, variableName: string, position: { x: number; y: number }) => void;
  onCsvVariableClick?: (variableId: string, variableName: string) => void;
  onApiVariableClick?: (variableId: string, variableName: string) => void;
  getCsvColumnFix?: (columnName: string) => any;
  csvVariablesWithMissingData?: string[];
}

export const VariableExtension = Node.create<VariableOptions>({
  name: 'variable',

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkedInVariableClick: undefined,
      onCsvVariableClick: undefined,
      onApiVariableClick: undefined,
      getCsvColumnFix: undefined,
      csvVariablesWithMissingData: [],
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-id': attributes.id,
          };
        },
      },
      content: {
        default: null,
        parseHTML: element => element.getAttribute('data-content'),
        renderHTML: attributes => {
          if (!attributes.content) {
            return {};
          }
          return {
            'data-content': attributes.content,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          return {
            id: element.getAttribute('data-id'),
            content: element.getAttribute('data-content'),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { id } = node.attrs;
    const { getCsvColumnFix, csvVariablesWithMissingData } = this.options;
    
    // Determine styling based on variable type and configuration status
    let bgColor = "bg-indigo-100";
    let textColor = "text-indigo-700";
    let cursor = "cursor-default";
    
    if (id && id.startsWith('linkedin_')) {
      // LinkedIn variables: red if unconfigured or skipLeads, blue if properly configured
      const hasFallback = getCsvColumnFix ? getCsvColumnFix(id) : null;
      cursor = "cursor-pointer";
      if (hasFallback) {
        // Check if it's a skipLeads configuration (needs attention)
        if (hasFallback.fixChain?.fixType === 'skipLeads') {
          // Has skipLeads configuration: red (needs attention)
          bgColor = "bg-red-100";
          textColor = "text-red-700";
        } else {
          // Has proper configuration: blue
          bgColor = "bg-blue-100";
          textColor = "text-blue-700";
        }
      } else {
        bgColor = "bg-red-100";
        textColor = "text-red-700";
      }
    } else if (id && (id.startsWith('csv_') || isApiVariable(id))) {
      // CSV variables: check if they have missing data and/or existing configuration
      const hasMissingData = csvVariablesWithMissingData?.includes(id) || false;
      const hasFallback = getCsvColumnFix ? getCsvColumnFix(id) : null;
      
      // Always make CSV variables clickable
      cursor = "cursor-pointer";
      
      if (hasFallback) {
        // Check if it's a skipLeads configuration (needs attention)
        if (hasFallback.fixChain?.fixType === 'skipLeads') {
          // Has skipLeads configuration: red (needs attention)
          bgColor = "bg-red-100";
          textColor = "text-red-700";
        } else {
          // Has proper configuration: green
          bgColor = "bg-green-100";
          textColor = "text-green-700";
        }
      } else if (hasMissingData) {
        // Has missing data but no configuration: red
        bgColor = "bg-red-100";
        textColor = "text-red-700";
      }
      // If no missing data and no configuration, keep default indigo styling (but still clickable)
    }

    const className = ` mx-0 rounded select-none hover:opacity-80 transition-opacity ${cursor} ${bgColor} ${textColor}`;

    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'variable',
      'data-id': node.attrs.id,
      'data-content': node.attrs.content,
      'contenteditable': 'false',
      'class': className,
      'data-has-fallback': getCsvColumnFix ? (getCsvColumnFix(id) ? 'true' : 'false') : 'false',
    }), node.attrs.content || ''];
  },

  // Remove React node view for now to avoid complexity
  // addNodeView() {
  //   return ReactNodeViewRenderer(VariableComponent);
  // },
});

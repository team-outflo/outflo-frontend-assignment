
import { useStore } from "zustand";
import { create } from "zustand";

import { Campaign, CampaignState, CampaignStep, CampaignStepType, TCampaignFollowUp, CsvConfig, CsvColumnFix, CampaignConfig, Lead, ColumnMapping } from "../../../types/campaigns";
import { extractDaysAndHours } from "../../../utils/dateTime";
import { Account } from '@/types/accounts';
import { Node, Edge, applyNodeChanges, addEdge, applyEdgeChanges, OnNodesChange, OnEdgesChange } from "@xyflow/react";
import { Dispatch, SetStateAction } from "react";
import { convertApiWorkflowToSteps, convertStepsToConfigs } from "../../../components/Campaign/Sequence/utils";

/**
 * SequenceDraft stores both FLAT and TREE sequence data independently.
 * FLAT and TREE data are never merged - they exist separately and both are preserved
 * when switching between sequence types. All data persists in the database.
 */
export interface SequenceDraft {
  flat?: any[]; // Array of configs for flat sequence (INITIATED, SEND_CONNECTION_REQUEST, SEND_MESSAGE, COMPLETED)
  nodes: Node[]; // React Flow nodes for TREE sequence
  edges: Edge[]; // React Flow edges for TREE sequence
}
import { ValidatedVariable } from '../../../components/Campaign/Sequence/types';
import { getSystemVariables } from '@/api/variables/variables';
import { getCampaignVariables } from '@/api/leads/leadsApi';

export interface ICampaignStoreState {
  currentStep: number;
  campaign: Campaign;
  mode: 'edit' | 'view';
  isEdited: boolean;
  variables: ValidatedVariable[];
  variablesLoading: boolean;
}

export interface ICampaignStoreActions {
  setState: (data: Partial<ICampaignStoreState>, cb?: () => void) => void;
  init: (campaign?: Campaign, mode?: 'edit' | 'view', nodes?: any[], edges?: any[]) => void;
  setMode: (mode: 'edit' | 'view') => void;
  toggleMode: () => void;
  reset: () => void;
  setIsEdited: (edited: boolean) => void;
  updateCampaign: (data: Partial<Campaign>) => void;
  isCampaignStepValid: (stepIdx: number) => boolean;
  cloneCampaign: () => Campaign;
  setLeadsFile: (file: File) => void;
  setLeadsS3Data: (s3Data: { fileName: string; s3Url: string; fileKey: string; file: File }) => void;
  setSenderAccounts: (accounts: Account[]) => void;
  setLeadsData: (leadsData: any) => void;
  setLeadsFromList: (leadListId: string, leads: Lead[], columnMapping?: ColumnMapping[], source?: any, leadListMetadata?: any) => void;
  setWorkingHours: (hours: any) => void;
  setOperationalTimes: (times: any) => void;
  setSequenceSettings: (settings: { excludeConnected?: boolean }) => void;
  updateSequenceSteps: (steps: any[]) => void; // API format steps
  updateSequenceExcludeConnected: (excludeConnected: boolean) => void;
  setCsvConfig: (csvConfig: CsvConfig) => void;
  addCsvColumnFix: (columnFix: CsvColumnFix) => void;
  addCsvColumnFixes: (columnFixes: CsvColumnFix[]) => void;
  removeCsvColumnFix: (columnName: string) => void;
  clearCsvColumnFixes: () => void;
  getCsvColumnFix: (columnName: string) => CsvColumnFix | undefined;
  setDetectedColumns: (columns: string[]) => void;
  getDetectedColumns: () => string[];
  setMainIdentifier: (mainIdentifier: string) => void;
  getMainIdentifier: () => string | null;
  getCsvConfig: () => CsvConfig | null;
  getLeadsData: () => Lead[];
  setIsFetchingLeads: (isFetching: boolean) => void;
  refreshLeadsData: (leadListId: string, leads: Lead[], columnMapping?: ColumnMapping[], source?: any, leadListMetadata?: any) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSequenceData: (nodes: Node[], edges: Edge[]) => void;
  getSequenceData: () => SequenceDraft | null;
  setVariables: (variables: ValidatedVariable[]) => void;
  getVariables: () => ValidatedVariable[];
  generateVariables: () => Promise<void>;
  setVariablesLoading: (loading: boolean) => void;
}

const emptyCampaign: Campaign = {
  leadListId: null, // TODO: Remove from top level - should only be in leads.leadListId
  id: "",
  name: "",
  description: "",
  leads: {
    data: [],
    leadListId: undefined,
  },
  senderAccounts: [],
  accountIDs: [], // Clear account IDs on reset
  sequence: {},
  sequenceType: "TREE", // Always tree for now, will be used later
  sequenceDraft: null,
  timeZone: "IST",
  operationalTimes: {
    monday: { startTime: 540, endTime: 1020, enabled: true },     // 9:00 → 17:00 in minutes
    tuesday: { startTime: 540, endTime: 1020, enabled: true },
    wednesday: { startTime: 540, endTime: 1020, enabled: true },
    thursday: { startTime: 540, endTime: 1020, enabled: true },
    friday: { startTime: 540, endTime: 1020, enabled: true },
    saturday: { startTime: 540, endTime: 1020, enabled: false },
    sunday: { startTime: 540, endTime: 1020, enabled: false },
  },
  csvConfig: {
    columnFixes: [],
    detectedColumns: [],
    lastUpdated: Date.now(),
  },
};

export const campaignStore = create<ICampaignStoreState & ICampaignStoreActions>()((set, get) => ({
  currentStep: 1,
  campaign: { ...emptyCampaign },
  mode: 'edit',
  isEdited: false,
  variables: [],
  variablesLoading: false,

  setState: (data: Partial<ICampaignStoreState>, cb) => {
    set(() => data);
    cb?.();
  },

  init: (campaign, mode = 'edit', nodes: any[] = [], edges: any[] = []) => {
    set(() => {
      // Set currentStep to 2 if mode is 'view', otherwise 1
      const initialStep = mode === 'view' ? 2 : 1;

      if (!campaign) {
        return {
          currentStep: initialStep,
          campaign: { ...emptyCampaign ,sequenceDraft: null },
          mode,
          isEdited: false,
          variables: [],
          variablesLoading: false,
        };
      }

      // Merge provided campaign with emptyCampaign defaults to ensure all properties are initialized
      const initializedCampaign: Campaign = {
        ...emptyCampaign,
        ...campaign,
        // Ensure leads structure is properly initialized
        leads: {
          ...emptyCampaign.leads,
          ...campaign.leads,
          data: campaign.leads?.data || [],
        },
        // Ensure senderAccounts is initialized
        senderAccounts: campaign.senderAccounts || [],
        // Ensure sequence is initialized
        sequence: campaign.sequence || {},
        // Ensure sequenceType is initialized (default to "tree")
        sequenceType: campaign.sequenceType || "TREE",
        // Ensure operationalTimes is initialized
        operationalTimes: campaign.operationalTimes || emptyCampaign.operationalTimes,
        // Ensure csvConfig is initialized
        csvConfig: campaign.csvConfig || emptyCampaign.csvConfig,
        // Ensure timeZone is initialized
        timeZone: campaign.timeZone || emptyCampaign.timeZone,
        // Initialize sequenceDraft - preserve both FLAT and TREE data independently
        sequenceDraft: campaign.sequenceDraft || (nodes && edges && nodes.length > 0
          ? {
              flat: campaign.sequenceDraft?.flat || undefined, // Preserve FLAT if exists
              nodes,
              edges,
            }
          : campaign.sequenceDraft?.flat 
            ? { flat: campaign.sequenceDraft.flat, nodes: [], edges: [] } 
            : null),
      };

      return {
        currentStep: initialStep,
        campaign: initializedCampaign,
        mode,
        isEdited: false,
        variables: [],
        variablesLoading: false,
      };
    });
  },

  setMode: (mode) => set(() => ({ mode })),
  toggleMode: () => {
    const currentMode = get().mode;
    set({ mode: currentMode === 'edit' ? 'view' : 'edit' });
  },

  isCampaignStepValid: (stepIdx: number) => {
    const senderAccounts = get().campaign.senderAccounts;
    if (stepIdx === 0) {
      const leads = get().campaign.leads;
      return leads === undefined ? false : Boolean(leads.s3Url && leads.fileName);
    } else if (stepIdx === 1) {
      return senderAccounts === undefined ? false : senderAccounts.length > 0;
    } else if (stepIdx === 2) {
      // const senderAccounts = get().campaign.senderAccounts;

      const workflowSteps = get().campaign.sequence?.steps ?? [];
      return (
        (senderAccounts === undefined ? false : senderAccounts.length > 0) &&
        workflowSteps.slice(1).every((step: CampaignStep) => {
          const message = (step.data as TCampaignFollowUp).message;
          const delay = extractDaysAndHours((step.data as TCampaignFollowUp).delay);
          return 1 <= message?.length && !(delay.days === 0 && delay.hours < 3);
        })
      );
    } else if (stepIdx === 3) {
      const campaignName = get().campaign.name;
      // const senderAccounts = get().campaign.senderAccounts;
      return (senderAccounts === undefined ? false : senderAccounts.length > 0) && !!campaignName;
    }
    return false;
  },

  reset: () => {
    const currentState = get();
    console.log('Resetting campaign store to empty state. Current state:', {
      campaignId: currentState.campaign?.id,
      campaignName: currentState.campaign?.name,
      isEdited: currentState.isEdited,
    });

    
    // Simply set campaign data to emptyCampaign - direct assignment
    set({
      currentStep: 1,
      campaign: { ...emptyCampaign, sequenceDraft: null },
      mode: 'edit',
      isEdited: false,
    });

    // Immediately verify reset worked
    const newState = get();
    const resetSuccessful = !newState.campaign?.id && !newState.isEdited;

    console.log('Campaign store reset complete. Verified state:', {
      campaignId: newState.campaign?.id || '(empty)',
      campaignName: newState.campaign?.name || '(empty)',
      isEdited: newState.isEdited,
      currentStep: newState.currentStep,
      resetSuccessful,
    });

    if (!resetSuccessful) {
      console.error('⚠️ WARNING: Reset may not have worked completely!', {
        hasCampaignId: !!newState.campaign?.id,
        isEdited: newState.isEdited,
        campaign: newState.campaign,
      });
    }
  },

  setIsEdited: (edited: boolean) => {
    set({ isEdited: edited });
  },

  updateCampaign: (data) => {
    const { mode } = get();
    if (mode === 'view') {
      console.warn('⚠️ Cannot update campaign in view mode');
      return;
    }
    set((state) => ({
      campaign: {
        ...state.campaign,
        ...data,
      },
      isEdited: true,
    }));
  },

  cloneCampaign: () => {
    const campaign = get().campaign;
    const clone: Campaign = {
      ...campaign,
      id: `${campaign.id}-copy`,
      name: `${campaign.name} (Copy)`,
      state: CampaignState.DRAFT,
    };
    return clone;
  },


  setLeadsFile: (file: File) => {
    if (get().mode === 'view') return;
    set((state) => ({
      campaign: {
        ...state.campaign,
        leads: {
          ...state.campaign.leads,
          file: file,
          fileName: file.name,
        },
      },
      isEdited: true,
    }));
  },

  setLeadsS3Data: (s3Data: { fileName: string; s3Url: string; fileKey: string; file: File }) => {
    if (get().mode === 'view') return;
    console.log('Storing S3 data in campaign store:', s3Data);
    set((state) => ({
      campaign: {
        ...state.campaign,
        leads: {
          ...state.campaign.leads,
          file: s3Data.file,
          fileName: s3Data.fileName,
          s3Url: s3Data.s3Url,
          fileKey: s3Data.fileKey,
        },
      },
      isEdited: true,
    }));
    console.log('S3 data stored successfully in campaign store');
  },

  setSenderAccounts: (accounts: Account[]) => {
    if (get().mode === 'view') return;
    console.log('LinkedIn Accounts saved to campaign store:', accounts);
    set((state) => ({
      campaign: {
        ...state.campaign,
        senderAccounts: accounts,
      },
      isEdited: true,
    }));
  },

  setLeadsData: (leadsData: any) => {
    if (get().mode === 'view') return;
    console.log('Leads data saved to campaign store:', leadsData);
    set((state) => {
      const preservedS3Url = leadsData.s3Url || state.campaign.leads?.s3Url;
      const preservedFileKey = leadsData.fileKey || state.campaign.leads?.fileKey;

      console.log('Preserving S3 data:', {
        incomingS3Url: leadsData.s3Url,
        existingS3Url: state.campaign.leads?.s3Url,
        preservedS3Url,
        preservedFileKey
      });

      return {
        campaign: {
          ...state.campaign,
          leadListId: leadsData.leadListId || state.campaign.leadListId, // Also set at campaign level
          leads: {
            ...state.campaign.leads,
            ...leadsData,
            // Preserve S3 data if it exists
            s3Url: preservedS3Url,
            fileKey: preservedFileKey,
          }
        },
        isEdited: true,
      };
    });
  },

  setLeadsFromList: (leadListId: string, leads: Lead[], columnMapping?: ColumnMapping[], source?: any, leadListMetadata?: any) => {
    if (get().mode === 'view') return;
    console.log('Setting leads from list:', { leadListId, leadsCount: leads.length, columnMapping, source, leadListMetadata });
    set((state) => {
      const preservedS3Url = state.campaign.leads?.s3Url;
      const preservedFileKey = state.campaign.leads?.fileKey;

      // Extract columnMapping and source from leadListMetadata if provided
      const metadataColumnMapping = leadListMetadata?.columnMapping || columnMapping;
      const metadataSource = leadListMetadata?.source || source;

      return {
        campaign: {
          ...state.campaign,
          leadListId: leadListId, // Update at campaign level
          leads: {
            ...state.campaign.leads,
            data: leads,
            leadListId: leadListId,
            columnMapping: metadataColumnMapping, // Store column mapping from metadata or parameter
            source: metadataSource, // Store source information from metadata or parameter
            leadListMetadata: leadListMetadata, // Store raw leadList metadata
            // Preserve S3 data if it exists
            s3Url: preservedS3Url,
            fileKey: preservedFileKey,
          }
        },
        isEdited: true,
      };
    });
  },


  // New action for working hours
  setWorkingHours: (hours: any) => {
    console.log('Working hours saved to store:', hours);
    set((state) => ({
      campaign: {
        ...state.campaign,
        workingHours: hours
      },
      isEdited: true,
    }));
  },

  // New action for operational times (API format)
  setOperationalTimes: (times: any) => {
    console.log('Operational times saved to store:', times);
    set((state) => ({
      campaign: {
        ...state.campaign,
        operationalTimes: times
      },
      isEdited: true,
    }));
  },

  setSequenceSettings: (settings: { excludeConnected?: boolean }) => {
    set((state) => ({
      campaign: {
        ...state.campaign,
        sequenceSettings: {
          excludeConnected: settings.excludeConnected ?? state.campaign.sequenceSettings?.excludeConnected ?? false,
        },
      },
      isEdited: true,
    }));
  },

  updateSequenceSteps: (steps: any[]) => {
    if (get().mode === 'view') return;
    set((state) => {
      const currentSequenceDraft = state.campaign.sequenceDraft || { nodes: [], edges: [] };
      const excludeConnected = state.campaign.sequence?.excludeConnected ?? false;
      
      // Convert API format steps to UI format, then to configs format for FLAT
      const uiSteps = convertApiWorkflowToSteps({ steps });
      const configs = convertStepsToConfigs(uiSteps, excludeConnected);
      
      return {
        campaign: {
          ...state.campaign,
          sequence: {
            ...state.campaign.sequence,
            steps: steps,
            // Preserve excludeConnected when updating steps
            excludeConnected: excludeConnected,
          },
          // Store FLAT configs in sequenceDraft - preserve TREE data (nodes/edges)
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: configs, // Update FLAT data
            nodes: currentSequenceDraft.nodes || [], // Preserve TREE nodes
            edges: currentSequenceDraft.edges || [], // Preserve TREE edges
          },
        },
        isEdited: true,
      };
    });
  },

  updateSequenceExcludeConnected: (excludeConnected: boolean) => {
    if (get().mode === 'view') return;
    set((state) => ({
      campaign: {
        ...state.campaign,
        sequence: {
          ...state.campaign.sequence,
          excludeConnected: excludeConnected,
        },
        sequenceSettings: {
          excludeConnected: excludeConnected,
        },
      },
      isEdited: true,
    }));
  },

  // setSequenceSettings: (settings: { excludeConnected?: boolean }) => {
  //   set((state) => ({
  //     campaign: {
  //       ...state.campaign,
  //       sequenceSettings: {
  //         excludeConnected: settings.excludeConnected ?? state.campaign.sequenceSettings?.excludeConnected ?? false,
  //       },
  //     },
  //     isEdited: true,
  //   }));
  // },

  // updateSequenceSteps: (steps: any[]) => {
  //   if (get().mode === 'view') return;
  //   set((state) => ({
  //     campaign: {
  //       ...state.campaign,
  //       sequence: {
  //         ...state.campaign.sequence,
  //         steps: steps,
  //         // Preserve excludeConnected when updating steps
  //         excludeConnected: state.campaign.sequence?.excludeConnected ?? false,
  //       },
  //     },
  //     isEdited: true,
  //   }));
  // },

  // updateSequenceExcludeConnected: (excludeConnected: boolean) => {
  //   if (get().mode === 'view') return;
  //   set((state) => ({
  //     campaign: {
  //       ...state.campaign,
  //       sequence: {
  //         ...state.campaign.sequence,
  //         excludeConnected: excludeConnected,
  //       },
  //       sequenceSettings: {
  //         excludeConnected: excludeConnected,
  //       },
  //     },
  //     isEdited: true,
  //   }));
  // },

  onNodesChange: (changes) => {
    set((state) => {
      const currentNodes = state.campaign.sequenceDraft?.nodes || [];
      const updatedNodes = applyNodeChanges(changes, currentNodes);
      return {
        campaign: {
          ...state.campaign,
          // Update TREE nodes - preserve FLAT data
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
            nodes: updatedNodes, // Update TREE nodes
            edges: state.campaign.sequenceDraft?.edges || [], // Preserve TREE edges
          },
        },
      };
    });
  },
  onEdgesChange: (changes) => {
    set((state) => {
      const currentEdges = state.campaign.sequenceDraft?.edges || [];
      const updatedEdges = applyEdgeChanges(changes, currentEdges);
      return {
        campaign: {
          ...state.campaign,
          // Update TREE edges - preserve FLAT data
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
            nodes: state.campaign.sequenceDraft?.nodes || [], // Preserve TREE nodes
            edges: updatedEdges, // Update TREE edges
          },
        },
      };
    });
  },
  onConnect: (connection) => {
    set((state) => {
      const currentEdges = state.campaign.sequenceDraft?.edges || [];
      const updatedEdges = addEdge(connection, currentEdges);
      return {
        campaign: {
          ...state.campaign,
          // Add new TREE edge - preserve FLAT data
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
            nodes: state.campaign.sequenceDraft?.nodes || [], // Preserve TREE nodes
            edges: updatedEdges, // Update TREE edges
          },
        },
      };
    });
  },
  setNodes: (nodes) => {
    set((state) => {
      const updatedNodes = typeof nodes === 'function' 
        ? nodes(state.campaign.sequenceDraft?.nodes || [])
        : nodes;
      return {
        campaign: {
          ...state.campaign,
          // Update TREE nodes - preserve FLAT data
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
            nodes: updatedNodes, // Update TREE nodes
            edges: state.campaign.sequenceDraft?.edges || [], // Preserve TREE edges
          },
        },
      };
    });
  },
  setEdges: (edges) => {
    set((state) => {
      const updatedEdges = typeof edges === 'function'
        ? edges(state.campaign.sequenceDraft?.edges || [])
        : edges;
      return {
        campaign: {
          ...state.campaign,
          // Update TREE edges - preserve FLAT data
          // FLAT and TREE data are independent and never merged
          sequenceDraft: {
            flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
            nodes: state.campaign.sequenceDraft?.nodes || [], // Preserve TREE nodes
            edges: updatedEdges, // Update TREE edges
          },
        },
      };
    });
  },

  setSequenceData: (nodes, edges) => {
    set((state) => ({
      campaign: {
        ...state.campaign,
        // Update TREE data (nodes/edges) - preserve FLAT data
        // FLAT and TREE data are independent and never merged
        sequenceDraft: {
          flat: state.campaign.sequenceDraft?.flat, // Preserve FLAT data
          nodes, // Update TREE nodes
          edges, // Update TREE edges
        },
      },
    }));
  },

  getSequenceData: () => {
    const state = get();
    return state.campaign.sequenceDraft || null;
  },

  // CSV Config actions
  setCsvConfig: (csvConfig: CsvConfig) => {
    console.log('CSV config saved to store:', csvConfig);
    set((state) => ({
      campaign: {
        ...state.campaign,
        csvConfig: csvConfig
      },
      isEdited: true,
    }));
  },

  addCsvColumnFix: (columnFix: CsvColumnFix) => {
    console.log('Adding CSV column fix:', columnFix);
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      const existingFixIndex = currentConfig.columnFixes.findIndex(fix => fix.columnName === columnFix.columnName);

      let updatedFixes;
      if (existingFixIndex >= 0) {
        // Update existing fix
        updatedFixes = [...currentConfig.columnFixes];
        updatedFixes[existingFixIndex] = columnFix;
      } else {
        // Add new fix
        updatedFixes = [...currentConfig.columnFixes, columnFix];
      }

      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            columnFixes: updatedFixes,
            detectedColumns: currentConfig.detectedColumns,
            lastUpdated: Date.now()
          }
        },
        isEdited: true,
      };
    });
  },

  // New method to add multiple column fixes at once
  addCsvColumnFixes: (columnFixes: CsvColumnFix[]) => {
    console.log('Adding multiple CSV column fixes:', columnFixes);
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      const existingFixes = [...currentConfig.columnFixes];

      // Update or add each fix
      columnFixes.forEach(newFix => {
        const existingIndex = existingFixes.findIndex(fix => fix.columnName === newFix.columnName);
        if (existingIndex >= 0) {
          existingFixes[existingIndex] = newFix;
        } else {
          existingFixes.push(newFix);
        }
      });

      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            columnFixes: existingFixes,
            detectedColumns: currentConfig.detectedColumns,
            lastUpdated: Date.now()
          }
        }
      };
    });
  },

  // Method to remove a column fix
  removeCsvColumnFix: (columnName: string) => {
    console.log('Removing CSV column fix for:', columnName);
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      const updatedFixes = currentConfig.columnFixes.filter(fix => fix.columnName !== columnName);

      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            columnFixes: updatedFixes,
            detectedColumns: currentConfig.detectedColumns,
            lastUpdated: Date.now()
          }
        }
      };
    });
  },

  // Method to clear all column fixes
  clearCsvColumnFixes: () => {
    console.log('Clearing all CSV column fixes');
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            columnFixes: [],
            detectedColumns: currentConfig.detectedColumns,
            lastUpdated: Date.now()
          }
        }
      };
    });
  },

  getCsvColumnFix: (columnName: string) => {
    console.log('Getting CSV column fix for:', columnName);

    const state = get();
    console.log('State:', state);
    // Check both raw column name and variable ID format (csv_columnName)
    const variableId = `csv_${columnName}`;
    return state.campaign.csvConfig?.columnFixes.find(fix =>
      fix.columnName === columnName || fix.columnName === variableId
    );
  },

  setDetectedColumns: (columns: string[]) => {
    console.log('Setting detected columns:', columns);
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            ...currentConfig,
            detectedColumns: columns,
            lastUpdated: Date.now()

          }
        }
      };
    });
  },

  getDetectedColumns: () => {
    const state = get();
    return state.campaign.csvConfig?.detectedColumns || [];
  },

  setMainIdentifier: (mainIdentifier: string) => {
    console.log('Setting main identifier:', mainIdentifier);
    set((state) => {
      const currentConfig = state.campaign.csvConfig || { columnFixes: [], detectedColumns: [], lastUpdated: Date.now() };
      return {
        campaign: {
          ...state.campaign,
          csvConfig: {
            ...currentConfig,
            mainIdentifier: mainIdentifier,
            lastUpdated: Date.now()
          }
        }
      };
    });
  },

  getMainIdentifier: () => {
    const state = get();
    return state.campaign.csvConfig?.mainIdentifier || null;
  },

  getCsvConfig: () => {
    const state = get();
    return state.campaign.csvConfig || null;
  },

  getLeadsData: () => {
    const state = get();
    return state.campaign.leads?.data || [];
  },

  setIsFetchingLeads: (isFetching: boolean) => {
    set((state) => ({
      campaign: {
        ...state.campaign,
        leads: {
          ...state.campaign.leads,
          isFetchingLeads: isFetching,
        }
      }
    }));
  },

  // Method to refresh leads data in view mode (bypasses view mode check)
  refreshLeadsData: (leadListId: string, leads: Lead[], columnMapping?: ColumnMapping[], source?: any, leadListMetadata?: any) => {
    console.log('Refreshing leads data (view mode):', { leadListId, leadsCount: leads.length, columnMapping, source, leadListMetadata });
    set((state) => {
      const preservedS3Url = state.campaign.leads?.s3Url;
      const preservedFileKey = state.campaign.leads?.fileKey;

      // Extract columnMapping and source from leadListMetadata if provided
      const metadataColumnMapping = leadListMetadata?.columnMapping || columnMapping;
      const metadataSource = leadListMetadata?.source || source;

      return {
        campaign: {
          ...state.campaign,
          leadListId: leadListId, // Update at campaign level
          leads: {
            ...state.campaign.leads,
            data: leads,
            leadListId: leadListId,
            columnMapping: metadataColumnMapping,
            source: metadataSource,
            leadListMetadata: leadListMetadata,
            // Preserve S3 data if it exists
            s3Url: preservedS3Url,
            fileKey: preservedFileKey,
          }
        }
      };
    });
  },

  // Variables management - single source of truth for campaign variables
  setVariables: (variables: ValidatedVariable[]) => {
    set({ variables });
  },

  getVariables: () => {
    return get().variables;
  },

  setVariablesLoading: (loading: boolean) => {
    set({ variablesLoading: loading });
  },

  generateVariables: async () => {
    const state = get();
    const { campaign, mode } = state;
    const viewMode = mode === 'view';

    set({ variablesLoading: true });
    const allVariables: ValidatedVariable[] = [];

    try {
      // 1. Fetch "Fetched From Sheet" variables (csv_ prefix) from backend API - only in edit mode
      if (!viewMode && campaign?.id) {
        try {
          const response = await getCampaignVariables(campaign.id);
          const responseData = response.data as any;
          const csvVariables = responseData?.variables || [];
          allVariables.push(...csvVariables);
        } catch (error) {
          console.error('Failed to fetch campaign variables from backend:', error);
        }
      }

      // 2. Generate "Fetched From LinkedIn" variables (linkedin_ prefix)
      const linkedinVariables: ValidatedVariable[] = [
        {
          id: 'linkedin_firstName',
          name: 'First Name',
          description: 'This variable is replaced with the recipient\'s first name fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s first name fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_firstName}',
          exampleValue: 'John',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        },
        {
          id: 'linkedin_lastName',
          name: 'Last Name',
          description: 'This variable is replaced with the recipient\'s last name fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s last name fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_lastName}',
          exampleValue: 'Smith',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        },
        {
          id: 'linkedin_company',
          name: 'Company',
          description: 'This variable is replaced with the recipient\'s current company fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s current company fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_company}',
          exampleValue: 'Acme Inc',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        },
        {
          id: 'linkedin_jobTitle',
          name: 'Job Title',
          description: 'This variable is replaced with the recipient\'s current job title fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s current job title fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_jobTitle}',
          exampleValue: 'Marketing Director',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        },
        {
          id: 'linkedin_headline',
          name: 'Headline',
          description: 'This variable is replaced with the recipient\'s headline fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s headline fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_headline}',
          exampleValue: 'Marketing Director at Acme Inc',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        },
        {
          id: 'linkedin_location',
          name: 'Location',
          description: 'This variable is replaced with the recipient\'s location fetched from their LinkedIn profile.',
          inputBoxHoverInfo: 'This variable is replaced with the recipient\'s location fetched from their LinkedIn profile. Click to set a fallback if the value is missing.',
          placeholder: '{linkedin_location}',
          exampleValue: 'San Francisco, CA',
          type: 'linkedin' as const,
          source: 'linkedin' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid'
        }
      ];

      allVariables.push(...linkedinVariables);

      // 3. Fetch "System" variables from API
      try {
        const accountIds = campaign?.senderAccounts?.map(account => account.id) || [];
        const systemVariablesFromAPI = await getSystemVariables(accountIds);
        const systemVariables: ValidatedVariable[] = systemVariablesFromAPI.map(variable => ({
          ...variable,
          source: variable.type === 'sender' ? 'system' as const : 'system' as const,
          isValidated: false,
          missingRows: [],
          totalRows: 0,
          validationStatus: 'valid' as const
        }));
        allVariables.push(...systemVariables);
      } catch (error) {
        console.error('Failed to fetch system variables:', error);
        const fallbackSystemVariables: ValidatedVariable[] = [
          {
            id: 'sender_firstName',
            name: 'First Name',
            description: 'Contact\'s first name (fetched from system)',
            inputBoxHoverInfo: "",
            placeholder: '{sender_firstName}',
            exampleValue: 'John',
            type: 'sender' as const,
            source: 'system' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'sender_lastName',
            name: 'Last Name',
            description: 'Contact\'s last name (fetched from system)',
            inputBoxHoverInfo: "",
            placeholder: '{sender_lastName}',
            exampleValue: 'Smith',
            type: 'sender' as const,
            source: 'system' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'sender_company',
            name: 'Company',
            description: 'Contact\'s company (fetched from system)',
            inputBoxHoverInfo: "",
            placeholder: '{sender_company}',
            exampleValue: 'Acme Inc',
            type: 'sender' as const,
            source: 'system' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          },
          {
            id: 'sender_title',
            name: 'Job Title',
            description: 'Contact\'s job title (fetched from system)',
            inputBoxHoverInfo: "",
            placeholder: '{sender_title}',
            exampleValue: 'Marketing Director',
            type: 'sender' as const,
            source: 'system' as const,
            isValidated: false,
            missingRows: [],
            totalRows: 0,
            validationStatus: 'valid'
          }
        ];
        allVariables.push(...fallbackSystemVariables);
      }

      // Remove duplicates based on ID
      const uniqueVariables = allVariables.filter((variable, index, self) =>
        index === self.findIndex(v => v.id === variable.id)
      );

      set({ variables: uniqueVariables });
    } catch (error) {
      console.error('Error generating variables:', error);
    } finally {
      set({ variablesLoading: false });
    }
  },

}));


const CampaignStore = (selector?: (state: any) => any) => useStore(campaignStore, selector as any);

export const useCampaignStore = () => {
  return CampaignStore() as ICampaignStoreState & ICampaignStoreActions;
};

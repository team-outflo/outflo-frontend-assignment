import React, { useState } from 'react';
import { ChevronDown, Info, Check, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TooltipInfo } from '@/components/utils/TooltipInfo';
import { ValidatedVariable } from '../types';
import { getValidationStatusStyles } from '../utils';
import { post } from '@/common/api/client';
import { checkUnauthorized } from '@/common/api/post-process';
import { useToast } from '@/hooks/use-toast';

interface VariableSelectorProps {
  variables: ValidatedVariable[];
  variablesLoading: boolean;
  onVariableSelect: (variable: ValidatedVariable) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  label?: string;
  // For connection message sheet
  showMessageTypeBadge?: boolean;
  messageType?: 'premium' | 'standard';
  // For different layouts
  layout?: 'horizontal' | 'vertical';
  buttonText?: string;
  buttonSize?: 'sm' | 'default';
  dropdownWidth?: string;
  dropdownMaxHeight?: string;
  buttonWidthClass?: string;
  dropdownMenuTriggerClass?: string;
  campaignId?: string;
  onVariableCreated?: () => void;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  variables,
  variablesLoading,
  onVariableSelect,
  disabled = false,
  className = "",
  buttonClassName = "",
  showLabel = true,
  label = "Insert variable:",
  showMessageTypeBadge = false,
  messageType = 'standard',
  layout = 'horizontal',
  buttonText = "Variables",
  buttonSize = 'sm',
  dropdownWidth = "w-80",
  dropdownMaxHeight = "max-h-80",
  buttonWidthClass = "w-auto",
  dropdownMenuTriggerClass = "",
  campaignId,
  onVariableCreated
}) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newVariableName, setNewVariableName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  // Consistent button class for all variable buttons
  const variableButtonClass = `h-8 text-sm px-3 flex items-center gap-2 justify-between transition-all duration-150 ${buttonWidthClass} ${buttonClassName}`;

  /**
   * Validates if a string is a valid JSON key
   * Rules: Must start with letter or underscore, contain only alphanumeric and underscores
   */
  const isValidJsonKey = (key: string): { isValid: boolean; error: string } => {
    if (!key.trim()) {
      return { isValid: false, error: 'Variable name cannot be empty' };
    }

    // Must start with a letter or underscore
    if (!/^[a-zA-Z_]/.test(key)) {
      return { isValid: false, error: 'Variable name must start with a letter or underscore' };
    }

    // Must contain only alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      return { isValid: false, error: 'Variable name can only contain letters, numbers, and underscores' };
    }

    return { isValid: true, error: '' };
  };

  /**
   * Sanitizes input to create a valid JSON key
   * Converts spaces to underscores, removes invalid characters, ensures it starts with letter/underscore
   */
  const sanitizeToJsonKey = (input: string): string => {
    let sanitized = input.trim();
    
    // Replace spaces and hyphens with underscores
    sanitized = sanitized.replace(/[\s-]+/g, '_');
    
    // Remove all invalid characters (keep only alphanumeric and underscores)
    sanitized = sanitized.replace(/[^a-zA-Z0-9_]/g, '');
    
    // If it starts with a number, prefix with underscore
    if (/^[0-9]/.test(sanitized)) {
      sanitized = '_' + sanitized;
    }
    
    // If empty after sanitization, return empty string
    if (!sanitized) {
      return '';
    }
    
    return sanitized;
  };

  const handleVariableNameChange = (value: string) => {
    setNewVariableName(value);
    const validation = isValidJsonKey(value);
    setValidationError(validation.error);
  };

  const handleCreateApiVariable = async () => {
    const trimmedName = newVariableName.trim();
    const validation = isValidJsonKey(trimmedName);
    
    if (!validation.isValid) {
      setValidationError(validation.error);
      toast({
        title: 'Invalid variable name',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    if (!campaignId) return;

    setIsCreating(true);
    try {
      const response = await post(
        `/campaigns/${campaignId}/custom-variables`,
        { variableName: trimmedName }
      ).then(checkUnauthorized);

      console.log('API Variable creation response:', response);

      // Handle different possible response structures
      const createdVariable = (response as any)?.data?.data?.variable || (response as any)?.data?.variable || (response as any)?.variable;

      if (createdVariable) {
        console.log('Created variable:', createdVariable);

        // Map the created variable to ValidatedVariable format
        const mappedVariable: ValidatedVariable = {
          id: createdVariable.id,
          name: createdVariable.name,
          description: createdVariable.description || `API variable: ${createdVariable.name}`,
          placeholder: createdVariable.placeholder || `{${createdVariable.id}}`,
          exampleValue: createdVariable.exampleValue || '',
          type: 'api',
          source: 'api',
          isValidated: createdVariable.isValidated ?? true,
          missingRows: createdVariable.missingRows || [],
          totalRows: createdVariable.totalRows || 0,
          allLeadsPresentInfo: createdVariable.allLeadsPresentInfo || '',
          inputBoxHoverInfo: createdVariable.inputBoxHoverInfo || '',
          validationStatus: createdVariable.isValidated ? 'valid' : 'pending'
        };

        console.log('Mapped variable to insert:', mappedVariable);

        // Refresh variables list first to include the new variable
        if (onVariableCreated) {
          await onVariableCreated();
        }

        // Then insert the variable into the message
        onVariableSelect(mappedVariable);

        toast({
          title: 'API Variable created',
          description: `"${trimmedName}" has been created and inserted.`,
        });
      } else {
        console.error('No variable found in response:', response);
        toast({
          title: 'Unexpected response',
          description: 'Variable was created but could not be inserted.',
          variant: 'destructive',
        });
      }

      setIsCreateDialogOpen(false);
      setNewVariableName('');
      setValidationError('');
    } catch (error) {
      console.error('Error creating API variable:', error);
      toast({
        title: 'Failed to create variable',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (variablesLoading) {
    return (
      <div className={`text-xs text-gray-500 py-2 ${className}`}>
        Loading variables...
      </div>
    );
  }

  const containerClass = layout === 'vertical' ? 'space-y-3' : 'flex items-center gap-2';
  const labelClass = layout === 'vertical' ? 'text-xs font-medium text-gray-600' : 'text-xs text-gray-600 font-medium';

  // Group variables by type
  const csvVariables = variables.filter(v => (v.type !=="linkedin" && v.type !=="sender"));
  const linkedinVariables = variables.filter(v => v.type === 'linkedin');
  const senderVariables = variables.filter(v => v.type === 'sender');
  const apiVariables = variables.filter(v => v.type === 'api');

  const CategoryHeader = ({
    title,
    tooltip,
    categoryType
  }: {
    title: string;
    tooltip: string;
    categoryType: 'csv' | 'linkedin' | 'sender' | 'api';
  }) => {
    const categoryStyles = {
      csv: {
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600'
      },
      linkedin: {
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      },
      sender: {
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        textColor: 'text-purple-800',
        iconColor: 'text-purple-600'
      },
      api: {
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600'
      }
    };

    const styles = categoryStyles[categoryType];

    return (
      <div className={`px-3 w-full py-2 ${styles.bgColor} border-b ${styles.borderColor}`}>
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-semibold ${styles.textColor}`}>{title}</h4>

          <div className="flex items-center gap-2">
            <TooltipInfo
              trigger={
                <Info className={`w-3 h-3 ${styles.iconColor} hover:opacity-70 cursor-pointer transition-opacity`} />
              }
              content={tooltip}
              side="top"
            />
          </div>
        </div>
      </div>
    );
  };

  const VariableItem = ({
    variable,
  }: {
    variable: ValidatedVariable;
  }) => (
    <TooltipInfo
      trigger={
        <DropdownMenuItem
          onClick={() => onVariableSelect(variable)}
          className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-800 font-medium">{variable.name}</span>
            {/* <div className="flex items-center gap-2">
              <Info className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div> */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{variable.id}</span>
            </div>
          </div>
        </DropdownMenuItem>
      }
      content={variable.description || ''}
      side="right"
    />
  );

  return (
    <div className={`${containerClass} ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className={labelClass}>{label}</label>
          {showMessageTypeBadge && (
            <Badge
              variant="secondary"
              className={messageType === 'premium'
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-blue-100 text-blue-800 border-blue-200"
              }
            >
              Adding to {messageType === 'premium' ? 'Premium' : 'Standard'} message
            </Badge>
          )}
        </div>
      )}

      {/* Quick access buttons for commonly used variables */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Create API Variable Button */}
        {/* {campaignId && (
          <TooltipInfo
            trigger={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                className={variableButtonClass}
                disabled={disabled}
              >
                <Plus className="w-4 h-4 mr-1" />
                From API
              </Button>
            }
            content="Create a new API variable to fetch dynamic data from external integrations."
            side="top"
          />
        )} */}
        {linkedinVariables.find(v => v.id === 'linkedin_firstName') && (
          <TooltipInfo
            trigger={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const firstNameVar = linkedinVariables.find(v => v.id === 'linkedin_firstName');
                  if (firstNameVar) onVariableSelect(firstNameVar);
                }}
                className={variableButtonClass}
                disabled={disabled}
              >
                First Name
              </Button>
            }
            content={
              <>
                This variable will be replaced with the recipient's first name fetched from their LinkedIn profile. You can insert more personalization variables from LinkedIn, CSV, or your sender account using the <strong>Variables</strong> dropdown.
              </>
            }
            side="top"
          />
        )}
        {linkedinVariables.find(v => v.id === 'linkedin_lastName') && (
          <TooltipInfo
            trigger={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const lastNameVar = linkedinVariables.find(v => v.id === 'linkedin_lastName');
                  if (lastNameVar) onVariableSelect(lastNameVar);
                }}
                className={variableButtonClass}
                disabled={disabled}
              >
                Last Name
              </Button>
            }
            content={
              <>
                This variable will be replaced with the recipient's last name fetched from their LinkedIn profile. You can insert more personalization variables from LinkedIn, CSV, or your sender account using the <strong>Variables</strong> dropdown.
              </>
            }
            side="top"
          />
        )}
        {linkedinVariables.find(v => v.id === 'linkedin_company') && (
          <TooltipInfo
            trigger={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const companyVar = linkedinVariables.find(v => v.id === 'linkedin_company');
                  if (companyVar) onVariableSelect(companyVar);
                }}
                className={variableButtonClass}
                disabled={disabled}
              >
                Company
              </Button>
            }
            content={
              <>
                This variable will be replaced with the recipient's current company name fetched from their LinkedIn profile. You can insert more personalization variables from LinkedIn, CSV, or your sender account using the <strong>Variables</strong> dropdown.
              </>
            }
            side="top"
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`${variableButtonClass} ${dropdownMenuTriggerClass}`}
              disabled={disabled}
            >
              <span className={`text-sm`}>{buttonText}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className={`${dropdownWidth} ${dropdownMaxHeight} overflow-y-auto p-0 border border-gray-200 shadow-lg`}
          >
            {/* Variables from CSV */}
     
              <div>
                <CategoryHeader
                  title="Variables from List"
                  tooltip="Use these variables to personalize your message with details from the recipient’s data in your CSV file. You can click any inserted variable to configure fallback behavior if that value is missing."
                  categoryType="csv"
                />
                {csvVariables.map(variable => (
                  <VariableItem
                    key={variable.id}
                    variable={variable}
                  />
                ))}
                <TooltipInfo
                trigger={
                  <DropdownMenuItem
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors duration-150 rounded-none border-0 focus:bg-gray-50 group"
                  >
                    <div className="flex items-center justify-between w-full text-purple-800">
                      <div className="flex">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </div>
                      <div className="flex items-center gap-2">
                        <Info className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </DropdownMenuItem>
                }
                content={"Create a new API variable to fetch dynamic data from external integrations."}
                side="right"
              />
              </div>
 

            {/* Variables fetched from LinkedIn */}
            {linkedinVariables.length > 0 && (
              <div>
                <CategoryHeader
                  title="Variables fetched from LinkedIn"
                  tooltip="Use these variables to personalize your message with details from the recipient’s LinkedIn profile. You can click any inserted variable to configure fallback behavior if that value is missing."
                  categoryType="linkedin"
                />
                {linkedinVariables.map(variable => (
                  <VariableItem
                    key={variable.id}
                    variable={variable}
                  />
                ))}
              </div>
            )}

            {/* Variables of Sender */}
            {senderVariables.length > 0 && (
              <div>
                <CategoryHeader
                  title="Variables of Sender"
                  tooltip="Use these variables to personalize your message with details from the sender's LinkedIn profile. If multiple sender accounts are connected, the values will automatically adjust based on the account assigned to each lead."
                  categoryType="sender"
                />
                {senderVariables.map(variable => (
                  <VariableItem
                    key={variable.id}
                    variable={variable}
                  />
                ))}
              </div>
            )}

            {/* API Variables */}

            {/* <div>
              <CategoryHeader
                title="API Variables"
                tooltip="Use these variables to personalize your message with data fetched from external APIs or integrations. These values are dynamically retrieved for each lead."
                categoryType="api"
              />

              {apiVariables.map(variable => (
                <VariableItem
                  key={variable.id}
                  variable={variable}
                />
              ))}
            </div> */}

            {/* Show message if no variables */}
            {csvVariables.length === 0 && linkedinVariables.length === 0 && senderVariables.length === 0 && apiVariables.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No variables available
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Create API Variable Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Variable</DialogTitle>
            {/* <DialogDescription>
              Enter a name for your new API variable. This will be used to fetch dynamic data from external APIs.
            </DialogDescription> */}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="variableName">
                Variable Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="variableName"
                placeholder="e.g., company_size or CompanySize"
                value={newVariableName}
                onChange={(e) => handleVariableNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newVariableName.trim() && !validationError) {
                    handleCreateApiVariable();
                  }
                }}
                className={validationError ? 'border-red-500 focus:border-red-500' : ''}
                autoFocus
              />
              {validationError && (
                <p className="text-sm text-red-500 mt-1">{validationError}</p>
              )}
              {!validationError && newVariableName.trim() && (
                <p className="text-xs text-gray-500 mt-1">
                  Valid JSON key format: starts with letter/underscore, contains only letters, numbers, and underscores
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewVariableName('');
                setValidationError('');
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateApiVariable}
              disabled={!newVariableName.trim() || !!validationError || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Insert'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VariableSelector;

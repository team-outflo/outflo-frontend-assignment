import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EnrichmentService } from './enrichmentService';

interface LinkedInData {
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  company: string;
  title: string;
}

interface Lead {
  id: string;
  name: string;
  linkedInData: LinkedInData;
}

interface LinkedInDataConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSave: (leadId: string, linkedInData: LinkedInData) => void;
}

export const LinkedInDataConfigurationModal: React.FC<LinkedInDataConfigurationModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSave
}) => {
  const [linkedInData, setLinkedInData] = useState<LinkedInData>({
    firstName: '',
    lastName: '',
    headline: '',
    location: '',
    company: '',
    title: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load lead data when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      setLinkedInData(lead.linkedInData);
    }
  }, [isOpen, lead]);

  const handleInputChange = (field: keyof LinkedInData, value: string) => {
    setLinkedInData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleSave = () => {
    if (!lead) return;
    
    onSave(lead.id, linkedInData);
  };

  const isFormValid = linkedInData.firstName.trim() && linkedInData.lastName.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Configure LinkedIn Data
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Update information for {lead?.id}
          </p>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                First Name
              </Label>
              <Input
                id="firstName"
                value={linkedInData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Last Name
              </Label>
              <Input
                id="lastName"
                value={linkedInData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* LinkedIn Headline */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="headline" className="text-sm font-medium text-gray-700">
                LinkedIn Headline
              </Label>
              <Input
                id="headline"
                value={linkedInData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                placeholder="Enter LinkedIn headline"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Location */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                Location
              </Label>
              <Input
                id="location"
                value={linkedInData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Enter location"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium text-gray-700">
                Company
              </Label>
              <Input
                id="company"
                value={linkedInData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Enter company name"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                Job Title
              </Label>
              <Input
                id="title"
                value={linkedInData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter job title"
                className="rounded-lg border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

      
        </div>

        <DialogFooter className="flex justify-end space-x-3">
          {/* <Button
            variant="outline"
            onClick={onClose}
            className="px-6"
          >
            Cancel
          </Button> */}
          <Button
            onClick={handleSave}
            disabled={!isFormValid}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

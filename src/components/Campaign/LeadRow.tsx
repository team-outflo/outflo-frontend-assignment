import React from "react";
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu } from '@/components/ui/dropdown-menu';

interface LeadRowProps {
  lead: any;
  onSelect: (leadId: string, checked: boolean) => void;
  // Add more props as needed for actions, etc.
}
    
const LeadRow: React.FC<LeadRowProps> = ({ lead, onSelect }) => {
  return (
    <div key={lead.id} className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${lead.selected ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        <Checkbox className='mt-4' checked={lead.selected} onCheckedChange={checked => onSelect(lead.id, checked as boolean)} />
        <img src={lead.avatar} alt={`${lead.firstName} ${lead.lastName}`} className="w-12 h-12 rounded-full bg-gray-200 object-cover" onError={(e) => {
          (e.target as HTMLImageElement).src = '/placeholder.svg';
        }} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {lead.firstName} {lead.lastName}
          </h3>
          <div className="text-xs text-gray-500 mt-1">
            {[
              lead.headline && <span key="headline" className="block text-gray-600">{lead.headline}</span>,
              (lead.jobTitle || lead.company) &&
                <span key="position" className="block">
                  {[lead.jobTitle, lead.company].filter(Boolean).join(" at ")}
                </span>,
              lead.location && <span key="location" className="block">{lead.location}</span>
            ].filter(Boolean)}
          </div>
        </div>
        <DropdownMenu>
          {/* Add dropdown menu actions here */}
        </DropdownMenu>
      </div>
    </div>
  );
};

export default React.memo(LeadRow);

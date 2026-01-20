import React from 'react';
import { useState } from "react";
import { X, ExternalLink, Shield, Chrome, Info, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Link } from 'react-router-dom';

// Helper function to convert URN to LinkedIn profile URL
const getLinkedInProfileUrl = (urn: string): string => {
  // Extract the profile ID from URN (e.g., "urn:li:fsd_profile:ACoAACPaKIgBgdBazCv1SMwAgTYuHCQoYL-RN_U")
  const profileId = urn.replace('urn:li:fsd_profile:', '');
  return `https://www.linkedin.com/in/${profileId}`;
};

interface LinkedInConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: {
    urn: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

// Component to display user profile information
const UserProfileSection = ({ userProfile }: { userProfile: LinkedInConnectionModalProps['userProfile'] }) => {
  if (!userProfile) return null;

  const profileUrl = getLinkedInProfileUrl(userProfile.urn);
  const fullName = `${userProfile.firstName} ${userProfile.lastName}`;

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 mb-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {userProfile.profileImageUrl ? (
            <img
              src={userProfile.profileImageUrl}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">{fullName}</h3>
          <p className="text-xs text-gray-500">LinkedIn Profile</p>
        </div>
        <div className="flex-shrink-0">
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Profile
          </a>
        </div>
      </div>
    </div>
  );
};

const OnboardingContent = () => (
  <div className="space-y-6 text-sm leading-relaxed"> 

    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-medium text-black">
          <span className="text-lg">🧩</span>
          <span>Step 1: Install OutFlo Chrome Extension</span>
        </div>
        <div className="pl-6 space-y-2">
          <p>Install the OutFlo extension in the Chrome profile where your LinkedIn account is logged in.</p>
          <div className='text-blue-500'>👉 <Link target='_blank' to="https://chromewebstore.google.com/detail/outflo-%E2%80%93-scale-outreach-o/cmikcdbkjpaejenbajphdelgdjolgdod?authuser=0&hl=en-GB" className="hover:underline">Install Extension</Link></div>
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-medium text-black">
          <span className="text-lg">🔗</span>
          <span>Step 2: Connect Your LinkedIn Account</span>
        </div>
        <div className="pl-6 space-y-3">
          <ol className="list-decimal space-y-2 ml-4">
            <li>Open LinkedIn and go to your home feed.</li>
            <li>Click the Extensions icon (top-right of Chrome).</li>
            <li>Select <strong>OutFlo</strong>.</li>
            <li>In the popup:
              <ul className="list-disc ml-6 mt-1 space-y-1">
                <li>Enter your OutFlo username (the one used to set up your workspace)</li>
                <li>Click <strong>Connect</strong></li>
              </ul>
            </li>
            <li>Once connected:
              <ul className="list-disc ml-6 mt-1 space-y-1">
                <li>Go to the <strong>Accounts</strong> tab in OutFlo dashboard.</li>
                <li>Your LinkedIn account should be listed with <Badge variant="outline" className="text-green-500 border-green-500">Status: Active</Badge></li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-medium text-outflo-dark">
          <span className="text-lg">💬</span>
          <span>What Happens Next</span>
        </div>
        <div className="pl-6 space-y-2">
          <ul className="list-disc ml-4 space-y-1">
            <li>Your last 7 days of LinkedIn conversations will show in the <strong>Unibox</strong> tab.</li>
            <li>Any new messages will appear automatically — no manual syncing needed.</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-medium text-outflo-dark">
          <span className="text-lg">🔄</span>
          <span>Add Multiple LinkedIn Accounts</span>
        </div>
        <div className="pl-6 space-y-2">
          <p>To add more LinkedIn accounts:</p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Use a different Chrome profile for each account.</li>
            <li>Install the extension in each profile.</li>
            <li>Repeat the same steps with the respective OutFlo username.</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 font-medium text-yellow-500">
          <span className="text-lg">⚠️</span>
          <span>Important Notes</span>
        </div>
        <div className="pl-6 space-y-2">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-outflo-success text-sm">✅</span>
              <span>Keep the Chrome extension installed for continuous syncing.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-outflo-success text-sm">✅</span>
              <span>Make sure LinkedIn is logged in within the Chrome profile.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-outflo-warning text-sm">❗</span>
              <div>
                <span>If status shows <strong>Inactive</strong>:</span>
                <ul className="list-disc ml-6 mt-1 space-y-1">
                  <li>Reopen the Chrome profile</li>
                  <li>Open the extension and reconnect with your OutFlo username</li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <div className="bg-outflo-gray/30 rounded-lg p-4">
        <div className="text-center space-y-2">
          <p className="font-medium">📞 Need help?</p>
          <p>Reach out to our support team at <Link to="tel:+919878006792" className="text-blue-500 hover:underline">+91 9878006792</Link>.</p>
          <p>Let's get growing 🚀</p>
        </div>
      </div>
    </div>
  </div>
);
const LinkedInConnectionModal = ({ isOpen, onClose, userProfile }: LinkedInConnectionModalProps) => {
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
      <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-xl border-0 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 relative bg-gradient-to-r from-gray-50 to-white border-b">
          {/* <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button> */}
          <DialogTitle className="text-xl font-semibold text-gray-900 text-center whitespace-nowrap">
            Connect your LinkedIn account
          </DialogTitle>
          {/* <DialogDescription className="text-sm text-gray-600 text-center mt-2 whitespace-nowrap">
            Choose your preferred method to connect with LinkedIn
          </DialogDescription> */}
        </DialogHeader>

        {/* Content */}
        <div className="px-6 pb-6 space-y-5 pt-4">
          {/* User Profile Section */}
          <UserProfileSection userProfile={userProfile} />
          {/* OutFlo Chrome Extension Option */}
          <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all relative cursor-pointer shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Chrome className="w-6 h-6 text-gray-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900">OutFlo Chrome Extension</h3>
                  <span className="px-2 py-0.5 bg-primary/90 text-white text-xs font-medium rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Connect to OutFlo using an existing LinkedIn login session
                </p>
              </div>
              <div className="w-6 h-6 border-2 border-primary rounded-full bg-primary flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Get OutFlo Extension Button */}
          <Button
            className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 h-auto rounded-xl font-medium flex items-center justify-center space-x-2 shadow-lg"
            onClick={() => {
              // Handle extension download
              window.open('https://chromewebstore.google.com/detail/outflo-%E2%80%93-scale-outreach-o/cmikcdbkjpaejenbajphdelgdjolgdod?authuser=0&hl=en-GB', '_blank');
            }}
          >
            <span>Get OutFlo extension</span>
            <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
           <Button
              variant="outline"
              className="w-full mt-3 flex items-center justify-center"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Info className="w-3 h-3" />
              How to connect?
            </Button>
          {/* Security Notice */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mt-2">
            <Shield className="w-4 h-4" />
            <span>Secured with TLS 1.3 encryption</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-outflo-dark">
              How to connect your LinkedIn account with OutFlo ?
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <OnboardingContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};




export default LinkedInConnectionModal;

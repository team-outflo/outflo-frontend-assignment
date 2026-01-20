"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Mail, Phone, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { post } from "@/common/api/client";

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpPopup({ isOpen, onClose }: HelpPopupProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await post('/slack/submit-query', {
        queryType: 'linkedin_connection',
        name: formData.name,
        email: formData.email,
        message: formData.message
      });

      if (response.ok) {
        setSubmitStatus('success');
        // Reset form after successful submission
        setFormData({ name: "", email: "", message: "" });
        // Close popup after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting help request:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl animate-scale-in">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Need Help?</CardTitle>
              <CardDescription className="text-sm">Get in touch with our support team</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Mail className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-muted-foreground">team@outflo.io</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <Phone className="w-4 h-4 text-primary" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-xs text-muted-foreground">+91 98780 06792</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="message" className="text-xs">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="How can we help you?"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[60px] text-sm resize-none"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-8 text-sm bg-gradient-to-r from-indigo-600 to-violet-400 hover:from-indigo-700 hover:to-violet-500 text-white"
              disabled={!formData.name || !formData.email || !formData.message || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-2" />
                  Send Message
                </>
              )}
            </Button>
            
            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-medium text-green-700">Message sent successfully!</p>
                </div>
              </div>
            )}
            
            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm font-medium text-red-700">Failed to send message. Please try again.</p>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



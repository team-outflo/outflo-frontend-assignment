"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    PartyPopper,
    Users,
    Zap,
    Clock,
    Check,
    ExternalLink,
    CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import SafetyTooltip from "./Accounts/safety-tooltip";
import { formatExpirationDate } from "@/utils/timeUtils";

interface TrialWelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    trialDaysLeft: number;
    trialEndDate: string;
}

export function TrialWelcomeModal({
    trialEndDate,
    isOpen,
    onClose,
    trialDaysLeft,
}: TrialWelcomeModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg border-0 p-0 overflow bg-white dark:bg-gray-950">
                <div className="relative rounded-t-lg bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 px-6 py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <PartyPopper className="w-8 h-8 text-white" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2 text-green-900 dark:text-green-100">
                        Welcome! Your Trial is Active
                    </h2>
                    <p className="text-sm text-green-800/80 dark:text-green-200/80">
                        Start exploring everything our platform has to offer
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Trial info badge */}
                    <div className="bg-green-500 text-white rounded-lg p-4 shadow-md">
                        <div className="flex !flex-wrap items-start gap-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                            <p className="text-xs opacity-90 mb-1 font-bold">Free Trial Active</p>
                        </div>
                        <div className="mb-2">
                            <p className="text-lg font-bold">
                                {trialDaysLeft} Days Remaining
                            </p>
                        </div>
                        <div className="bg-green-600 text-white rounded-sm px-2 py-1 flex items-center text-xs">
                            <span>Expires {formatExpirationDate(trialEndDate)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">During your trial, enjoy:</h3>

                        <div className="space-y-2.5">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                                    <Users className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">
                                        Unlimited LinkedIn Accounts
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Connect and manage as many accounts as you need
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">
                                        Unlimited LinkedIn Actions
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Run campaigns without any restrictions
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={() => {
                                window.open(
                                    "https://chromewebstore.google.com/detail/outflo-%E2%80%93-scale-outreach-o/cmikcdbkjpaejenbajphdelgdjolgdod",
                                    "_blank"
                                );
                                onClose();
                            }}
                            className="w-full bg-[#5a41cd] hover:bg-[#5a41cd]/90 text-white hover:text-white/90 shadow-lg h-11"
                        >
                            <ExternalLink />
                            Connect your LinkedIn Account
                        </Button>

                        <div className="flex flex-row items-center text-muted-foreground text-xs gap-4 justify-center">
                            <div className="flex flex-row gap-1">
                                <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                <SafetyTooltip>
                                    <span className="cursor-pointer decoration-dotted border border-t-0 border-r-0 border-l-0 border-dotted border-primary">
                                        100% safe
                                    </span>
                                </SafetyTooltip>
                            </div>
                            <div className="flex flex-row gap-1">
                                <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>No password needed</span>
                            </div>
                            <div className="flex flex-row gap-1">
                                <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>Takes &lt;1 min</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

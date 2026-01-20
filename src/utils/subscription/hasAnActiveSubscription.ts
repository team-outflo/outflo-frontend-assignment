interface Subscription {
    status?: string;
    trialEndDate?: string;
    [key: string]: any;
}

const hasAnActiveSubscription = (subscription: Subscription = {}): boolean => {
    if (!subscription?.status) {
        return false;
    }
    // If status is "trialing", check if trial end date has passed
    if (subscription.status === "trialing") {
        if (!subscription.trialEndDate) {
            return false;
        }
        const trialEndDate = new Date(subscription.trialEndDate);
        const now = new Date();
        // Return true only if trial end date is in the future
        return trialEndDate > now;
    }

    // For other statuses, exclude only inactive statuses
    const inactiveStatuses = ["canceled", "unpaid"];
    return !inactiveStatuses.includes(subscription.status);
};

export default hasAnActiveSubscription;

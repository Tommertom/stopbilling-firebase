
# Firebase/GCP Billing Cap Function

A Firebase Cloud Function that automatically disables billing for your Google Cloud Platform project when spending exceeds a specified threshold. This helps prevent unexpected charges by automatically unlinking your billing account when costs reach your defined limit.

## 🚨 Important Warning

**This function will completely disable billing for your project, which will shut down all billable services.** Use with caution and make sure you understand the implications.

## Features

- Automatically monitors project spending via Pub/Sub notifications
- Disables billing when costs exceed a configurable threshold (default: $50)
- Integrates with GCP Budget Alerts
- Easy to deploy with Firebase Functions

## Prerequisites

- Google Cloud Platform project with billing enabled
- Firebase CLI installed and configured
- Node.js and npm installed

## Setup Instructions

### 1. Enable Required APIs

First, enable the Cloud Billing API in your GCP project:
- Visit the [Cloud Billing API Console](https://console.cloud.google.com/apis/api/cloudbilling.googleapis.com)
- Click "Enable" if not already enabled

### 2. Create Budget Alert

1. Go to the [GCP Billing Console](https://console.cloud.google.com/billing)
2. Create a new budget alert for your project
3. Set the trigger level (recommended: same as your threshold in the function, default $50)
4. Configure the alert to publish to a Pub/Sub topic named `downgrade-plan`

### 3. Configure Service Account Permissions

The Cloud Run service account needs billing management permissions:

1. Go to [IAM & Admin](https://console.cloud.google.com/iam-admin/iam) in your GCP Console
2. Find your Cloud Run service account (usually `<project-id>@appspot.gserviceaccount.com`)
3. Add the role: **Project Billing Manager**

### 4. Deploy the Function

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Deploy to Firebase:
   ```bash
   firebase deploy --only functions:stopBilling
   ```

## Configuration

The billing threshold is set in the `stop-billing.ts` file:

```typescript
const treshHold = 50; // $50 USD threshold
```

You can modify this value before deploying to set your desired spending limit.

## How It Works

1. When your project spending reaches the budget alert threshold, GCP sends a message to the `downgrade-plan` Pub/Sub topic
2. The Firebase function receives this message and checks the current spending
3. If spending exceeds the configured threshold, the function disables billing for the project
4. All billable services will be shut down to prevent further charges

## Testing

You can test the function by manually publishing a message to the `downgrade-plan` Pub/Sub topic:

1. Go to the [Pub/Sub Console](https://console.cloud.google.com/cloudpubsub/topic/detail/downgrade-plan?tab=messages)
2. Click "Publish Message" 
3. Use this JSON payload (modify `costAmount` to trigger the function):

```json
{
    "budgetDisplayName": "Test Budget",
    "alertThresholdExceeded": 0.0,
    "costAmount": 60,
    "costIntervalStart": "2024-01-01T00:00:00Z",
    "budgetAmount": 100.00,
    "budgetAmountType": "SPECIFIED_AMOUNT",
    "currencyCode": "USD"
}
```

4. Check your billing account under "Account Management" to verify the project is no longer linked

## Recovery After Billing Disable

If billing has been disabled and you need to restore services:

1. **Firebase Console**: Re-enable the "Pay as you go" plan
   - Your functions should still be deployed and ready
2. **Other Services**: VPC, static IPs, and other resources will need to be recreated
3. **Re-link Billing Account**: Manually re-associate your project with a billing account

## Project Structure

```
├── package.json          # Dependencies
├── stop-billing.ts       # Main function code
└── README.md            # This file
```

## Dependencies

- `@google-cloud/billing`: Google Cloud Billing API client
- `firebase-functions`: Firebase Functions SDK

## Sources and Contributing

This project is based on Google Cloud's official documentation and best practices:

- **[Google Cloud: Disable Billing with Notifications](https://cloud.google.com/billing/docs/how-to/disable-billing-with-notifications)** - Official Google Cloud documentation on setting up automatic billing disabling
- **[YouTube Tutorial: GCP Billing Cap Setup](https://youtu.be/NWrZwXK92IM)** - Video walkthrough of the setup process

Feel free to submit issues and enhancement requests!



## Disclaimer

This tool is provided as-is. Always test in a development environment first and understand the implications of disabling billing for your project. The authors are not responsible for any service interruptions or data loss.

